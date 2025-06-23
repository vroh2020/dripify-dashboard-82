import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  const { purchaseProduct, isPro, isLoading, offerings } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartTrial = async () => {
    if (isPro) {
      onNext();
      return;
    }

    setIsProcessing(true);
    try {
      const proProduct = offerings?.[0]?.availablePackages?.find(
        (pkg) => pkg.product.identifier === "gs_1299_1m"
      );
      // Use the specific product ID we know exists
      const success = await purchaseProduct(proProduct);
      if (success) {
        setTimeout(onNext, 1000);
      } else {
        // If purchase fails, still allow user to continue
        setTimeout(onNext, 500);
      }
    } catch (error) {
      console.error("Trial start error:", error);
      // Allow user to continue even if purchase fails
      setTimeout(onNext, 500);
    } finally {
      setIsProcessing(false);
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

          {isPro && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mt-6">
              <p className="text-green-300 font-medium">
                ✨ You already have Pro access!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      <div className="px-8 pb-8">
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
          ) : isPro ? (
            "Continue to App"
          ) : (
            "Try for Free"
          )}
        </Button>
      </div>
    </motion.div>
  );
};
