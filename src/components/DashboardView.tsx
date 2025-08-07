import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Card, CardContent } from "./ui/card";
import { Camera, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { StyleStats } from "./dashboard/StyleStats";
import { StyleAnalysesList } from "./dashboard/StyleAnalysesList";
import { QuickStartSection } from "./dashboard/QuickStartSection";
import { OnboardingCompletionCard } from "./OnboardingCompletionCard";
import { StyleAnalysis, ScoreBreakdown, StyleTip } from "@/types/styleTypes";
import { useAuth } from "@/hooks/useAuth";

export const DashboardView = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<StyleAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageScore: 0,
    streak: 0,
    totalScans: 0,
    bestScore: 0
  });
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Add render counter to prevent infinite loops
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  // Prevent excessive logging
  if (renderCountRef.current <= 3) {
    console.log('🎯 DashboardView rendered:', {
      user: user?.id,
      loading,
      analysesCount: analyses.length,
      renderCount: renderCountRef.current,
      timestamp: new Date().toISOString()
    });
  } else if (renderCountRef.current === 4) {
    console.warn('⚠️ DashboardView rendering too frequently - stopping logs');
  }

  const fetchAnalyses = useCallback(async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('style_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const processedData: StyleAnalysis[] = data.map(analysis => {
          let typedBreakdown: ScoreBreakdown[] = [];
          let typedTips: StyleTip[] = [];
          
          if (analysis.breakdown && typeof analysis.breakdown === 'object') {
            if (Array.isArray(analysis.breakdown)) {
              typedBreakdown = analysis.breakdown as unknown as ScoreBreakdown[];
            } 
            else if (typeof analysis.breakdown === 'string') {
              try {
                typedBreakdown = JSON.parse(analysis.breakdown) as ScoreBreakdown[];
              } catch (e) {
                console.error('Error parsing breakdown JSON:', e);
              }
            }
          }

          if (analysis.tips) {
            if (typeof analysis.tips === 'string') {
              try {
                const parsedTips = JSON.parse(analysis.tips);
                if (Array.isArray(parsedTips)) {
                  typedTips = parsedTips as StyleTip[];
                }
              } catch (e) {
                console.error('Error parsing tips JSON:', e);
              }
            } else if (Array.isArray(analysis.tips)) {
              typedTips = analysis.tips as unknown as StyleTip[];
            }
          }
          
          return {
            ...analysis,
            breakdown: typedBreakdown,
            tips: typedTips,
            image_url: analysis.thumbnail_url || analysis.image_url
          };
        });
        
        setAnalyses(processedData);
        
        const scores = data.map(a => a.total_score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const bestScore = Math.max(...scores);
        const currentStreak = data[0].streak_count || 0;

        setStats({
          averageScore: Math.round(averageScore * 10) / 10,
          streak: currentStreak,
          totalScans: data.length,
          bestScore: bestScore
        });
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
      // Remove toast from dependency array to prevent infinite loops
      if (renderCountRef.current <= 10) {
        toast({
          title: "Error loading analyses",
          description: "Failed to load your style analyses.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]); // Removed toast from dependencies

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const hasScans = analyses.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mx-auto px-4 pb-6 space-y-6"
    >
        {/* Removed onboarding completion card - just let users access dashboard normally */}
        
        {!hasScans ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="relative">
              {/* Subtle floating sparkles background */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                <svg width="100%" height="100%" className="absolute top-0 left-0 opacity-30 animate-pulse" style={{filter: 'blur(2px)'}}>
                  <circle cx="30" cy="40" r="8" fill="#a78bfa" />
                  <circle cx="220" cy="80" r="5" fill="#f472b6" />
                  <circle cx="120" cy="120" r="6" fill="#fbbf24" />
                  <circle cx="80" cy="180" r="4" fill="#38bdf8" />
                  <circle cx="200" cy="160" r="7" fill="#f472b6" />
                </svg>
              </div>
              <Card className="relative z-10 bg-white/10 backdrop-blur-xl border border-purple-400/30 shadow-2xl rounded-3xl p-8 flex flex-col items-center">
                <div className="text-5xl mb-4 animate-bounce">✨</div>
                <h2 className="text-2xl font-extrabold text-white mb-2 text-center drop-shadow-lg">
                  Welcome to OutfitGrader AI!
                </h2>
                <p className="text-base text-white/90 mb-6 text-center max-w-xs">
                  Start your style journey with your first scan.
                </p>
                <Button 
                  onClick={() => navigate('/scan')} 
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-pink-500 hover:to-orange-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <Camera className="w-6 h-6" />
                  Take Your First Scan
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </motion.div>
                </Button>
              </Card>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <StyleStats hasScans={hasScans} stats={stats} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <StyleAnalysesList analyses={analyses} />
            </motion.div>
          </div>
        )}
      </motion.div>
  );
};
