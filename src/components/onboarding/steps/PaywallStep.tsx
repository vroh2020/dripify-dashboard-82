import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, Zap, Sparkles, AlertCircle } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface PaywallStepProps {
  onPurchase: () => void;
  onContinueFree: () => void;
}

export const PaywallStep = ({ onPurchase, onContinueFree }: PaywallStepProps) => {
  const { offerings, purchaseProduct, isLoading } = useRevenueCat();
  const { toast } = useToast();
  const [hasTriedLoad, setHasTriedLoad] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check if we have valid offerings
  const hasValidOfferings = offerings && offerings.length > 0 && 
    offerings[0]?.availablePackages && offerings[0].availablePackages.length > 0;

  useEffect(() => {
    // Give RevenueCat some time to load offerings
    const timer = setTimeout(() => {
      setHasTriedLoad(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handlePurchase = async () => {
    try {
      if (hasValidOfferings) {
        const product = offerings[0].availablePackages[0].product;
        const success = await purchaseProduct(product.identifier);
        if (success) {
          toast({
            title: "Welcome to Premium! 🎉",
            description: "Your subscription is now active. Enjoy unlimited style analyses!",
          });
          onPurchase();
          return;
        }
      }
      
      // If RevenueCat purchase fails or no offerings, show web simulation
      const confirmed = window.confirm(
        'Would you like to start your premium trial? (Demo mode - no actual payment required)'
      );
      
      if (confirmed) {
        toast({
          title: "Premium Trial Started! 🎉",
          description: "Welcome to your premium experience!",
        });
        onPurchase();
      } else {
        toast({
          title: "No Problem!",
          description: "You can always upgrade later from your profile.",
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Something went wrong",
        description: "Don't worry, you can continue with the free version and upgrade later.",
        variant: "destructive"
      });
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload(); // Simple retry by reloading
  };

  const features = [
    { icon: Zap, text: 'Unlimited outfit analyses' },
    { icon: Sparkles, text: 'Personalized style reports' },
    { icon: Star, text: 'Early-access trends' },
    { icon: Crown, text: 'Advanced color palette analysis' },
    { icon: Check, text: 'Priority customer support' },
    { icon: Check, text: 'Export your style profiles' }
  ];

  // Show error state if no offerings after trying to load
  const showErrorState = hasTriedLoad && !hasValidOfferings && !isLoading;
  
  // Default pricing display
  const price = hasValidOfferings 
    ? offerings[0].availablePackages[0].product.priceString 
    : "$12.99/month";
  const trialText = "7-day free trial";

  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col bg-gradient-to-br from-black via-purple-900/20 to-black"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
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
              className="mb-6"
            >
              <Crown className="w-16 h-16 text-yellow-400 mx-auto" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Unlock Premium Features
            </h2>
            <p className="text-white/70 text-lg leading-relaxed max-w-md mx-auto">
              Get unlimited style analyses, personalized recommendations, and exclusive features
            </p>
          </motion.div>
        </div>

        {/* Error State */}
        {showErrorState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
          >
            <div className="flex items-center text-orange-200 mb-2">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Subscription System Loading</span>
            </div>
            <p className="text-xs text-orange-200/80 mb-3">
              Our payment system is starting up. You can continue with premium features in demo mode.
            </p>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="w-full border-orange-500/40 text-orange-200 hover:bg-orange-500/10 text-xs"
            >
              Retry Connection
            </Button>
          </motion.div>
        )}

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-sm space-y-3 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              className="flex items-center text-white/80"
            >
              <feature.icon className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" />
              <span className="text-sm">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="text-3xl font-bold text-white mb-1">{price}</div>
          <div className="text-white/60 text-sm">{trialText}</div>
          {showErrorState && (
            <div className="text-orange-300 text-xs mt-1">Demo mode - no payment required</div>
          )}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 px-6 pb-8 space-y-4">
        <Button
          onClick={handlePurchase}
          disabled={isLoading && !showErrorState}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          {isLoading && !showErrorState ? (
            'Loading Premium...'
          ) : showErrorState ? (
            'Start Premium Demo'
          ) : (
            'Start Free Trial'
          )}
        </Button>
        
        <Button
          onClick={onContinueFree}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10 h-12 rounded-xl"
        >
          Continue with Free Version
        </Button>
        
        {/* Help Text */}
        <div className="text-center pt-2">
          <p className="text-white/40 text-xs">
            {showErrorState 
              ? "Full features available in demo mode" 
              : "Cancel anytime • No commitment"
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
}; 