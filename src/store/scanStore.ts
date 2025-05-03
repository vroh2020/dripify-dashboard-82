import { create } from 'zustand';
import type { ScoreBreakdown, StyleTip } from '@/types/styleTypes';

type ScanState = {
  latestScan: {
    overallScore: number;
    rawAnalysis: string;
    imageUrl: string;
    breakdown?: ScoreBreakdown[];
    tips?: StyleTip[];
    summary?: string;
  } | null;
  setLatestScan: (scan: {
    overallScore: number;
    rawAnalysis: string;
    imageUrl: string;
    breakdown?: ScoreBreakdown[];
    tips?: StyleTip[];
    summary?: string;
  }) => void;
};

export const useScanStore = create<ScanState>((set) => ({
  latestScan: null,
  setLatestScan: (scan) => set({ latestScan: scan }),
}));
