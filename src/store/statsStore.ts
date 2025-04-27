
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface UserStats {
  averageScore: number;
  streak: number;
  totalScans: number;
  bestScore: number;
  bestCategory: string;
  lastScan: string;
  improvedCategories: number;
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
    bestScore: 0,
    bestCategory: 'N/A',
    lastScan: 'No scans yet',
    improvedCategories: 0
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
        .select('total_score, breakdown, created_at, streak_count, scan_date')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!analyses || analyses.length === 0) return;

      // Calculate average score
      const totalScore = analyses.reduce((sum, analysis) => sum + analysis.total_score, 0);
      const averageScore = Math.round((totalScore / analyses.length) * 10) / 10;

      // Get best score
      const bestScore = Math.max(...analyses.map(a => a.total_score));

      // Get current streak
      const currentStreak = analyses[0]?.streak_count || 0;

      // Calculate best category
      const categoryScores: Record<string, { total: number; count: number }> = {};
      analyses.forEach(analysis => {
        if (analysis.breakdown && typeof analysis.breakdown === 'object') {
          const breakdown = Array.isArray(analysis.breakdown) 
            ? analysis.breakdown 
            : JSON.parse(analysis.breakdown as string);
          
          breakdown.forEach((item: { category: string; score: number }) => {
            if (!categoryScores[item.category]) {
              categoryScores[item.category] = { total: 0, count: 0 };
            }
            categoryScores[item.category].total += item.score;
            categoryScores[item.category].count += 1;
          });
        }
      });

      let bestCategory = 'N/A';
      let highestAverage = 0;
      Object.entries(categoryScores).forEach(([category, data]) => {
        const average = data.total / data.count;
        if (average > highestAverage) {
          highestAverage = average;
          bestCategory = category;
        }
      });

      // Calculate improved categories
      let improvedCategories = 0;
      if (analyses.length >= 2) {
        const oldestAnalysis = analyses[analyses.length - 1];
        const newestAnalysis = analyses[0];
        
        if (oldestAnalysis.breakdown && newestAnalysis.breakdown) {
          const oldBreakdown = Array.isArray(oldestAnalysis.breakdown) 
            ? oldestAnalysis.breakdown 
            : JSON.parse(oldestAnalysis.breakdown as string);
          
          const newBreakdown = Array.isArray(newestAnalysis.breakdown) 
            ? newestAnalysis.breakdown 
            : JSON.parse(newestAnalysis.breakdown as string);
          
          const oldScores: Record<string, number> = {};
          oldBreakdown.forEach((item: { category: string; score: number }) => {
            oldScores[item.category] = item.score;
          });
          
          newBreakdown.forEach((item: { category: string; score: number }) => {
            if (oldScores[item.category] && item.score > oldScores[item.category]) {
              improvedCategories++;
            }
          });
        }
      }

      // Format last scan time
      const lastScanTime = analyses[0]?.scan_date || analyses[0]?.created_at;
      const lastScan = lastScanTime 
        ? formatDistanceToNow(new Date(lastScanTime), { addSuffix: true })
        : 'No scans yet';

      set({
        stats: {
          averageScore,
          streak: currentStreak,
          totalScans: analyses.length,
          bestScore,
          bestCategory,
          lastScan,
          improvedCategories
        }
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }
}));
