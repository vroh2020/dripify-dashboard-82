import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, Zap, Sparkles, RefreshCw } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";

interface PaywallStepProps {
  onPurchase: () => void;
}

export const PaywallStep = ({ onPurchase }: PaywallStepProps) => {
  const { purchaseProduct, offerings, isLoading } = useRevenueCat();
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handlePurchase = async () => {
    // Prevent multiple purchase attempts
    if (isLoading || isRetrying) {
      return;
    }

    // Check if we have any offerings
    if (!offerings || offerings.length === 0) {
      toast({
        title: "Service Temporarily Unavailable",
        description: "Unable to load subscription options. Please check your internet connection and try again.",
        variant: "destructive"
      });
      return;
    }

    // Get the first available product from offerings
    const product = offerings[0]?.availablePackages?.[0]?.product || 
                   offerings[0]?.monthly?.product ||
                   offerings[0]?.availablePackages?.find(pkg => pkg.product)?.product;
                   
    if (!product) {
      // Show immediate error instead of retry logic
      toast({
        title: "Products Not Available",
        description: "Subscription products are currently unavailable. Please try refreshing the page or contact support.",
        variant: "destructive"
      });
      return;
    }

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
      console.error('Purchase error in PaywallStep:', error);
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Separate retry function for manual retry
  const handleRetry = async () => {
    if (isRetrying || !isMountedRef.current) return;
    
    setIsRetrying(true);
    
    toast({
      title: "Refreshing...",
      description: "Loading subscription options...",
    });

    // Give a brief moment for state updates, then try purchase again
    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsRetrying(false);
        handlePurchase();
      }
    }, 1500);
  };

  // Get product information for display
  const displayProduct = offerings?.[0]?.availablePackages?.[0]?.product || 
                        offerings?.[0]?.monthly?.product ||
                        offerings?.[0]?.availablePackages?.find(pkg => pkg.product)?.product;

  const price = displayProduct?.priceString || "$12.99";
  const hasValidProduct = !!displayProduct;
  const showLoading = isLoading || isRetrying;

  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-6"
    >
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-full mb-6"
          >
            <Crown className="w-10 h-10 text-purple-900" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold mb-4"
          >
            Unlock Your Style Potential
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-purple-200 text-lg"
          >
            Get unlimited outfit analyses, personalized style reports, and early access to trends
          </motion.p>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4 mb-8"
        >
          {[
            { icon: Zap, text: "Unlimited outfit analyses" },
            { icon: Star, text: "Personalized style reports" },
            { icon: Sparkles, text: "Early-access trends" },
            { icon: Crown, text: "Advanced color palette analysis" },
            { icon: Check, text: "Priority customer support" },
            { icon: RefreshCw, text: "Export your style profiles" }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <feature.icon className="w-4 h-4 text-purple-900" />
              </div>
              <span className="text-purple-100">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20"
        >
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{price}/month</div>
            <div className="text-purple-200">Cancel anytime</div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="space-y-3"
        >
          {/* Main Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={showLoading || !hasValidProduct}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold py-4 text-lg rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {showLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{isRetrying ? "Refreshing..." : "Processing..."}</span>
              </div>
            ) : !hasValidProduct ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh Products
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Unlock Premium
              </>
            )}
          </Button>

          {/* Retry Button - Only show if products failed to load */}
          {!hasValidProduct && !showLoading && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 py-3 rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </motion.div>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-xs text-purple-300 text-center mt-4"
        >
          By continuing, you agree to our Terms of Service and Privacy Policy. {price}/month.
        </motion.p>
      </div>
    </motion.div>
  );
}; 