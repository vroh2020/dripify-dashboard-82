import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { REVENUECAT_CONFIG } from "@/config/revenueCat";
import { useToast } from "@/hooks/use-toast";
import { findProduct } from "@/utils/subscriptionProducts";

interface ProOfferCardProps {
  onContinue: () => void;
}

export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, isPro, isLoading } = useSubscription();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Resolve products from RevenueCat offerings or fall back to hard-coded stubs
  const weeklyProduct = findProduct(offerings, REVENUECAT_CONFIG.products.weekly);
  const monthlyProduct = findProduct(offerings, REVENUECAT_CONFIG.products.monthly);

  const weeklyPriceDisplay = weeklyProduct?.priceString ?? `$${(weeklyProduct?.price ?? 4.99).toFixed(2)}`;
  const monthlyPriceDisplay = monthlyProduct?.priceString ?? `$${(monthlyProduct?.price ?? 12.99).toFixed(2)}`;

  const handlePurchase = async (plan: 'weekly' | 'monthly') => {
    if (isProcessing) return;
    setIsProcessing(true);
    setHasError(false);

    try {
      const product = plan === 'weekly' ? weeklyProduct : monthlyProduct;

      if (!product) {
        toast({
          variant: 'destructive',
          title: 'Store Unavailable',
          description: 'We are still connecting to the App Store. Please try again in a moment.'
        });
        return;
      }

      const success = await purchaseProduct(product);
      if (success) setTimeout(onContinue, 1000);
      else setHasError(true);
    } catch (error) {
      console.error('Purchase error:', error);
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-black/30 backdrop-blur-lg border-white/10 max-w-sm w-full">
      <CardContent className="p-8">
        {/* App Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-orange-400/20 p-4">
            <Sparkles className="h-12 w-12 text-orange-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white text-center mb-2">
          Unlock Premium Features
        </h3>
        <p className="text-white/70 text-center mb-6">
          Choose your subscription plan
        </p>

        {/* Features List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-white/90">Unlimited style analyses</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-white/90">Personalized recommendations</span>
          </div>
        </div>

        {/* Error State */}
        {hasError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-300 font-medium text-sm">
              Payment didn't go through. Please try again.
            </p>
          </div>
        )}

        {/* Debug Info for Development */}
        {isPro && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-yellow-300 font-medium text-sm">
              ⚠️ Existing subscription detected. Complete payment to verify access.
            </p>
          </div>
        )}

        {/* Plan Buttons */}
        <div className="space-y-3 mb-4">
          {/* Weekly Plan - Popular */}
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
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Starting Weekly...
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl font-bold">{weeklyPriceDisplay}/week</div>
                  <div className="text-sm opacity-90">Weekly Premium</div>
                </div>
              )}
            </Button>
          </div>

          {/* Monthly Plan */}
          <Button
            onClick={() => handlePurchase('monthly')}
            disabled={isProcessing || isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white border-0"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Starting Monthly...
              </div>
            ) : hasError ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Try Again
              </div>
            ) : (
              <div className="text-center">
                <div className="text-xl font-bold">{monthlyPriceDisplay}/month</div>
                <div className="text-sm opacity-90">Monthly Premium</div>
              </div>
            )}
          </Button>
        </div>

        {/* Terms */}
        <div className="flex justify-center items-center mt-4 text-sm text-white/60">
          <button className="hover:text-white/80">Terms & Conditions</button>
        </div>
      </CardContent>
    </Card>
  );
};
