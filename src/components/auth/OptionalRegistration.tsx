import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Loader2, Zap, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { persistenceManager } from '@/utils/persistenceManager';

interface OptionalRegistrationProps {
  onRegister?: () => void;
  onSkip?: () => void;
  onPurchase?: () => void;
  showPurchaseOption?: boolean;
}

export const OptionalRegistration: React.FC<OptionalRegistrationProps> = ({
  onRegister,
  onSkip,
  onPurchase,
  showPurchaseOption = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // Initialize Apple Sign-in flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            device_id: persistenceManager.getDeviceInfo()?.deviceId || '',
            trigger: 'optional_registration'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Registration Started",
        description: "Please complete the registration process.",
      });

      if (onRegister) {
        onRegister();
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "You can still use the app without registration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    toast({
      title: "Continuing as Guest",
      description: "You can register anytime to sync across devices.",
    });
    
    if (onSkip) {
      onSkip();
    }
  };

  const handlePurchase = () => {
    setIsVisible(false);
    if (onPurchase) {
      onPurchase();
    }
  };

  if (!isVisible) return null;

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
            <User className="w-12 h-12 text-blue-400 mx-auto" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Optional Registration
          </h2>
          
          <p className="text-gray-400 text-sm">
            Registration is completely optional. You can use all features without creating an account.
          </p>
        </div>

        {/* Benefits of Registration */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-gray-300 text-sm">Sync across all your devices</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-gray-300 text-sm">Secure backup of your data</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-gray-300 text-sm">Access your history anywhere</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {showPurchaseOption && (
            <Button
              onClick={handlePurchase}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Zap className="w-5 h-5 mr-2" />
              Continue to Purchase
            </Button>
          )}
          
          <Button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300"
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
                <User className="w-5 h-5 mr-2" />
                Register with Apple
              </>
            )}
          </Button>

          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full h-12 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-300"
          >
            Continue as Guest
          </Button>
        </div>

        {/* Important Note */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm text-center">
            💡 You can register anytime later to sync your data across devices
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};