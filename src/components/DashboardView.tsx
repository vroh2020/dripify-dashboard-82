import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Card, CardContent } from "./ui/card";
import { Camera, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { StyleStats } from "./dashboard/StyleStats";
import { StyleAnalysesList } from "./dashboard/StyleAnalysesList";
import { QuickStartSection } from "./dashboard/QuickStartSection";
import { StyleAnalysis, ScoreBreakdown, StyleTip } from "@/types/styleTypes";

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

  const fetchAnalyses = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // User not authenticated, but don't redirect here since Index.tsx handles it
        // Just show empty state
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

          // Handle tips parsing with proper type checking
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
      toast({
        title: "Error loading analyses",
        description: "Failed to load your style analyses.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalyses();

    // DISABLED: Real-time subscription for performance optimization
    // This was one of 3 duplicate subscriptions causing 94.8% of DB load
    /*
    const subscription = supabase
      .channel('style_analyses_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'style_analyses' 
        }, 
        () => {
          fetchAnalyses();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    */
  }, [navigate, toast, fetchAnalyses]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account."
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "An error occurred while signing out.",
        variant: "destructive"
      });
    }
  };

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
      className="w-full max-w-md mx-auto px-4 pb-20 pt-4"
    >
        <DashboardHeader 
          hasScans={hasScans} 
          totalScans={stats.totalScans} 
        />

        {!hasScans ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6"
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Getting Started</h3>
                  </div>
                </div>
                <p className="text-white/70 mb-6 leading-relaxed">
                  Welcome to Drip Max! Take your first style scan to get personalized fashion insights and start building your style streak.
                </p>
                <Button 
                  onClick={() => navigate('/scan')} 
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-3 h-auto transition-all duration-200 group min-h-[44px]"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Your First Scan
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </motion.div>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Stats Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <StyleStats hasScans={hasScans} stats={stats} />
            </motion.div>

            {/* Recent Analyses */}
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
