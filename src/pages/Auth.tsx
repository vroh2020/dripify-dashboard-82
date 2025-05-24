
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PaywallOnboarding } from "@/components/onboarding/PaywallOnboarding";
import { ChevronRight } from "lucide-react";

export const Auth = () => {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleOnboardingComplete = (userData: any) => {
    setOnboardingData(userData);
    setShowEmailAuth(true);
    setIsSignUp(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error("Username is required");
        }
        if (username.length < 3) {
          throw new Error("Username must be at least 3 characters long");
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              ...onboardingData
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.status === 429) {
            const errorBody = JSON.parse(signUpError.message.includes('{') ? 
              signUpError.message.substring(signUpError.message.indexOf('{')) : 
              '{"message": "Please wait a moment before trying again."}'
            );
            throw new Error(errorBody.message || "Please wait before trying again.");
          }
          throw signUpError;
        }

        toast({
          title: "Sign up successful!",
          description: "Please check your email to verify your account.",
        });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate("/");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOnboarding = () => {
    setShowEmailAuth(false);
    setOnboardingData(null);
  };

  if (!showEmailAuth) {
    return <PaywallOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-xl bg-black/30 border-white/10">
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="text-center mb-6">
                  <Button
                    variant="ghost"
                    onClick={handleBackToOnboarding}
                    className="text-white/70 hover:text-white mb-4"
                  >
                    ← Back to setup
                  </Button>
                  <h2 className="text-xl font-semibold text-white">
                    {isSignUp ? "Create your account" : "Sign in to your account"}
                  </h2>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-white">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Choose a username"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Choose a password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        {isSignUp ? "Creating account..." : "Signing in..."}
                      </div>
                    ) : (
                      <>{isSignUp ? "Create Account" : "Sign In"} <ChevronRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-sm text-white/60 hover:text-white"
                    >
                      {isSignUp
                        ? "Already have an account? Sign in"
                        : "Don't have an account? Sign up"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
