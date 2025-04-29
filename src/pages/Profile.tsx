
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/store/statsStore";
import { SubscriptionButton } from "@/components/profile/SubscriptionButton";
import Logger from "@/utils/logger";

interface Breakdown {
  category: string;
  score: number;
  emoji?: string;
  details?: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null, id: string } | null>(null);
  const { stats, isLoading, error, fetchUserStats } = useStatsStore();
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    
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
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            fetchUserStats(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(analysisChannel);
    };
  }, [fetchUserStats]);

  useEffect(() => {
    const initializeStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchUserStats(user.id);
      }
    };
    
    initializeStats();
  }, [fetchUserStats]);

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
        Logger.error('Error fetching profile:', error);
        
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
            Logger.error('Error creating profile:', insertError);
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
      Logger.error('Error in fetchProfile:', error);
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

  if (loading || isLoading) {
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
        <div className="flex items-center justify-between">
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
          <SubscriptionButton />
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
                  <p className="text-white font-medium">{stats.totalScans || 0}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Average Score:</p>
                  <p className="text-white font-medium">{stats.averageScore || 0}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Best Category:</p>
                  <p className="text-white font-medium">{stats.bestCategory || 'N/A'}</p>
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
                  <p className="text-white font-medium">{stats.lastScan || 'No scans yet'}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Improved Categories:</p>
                  <p className="text-white font-medium">{stats.improvedCategories || 0}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/60">Style Streak:</p>
                  <p className="text-white font-medium">{stats.streak || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400 text-center">{error}</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;
