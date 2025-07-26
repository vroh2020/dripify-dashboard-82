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
import { Button } from "@/components/ui/button";
import { Crown, BadgeInfo, LogOut, ShieldCheck, User, Star, Trash2, Heart, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { DeleteAccountButton } from '@/components/DeleteAccountButton';

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
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const { signOut } = useAuth();
  const { restorePurchases } = useSubscription();

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

  const openTermsOfUse = () => {
    window.open('https://dripcheck.framer.website/terms-of-services', '_blank', 'noopener,noreferrer');
  };

  const openPrivacyPolicy = () => {
    window.open('https://dripcheck.framer.website/privacy-policy', '_blank', 'noopener,noreferrer');
  };

  const handleRestorePurchases = async () => {
    if (isRestoring) return;
    
    setIsRestoring(true);
    
    try {
      const success = await restorePurchases();
      if (success) {
        toast({
          title: "Welcome Back!",
          description: "Your purchases have been restored successfully.",
        });
      } else {
        toast({
          title: "Ready to Upgrade",
          description: "Ready to unlock your premium features? Choose a plan to get started.",
        });
      }
    } catch (error) {
      console.error("Restore error:", error);
      toast({
        title: "Connection Issue",
        description: "Unable to connect. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
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

        {/* Restore Purchases Section - Apple Guideline 3.1.1 */}
        <Card className="bg-black/20 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">Restore Purchases</h3>
              <p className="text-white/60 text-sm mb-4">
                If you've previously purchased Dripify AI Premium, you can restore your subscription here. New to Dripify? Choose a plan to get started!
              </p>
              <Button
                onClick={handleRestorePurchases}
                disabled={isRestoring}
                variant="outline"
                className="w-full border-white/30 text-white hover:text-white hover:border-white/50 bg-white/5 backdrop-blur-sm font-medium"
              >
                {isRestoring ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    Restoring Previous Purchases...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Restore Previous Purchases
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legal Information Section - Apple Guideline 3.1.2 */}
        <Card className="bg-black/20 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">Legal Information</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={openPrivacyPolicy}
                  className="flex items-center justify-center gap-2 text-white/60 hover:text-white font-medium transition-colors"
                >
                  <span>Privacy Policy</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={openTermsOfUse}
                  className="flex items-center justify-center gap-2 text-white/60 hover:text-white font-medium transition-colors"
                >
                  <span>Terms of Use</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone - Delete Account */}
        <Card className="border border-red-300 bg-transparent rounded-2xl mt-6 shadow-md">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-1">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Danger Zone
            </div>
            <div className="text-white font-semibold text-base">Delete Account</div>
            <div className="text-white text-sm mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </div>
            <div className="flex justify-center">
              <DeleteAccountButton />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Profile;