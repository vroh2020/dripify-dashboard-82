// @ts-ignore – framer-motion types not installed but build uses skipLibCheck
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { useState } from "react";
import { REVENUECAT_CONFIG } from "@/config/revenueCat";
// Hard-coded Pro product fallback

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  const isWeb = !Capacitor.isNativePlatform();
  const { offerings, purchaseProduct, isLoading } = useSubscription();

  // Find the Pro product (monthly)
  const proProduct = offerings?.[0]?.availablePackages?.find(
    (pkg) =>
      pkg.product.identifier === REVENUECAT_CONFIG.products.monthly ||
      pkg.product.identifier.includes('pro') ||
      pkg.product.title.toLowerCase().includes('pro')
  )?.product;

  const formattedPrice = '$12.99';

  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartTrial = async () => {
    if (isProcessing || isLoading) return;
    setIsProcessing(true);

    try {
      const product =
        proProduct ||
        ({
          identifier: REVENUECAT_CONFIG.products.monthly,
          title: 'Pro Monthly',
          description: 'Pro subscription with 7-day free trial',
          price: 12.99,
          priceString: '$12.99',
          currencyCode: 'USD',
          subscriptionPeriod: 'P1M',
        } as any);

      const success = await purchaseProduct(product);
      if (success) onNext();
    } catch (error) {
      console.error('Purchase error:', error);
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
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <Crown className="w-20 h-20 text-orange-400 mx-auto mb-6" />
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Unlock Premium Access
          </h1>
          <p className="text-white/80 text-lg">Choose a plan to continue.</p>
        </div>
        
        <div className="space-y-3 mt-8 w-full max-w-sm">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-white/90">Unlimited style analyses</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-white/90">Personalized recommendations</span>
            </div>
        </div>

        <div className="w-full max-w-sm space-y-4 mt-8">
          <Button
            onClick={handleStartTrial}
            disabled={isProcessing || isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white border-0"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Starting Trial...
              </div>
            ) : (
              <div className="text-center">
                <div className="text-xl font-bold">{formattedPrice}/month</div>
                <div className="text-sm opacity-90">First 7 days free</div>
              </div>
            )}
          </Button>
        </div>
        {isWeb && (
            <p className="text-white/70 text-xs mt-4">
              This is a web demo. In production, this would open a real payment flow.
            </p>
          )}
        <div className="mt-6 text-sm text-white/60">
            <button className="underline hover:text-white/80" onClick={() => alert('Terms & Conditions clicked!')}>
                Terms & Conditions
            </button>
        </div>
      </div>
    </motion.div>
  );
};
