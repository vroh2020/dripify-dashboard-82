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
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');

  // Find the products using the new product IDs - Enhanced search
  let weeklyProduct = null;
  let monthlyProduct = null;

  if (offerings && offerings.length > 0) {
    for (const offering of offerings) {
      for (const pkg of offering.availablePackages) {
        console.log('🔍 ProOfferCard - Checking package:', pkg.identifier, 'Product ID:', pkg.product.identifier);
        if (pkg.product.identifier === REVENUECAT_CONFIG.products.weekly) {
          weeklyProduct = pkg;
        }
        if (pkg.product.identifier === REVENUECAT_CONFIG.products.monthly) {
          monthlyProduct = pkg;
        }
      }
    }
  }

  // Format the prices
  const weeklyPrice = weeklyProduct?.product.priceString || "$4.99";
  const monthlyPrice = monthlyProduct?.product.priceString || "$10.99";

  const plans = [
    {
      id: 'weekly' as const,
      name: 'Weekly',
      price: weeklyPrice,
      period: '/week',
      product: weeklyProduct,
      fallback: {
        identifier: REVENUECAT_CONFIG.products.weekly,
        title: "Pro Weekly",
        description: "Pro weekly subscription",
        price: 4.99,
        priceString: "$4.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1W",
      }
    },
    {
      id: 'monthly' as const,
      name: 'Monthly',
      price: monthlyPrice,
      period: '/month',
      product: monthlyProduct,
      fallback: {
        identifier: REVENUECAT_CONFIG.products.monthly,
        title: "Pro Monthly",
        description: "Pro monthly subscription",
        price: 10.99,
        priceString: "$10.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1M",
      }
    }
  ];

  const handleStartTrial = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setHasError(false);
    
    try {
      // CRITICAL FIX: Always show payment flow, even if isPro is detected
      // This prevents bypass vulnerability from cached/existing subscriptions
      
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      const product = selectedPlanData?.product || selectedPlanData?.fallback;
      
      if (!product) {
        throw new Error('No product available');
      }
      
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

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 via-purple-700/10 to-transparent border-purple-500/30 shadow-2xl backdrop-blur-sm">
      <CardContent className="p-8 text-center space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center">
            <Sparkles className="h-16 w-16 text-orange-400" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Unlock Premium Features
            </h3>
            <p className="text-white/70 text-sm">
              Get unlimited style analyses and personalized recommendations
            </p>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full p-3 rounded-xl border transition-all duration-300 ${
                selectedPlan === plan.id
                  ? 'border-orange-500 bg-orange-500/20 text-white'
                  : 'border-white/20 bg-white/5 text-white/80 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{plan.name}</span>
                <span className="font-bold">{plan.price}{plan.period}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleStartTrial}
            disabled={isProcessing || isLoading}
            className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-xl"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <Sparkles className="mr-3 h-5 w-5" />
                Start {selectedPlanData?.name} Plan
              </>
            )}
          </Button>

          {hasError && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/30">
              <p className="font-medium">Payment failed</p>
              <p className="text-xs opacity-80 mt-1">Please try again or contact support</p>
            </div>
          )}

          <div className="text-white/40 text-xs">
            <p>Cancel anytime • No commitment</p>
            <p className="mt-1">
              {selectedPlanData?.price}{selectedPlanData?.period} after trial
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};