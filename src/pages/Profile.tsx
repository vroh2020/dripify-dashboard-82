
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { useNavigate } from "react-router-dom";
import { useStatsStore } from "@/store/statsStore";
import { ProUpgrade } from "@/components/subscription/ProUpgrade";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { AccountDeletion } from "@/components/AccountDeletion";
import { Button } from "@/components/ui/button";
import { Crown, BadgeInfo, LogOut, ShieldCheck, User, Star, Trash2, Heart } from "lucide-react";

interface Profile {
  username: string;
  avatar_url: string | null;
  id: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { stats, isLoading, error, fetchUserStats } = useStatsStore();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchProfile();
    initializeStats();
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
        if (error.code === 'PGRST116') {
          // Create a profile if it doesn't exist
          const username = user.email?.split('@')[0] || 'User';
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username
            });

          if (!insertError) {
            setProfile({
              username,
              avatar_url: null,
              id: user.id
            });
          }
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

  const initializeStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      fetchUserStats(user.id);
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

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      
      toast({
        title: "Signing out...",
        description: "Clearing all data and signing out.",
      });
      
      // Use the comprehensive sign-out function that clears ALL storage
      await signOut();
      
      // The signOut function handles navigation, but just in case:
      // navigate('/auth'); - not needed, signOut handles this
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error logging out",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
      setLoggingOut(false);
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
        <ProfileHeader 
          isPro={isPro} 
          onLogout={handleLogout} 
          isLoggingOut={loggingOut} 
        />

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

        <ProfileStats stats={stats} />

        {error && (
          <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Account Deletion Section */}
        <AccountDeletion />
      </motion.div>
    </div>
  );
};

export default Profile;
