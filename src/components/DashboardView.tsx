
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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

  const fetchAnalyses = async () => {
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
  };

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
  }, [navigate, toast]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 px-4 pb-20 max-w-2xl mx-auto"
    >
      <DashboardHeader 
        hasScans={hasScans} 
        totalScans={stats.totalScans} 
      />

      {!hasScans ? (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-6 bg-slate-900/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-slate-50">Getting Started</h3>
              </div>
              <Button 
                onClick={() => navigate('/scan')} 
                className="bg-purple-500 hover:bg-purple-600 transition-colors group rounded"
              >
                <Camera className="w-4 h-4 mr-2" />
                New Scan
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                </motion.div>
              </Button>
            </div>
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  1
                </div>
                <p className="text-white/80">Take a photo of your outfit</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  2
                </div>
                <p className="text-white/80">Get instant style feedback</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  3
                </div>
                <p className="text-white/80">Build your style profile</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <StyleStats hasScans={hasScans} stats={stats} />

      {hasScans && (
        <>
          <StyleAnalysesList analyses={analyses} />
          <QuickStartSection />
        </>
      )}
    </motion.div>
  );
};
