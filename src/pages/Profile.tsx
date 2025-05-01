
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Breakdown {
  category: string;
  score: number;
  emoji?: string;
  details?: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null, id: string } | null>(null);
  const [styleStats, setStyleStats] = useState({
    totalScans: 0,
    averageScore: 0,
    bestCategory: '',
    lastScan: '',
    improvedCategories: 0,
    styleStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchStyleStats();

    // Set up real-time subscription for profile updates
    const profileChannel = supabase
      .channel('profile_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        () => {
          fetchProfile();
        }
      )
      .subscribe();

    // Set up real-time subscription for style analysis updates
    const analysisChannel = supabase
      .channel('style_analysis_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'style_analyses' 
        }, 
        () => {
          fetchStyleStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(analysisChannel);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        if (error.code === 'PGRST116') {
          // Create a profile if it doesn't exist
          const username = user.email?.split('@')[0] || 'User';
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            toast({
              title: "Error creating profile",
              description: "Could not create a profile for you",
              variant: "destructive",
            });
          } else {
            setProfile({
              username,
              avatar_url: null,
              id: user.id
            });
          }
        } else {
          toast({
            title: "Error loading profile",
            description: "Could not load profile information",
            variant: "destructive",
          });
        }
        return;
      }

      if (data) {
        setProfile({
          username: data.username || user.email?.split('@')[0] || 'User',
          avatar_url: data.avatar_url,
          id: user.id
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStyleStats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get total scan count
      const { count: totalScans, error: countError } = await supabase
        .from('style_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error fetching scan count:', countError);
      }

      // Get average score
      const { data: scoreData, error: scoreError } = await supabase
        .from('style_analyses')
        .select('total_score')
        .eq('user_id', user.id);

      if (scoreError) {
        console.error('Error fetching scores:', scoreError);
      }

      let averageScore = 0;
      if (scoreData && scoreData.length > 0) {
        averageScore = Math.round(
          scoreData.reduce((acc, curr) => acc + curr.total_score, 0) / scoreData.length
        );
      }

      // Get best category
      const { data: analyses, error: analysesError } = await supabase
        .from('style_analyses')
        .select('breakdown')
        .eq('user_id', user.id);

      if (analysesError) {
        console.error('Error fetching analyses:', analysesError);
      }

      let bestCategory = '';
      if (analyses && analyses.length > 0) {
        // Process breakdown data to find best category
        const categoryScores: Record<string, { total: number; count: number }> = {};
        
        analyses.forEach(analysis => {
          if (analysis.breakdown && Array.isArray(analysis.breakdown)) {
            // Safe type casting with runtime checks
            (analysis.breakdown as unknown as Breakdown[]).forEach((item) => {
              if (item && typeof item === 'object' && 'category' in item && 'score' in item) {
                const category = item.category as string;
                const score = item.score as number;
                
                if (!categoryScores[category]) {
                  categoryScores[category] = { total: 0, count: 0 };
                }
                categoryScores[category].total += score;
                categoryScores[category].count += 1;
              }
            });
          }
        });

        let highestAvg = 0;
        Object.entries(categoryScores).forEach(([category, data]) => {
          const avg = data.total / data.count;
          if (avg > highestAvg) {
            highestAvg = avg;
            bestCategory = category;
          }
        });
      }

      // Get last scan date and streak
      const { data: latestScan, error: latestError } = await supabase
        .from('style_analyses')
        .select('scan_date, streak_count')
        .eq('user_id', user.id)
        .order('scan_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let lastScan = '';
      let styleStreak = 0;

      if (latestScan) {
        // Format date as "X days ago"
        const scanDate = new Date(latestScan.scan_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - scanDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        lastScan = diffDays <= 1 ? 'today' : `${diffDays} days ago`;
        styleStreak = latestScan.streak_count || 0;
      }

      // Calculate improved categories based on actual data
      // This looks at categories that have improved scores over time
      let improvedCategories = 0;
      if (analyses && analyses.length >= 2) {
        const oldestAnalysis = analyses[analyses.length - 1];
        const newestAnalysis = analyses[0];
        
        if (oldestAnalysis.breakdown && newestAnalysis.breakdown) {
          const oldCategories: Record<string, number> = {};
          
          // Process older breakdown
          (oldestAnalysis.breakdown as unknown as Breakdown[]).forEach((item) => {
            if (item && typeof item === 'object' && 'category' in item && 'score' in item) {
              oldCategories[item.category] = item.score;
            }
          });
          
          // Compare with newer breakdown
          (newestAnalysis.breakdown as unknown as Breakdown[]).forEach((item) => {
            if (item && typeof item === 'object' && 'category' in item && 'score' in item) {
              if (oldCategories[item.category] && item.score > oldCategories[item.category]) {
                improvedCategories++;
              }
            }
          });
        }
      }

      setStyleStats({
        totalScans: totalScans || 0,
        averageScore,
        bestCategory,
        lastScan,
        improvedCategories,
        styleStreak,
      });
    } catch (error) {
      console.error('Error in fetchStyleStats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = (url: string) => {
    if (profile) {
      setProfile({
        ...profile,
        avatar_url: url
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] py-8 px-4 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#9b87f5] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium text-white/90 ml-2">Profile</h1>
        </div>

        <Card className="bg-black/20 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              {profile && (
                <AvatarUpload 
                  avatarUrl={profile.avatar_url} 
                  userId={profile.id}
                  username={profile.username}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
          <Card className="bg-black/20 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-white/90">Style Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Total Scans:</p>
                  <p className="text-white font-medium">{styleStats.totalScans}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Average Score:</p>
                  <p className="text-white font-medium">{styleStats.averageScore}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Best Category:</p>
                  <p className="text-white font-medium">{styleStats.bestCategory || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-white/90">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Last Scan:</p>
                  <p className="text-white font-medium">{styleStats.lastScan || "No scans yet"}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Improved Categories:</p>
                  <p className="text-white font-medium">{styleStats.improvedCategories}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Style Streak:</p>
                  <p className="text-white font-medium">{styleStats.styleStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
