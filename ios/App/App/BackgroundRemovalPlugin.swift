import Foundation
import Capacitor
import Vision
import CoreImage
import UIKit

@objc(BackgroundRemovalPlugin)
public class BackgroundRemovalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundRemovalPlugin"
    public let jsName = "BackgroundRemoval"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "removeBackground", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func removeBackground(_ call: CAPPluginCall) {
        // Check if iOS 17+ (required for VNGenerateForegroundInstanceMaskRequest)
        guard #available(iOS 17.0, *) else {
            let iosVersion = UIDevice.current.systemVersion
            CAPLog.print("⚠️ Background removal requires iOS 17+, current version: \(iosVersion)")
            if let base64Image = call.getString("image") {
                call.resolve([
                    "imageData": base64Image,
                    "success": false,
                    "error": "iOS 17+ required, current: \(iosVersion)"
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
            self.processImage(cgImage: processedCGImage, originalBase64: base64Image, call: call)
        }
    }
    
    @available(iOS 17.0, *)
    private func processImage(cgImage: CGImage, originalBase64: String, call: CAPPluginCall) {
        // Create Vision request for foreground object detection
        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        do {
            CAPLog.print("🔍 Performing Vision analysis for foreground object detection...")
            try handler.perform([request])
            
            // Check if any objects were detected
            guard let result = request.results?.first else {
                CAPLog.print("⚠️ No objects detected in image - Vision couldn't identify foreground objects")
                CAPLog.print("💡 This often happens with flat clothing items or items with similar colors to the background")
                DispatchQueue.main.async {
                    call.resolve([
                        "imageData": originalBase64,
                        "success": false,
                        "error": "No objects detected - Vision couldn't identify foreground items. Try a photo with better contrast between the item and background."
                    ])
                }
                return
            }
            
            let instanceCount = result.allInstances.count
            CAPLog.print("✅ Detected \(instanceCount) foreground instance(s)")
            
            // Generate scaled mask for all detected instances
            let mask: CVPixelBuffer
            do {
                CAPLog.print("🎭 Generating mask for \(instanceCount) instance(s)...")
                // Use the handler's image for mask generation
                mask = try result.generateScaledMaskForImage(
                    forInstances: result.allInstances,
                    from: handler
                )
                CAPLog.print("✅ Mask generated successfully - size: \(CVPixelBufferGetWidth(mask))x\(CVPixelBufferGetHeight(mask))")
            } catch let maskError {
                CAPLog.print("❌ Failed to generate mask: \(maskError.localizedDescription)")
                CAPLog.print("Error type: \(type(of: maskError))")
                DispatchQueue.main.async {
                    call.resolve([
                        "imageData": originalBase64,
                        "success": false,
                        "error": "Failed to generate mask: \(maskError.localizedDescription)"
                    ])
                }
                return
            }
            
            // Apply mask to original image
            CAPLog.print("🎨 Applying mask to image...")
            guard let maskedImage = self.applyMask(mask: mask, to: cgImage) else {
                CAPLog.print("❌ Failed to apply mask to image")
                DispatchQueue.main.async {
                    call.resolve([
                        "imageData": originalBase64,
                        "success": false,
                        "error": "Failed to apply mask to image"
                    ])
                }
                return
            }
            
            // Convert to PNG with transparency
            guard let pngData = maskedImage.pngData() else {
                CAPLog.print("❌ Failed to convert masked image to PNG data")
                DispatchQueue.main.async {
                    call.resolve([
                        "imageData": originalBase64,
                        "success": false,
                        "error": "Failed to convert image to PNG"
                    ])
                }
                return
            }
            
            let base64Result = pngData.base64EncodedString()
            CAPLog.print("✅ Background removal successful! Output size: \(pngData.count) bytes (input was \(originalBase64.count) chars)")
            
            DispatchQueue.main.async {
                call.resolve([
                    "imageData": "data:image/png;base64," + base64Result,
                    "success": true
                ])
            }
            
        } catch let visionError {
            CAPLog.print("❌ Vision analysis failed with error: \(visionError.localizedDescription)")
            CAPLog.print("Error type: \(type(of: visionError))")
            if let nsError = visionError as NSError? {
                CAPLog.print("Error domain: \(nsError.domain), code: \(nsError.code)")
                let userInfo = nsError.userInfo
                if !userInfo.isEmpty {
                    CAPLog.print("Error userInfo: \(userInfo)")
                }
            }
            
            DispatchQueue.main.async {
                call.resolve([
                    "imageData": originalBase64,
                    "success": false,
                    "error": "Vision analysis failed: \(visionError.localizedDescription)"
                ])
            }
        }
    }
    
    @available(iOS 17.0, *)
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
        
        // Create a CIContext for rendering
        let context = CIContext(options: [.useSoftwareRenderer: false])
        
        // Method: Use CIBlendWithMask with transparent background
        // The mask should be white where we want to keep the image, black where we want transparency
        guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
            CAPLog.print("❌ CIBlendWithMask filter not available")
            return nil
        }
        
        // Create a transparent background image
        let transparentBackground = CIImage(color: CIColor.clear).cropped(to: imageExtent)
        
        // Set up the blend filter
        // inputImage: original image (foreground)
        // inputBackgroundImage: transparent background
        // inputMaskImage: mask (white = keep foreground, black = use background/transparent)
        blendFilter.setValue(ciImage, forKey: kCIInputImageKey)
        blendFilter.setValue(transparentBackground, forKey: kCIInputBackgroundImageKey)
        blendFilter.setValue(scaledMask, forKey: kCIInputMaskImageKey)
        
        guard let outputImage = blendFilter.outputImage else {
            CAPLog.print("❌ Failed to create output image from blend filter")
            return nil
        }
        
        // Render the result
        guard let finalCGImage = context.createCGImage(outputImage, from: imageExtent) else {
            CAPLog.print("❌ Failed to create CGImage from output")
            return nil
        }
        
        return UIImage(cgImage: finalCGImage)
    }
}
