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
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('style_images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      Logger.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload image to storage');
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

export const analyzeStyle = async (imageFile: File): Promise<StyleAnalysisResult> => {
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
    
    const imageUrl = await uploadImageToSupabase(imageFile);
    Logger.info('Image uploaded to Supabase:', imageUrl);
    
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
    
    const result: StyleAnalysisResult = {
      overallScore: analysisData.overallScore,
      rawAnalysis: data.feedback,
      imageUrl,
      breakdown: analysisData.breakdown || [],
      tips: analysisData.tips || [],
      summary: analysisData.summary
    };
    
    const store = useScanStore.getState();
    store.setLatestScan(result);
    
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
