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
  scanCount: number;
  setLatestScan: (scan: {
    overallScore: number;
    rawAnalysis: string;
    imageUrl: string;
    breakdown?: ScoreBreakdown[];
    tips?: StyleTip[];
    summary?: string;
  }) => void;
  incrementScanCount: () => void;
};

export const useScanStore = create<ScanState>((set) => ({
  latestScan: null,
  scanCount: 0,
  setLatestScan: (scan) => set({ latestScan: scan }),
  incrementScanCount: () => set((state) => ({ scanCount: state.scanCount + 1 })),
}));
