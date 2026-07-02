import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { useStatsStore } from "@/store/statsStore";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();
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

      if (data && !error) {
        setProfile({
          username: (data as any).username || user.email?.split('@')[0] || 'User',
          avatar_url: (data as any).avatar_url || null,
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
      // `screen-safe` = 100dvh + bottom safe-area inset built-in, so we
      // intentionally do NOT add `pb-nav` here — that would double the
      // home-indicator inset (64px extra) on already-padded iPhones.
      <div className="screen-safe app-content app-shell-scroll bg-white px-4 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  return (
    // `screen-safe` enforces 100dvh + safe-area-inset-(top|bottom|
    // left|right) so the Danger Zone Delete Account button can never
    // be obscured by the iOS home indicator. `app-shell-scroll` keeps
    // the long profile settings list scrollable inside the locked
    // webview (see global html/body `overflow:hidden` rule for why).
    <div className="screen-safe app-content app-shell-scroll bg-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto space-y-5 py-6"
      >
        <ProfileHeader
          isPro={isPro}
          onLogout={handleLogout}
          isLoggingOut={loggingOut}
        />

        <Card className="bg-white border border-gray-200 rounded-2xl">
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
          <Card className="bg-red-50 border border-red-200 rounded-2xl">
            <CardContent className="p-4">
              <p className="text-red-700 text-center text-sm font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone - Delete Account */}
        <Card className="border border-gray-200 bg-white rounded-2xl mt-6">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Danger Zone
            </div>
            <div className="text-gray-900 font-semibold text-base">Delete Account</div>
            <div className="text-gray-600 text-sm">
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