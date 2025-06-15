
import { useEffect } from 'react';
import { useSession } from './useSession';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const usePendingOnboarding = () => {
  const { user } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    const processPendingOnboarding = async () => {
      if (!user) return;

      const pendingData = localStorage.getItem('pendingOnboardingData');
      if (!pendingData) return;

      try {
        const data = JSON.parse(pendingData);
        console.log('Processing pending onboarding data:', data);

        // Save to user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            age_range: data.age,
            main_goal: data.mainGoal,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error saving pending profile data:', profileError);
        } else {
          console.log('Pending profile data saved successfully');
          
          // Save analysis if available
          if (data.analysisResult?.overallScore) {
            const { error: analysisError } = await supabase
              .from('style_analyses')
              .insert({
                user_id: user.id,
                total_score: data.analysisResult.overallScore,
                breakdown: JSON.stringify(data.analysisResult.breakdown || []),
                feedback: data.analysisResult.summary || "Welcome analysis!",
                tips: JSON.stringify(data.analysisResult.tips || []),
                raw_analysis: data.analysisResult.rawAnalysis || "Onboarding analysis"
              });
            
            if (analysisError) {
              console.error('Error saving pending analysis:', analysisError);
            }
          }

          // Clear pending data
          localStorage.removeItem('pendingOnboardingData');
          
          toast({
            title: "Profile Updated! 🎉",
            description: "Your onboarding preferences have been saved."
          });
        }

      } catch (error) {
        console.error('Error processing pending onboarding:', error);
        localStorage.removeItem('pendingOnboardingData');
      }
    };

    processPendingOnboarding();
  }, [user, toast]);
};
