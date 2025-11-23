import Foundation
import Capacitor
import Vision
import CoreImage
import UIKit

@objc(BackgroundRemovalPlugin)
public class BackgroundRemovalPlugin: CAPPlugin {
    
    @objc func removeBackground(_ call: CAPPluginCall) {
        // Check iOS version
        if #available(iOS 15.0, *) {
            removeBackgroundIOS15(call)
        } else {
            // Fall back to returning original image on older iOS
            if let base64Image = call.getString("image") {
                call.resolve(["processedImage": base64Image])
            } else {
                call.reject("Image data is required")
            }
        }
    }
    
    @available(iOS 15.0, *)
    private func removeBackgroundIOS15(_ call: CAPPluginCall) {
        // Check if iOS 17+ for generic object removal
        if #available(iOS 17.0, *) {
            removeBackgroundIOS17(call)
            return
        }
        
        // iOS 15-16: Only supports person segmentation
        // For clothing/objects, just return original image
        if let base64Image = call.getString("image") {
            call.resolve(["image": base64Image, "success": false])
        } else {
            call.reject("Image data is required")
        }
    }
    
    @available(iOS 17.0, *)
    private func removeBackgroundIOS17(_ call: CAPPluginCall) {
        guard let base64Image = call.getString("image") else {
            call.reject("Image data is required")
            return
        }
        
        // Remove data URL prefix if present
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
        
        guard let ciImage = CIImage(image: inputImage) else {
            call.reject("Failed to create CIImage")
            return
        }
        
        // Create Vision request for OBJECT/CLOTHING segmentation (iOS 17+)
        let request = VNGenerateForegroundInstanceMaskRequest()
        request.revision = VNGenerateForegroundInstanceMaskRequestRevision1
        
        let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
        
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
                
                guard let result = request.results?.first else {
                    // No object detected, return original image
                    DispatchQueue.main.async {
                        call.resolve(["image": base64Image, "success": false])
                    }
                    return
                }
                
                // Generate high-resolution mask using the correct method
                let maskPixelBuffer: CVPixelBuffer
                do {
                    maskPixelBuffer = try result.generateScaledMaskForImage(
                        forInstances: result.allInstances,
                        from: handler
                    )
                } catch {
                    DispatchQueue.main.async {
                        call.resolve(["image": base64Image, "success": false])
                    }
                    return
                }
                
                // Convert mask to CIImage
                let maskCIImage = CIImage(cvPixelBuffer: maskPixelBuffer)
                
                // Apply mask to original image using CIBlendWithMask filter (iOS 13+ compatible)
                guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
                    DispatchQueue.main.async {
                        call.resolve(["image": base64Image, "success": false])
                    }
                    return
                }
                blendFilter.setValue(ciImage, forKey: kCIInputImageKey)
                blendFilter.setValue(maskCIImage, forKey: kCIInputMaskImageKey)
                blendFilter.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
                
                guard let outputImage = blendFilter.outputImage else {
                    DispatchQueue.main.async {
                        call.resolve(["image": base64Image, "success": false])
                    }
                    return
                }
                
                // Convert to PNG with transparency
                let context = CIContext()
                guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
                    DispatchQueue.main.async {
                        call.resolve(["image": base64Image, "success": false])
                    }
                    return
                }
                
                let resultImage = UIImage(cgImage: cgImage)
                guard let pngData = resultImage.pngData() else {
                    DispatchQueue.main.async {
                        call.resolve(["image": base64Image, "success": false])
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
                // Error during processing, return original image
                DispatchQueue.main.async {
                    call.resolve(["image": base64Image, "success": false])
                }
            }
        }
    }
}

