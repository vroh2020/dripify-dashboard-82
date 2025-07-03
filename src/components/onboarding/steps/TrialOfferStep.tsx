import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  const { purchaseProduct, isPro, isLoading, offerings } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Automatically proceed for Pro users without showing UI
  useEffect(() => {
    if (isPro) {
      console.log('✅ User is already Pro - auto-proceeding');
      onNext();
    }
  }, [isPro, onNext]);

  const handleStartTrial = async () => {
    // If user is already Pro, continue immediately
    if (isPro) {
      onNext();
      return;
    }

    setIsProcessing(true);
    setHasError(false);
    
    try {
      const proProduct = offerings?.[0]?.availablePackages?.find(
        (pkg) => pkg.product.identifier === "gs_1299_1m"
      );
      
      if (!proProduct) {
        console.log('🚫 No pro product found');
        setHasError(true);
        setIsProcessing(false);
        return;
      }
      
      const success = await purchaseProduct(proProduct);
      if (success) {
        onNext();
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Trial start error:", error);
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    
    // Refresh subscription state and retry
    try {
      // Give RevenueCat time to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      await handleStartTrial();
    } catch (error) {
      console.error("Retry failed:", error);
      setHasError(true);
    }
  };

  return (
    <motion.div
      key="trial-offer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-8"
        >
          <Crown className="w-24 h-24 text-orange-400 mx-auto" />
        </motion.div>

        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            We offer
            <br />
            <span className="text-orange-400 text-5xl">7 days free</span>
            <br />
            so everyone can
            <br />
            max their drip with
            <br />
            <span className="text-orange-400">Drip Max</span>
          </h1>



          {hasError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-6">
              <div className="flex items-center gap-2 text-red-300 font-medium mb-2">
                <AlertCircle className="w-5 h-5" />
                Connection Issue
              </div>
              <p className="text-red-200 text-sm">
                {retryCount < 2 
                  ? "Having trouble loading subscription options. Let's try again!"
                  : "Still having trouble? Please check your internet connection and try again."
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      <div className="px-8 pb-8 space-y-3">
        {hasError ? (
          <Button
            onClick={handleRetry}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Retrying...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Try Again
              </div>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleStartTrial}
            disabled={isProcessing || isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Starting Trial...
              </div>
            ) : (
              "Try for Free"
            )}
          </Button>
        )}

        {retryCount >= 2 && hasError && (
          <p className="text-center text-white/60 text-sm">
            Need help? Email support@dripmax.com
          </p>
        )}
      </div>
    </motion.div>
  );
};
