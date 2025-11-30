import Foundation
import Capacitor
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit
import CoreML

@objc(BackgroundRemovalPlugin)
public class BackgroundRemovalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundRemovalPlugin"
    public let jsName = "BackgroundRemoval"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "removeBackground", returnType: CAPPluginReturnPromise)
    ]
    
    // Lazy load U²‑Net model (optional - only if model is added to project)
    private lazy var u2netModel: MLModel? = {
        guard let modelURL = Bundle.main.url(forResource: "u2net", withExtension: "mlmodelc") ??
                            Bundle.main.url(forResource: "U2Net", withExtension: "mlmodelc") else {
            CAPLog.print("⚠️ U²‑Net model not found - will use Vision framework only")
            return nil
        }
        do {
            let model = try MLModel(contentsOf: modelURL)
            CAPLog.print("✅ U²‑Net model loaded successfully")
            return model
        } catch {
            CAPLog.print("❌ Failed to load U²‑Net model: \(error.localizedDescription)")
            return nil
        }
    }()
    
    @objc func removeBackground(_ call: CAPPluginCall) {
        // Check if iOS 15+ (required for person segmentation fallback)
        // iOS 17+ gets Vision framework, iOS 15-16 gets person segmentation only
        guard #available(iOS 15.0, *) else {
            let iosVersion = UIDevice.current.systemVersion
            CAPLog.print("⚠️ Background removal requires iOS 15+, current version: \(iosVersion)")
            if let base64Image = call.getString("image") {
                call.resolve([
                    "imageData": base64Image,
                    "success": false,
                    "error": "iOS 15+ required for background removal, current: \(iosVersion)"
                ])
            } else {
                call.reject("Image data is required")
            }
            return
        }
        
        guard let base64Image = call.getString("image") else {
            CAPLog.print("❌ Background removal: Image data is missing")
            call.reject("Image data is required")
            return
        }
        
        CAPLog.print("🎨 Starting background removal process...")
        
        // Parse base64 image
        let imageData: Data
        if base64Image.hasPrefix("data:image") {
            let base64String = base64Image.components(separatedBy: ",").last ?? base64Image
            guard let data = Data(base64Encoded: base64String) else {
                CAPLog.print("❌ Background removal: Invalid base64 image data (data URL format)")
                call.reject("Invalid base64 image data")
                return
            }
            imageData = data
        } else {
            guard let data = Data(base64Encoded: base64Image) else {
                CAPLog.print("❌ Background removal: Invalid base64 image data")
                call.reject("Invalid base64 image data")
                return
            }
            imageData = data
        }
        
        guard let inputImage = UIImage(data: imageData) else {
            CAPLog.print("❌ Background removal: Failed to create UIImage from data (size: \(imageData.count) bytes)")
            call.reject("Failed to create image from data")
            return
        }
        
        guard let cgImage = inputImage.cgImage else {
            CAPLog.print("❌ Background removal: Failed to get CGImage from UIImage")
            call.reject("Failed to get CGImage")
            return
        }
        
        let imageSize = "\(cgImage.width)x\(cgImage.height)"
        CAPLog.print("📐 Image size: \(imageSize)")
        
        // Optimize image size if too large (max 2048px on longest side for performance)
        let maxDimension: CGFloat = 2048
        let processedCGImage: CGImage
        if max(CGFloat(cgImage.width), CGFloat(cgImage.height)) > maxDimension {
            let scale = maxDimension / max(CGFloat(cgImage.width), CGFloat(cgImage.height))
            let newWidth = Int(CGFloat(cgImage.width) * scale)
            let newHeight = Int(CGFloat(cgImage.height) * scale)
            CAPLog.print("📏 Resizing image from \(cgImage.width)x\(cgImage.height) to \(newWidth)x\(newHeight)")
            
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            guard let context = CGContext(
                data: nil,
                width: newWidth,
                height: newHeight,
                bitsPerComponent: 8,
                bytesPerRow: 0,
                space: colorSpace,
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            ) else {
                call.reject("Failed to create resize context")
                return
            }
            
            context.interpolationQuality = .high
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: newWidth, height: newHeight))
            
            guard let resizedImage = context.makeImage() else {
                call.reject("Failed to resize image")
                return
            }
            processedCGImage = resizedImage
        } else {
            processedCGImage = cgImage
        }
        
        // Process on background thread
        DispatchQueue.global(qos: .userInitiated).async {
            if #available(iOS 17.0, *) {
                self.processImage(cgImage: processedCGImage, originalBase64: base64Image, call: call)
            } else {
                // iOS 15-16: Use person segmentation only
                self.processImageIOS15(cgImage: processedCGImage, originalBase64: base64Image, call: call)
            }
        }
    }
    
    @available(iOS 17.0, *)
    private func processImage(cgImage: CGImage, originalBase64: String, call: CAPPluginCall) {
        var failureLogs: [String] = []
        
        // STEP 1: Try Vision framework (fast, works well for people/3D objects)
        CAPLog.print("🔍 Step 1: Trying Vision framework (fast for people/3D objects)...")
        showStatusAlert(title: "Processing Image", message: "Step 1/3: Trying Vision framework...")
        
        let preprocessedImage = preprocessImageForVision(cgImage) ?? cgImage
        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(cgImage: preprocessedImage, options: [:])
        
        do {
            try handler.perform([request])
            
            if let result = request.results?.first {
                let instanceCount = result.allInstances.count
                CAPLog.print("✅ Vision detected \(instanceCount) foreground instance(s)")
                
                // Generate mask
                let mask: CVPixelBuffer
                do {
                    let rawMask = try result.generateScaledMaskForImage(
                        forInstances: result.allInstances,
                        from: handler
                    )
                    CAPLog.print("✅ Mask generated successfully")
                    
                    // Refine mask edges for smoother results
                    CAPLog.print("✨ Refining mask edges...")
                    mask = refineMaskEdges(rawMask) ?? rawMask
                    
                    // Apply mask and return
                    if let maskedImage = self.applyMask(mask: mask, to: cgImage),
                       let pngData = maskedImage.pngData() {
                        let base64Result = pngData.base64EncodedString()
                        CAPLog.print("✅ Background removal successful using Vision framework!")
                        
                        DispatchQueue.main.async {
                            self.showSuccessAlert(title: "Success!", message: "Background removed using Vision framework")
                            call.resolve([
                                "imageData": "data:image/png;base64," + base64Result,
                                "success": true
                            ])
                        }
                        return
                    }
                } catch {
                    let errorMsg = "Vision mask generation failed: \(error.localizedDescription)"
                    CAPLog.print("⚠️ \(errorMsg)")
                    failureLogs.append("❌ Step 1 (Vision): \(errorMsg)")
                }
            } else {
                failureLogs.append("❌ Step 1 (Vision): No objects detected")
            }
        } catch {
            let errorMsg = "Vision analysis failed: \(error.localizedDescription)"
            CAPLog.print("⚠️ \(errorMsg)")
            failureLogs.append("❌ Step 1 (Vision): \(errorMsg)")
        }
        
        // STEP 2: Try U²‑Net CoreML (works for flat clothes/products)
        CAPLog.print("🔄 Step 2: Vision failed, trying U²‑Net CoreML (better for flat clothes)...")
        showStatusAlert(title: "Processing Image", message: "Step 2/3: Trying U²‑Net CoreML...")
        
        if let u2netMask = tryU2NetBackgroundRemoval(cgImage: cgImage) {
            CAPLog.print("✅ U²‑Net mask generated and refined successfully")
            
            if let maskedImage = self.applyMask(mask: u2netMask, to: cgImage),
               let pngData = maskedImage.pngData() {
                let base64Result = pngData.base64EncodedString()
                CAPLog.print("✅ Background removal successful using U²‑Net!")
                
                DispatchQueue.main.async {
                    self.showSuccessAlert(title: "Success!", message: "Background removed using U²‑Net CoreML")
                    call.resolve([
                        "imageData": "data:image/png;base64," + base64Result,
                        "success": true
                    ])
                }
                return
            } else {
                failureLogs.append("❌ Step 2 (U²‑Net): Failed to apply mask")
            }
        } else {
            failureLogs.append("❌ Step 2 (U²‑Net): Model not available or prediction failed")
        }
        
        // STEP 3: Try person segmentation fallback (iOS 15+)
        CAPLog.print("🔄 Step 3: U²‑Net failed, trying person segmentation fallback...")
        showStatusAlert(title: "Processing Image", message: "Step 3/3: Trying person segmentation...")
        
        if let rawPersonMask = tryPersonSegmentation(cgImage: cgImage) {
            CAPLog.print("✅ Person segmentation fallback succeeded!")
            
            // Refine mask edges
            CAPLog.print("✨ Refining person segmentation mask edges...")
            let personMask = refineMaskEdges(rawPersonMask) ?? rawPersonMask
            
            if let maskedImage = self.applyMask(mask: personMask, to: cgImage),
               let pngData = maskedImage.pngData() {
                let base64Result = pngData.base64EncodedString()
                
                DispatchQueue.main.async {
                    self.showSuccessAlert(title: "Success!", message: "Background removed using person segmentation")
                    call.resolve([
                        "imageData": "data:image/png;base64," + base64Result,
                        "success": true
                    ])
                }
                return
            } else {
                failureLogs.append("❌ Step 3 (Person Segmentation): Failed to apply mask")
            }
        } else {
            failureLogs.append("❌ Step 3 (Person Segmentation): No person detected or iOS version too old")
        }
        
        // All methods failed - show detailed failure alert
        CAPLog.print("❌ All background removal methods failed")
        let detailedError = failureLogs.joined(separator: "\n")
        CAPLog.print("📋 Failure details:\n\(detailedError)")
        
                DispatchQueue.main.async {
            self.showFailureAlert(
                title: "Background Removal Failed",
                message: "All methods failed. Using original image.",
                details: detailedError
            )
                    call.resolve([
                        "imageData": originalBase64,
                        "success": false,
                "error": "Background removal failed. Tips: 1) Use high contrast (dark item on light background), 2) Take photo of item hanging or on mannequin (3D shapes work better), 3) Ensure good lighting, 4) Make sure item fills most of the frame.",
                "failureLogs": failureLogs
            ])
        }
    }
    
    // MARK: - Native iOS Alerts
    
    private var currentStatusAlert: UIAlertController?
    
    /// Show status alert during processing (replaces previous if exists)
    private func showStatusAlert(title: String, message: String) {
        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else { return }
            
            // Dismiss previous status alert if exists
            if let previousAlert = self.currentStatusAlert {
                previousAlert.dismiss(animated: false)
            }
            
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            self.currentStatusAlert = alert
            viewController.present(alert, animated: true)
            
            // Auto-dismiss after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                if alert == self.currentStatusAlert {
                    alert.dismiss(animated: true)
                    self.currentStatusAlert = nil
                }
            }
        }
    }
    
    /// Show success alert
    private func showSuccessAlert(title: String, message: String) {
        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else { return }
            
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            viewController.present(alert, animated: true)
        }
    }
    
    /// Show detailed failure alert with logs
    private func showFailureAlert(title: String, message: String, details: String) {
        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else { return }
            
            // Use action sheet for longer content (better for scrolling)
            let alert = UIAlertController(
                title: title,
                message: "\(message)\n\n📋 Failure Logs:\n\(details)",
                preferredStyle: .actionSheet
            )
            
            // Add OK button
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            
            // For iPad, set popover presentation
            if let popover = alert.popoverPresentationController {
                popover.sourceView = viewController.view
                popover.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            
            viewController.present(alert, animated: true)
        }
    }
    
    // MARK: - Image Preprocessing
    
    /// Preprocess image to enhance for Vision detection
    /// - Enhances contrast, sharpens edges, converts to sRGB
    @available(iOS 17.0, *)
    private func preprocessImageForVision(_ cgImage: CGImage) -> CGImage? {
        let ciImage = CIImage(cgImage: cgImage)
        
        // 1. Enhance contrast (helps Vision detect object boundaries)
        let contrastFilter = CIFilter.colorControls()
        contrastFilter.inputImage = ciImage
        contrastFilter.contrast = 1.2  // Increase contrast by 20%
        contrastFilter.brightness = 0.05  // Slight brightness boost
        contrastFilter.saturation = 1.1  // Slight saturation boost
        
        guard let enhancedImage = contrastFilter.outputImage else {
            return cgImage  // Return original if enhancement fails
        }
        
        // 2. Sharpen edges (helps object detection)
        let sharpenFilter = CIFilter.sharpenLuminance()
        sharpenFilter.inputImage = enhancedImage
        sharpenFilter.sharpness = 0.5
        sharpenFilter.radius = 1.5
        
        guard let sharpenedImage = sharpenFilter.outputImage else {
            return cgImage
        }
        
        // 3. Ensure sRGB color space
        let sRGBColorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
        
        // 4. Render to CGImage
        let context = CIContext(options: [.useSoftwareRenderer: false, .workingColorSpace: sRGBColorSpace])
        guard let finalCGImage = context.createCGImage(sharpenedImage, from: ciImage.extent) else {
            return cgImage
        }
        
        return finalCGImage
    }
    
    // MARK: - Person Segmentation Fallback
    
    /// Try person segmentation as fallback (iOS 15+)
    /// Works well when person is in the photo
    @available(iOS 15.0, *)
    private func tryPersonSegmentation(cgImage: CGImage) -> CVPixelBuffer? {
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .balanced
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        do {
            try handler.perform([request])
            
            guard let result = request.results?.first as? VNPixelBufferObservation else {
                return nil
            }
            
            // Get the mask pixel buffer directly
            return result.pixelBuffer
        } catch {
            CAPLog.print("⚠️ Person segmentation failed: \(error.localizedDescription)")
            return nil
        }
    }
    
    // MARK: - U²‑Net CoreML Integration (Direct)
    
    /// Try U²‑Net CoreML model for background removal (direct CoreML, not via Vision)
    /// Works well for flat clothes, products, any background
    private func tryU2NetBackgroundRemoval(cgImage: CGImage) -> CVPixelBuffer? {
        guard let model = u2netModel else {
            CAPLog.print("⚠️ U²‑Net model not available")
            return nil
        }
        
        // U²‑Net typically expects 320x320 or 512x512 input
        let modelInputSize: CGFloat = 320
        let originalWidth = CGFloat(cgImage.width)
        let originalHeight = CGFloat(cgImage.height)
        
        // Calculate scale to fit model input size while maintaining aspect ratio
        let scale = min(modelInputSize / originalWidth, modelInputSize / originalHeight)
        let scaledWidth = Int(originalWidth * scale)
        let scaledHeight = Int(originalHeight * scale)
        
        // Resize image to model input size
        guard let resizedImage = resizeImage(cgImage, to: CGSize(width: scaledWidth, height: scaledHeight)) else {
            CAPLog.print("❌ Failed to resize image for U²‑Net")
            return nil
        }
        
        // Convert to CVPixelBuffer for model input (normalized 0-1, RGB format)
        guard let pixelBuffer = imageToPixelBufferForCoreML(resizedImage, width: scaledWidth, height: scaledHeight) else {
            CAPLog.print("❌ Failed to convert image to pixel buffer for CoreML")
            return nil
        }
        
        do {
            // Get model input description to determine expected format
            let modelDescription = model.modelDescription
            guard let inputDescription = modelDescription.inputDescriptionsByName.first?.value else {
                CAPLog.print("❌ Failed to get model input description")
                return nil
            }
            
            CAPLog.print("📋 Model input: \(inputDescription.name), type: \(inputDescription.type)")
            
            // Create MLFeatureValue from pixel buffer
            let inputFeature = MLFeatureValue(pixelBuffer: pixelBuffer)
            
            // Create input provider
            let inputProvider = try MLDictionaryFeatureProvider(dictionary: [inputDescription.name: inputFeature])
            
            // Run prediction directly via CoreML (not Vision)
            CAPLog.print("🔮 Running U²‑Net CoreML prediction directly...")
            let prediction = try model.prediction(from: inputProvider)
            
            // Extract output - try common output names
            let outputNames = ["output", "mask", "out", "prediction"]
            var outputBuffer: CVPixelBuffer?
            
            for outputName in outputNames {
                if let outputFeature = prediction.featureValue(for: outputName),
                   let buffer = outputFeature.imageBufferValue {
                    outputBuffer = buffer
                    CAPLog.print("✅ Found output: \(outputName)")
                    break
                }
            }
            
            guard let maskBuffer = outputBuffer else {
                // Try to get first available output
                let allOutputs = prediction.featureNames
                CAPLog.print("⚠️ Standard output names not found. Available outputs: \(allOutputs)")
                
                if let firstOutputName = allOutputs.first,
                   let outputFeature = prediction.featureValue(for: firstOutputName),
                   let buffer = outputFeature.imageBufferValue {
                    outputBuffer = buffer
                    CAPLog.print("✅ Using first available output: \(firstOutputName)")
                } else {
                    CAPLog.print("❌ U²‑Net output not found")
                    return nil
                }
            }
            
            // Scale mask back to original image size
            guard let scaledMask = scalePixelBuffer(maskBuffer, to: CGSize(width: Int(originalWidth), height: Int(originalHeight))) else {
                CAPLog.print("❌ Failed to scale mask to original size")
                return nil
            }
            
            // Refine mask edges for smoother results
            CAPLog.print("✨ Refining mask edges...")
            return refineMaskEdges(scaledMask)
            
        } catch {
            CAPLog.print("❌ U²‑Net prediction failed: \(error.localizedDescription)")
            if let nsError = error as NSError? {
                CAPLog.print("Error domain: \(nsError.domain), code: \(nsError.code)")
            }
            return nil
        }
    }
    
    /// Convert CGImage to CVPixelBuffer for CoreML input (normalized 0-1, RGB)
    private func imageToPixelBufferForCoreML(_ image: CGImage, width: Int, height: Int) -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        
        // Create pixel buffer with RGB format (CoreML typically expects RGB)
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32BGRA, // BGRA format
            [kCVPixelBufferCGImageCompatibilityKey: true,
             kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary,
            &pixelBuffer
        )
        
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }
        
        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
        
        let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        )
        
        context?.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        return buffer
    }
    
    /// Resize CGImage to specified size
    private func resizeImage(_ image: CGImage, to size: CGSize) -> CGImage? {
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let context = CGContext(
            data: nil,
            width: Int(size.width),
            height: Int(size.height),
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }
        
        context.interpolationQuality = .high
        context.draw(image, in: CGRect(origin: .zero, size: size))
        
        return context.makeImage()
    }
    
    // MARK: - Mask Refinement
    
    /// Refine mask edges for smoother, more natural results
    /// Applies Gaussian blur and morphological operations
    private func refineMaskEdges(_ mask: CVPixelBuffer) -> CVPixelBuffer? {
        let ciMask = CIImage(cvPixelBuffer: mask)
        
        // Step 1: Apply Gaussian blur to soften edges
        let blurFilter = CIFilter.gaussianBlur()
        blurFilter.inputImage = ciMask
        blurFilter.radius = 2.0  // Soft blur for edge smoothing
        
        guard let blurredMask = blurFilter.outputImage else {
            CAPLog.print("⚠️ Failed to apply Gaussian blur to mask")
            return mask  // Return original if blur fails
        }
        
        // Step 2: Apply morphological closing (dilation + erosion) to fill small holes
        // This helps smooth out jagged edges
        let morphFilter = CIFilter.morphologyRectangleMaximum()
        morphFilter.inputImage = blurredMask
        morphFilter.width = 3.0
        morphFilter.height = 3.0
        
        guard let dilatedMask = morphFilter.outputImage else {
            CAPLog.print("⚠️ Failed to apply morphological dilation")
            // Try to render blurred mask directly
            return renderCIImageToPixelBuffer(blurredMask, size: CGSize(
                width: CVPixelBufferGetWidth(mask),
                height: CVPixelBufferGetHeight(mask)
            ))
        }
        
        // Step 3: Apply erosion to shrink back slightly (closing operation)
        let erosionFilter = CIFilter.morphologyRectangleMinimum()
        erosionFilter.inputImage = dilatedMask
        erosionFilter.width = 2.0
        erosionFilter.height = 2.0
        
        guard let refinedMask = erosionFilter.outputImage else {
            CAPLog.print("⚠️ Failed to apply morphological erosion")
            return renderCIImageToPixelBuffer(dilatedMask, size: CGSize(
                width: CVPixelBufferGetWidth(mask),
                height: CVPixelBufferGetHeight(mask)
            ))
        }
        
        // Step 4: Render refined mask back to CVPixelBuffer
        return renderCIImageToPixelBuffer(refinedMask, size: CGSize(
            width: CVPixelBufferGetWidth(mask),
            height: CVPixelBufferGetHeight(mask)
        ))
    }
    
    /// Render CIImage to CVPixelBuffer
    private func renderCIImageToPixelBuffer(_ ciImage: CIImage, size: CGSize) -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            Int(size.width),
            Int(size.height),
            kCVPixelFormatType_OneComponent8, // Single channel for mask
            nil,
            &pixelBuffer
        )
        
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }
        
        let context = CIContext(options: [.useSoftwareRenderer: false])
        context.render(ciImage, to: buffer)
        
        return buffer
    }
    
    /// Scale CVPixelBuffer to new size
    private func scalePixelBuffer(_ buffer: CVPixelBuffer, to size: CGSize) -> CVPixelBuffer? {
        let ciImage = CIImage(cvPixelBuffer: buffer)
        let scaleX = size.width / CGFloat(CVPixelBufferGetWidth(buffer))
        let scaleY = size.height / CGFloat(CVPixelBufferGetHeight(buffer))
        
        let scaledImage = ciImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        var outputBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            Int(size.width),
            Int(size.height),
            kCVPixelFormatType_OneComponent8,
            nil,
            &outputBuffer
        )
        
        guard status == kCVReturnSuccess, let output = outputBuffer else {
            return nil
        }
        
        let context = CIContext()
        context.render(scaledImage, to: output)
        
        return output
    }
    
    // MARK: - iOS 15-16 Support (Person Segmentation Only)
    
    @available(iOS 15.0, *)
    private func processImageIOS15(cgImage: CGImage, originalBase64: String, call: CAPPluginCall) {
        var failureLogs: [String] = []
        
        CAPLog.print("🔍 Using person segmentation (iOS 15-16)...")
        showStatusAlert(title: "Processing Image", message: "Trying person segmentation...")
        
        if let rawPersonMask = tryPersonSegmentation(cgImage: cgImage) {
            CAPLog.print("✅ Person segmentation succeeded!")
            
            // Refine mask edges
            CAPLog.print("✨ Refining person segmentation mask edges...")
            let personMask = refineMaskEdges(rawPersonMask) ?? rawPersonMask
            
            if let maskedImage = self.applyMask(mask: personMask, to: cgImage),
               let pngData = maskedImage.pngData() {
                let base64Result = pngData.base64EncodedString()
                
                DispatchQueue.main.async {
                    self.showSuccessAlert(title: "Success!", message: "Background removed using person segmentation")
                    call.resolve([
                        "imageData": "data:image/png;base64," + base64Result,
                        "success": true
                    ])
                }
                return
            } else {
                failureLogs.append("❌ Person Segmentation: Failed to apply mask")
            }
        } else {
            failureLogs.append("❌ Person Segmentation: No person detected in image")
        }
        
        // Also try U²‑Net if available
        showStatusAlert(title: "Processing Image", message: "Trying U²‑Net CoreML...")
        
        if let u2netMask = tryU2NetBackgroundRemoval(cgImage: cgImage) {
            CAPLog.print("✅ U²‑Net succeeded!")
            
            if let maskedImage = self.applyMask(mask: u2netMask, to: cgImage),
               let pngData = maskedImage.pngData() {
                let base64Result = pngData.base64EncodedString()
                
                DispatchQueue.main.async {
                    self.showSuccessAlert(title: "Success!", message: "Background removed using U²‑Net CoreML")
                    call.resolve([
                        "imageData": "data:image/png;base64," + base64Result,
                        "success": true
                    ])
                }
                return
            } else {
                failureLogs.append("❌ U²‑Net: Failed to apply mask")
            }
        } else {
            failureLogs.append("❌ U²‑Net: Model not available or prediction failed")
        }
        
        // All methods failed
        CAPLog.print("❌ Background removal failed on iOS 15-16")
        let detailedError = failureLogs.joined(separator: "\n")
        CAPLog.print("📋 Failure details:\n\(detailedError)")
        
        DispatchQueue.main.async {
            self.showFailureAlert(
                title: "Background Removal Failed",
                message: "All methods failed. Using original image.",
                details: detailedError
            )
            call.resolve([
                "imageData": originalBase64,
                "success": false,
                "error": "Background removal failed. On iOS 15-16, this works best with photos containing people. For flat clothing items, iOS 17+ or U²‑Net model is recommended.",
                "failureLogs": failureLogs
            ])
        }
    }
    
    // MARK: - Mask Application
    
    @available(iOS 15.0, *)
    private func applyMask(mask: CVPixelBuffer, to cgImage: CGImage) -> UIImage? {
        let ciImage = CIImage(cgImage: cgImage)
        let maskImage = CIImage(cvPixelBuffer: mask)
        
        // Scale mask to match original image size exactly
        let imageExtent = ciImage.extent
        let maskExtent = maskImage.extent
        
        let scaleX = imageExtent.width / maskExtent.width
        let scaleY = imageExtent.height / maskExtent.height
        
        // Transform mask to match image size
        let scaledMask = maskImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        // Use the cleaner blendWithMask API (matches article's approach)
        let filter = CIFilter.blendWithMask()
        filter.inputImage = ciImage
        filter.maskImage = scaledMask
        filter.backgroundImage = CIImage.empty()  // Transparent background
        
        guard let outputImage = filter.outputImage else {
            CAPLog.print("❌ Failed to create output image from blend filter")
            return nil
        }
        
        // Create a CIContext for rendering
        let context = CIContext(options: [.useSoftwareRenderer: false])
        
        // Render the result
        guard let finalCGImage = context.createCGImage(outputImage, from: imageExtent) else {
            CAPLog.print("❌ Failed to create CGImage from output")
            return nil
        }
        
        return UIImage(cgImage: finalCGImage)
    }
}
