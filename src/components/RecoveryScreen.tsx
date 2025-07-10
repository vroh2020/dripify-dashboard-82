import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Home, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RecoveryScreenProps {
  message?: string;
  onRetry?: () => void;
}

export const RecoveryScreen = ({ message = "Something went wrong", onRetry }: RecoveryScreenProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-xl">Recovery Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/70 text-center">{message}</p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleRetry}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            
            <Button 
              onClick={handleClearStorage}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
            
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
          
          <p className="text-xs text-white/50 text-center mt-4">
            If the problem persists, please contact support
          </p>
        </CardContent>
      </Card>
    </div>
  );
};