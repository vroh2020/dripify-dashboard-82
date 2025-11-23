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
        
        // Create Vision request for person segmentation
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .balanced // Options: .fast, .balanced, .accurate
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        
        let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
        
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
                
                guard let result = request.results?.first else {
                    call.reject("No segmentation result")
                    return
                }
                
                // Get the mask
                let maskPixelBuffer = result.pixelBuffer
                let maskCIImage = CIImage(cvPixelBuffer: maskPixelBuffer)
                
                // Scale mask to match input image size
                let scaleX = ciImage.extent.width / maskCIImage.extent.width
                let scaleY = ciImage.extent.height / maskCIImage.extent.height
                let scaledMask = maskCIImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
                
                // Apply mask to original image
                let blendFilter = CIFilter(name: "CIBlendWithMask")!
                blendFilter.setValue(ciImage, forKey: kCIInputImageKey)
                blendFilter.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
                blendFilter.setValue(scaledMask, forKey: kCIInputMaskImageKey)
                
                guard let outputImage = blendFilter.outputImage else {
                    call.reject("Failed to apply mask")
                    return
                }
                
                // Convert to PNG with transparency
                let context = CIContext()
                guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
                    call.reject("Failed to create CGImage")
                    return
                }
                
                let resultImage = UIImage(cgImage: cgImage)
                guard let pngData = resultImage.pngData() else {
                    call.reject("Failed to create PNG data")
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
                call.reject("Background removal failed: \(error.localizedDescription)")
            }
        }
    }
}

