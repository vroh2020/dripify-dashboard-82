import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { REVENUECAT_CONFIG } from "@/config/revenueCat";

interface ProOfferCardProps {
  onContinue: () => void;
}

export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, isPro, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Find the Pro product - look for gs_1099_1m specifically
  const proProduct = offerings?.[0]?.availablePackages?.find(
    (pkg) =>
      pkg.product.identifier === REVENUECAT_CONFIG.products.monthly ||
      pkg.product.identifier === "gs_1099_1m" ||
      pkg.product.identifier.includes("pro")
  );

  // Format the price
  const formattedPrice = proProduct?.product.priceString || "$10.99";

  const handleStartTrial = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setHasError(false);
    
    try {
      // CRITICAL FIX: Always show payment flow, even if isPro is detected
      // This prevents bypass vulnerability from cached/existing subscriptions
      
      const product = proProduct || {
        identifier: REVENUECAT_CONFIG.products.monthly,
        title: "Pro Monthly",
        description: "Pro subscription",
        price: 10.99,
        priceString: "$10.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1M",
      };
      
      const success = await purchaseProduct(product);
      
      if (success) {
        // Payment succeeded - proceed to completion
        onContinue();
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // CRITICAL FIX: Remove auto-complete bypass
  // Always show payment screen regardless of isPro status
  // This prevents users from skipping payment due to cached/test subscriptions

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-8">
      <div className="w-full max-w-md mx-auto flex flex-col items-center bg-black/70 rounded-3xl shadow-2xl p-8 border border-white/10">
        <span className="text-5xl mb-6">🚀</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-4 tracking-tight">Get Drip AI Pro</h1>
        <p className="text-lg text-white/80 text-center mb-8">Unlock your full style potential with unlimited analyses and recommendations.</p>
        <div className="w-full flex flex-col items-center mb-8">
          <span className="text-3xl font-bold text-orange-400 mb-1">{formattedPrice}</span>
          <span className="text-base text-white/70 mb-2">per month</span>
        </div>
        {hasError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-300 font-medium text-sm">
              Payment didn't go through. Please try again.
            </p>
          </div>
        )}
        {isPro && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-yellow-300 font-medium text-sm">
              ⚠️ Existing subscription detected. Complete payment to verify access.
            </p>
          </div>
        )}
        <Button
          onClick={handleStartTrial}
          disabled={isProcessing || isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-extrabold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white mb-4"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Subscribing...
            </div>
          ) : hasError ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Try Again
            </div>
          ) : (
            "Subscribe Now"
          )}
        </Button>
        <div className="text-white/40 text-xs text-center mt-2">Cancel anytime. No hidden fees.</div>
      </div>
    </div>
  );
};