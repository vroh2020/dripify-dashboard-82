import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface ProOfferCardProps {
  onContinue: () => void;
}

export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, isPro, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Find the Pro product - look for gs_1299_1m specifically
  const proProduct = offerings?.[0]?.availablePackages?.find(
    (pkg) =>
      pkg.product.identifier === "gs_1299_1m" ||
      pkg.product.identifier.includes("pro") ||
      pkg.product.title.toLowerCase().includes("pro")
  );

  // Format the price
  const formattedPrice = proProduct?.product.priceString || "$12.99";

  const handleStartTrial = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setHasError(false);
    
    try {
      // CRITICAL FIX: Always show payment flow, even if isPro is detected
      // This prevents bypass vulnerability from cached/existing subscriptions
      
      const product = proProduct || {
        identifier: "gs_1299_1m",
        title: "Pro Monthly",
        description: "Pro subscription with 7-day free trial",
        price: 12.99,
        priceString: "$12.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1M",
      };
      
      const success = await purchaseProduct(product);
      
      if (success) {
        // Payment succeeded - proceed to completion
        setTimeout(onContinue, 1000);
      } else {
        // Payment failed - show error
        setHasError(true);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // CRITICAL FIX: Remove auto-complete bypass
  // Always show payment screen regardless of isPro status
  // This prevents users from skipping payment due to cached/test subscriptions

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
          Try Drip Max for free
        </h3>

        {/* Features List */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-white/90">Unlock unlimited style analyses</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-white/90">Personalized recommendations</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 mb-6 text-center">
          <div className="text-white/90 text-lg">
            <span className="font-bold text-2xl text-orange-400">{formattedPrice}</span>
            <span className="text-base"> Annual</span>
          </div>
          <div className="text-orange-300 text-sm mt-1">
            First 7 days free
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

        {/* Single Action Button */}
        <Button
          onClick={handleStartTrial}
          disabled={isProcessing || isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white border-0"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Starting Trial...
            </div>
          ) : hasError ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Try Again
            </div>
          ) : (
            "Try free and subscribe"
          )}
        </Button>

        {/* Small Text Links */}
        <div className="flex justify-between items-center mt-4 text-sm text-white/60">
          <button className="hover:text-white/80">Restore Purchase</button>
          <button className="hover:text-white/80">Terms & Conditions</button>
        </div>
      </CardContent>
    </Card>
  );
};
