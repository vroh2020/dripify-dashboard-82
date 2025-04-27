
import { supabase } from '@/integrations/supabase/client';
import { useScanStore } from '@/store/scanStore';
import type { StyleAnalysisResult } from '@/types/styleTypes';
import { parseAnalysis } from '@/utils/analysisParser';

// Upload image to Supabase Storage
const uploadImageToSupabase = async (imageFile: File): Promise<string> => {
  try {
    const timestamp = new Date().getTime();
    const filePath = `outfit_${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
    
    console.log('Attempting to upload image to style_images bucket:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('style_images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload image to storage');
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('style_images')
      .getPublicUrl(filePath);
      
    console.log('Image uploaded successfully, public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

export const analyzeStyle = async (imageFile: File): Promise<StyleAnalysisResult> => {
  try {
    // First check if user has scans remaining
    const { data: userData } = await supabase.auth.getUser();
    
    if (userData && userData.user) {
      // Check remaining scans directly from the database
      const { data: scanCountData, error: scanCountError } = await supabase.rpc(
        'get_daily_scan_count',
        { _user_id: userData.user.id }
      );
      
      if (!scanCountError && scanCountData >= 3) {
        throw new Error('Daily scan limit (3) exceeded for today');
      }
    }
    
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    console.log('Starting style analysis...');
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
    const imageUrl = await uploadImageToSupabase(imageFile);
    console.log('Image uploaded to Supabase:', imageUrl);
    
    // Get user info for database save
    const { data: currentUserData } = await supabase.auth.getUser();
    
    // Save analysis to database if user is logged in and we have a valid score
    if (currentUserData && currentUserData.user && analysisData.overallScore !== undefined) {
      const dbAnalysisData = {
        user_id: currentUserData.user.id,
        total_score: analysisData.overallScore,
        raw_analysis: data.feedback,
        feedback: analysisData.summary || data.feedback.substring(0, 200) + '...',
        breakdown: JSON.stringify(analysisData.breakdown || []),
        tips: JSON.stringify(analysisData.tips || []),
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        scan_date: new Date().toISOString(), // Use ISO string for consistent timezone handling
      };
      
      try {
        const { error: insertError } = await supabase
          .from('style_analyses')
          .insert(dbAnalysisData);
          
        if (insertError) {
          if (insertError.message.includes('limit')) {
            throw new Error('Daily scan limit (3) exceeded');
          }
          console.error('Error saving analysis to database:', insertError);
        } else {
          console.log('Analysis saved to database successfully');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        if (dbError instanceof Error && dbError.message.includes('limit')) {
          throw dbError; // Rethrow limit errors
        }
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

// Convert file to base64 - optimized for speed
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
