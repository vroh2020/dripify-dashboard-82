import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Apple, Shield, Loader2, Zap, Check } from 'lucide-react';
import { persistenceManager } from '@/utils/persistenceManager';

interface AppleSignInProps {
  onSuccess?: (user: unknown) => void;
  onCancel?: () => void;
  trigger: 'onboarding' | 'paywall' | 'completion' | 'reinstall';
  userProgress?: {
    stepsCompleted: number;
    timeSpent: number;
    hasPhoto: boolean;
  };
}

export const AppleSignIn: React.FC<AppleSignInProps> = ({
  onSuccess,
  onCancel,
  trigger,
  userProgress
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'onboarding':
        return {
          title: "Secure Your Progress",
          subtitle: "Sign in with Apple to save your setup across devices",
          benefits: [
            "Never lose your progress again",
            "Access your style profile anywhere",
            "Sync across all your devices"
          ]
        };
      case 'paywall':
        return {
          title: "Unlock Premium Features",
          subtitle: "Sign in with Apple to access unlimited style analysis",
          benefits: [
            "Unlimited style analysis",
            "Advanced AI recommendations",
            "Priority customer support"
          ]
        };
      case 'completion':
        return {
          title: "Save Your Setup",
          subtitle: "Sign in with Apple to preserve your personalized experience",
          benefits: [
            "Keep your style preferences",
            "Access your analysis history",
            "Get personalized recommendations"
          ]
        };
      case 'reinstall':
        return {
          title: "Welcome Back!",
          subtitle: "Sign in with Apple to restore your previous setup",
          benefits: [
            "Restore your style profile",
            "Continue where you left off",
            "Keep your preferences"
          ]
        };
      default:
        return {
          title: "Sign in with Apple",
          subtitle: "Secure your account and sync across devices",
          benefits: [
            "Secure authentication",
            "Cross-device sync",
            "Data protection"
          ]
        };
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Get device info for guest progress
      const deviceInfo = persistenceManager.getDeviceInfo();
      
      // Start Apple Sign-in flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Pass device info to merge guest progress
            device_id: deviceInfo?.deviceId || '',
            trigger: trigger,
            ...(userProgress && {
              steps_completed: userProgress.stepsCompleted,
              time_spent: userProgress.timeSpent,
              has_photo: userProgress.hasPhoto
            })
          }
        }
      });

      if (error) throw error;

      // Show success message
      toast({
        title: "Sign-in Initiated",
        description: "Please complete the sign-in process in the popup window.",
      });

      if (onSuccess) {
        onSuccess(data);
      }

    } catch (error) {
      console.error('Apple Sign-in error:', error);
      toast({
        title: "Sign-in Failed",
        description: "Please try again or continue as a guest.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    toast({
      title: "Continuing as Guest",
      description: "You can always sign in later to save your progress.",
    });
    
    if (onCancel) {
      onCancel();
    }
  };

  const message = getTriggerMessage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-4"
          >
            <Apple className="w-12 h-12 text-white mx-auto" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {message.title}
          </h2>
          
          <p className="text-gray-400 text-sm">
            {message.subtitle}
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          {message.benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-green-400" />
              </div>
              <span className="text-gray-300 text-sm">{benefit}</span>
            </motion.div>
          ))}
        </div>

        {/* Progress indicator for onboarding */}
        {trigger === 'onboarding' && userProgress && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Your Progress</span>
              <span>{userProgress.stepsCompleted} steps completed</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(userProgress.stepsCompleted / 15) * 100}%` }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-white text-black hover:bg-gray-100 font-semibold rounded-xl transition-all duration-300 hover:scale-105"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-5 h-5" />
              </motion.div>
            ) : (
              <>
                <Apple className="w-5 h-5 mr-2" />
                Continue with Apple
              </>
            )}
          </Button>

          <Button
            onClick={handleContinueAsGuest}
            variant="ghost"
            className="w-full h-12 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-300"
          >
            Continue as Guest
          </Button>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Shield className="w-3 h-3" />
            <span>Your data is protected with Apple's privacy standards</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};