
import { ArrowLeft, Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logout as revenueCatLogout } from "@/services/revenueCatService";
import { useNavigate } from "react-router-dom";

interface ProfileHeaderProps {
  isPro: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export const ProfileHeader = ({ isPro, onLogout, isLoggingOut }: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUserId();
  }, []);

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone. You must also cancel your subscription in the App Store.")) {
      return;
    }
    setDeleting(true);
    try {
      if (!userId) throw new Error("User not found");
      // Call your Supabase RPC or deletion logic here
      const { error: deleteError } = await supabase.rpc("delete_user_and_data" as any, { user_id: userId });
      if (deleteError) throw deleteError;
      await revenueCatLogout();
      await supabase.auth.signOut();
      navigate("/");
      alert("Your account and all data have been deleted.");
    } catch (error) {
      alert("Failed to delete account: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
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
      
      <div className="flex items-center gap-2">
        {isPro && (
          <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-3 py-1 rounded-full">
            <Crown className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Pro</span>
          </div>
        )}
        {/* Delete Account Button */}
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={deleting || !userId}
        >
          {deleting ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </div>
  );
};
