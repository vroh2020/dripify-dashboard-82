
import { ArrowLeft, Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ProfileHeaderProps {
  isPro: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export const ProfileHeader = ({ isPro, onLogout, isLoggingOut }: ProfileHeaderProps) => {
  const navigate = useNavigate();

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
      </div>
    </div>
  );
};
