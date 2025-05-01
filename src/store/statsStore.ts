
import { create } from 'zustand';

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
      // Fetch stats logic here
      // For now, we'll just set some default values
      set({
        stats: {
          averageScore: 0,
          streak: 0,
          totalScans: 0,
          bestScore: 0
        }
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }
}));
