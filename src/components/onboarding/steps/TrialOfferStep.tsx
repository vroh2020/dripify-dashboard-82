import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { useState } from "react";
import { REVENUECAT_CONFIG } from "@/config/revenueCat";
import { findProduct } from "@/utils/subscriptionProducts";

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  const isWeb = !Capacitor.isNativePlatform();
  const { offerings, purchaseProduct, isLoading } = useSubscription();

  const weeklyProduct = findProduct(offerings, REVENUECAT_CONFIG.products.weekly);
  const monthlyProduct = findProduct(offerings, REVENUECAT_CONFIG.products.monthly);

  const weeklyPriceDisplay = weeklyProduct?.priceString ?? `$${(weeklyProduct?.price ?? 4.99).toFixed(2)}`;
  const monthlyPriceDisplay = monthlyProduct?.priceString ?? `$${(monthlyProduct?.price ?? 12.99).toFixed(2)}`;

  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (productType: 'weekly' | 'monthly') => {
    if (isProcessing || isLoading) return;
    setIsProcessing(true);

    try {
      const product = productType === 'weekly' ? weeklyProduct : monthlyProduct;

      if (!product) {
        if (Capacitor.isNativePlatform()) {
          alert('We are still connecting to the App Store. Please try again in a moment.');
        }
        return;
      }

      const success = await purchaseProduct(product);
      if (success) {
        onNext();
      }
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
          <div className="relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </span>
            </div>
            <Button
              onClick={() => handlePurchase('weekly')}
              disabled={isProcessing || isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white border-0 pt-3"
            >
              <div className="text-center">
                <div className="text-xl font-bold">{weeklyPriceDisplay}/week</div>
                <div className="text-sm opacity-90">Weekly Premium</div>
              </div>
            </Button>
          </div>
          <Button
            onClick={() => handlePurchase('monthly')}
            disabled={isProcessing || isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white border-0"
          >
            <div className="text-center">
                <div className="text-xl font-bold">{monthlyPriceDisplay}/month</div>
                <div className="text-sm opacity-90">Monthly Premium</div>
              </div>
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
