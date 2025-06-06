import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { validateEmail, checkRateLimit, sanitizeTextInput, sanitizeUserMetadata } from "@/utils/security";

export const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is already authenticated, go to main app
        navigate("/");
      }
    });
  }, [navigate]);

  const handleOnboardingComplete = (userData: any) => {
    // Sanitize user data before processing
    const sanitizedData = sanitizeUserMetadata(userData);
    setIsOnboarding(false);
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    // Email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.errors[0];
    }
    
    // Password validation
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    // Check for weak passwords
    if (password && password.length < 8) {
      newErrors.password = 'Password should be at least 8 characters for better security';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Rate limiting check
    const rateLimitResult = checkRateLimit(`signin_${email}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000 // 30 minutes block
    });

    if (!rateLimitResult.allowed) {
      toast({
        title: "Too many attempts",
        description: `Please wait ${rateLimitResult.retryAfter} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeTextInput(email).toLowerCase();
      
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password,
      });

      if (error) {
        // Log security event for monitoring
        console.warn('Failed sign-in attempt:', { 
          email: sanitizedEmail, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      navigate("/");
    } catch (error: any) {
      // Generic error message to prevent information disclosure
      const errorMessage = error.message.includes('Invalid login credentials') 
        ? 'Invalid email or password'
        : 'Sign in failed. Please try again.';
        
      toast({
        title: "Error signing in",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(`signup_${email}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 2 * 60 * 60 * 1000 // 2 hours block
    });

    if (!rateLimitResult.allowed) {
      toast({
        title: "Too many attempts",
        description: `Please wait ${Math.ceil(rateLimitResult.retryAfter! / 60)} minutes before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeTextInput(email).toLowerCase();
      
      const { error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: password,
        options: {
          data: sanitizeUserMetadata({
            created_via: 'auth_page',
            is_temp_account: false
          })
        }
      });

      if (error) {
        // Log security event for monitoring
        console.warn('Failed sign-up attempt:', { 
          email: sanitizedEmail, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      // Generic error message to prevent information disclosure
      const errorMessage = error.message.includes('already registered')
        ? 'This email is already registered. Please sign in instead.'
        : 'Account creation failed. Please try again.';
        
      toast({
        title: "Error creating account",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes with real-time validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  if (isOnboarding) {
    return <ModernOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center gradient-text">Welcome to Drip Max</CardTitle>
            <CardDescription className="text-center text-white/70">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      className={errors.email ? "border-red-500" : ""}
                      required
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={handlePasswordChange}
                      className={errors.password ? "border-red-500" : ""}
                      required
                      autoComplete="current-password"
                    />
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      className={errors.email ? "border-red-500" : ""}
                      required
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password (min 8 characters)"
                      value={password}
                      onChange={handlePasswordChange}
                      className={errors.password ? "border-red-500" : ""}
                      required
                      autoComplete="new-password"
                    />
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password}</p>
                    )}
                    <p className="text-xs text-white/60">
                      Use at least 8 characters with a mix of letters, numbers, and symbols
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsOnboarding(true)}
              className="text-white/70 hover:text-white"
            >
              Back to Onboarding
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
