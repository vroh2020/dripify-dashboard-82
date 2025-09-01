import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "./ui/card";
import { Camera, ArrowRight, TrendingUp, Calendar, Star, Zap, Target } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StyleAnalysis, ScoreBreakdown, StyleTip } from "@/types/styleTypes";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalScans: number;
  averageScore: number;
  bestScore: number;
  streak: number;
  recentActivity: number;
}

export const DashboardView = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<StyleAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    averageScore: 0,
    bestScore: 0,
    streak: 0,
    recentActivity: 0
  });

  const { user } = useAuth();
  
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

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
        .limit(5);

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
            image_url: analysis.thumbnail_url || analysis.image_url || '',
            raw_analysis: analysis.raw_analysis || ''
          };
        });
        
        setAnalyses(processedData);
        
        const scores = data.map(a => a.total_score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const bestScore = Math.max(...scores);
        const currentStreak = data[0]?.streak_count || 0;

        setStats({
          totalScans: data.length,
          averageScore: Math.round(averageScore * 10) / 10,
          bestScore: bestScore,
          streak: currentStreak,
          recentActivity: data.filter(a => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(a.created_at) > weekAgo;
          }).length
        });
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const hasScans = analyses.length > 0;

  const quickActions = [
    {
      title: "Style Scan",
      description: "Analyze your outfit",
      icon: Camera,
      action: () => navigate('/scan'),
      color: "bg-black"
    },
    {
      title: "My Closet",
      description: "Manage wardrobe",
      icon: Target,
      action: () => navigate('/closet'),
      color: "bg-black"
    },

  ];

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-sm mx-auto space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-black tracking-tight font-['Inter']">Welcome back!</h1>
          <p className="text-gray-600 font-['Inter']">Ready to elevate your style today?</p>
        </motion.div>

        {!hasScans ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <CardContent className="text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-black mb-2 font-['Inter'] tracking-tight">
                  Start Your Style Journey
                </h2>
                <p className="text-gray-600 mb-6 font-['Inter']">
                  Take your first style scan to get personalized insights and recommendations.
                </p>
                <Button
                  onClick={() => navigate('/scan')}
                  className="w-full bg-black hover:bg-gray-800 text-white font-semibold text-lg py-4 rounded-xl shadow-sm transition-all duration-300 font-['Inter']"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  Take Your First Scan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3"
            >
              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <CardContent className="text-center">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-1 font-['Inter'] tracking-tight">{stats.averageScore}</h3>
                  <p className="text-sm text-gray-600 font-['Inter']">Avg Score</p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <CardContent className="text-center">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-1 font-['Inter'] tracking-tight">{stats.bestScore}</h3>
                  <p className="text-sm text-gray-600 font-['Inter']">Best Score</p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <CardContent className="text-center">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-1 font-['Inter'] tracking-tight">{stats.streak}</h3>
                  <p className="text-sm text-gray-600 font-['Inter']">Day Streak</p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <CardContent className="text-center">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-1 font-['Inter'] tracking-tight">{stats.recentActivity}</h3>
                  <p className="text-sm text-gray-600 font-['Inter']">This Week</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h2 className="text-xl font-semibold text-black font-['Inter'] tracking-tight">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <button
                      onClick={action.action}
                      className="w-full bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center text-white transition-all duration-200 group-hover:scale-105 shadow-sm`}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-black text-sm mb-1 truncate font-['Inter']">{action.title}</h3>
                          <p className="text-xs text-gray-600 truncate font-['Inter']">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black font-['Inter'] tracking-tight">Recent Scans</h2>

              </div>
              
              <div className="space-y-3">
                {analyses.slice(0, 3).map((analysis, index) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                            {analysis.image_url ? (
                              <img 
                                src={analysis.image_url} 
                                alt="Style analysis"
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              <Camera className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-black text-sm truncate font-['Inter']">Style Analysis</h3>
                            <p className="text-xs text-gray-600 font-['Inter']">
                              {new Date(analysis.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-black text-white px-2 py-1 rounded-full text-xs font-medium font-['Inter']">
                              {analysis.total_score}/100
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
