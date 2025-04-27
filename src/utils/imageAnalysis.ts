
import { supabase } from '@/integrations/supabase/client';
import { useScanStore } from '@/store/scanStore';
import type { StyleAnalysisResult } from '@/types/styleTypes';
import { parseAnalysis } from '@/utils/analysisParser';

// Maximum size for image uploads (in bytes) - 3MB
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
// Maximum image dimension for processing
const MAX_IMAGE_DIMENSION = 1800;

export const analyzeStyle = async (imageFile: File): Promise<StyleAnalysisResult> => {
  try {
    console.log('Starting style analysis with file size:', Math.round(imageFile.size / 1024), 'KB');
    
    // Optimize image before uploading if needed
    const optimizedImage = await optimizeImage(imageFile);
    console.log('Image optimized. New size:', Math.round(optimizedImage.size / 1024), 'KB');
    
    // Convert image to base64
    const base64Image = await fileToBase64(optimizedImage);
    
    console.log('Starting style analysis API call...');
    const startTime = performance.now();
    
    // Call the analyze-style Supabase function
    const { data, error } = await supabase.functions.invoke('analyze-style', {
      body: { image: base64Image, style: "casual" }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error('Failed to analyze image: ' + error.message);
    }

    const endTime = performance.now();
    console.log(`Analysis completed in ${Math.round(endTime - startTime)}ms`);
    console.log('Analysis response:', data);
    
    if (!data || !data.feedback) {
      throw new Error('Invalid response format from AI service');
    }
    
    // Parse the analysis results
    const analysisData = parseAnalysis(data.feedback);
    
    // Make sure we have a valid overall score
    if (analysisData.overallScore === undefined) {
      console.error('Failed to extract a valid overall score from the analysis');
      // Set a default score of 5 if no score could be extracted
      analysisData.overallScore = 5;
    }
    
    // Upload image to Supabase Storage
    const imageUrl = await uploadImageToSupabase(optimizedImage);
    console.log('Image uploaded to Supabase:', imageUrl);
    
    // Get user info for database save
    const { data: userData } = await supabase.auth.getUser();
    
    // Save analysis to database if user is logged in and we have a valid score
    if (userData && userData.user && analysisData.overallScore !== undefined) {
      const dbAnalysisData = {
        user_id: userData.user.id,
        total_score: analysisData.overallScore,
        raw_analysis: data.feedback,
        feedback: analysisData.summary || data.feedback.substring(0, 200) + '...',
        breakdown: JSON.stringify(analysisData.breakdown || []),
        tips: JSON.stringify(analysisData.tips || []),
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        scan_date: new Date().toISOString(),
      };
      
      try {
        const { error: insertError } = await supabase
          .from('style_analyses')
          .insert(dbAnalysisData);
          
        if (insertError) {
          console.error('Error saving analysis to database:', insertError);
        } else {
          console.log('Analysis saved to database successfully');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }
    
    // Create the result object
    const result: StyleAnalysisResult = {
      overallScore: analysisData.overallScore,
      rawAnalysis: data.feedback,
      imageUrl,
      breakdown: analysisData.breakdown || [],
      tips: analysisData.tips || [],
      summary: analysisData.summary
    };
    
    // Update the scan store with the new analysis
    const store = useScanStore.getState();
    store.setLatestScan(result);
    
    return result;
  } catch (error) {
    console.error('Error analyzing style:', error);
    throw error;
  }
};

// Optimize image before uploading - resize and compress if needed
const optimizeImage = async (imageFile: File): Promise<File> => {
  // If image is already small enough, return as is
  if (imageFile.size <= MAX_IMAGE_SIZE) {
    return imageFile;
  }
  
  try {
    console.log('Image needs optimization');
    const image = await createImageBitmap(imageFile);
    
    // Calculate new dimensions while maintaining aspect ratio
    let width = image.width;
    let height = image.height;
    
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }
    
    // Create a canvas to draw the resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return imageFile;
    }
    
    // Draw the image on the canvas with the new dimensions
    ctx.drawImage(image, 0, 0, width, height);
    
    // Convert the canvas to a blob with compression
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob || new Blob()),
        'image/jpeg',
        0.85 // compression quality
      );
    });
    
    // Create a new file from the blob
    const optimizedFile = new File([blob], imageFile.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    
    console.log('Original size:', Math.round(imageFile.size / 1024), 'KB');
    console.log('Optimized size:', Math.round(optimizedFile.size / 1024), 'KB');
    
    return optimizedFile;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return imageFile; // Return original on error
  }
};

// Upload image to Supabase Storage
const uploadImageToSupabase = async (imageFile: File): Promise<string> => {
  try {
    const timestamp = new Date().getTime();
    const filePath = `outfit_${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('style_images')
      .upload(filePath, imageFile);
      
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload image to storage');
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('style_images')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

// Optimized fileToBase64 function
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};
