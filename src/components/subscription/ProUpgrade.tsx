import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, RefreshCw, Timer, Calendar, Crown } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { format } from "date-fns";
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

interface ProUpgradeProps {
  compact?: boolean;
}

export const ProUpgrade = ({ compact = false }: ProUpgradeProps) => {
  const { isLoading, subscription, offerings, purchaseProduct, restorePurchases } = useRevenueCat();
  const [restoring, setRestoring] = useState(false);

  // Determine if user has Pro access
  const isPro = subscription.isActive;

  // Format the expiration date if available
  const formattedExpirationDate = subscription.expirationDate
    ? format(subscription.expirationDate, 'MMM dd, yyyy')
    : null;

  // Determine current plan type
  const isWeeklyPlan = subscription.productId === REVENUECAT_CONFIG.products.weekly;
  const isMonthlyPlan = subscription.productId === REVENUECAT_CONFIG.products.monthly;
  const currentPlanName = isWeeklyPlan ? 'Weekly Premium' : isMonthlyPlan ? 'Monthly Premium' : 'Premium';

  // Find the Pro products
  const monthlyProduct = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier.includes('1299') || pkg.product.identifier.includes('pro') || pkg.product.identifier === REVENUECAT_CONFIG.products.monthly
  );

  const weeklyProduct = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier === REVENUECAT_CONFIG.products.weekly
  );

  // Handle purchase
  const handlePurchase = async (planType: 'weekly' | 'monthly' = 'weekly') => {
    const targetProduct = planType === 'weekly' ? weeklyProduct : monthlyProduct;

    // If the product is found in the current offerings use it, otherwise fall back
    // to the known identifier so the web-demo flow can still proceed.
    const productId = targetProduct?.product.identifier ?? (
      planType === 'weekly' ? REVENUECAT_CONFIG.products.weekly : REVENUECAT_CONFIG.products.monthly
    );

    await purchaseProduct(productId);
  };

  // Handle restore
  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      return restored;
    } catch (error) {
      console.error('Error in handleRestore:', error);
    } finally {
      setRestoring(false);
    }
  };

  if (compact) {
    return (
      <Card className={`bg-black/20 backdrop-blur-lg border-${isPro ? 'purple-500/30' : 'white/10'}`}>
        <CardContent className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className={`h-5 w-5 ${isPro ? 'text-purple-400' : 'text-white/70'}`} />
            <span className="font-medium">{isPro ? currentPlanName : 'Upgrade to Pro'}</span>
          </div>
          {isPro ? (
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-400">Active</span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
              onClick={() => handlePurchase('weekly')}
              disabled={isLoading}
            >
              Upgrade
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-black/20 backdrop-blur-lg border-${isPro ? 'purple-500/30' : 'white/10'} overflow-hidden`}>
      {isPro && (
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 py-2 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium text-purple-300">{currentPlanName} Active</span>
            </div>
            {formattedExpirationDate && (
              <div className="flex items-center gap-1 text-xs text-purple-200">
                <Calendar className="h-3 w-3" />
                <span>Renews {formattedExpirationDate}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          {isPro ? 'Subscription Management' : 'Upgrade to Pro'}
        </CardTitle>
        <CardDescription>
          {isPro 
            ? `Your ${currentPlanName} subscription is active${formattedExpirationDate ? ` until ${formattedExpirationDate}` : ''}`
            : 'Choose your plan and unlock all premium features'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Features List */}
        <div className="space-y-2">
          <h4 className="font-medium text-white mb-3">Premium Features:</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Unlimited style analyses</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Detailed breakdown reports</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Personalized style recommendations</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Save and organize your outfits</span>
            </div>
          </div>
        </div>

        {/* Plan Selection (only show if not already subscribed) */}
        {!isPro && (
          <div className="space-y-3">
            <h4 className="font-medium text-white mb-3">Choose Your Plan:</h4>
            
            {/* Weekly Plan - Popular */}
            <div className="relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <Button
                onClick={() => handlePurchase('weekly')}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-14 text-base font-bold rounded-xl transition-all duration-300 hover:scale-105 text-white border-0 pt-3"
              >
                <div className="text-center">
                  <div className="text-lg font-bold">$4.99/week</div>
                  <div className="text-sm opacity-90">Weekly Premium</div>
                </div>
              </Button>
            </div>

            {/* Monthly Plan */}
            <Button
              onClick={() => handlePurchase('monthly')}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-base font-bold rounded-xl transition-all duration-300 hover:scale-105 text-white border-0"
            >
              <div className="text-center">
                <div className="text-lg font-bold">$12.99/month</div>
                <div className="text-sm opacity-90">Monthly Premium</div>
              </div>
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        {isPro ? (
          <div className="w-full space-y-2">
            <Button 
              disabled
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              {currentPlanName} Active
            </Button>
            <p className="text-xs text-center text-white/60">
              Your subscription will automatically renew. Cancel anytime in your App Store settings.
            </p>
          </div>
        ) : null}
        
        <Button 
          variant="ghost" 
          className="text-white/70 hover:text-white"
          onClick={handleRestore}
          disabled={isLoading || restoring}
        >
          {restoring ? (
            <Timer className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Restore Purchases
        </Button>
      </CardFooter>
    </Card>
  );
};
