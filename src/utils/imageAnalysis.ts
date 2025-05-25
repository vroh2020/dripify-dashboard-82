import { supabase } from '@/integrations/supabase/client';
import { useScanStore } from '@/store/scanStore';
import type { StyleAnalysisResult } from '@/types/styleTypes';
import { parseAnalysis } from '@/utils/analysisParser';
import Logger from '@/utils/logger';

const uploadImageToSupabase = async (imageFile: File): Promise<string> => {
  try {
    const timestamp = new Date().getTime();
    const filePath = `outfit_${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
    
    Logger.debug('Attempting to upload image:', filePath);
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('style_images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      Logger.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload image to storage: ' + uploadError.message);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('style_images')
      .getPublicUrl(filePath);
      
    Logger.info('Image upload successful');
    return publicUrl;
  } catch (error) {
    Logger.error('Image upload error:', error);
    throw error;
  }
};

export const analyzeStyle = async (imageFile: File, isOnboarding = false): Promise<StyleAnalysisResult> => {
  try {
    const base64Image = await fileToBase64(imageFile);
    
    Logger.info('Starting style analysis...');
    const startTime = performance.now();
    
    const { data, error } = await supabase.functions.invoke('analyze-style', {
      body: { image: base64Image, style: "casual" }
    });

    if (error) {
      Logger.error('Supabase function error:', error);
      throw new Error('Failed to analyze image: ' + error.message);
    }

    const endTime = performance.now();
    Logger.debug(`Analysis completed in ${Math.round(endTime - startTime)}ms`);
    
    if (!data || !data.feedback) {
      throw new Error('Invalid response format from AI service');
    }
    
    const analysisData = parseAnalysis(data.feedback);
    
    if (analysisData.overallScore === undefined) {
      Logger.error('Failed to extract a valid overall score from the analysis');
      analysisData.overallScore = 5;
    }
    
    // Handle image URL based on context
    let imageUrl = '';
    if (isOnboarding) {
      // For onboarding, use local URL to avoid auth issues
      imageUrl = URL.createObjectURL(imageFile);
      Logger.info('Using local URL for onboarding');
    } else {
      // For regular app usage, try to upload to Supabase
      try {
        imageUrl = await uploadImageToSupabase(imageFile);
        Logger.info('Image uploaded to Supabase:', imageUrl);
      } catch (uploadError) {
        // If upload fails, create a local URL as fallback
        Logger.warn('Image upload failed, using local URL:', uploadError);
        imageUrl = URL.createObjectURL(imageFile);
      }
    }
    
    // Only save to database if user is authenticated and not in onboarding
    if (!isOnboarding) {
      const { data: userData } = await supabase.auth.getUser();
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
            Logger.error('Error saving analysis to database:', insertError);
          } else {
            Logger.info('Analysis saved to database successfully');
          }
        } catch (dbError) {
          Logger.error('Database error:', dbError);
        }
      }
    }

    const result: StyleAnalysisResult = {
      overallScore: analysisData.overallScore,
      rawAnalysis: data.feedback,
      imageUrl,
      breakdown: analysisData.breakdown || [],
      tips: analysisData.tips || [],
      summary: analysisData.summary
    };
    
    if (!isOnboarding) {
      const store = useScanStore.getState();
      store.setLatestScan(result);
    }
    
    return result;
  } catch (error) {
    Logger.error('Error analyzing style:', error);
    throw error;
  }
};

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

// Special function for onboarding that doesn't require authentication
export const analyzeStyleForOnboarding = async (imageFile: File): Promise<StyleAnalysisResult> => {
  try {
    Logger.info('Starting onboarding style analysis...');
    
    // Create local URL for the image
    const imageUrl = URL.createObjectURL(imageFile);
    
    // Return mock analysis data for onboarding
    const result: StyleAnalysisResult = {
      overallScore: 86,
      rawAnalysis: "This outfit demonstrates excellent style coordination with professional appeal. The color choices work harmoniously together, and the overall fit appears well-tailored. The styling shows attention to detail and creates a polished, confident look.",
      imageUrl,
      summary: "This outfit is well-put-together, with a professional yet approachable style. The coordination creates a harmonious look with great attention to detail. To elevate it further, consider adding subtle accessories.",
      breakdown: [
        { category: "Color Coordination", score: 85, emoji: "🎨" },
        { category: "Fit & Silhouette", score: 88, emoji: "👔" },
        { category: "Style Cohesion", score: 84, emoji: "✨" },
        { category: "Occasion Appropriateness", score: 90, emoji: "🎯" }
      ],
      tips: [
        { category: "Accessories", tip: "Consider adding a subtle accessory like a watch or pocket square", level: "beginner" },
        { category: "Color", tip: "The color combination works beautifully together", level: "intermediate" },
        { category: "Fit", tip: "Great fit on the garments - well-tailored", level: "beginner" }
      ]
    };
    
    Logger.info('Onboarding analysis completed successfully');
    return result;
  } catch (error) {
    Logger.error('Error in onboarding style analysis:', error);
    
    // Even if there's an error, return mock data for onboarding
    return {
      overallScore: 86,
      rawAnalysis: "This outfit demonstrates excellent style coordination with professional appeal. The color choices work harmoniously together, and the overall fit appears well-tailored. The styling shows attention to detail and creates a polished, confident look.",
      imageUrl: URL.createObjectURL(imageFile),
      summary: "This outfit is well-put-together, with a professional yet approachable style. The coordination creates a harmonious look with great attention to detail. To elevate it further, consider adding subtle accessories.",
      breakdown: [
        { category: "Color Coordination", score: 85, emoji: "🎨" },
        { category: "Fit & Silhouette", score: 88, emoji: "👔" },
        { category: "Style Cohesion", score: 84, emoji: "✨" },
        { category: "Occasion Appropriateness", score: 90, emoji: "🎯" }
      ],
      tips: [
        { category: "Accessories", tip: "Consider adding a subtle accessory like a watch or pocket square", level: "beginner" },
        { category: "Color", tip: "The color combination works beautifully together", level: "intermediate" },
        { category: "Fit", tip: "Great fit on the garments - well-tailored", level: "beginner" }
      ]
    };
  }
};
