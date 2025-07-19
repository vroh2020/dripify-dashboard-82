import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, Zap, Sparkles, RefreshCw } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useToast } from "@/hooks/use-toast";

interface PaywallStepProps {
  onPurchase: () => void;
}

export const PaywallStep = ({ onPurchase }: PaywallStepProps) => {
  const { purchaseProduct, offerings, isLoading, initializationError } = useRevenueCat();
  const { toast } = useToast();

  const handlePurchase = async () => {
    // Enhanced debugging
    console.log('🛒 PaywallStep: Purchase attempt started');
    console.log('🛒 Offerings available:', offerings?.length || 0);
    console.log('🛒 Initialization error:', initializationError);
    console.log('🛒 Offerings data:', offerings?.map(o => ({
      id: o.identifier,
      packages: o.availablePackages?.length || 0
    })));

    const product = offerings?.[0]?.availablePackages?.[0]?.product;
    
    if (!product) {
      console.error('🛒 PaywallStep: No product found in offerings');
      console.error('🛒 Debug info:', {
        offeringsCount: offerings?.length || 0,
        firstOfferingPackages: offerings?.[0]?.availablePackages?.length || 0,
        isLoading,
        initializationError
      });
      
      toast({
        title: "Loading Subscription Options...",
        description: initializationError 
          ? "Subscription service is temporarily unavailable. Please check your internet connection and try again."
          : offerings?.length === 0 
            ? "Please wait while we load subscription options. If this persists, check your internet connection."
            : "Subscription configuration issue. Please try again or contact support.",
        variant: "destructive"
      });
      return;
    }

    console.log('🛒 PaywallStep: Attempting purchase for product:', product.identifier);
    
    try {
      const success = await purchaseProduct(product.identifier);
      if (success) {
        toast({
          title: "Welcome to Premium! 🎉",
          description: "Your subscription is now active. Enjoy unlimited style analyses!",
        });
        onPurchase();
      } else {
        toast({
          title: "Purchase Cancelled",
          description: "Please try again to unlock premium features.",
        });
      }
    } catch (error) {
      console.error('🛒 PaywallStep: Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    console.log('🛒 PaywallStep: Refresh requested');
    window.location.reload();
  };

  // Show loading state while offerings are being fetched
  if (isLoading) {
    return (
      <motion.div
        key="paywall-loading"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center p-6"
      >
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Loading Subscription Options...</h3>
          <p className="text-purple-200">Please wait while we prepare your premium experience</p>
        </div>
      </motion.div>
    );
  }

  // Show error state if no offerings are available or there's an initialization error
  if (!offerings || offerings.length === 0 || initializationError) {
    return (
      <motion.div
        key="paywall-error"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full text-center text-white">
          <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h3 className="text-2xl font-bold mb-4">
            {initializationError ? "Connection Issue" : "Subscription Setup"}
          </h3>
          <p className="text-purple-200 mb-6">
            {initializationError 
              ? "We're having trouble connecting to our subscription service. Please check your internet connection."
              : "We're setting up your subscription options. This usually takes just a moment."
            }
          </p>
          <div className="space-y-3">
            <Button 
              onClick={handleRefresh}
              className="w-full bg-white text-purple-900 hover:bg-purple-100 font-semibold py-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={onPurchase}
              variant="outline"
              className="w-full border-white text-white hover:bg-white hover:text-purple-900"
            >
              Continue Without Premium
            </Button>
          </div>
          <p className="text-xs text-purple-300 mt-4">
            {initializationError 
              ? "Error: Subscription service unavailable"
              : "Having trouble? Make sure you're connected to the internet."
            }
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-b from-indigo-900/60 via-purple-800/40 to-black flex flex-col justify-center items-center px-6 py-8 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-4"
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
            className="flex justify-center"
          >
            <Crown className="w-16 h-16 text-orange-400" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Unlock Your Style Potential
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Get unlimited outfit analyses, personalized style reports, and early access to trends
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-3"
        >
          {["Unlimited outfit analyses", "Personalized style reports", "Early-access trends", "Advanced color palette analysis", "Priority customer support", "Export your style profiles"].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
              className="flex items-center space-x-3"
            >
              <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <span className="text-white/80 text-sm">{feature}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-gradient-to-r from-purple-900/40 to-purple-700/40 rounded-2xl p-4 border border-purple-500/30"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">$12.99/month</div>
            <div className="text-white/60 text-xs">Cancel anytime</div>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <Crown className="mr-3 h-6 w-6" />
                Unlock Premium
              </>
            )}
          </Button>
        </motion.div>

        {/* Legal Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-white/40 text-xs leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy. $12.99/month.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}; 