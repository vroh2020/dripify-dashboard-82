
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  averageScore: number;
  streak: number;
  totalScans: number;
  bestScore: number;
}

type StatsState = {
  stats: UserStats;
  fetchUserStats: (userId?: string) => Promise<void>;
};

export const useStatsStore = create<StatsState>((set) => ({
  stats: {
    averageScore: 0,
    streak: 0,
    totalScans: 0,
    bestScore: 0
  },
  fetchUserStats: async (userId?: string) => {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
      }

      // Get all analyses for the user
      const { data: analyses } = await supabase
        .from('style_analyses')
        .select('total_score, streak_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (analyses && analyses.length > 0) {
        // Calculate average score
        const totalScore = analyses.reduce((sum, analysis) => sum + analysis.total_score, 0);
        const averageScore = Math.round((totalScore / analyses.length) * 10) / 10;

        // Get best score
        const bestScore = Math.max(...analyses.map(a => a.total_score));

        // Get current streak
        const currentStreak = analyses[0]?.streak_count || 0;

        set({
          stats: {
            averageScore,
            streak: currentStreak,
            totalScans: analyses.length,
            bestScore
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }
}));
