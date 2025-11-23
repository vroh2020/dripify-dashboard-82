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
            // Return original image for older iOS versions
            if let base64Image = call.getString("image") {
                call.resolve(["image": base64Image, "success": false])
            } else {
                call.reject("Image data is required")
            }
            return
        }
        
        guard let base64Image = call.getString("image") else {
            call.reject("Image data is required")
            return
        }
        
        // Parse base64 image
        let imageData: Data
        if base64Image.hasPrefix("data:image") {
            let base64String = base64Image.components(separatedBy: ",").last ?? base64Image
            guard let data = Data(base64Encoded: base64String) else {
                call.reject("Invalid base64 image data")
                return
            }
            imageData = data
        } else {
            guard let data = Data(base64Encoded: base64Image) else {
                call.reject("Invalid base64 image data")
                return
            }
            imageData = data
        }
        
        guard let inputImage = UIImage(data: imageData) else {
            call.reject("Failed to create image from data")
            return
        }
        
        guard let cgImage = inputImage.cgImage else {
            call.reject("Failed to get CGImage")
            return
        }
        
        // Process on background thread
        DispatchQueue.global(qos: .userInitiated).async {
            self.processImage(cgImage: cgImage, originalBase64: base64Image, call: call)
        }
    }
    
    @available(iOS 17.0, *)
    private func processImage(cgImage: CGImage, originalBase64: String, call: CAPPluginCall) {
        // Create Vision request for foreground object detection
        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        do {
            try handler.perform([request])
            
            guard let result = request.results?.first else {
                // No object detected, return original
                DispatchQueue.main.async {
                    call.resolve(["image": originalBase64, "success": false])
                }
                return
            }
            
            // Generate scaled mask
            let mask = try result.generateScaledMaskForImage(
                forInstances: result.allInstances,
                from: handler
            )
            
            // Apply mask to original image
            let maskedImage = self.applyMask(mask: mask, to: cgImage)
            
            // Convert to PNG with transparency
            guard let pngData = maskedImage.pngData() else {
                DispatchQueue.main.async {
                    call.resolve(["image": originalBase64, "success": false])
                }
                return
            }
            
            let base64Result = pngData.base64EncodedString()
            
            DispatchQueue.main.async {
                call.resolve([
                    "image": "data:image/png;base64," + base64Result,
                    "success": true
                ])
            }
            
        } catch {
            DispatchQueue.main.async {
                call.resolve(["image": originalBase64, "success": false])
            }
        }
    }
    
    @available(iOS 17.0, *)
    private func applyMask(mask: CVPixelBuffer, to cgImage: CGImage) -> UIImage {
        let ciImage = CIImage(cgImage: cgImage)
        let maskImage = CIImage(cvPixelBuffer: mask)
        
        // Scale mask to match original image size
        let scaleX = ciImage.extent.width / maskImage.extent.width
        let scaleY = ciImage.extent.height / maskImage.extent.height
        let scaledMask = maskImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        // Apply mask using CIBlendWithMask filter
        guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
            return UIImage(cgImage: cgImage)
        }
        
        blendFilter.setValue(ciImage, forKey: kCIInputImageKey)
        blendFilter.setValue(scaledMask, forKey: kCIInputMaskImageKey)
        blendFilter.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
        
        guard let outputImage = blendFilter.outputImage else {
            return UIImage(cgImage: cgImage)
        }
        
        // Render the result
        let context = CIContext()
        guard let finalCGImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return UIImage(cgImage: cgImage)
        }
        
        return UIImage(cgImage: finalCGImage)
    }
}
