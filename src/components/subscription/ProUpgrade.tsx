
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, RefreshCw, Timer } from "lucide-react";
import { useRevenueCatSimple } from "@/hooks/useRevenueCatSimple";
import { format } from "date-fns";

interface ProUpgradeProps {
  compact?: boolean;
}

export const ProUpgrade = ({ compact = false }: ProUpgradeProps) => {
  const { isLoading, customerInfo, offerings, purchasePackage, restorePurchases, hasActiveSubscription } = useRevenueCatSimple();
  const [restoring, setRestoring] = useState(false);

  // Determine if user has Pro access
  const isPro = hasActiveSubscription();

  // Format the expiration date if available
  const formattedExpirationDate = customerInfo?.entitlements?.active?.pro?.expirationDate
    ? format(new Date(customerInfo.entitlements.active.pro.expirationDate), 'MMM dd, yyyy')
    : null;

  // Find the Pro product
  const proProduct = offerings?.availablePackages?.[0];
  
  // Format the price
  const formattedPrice = proProduct?.product.priceString || "$12.99";
  
  // Handle purchase
  const handlePurchase = async () => {
    if (proProduct) {
      await purchasePackage(proProduct);
    }
  };

  // Handle restore - ONLY restore, don't trigger purchases
  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
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
            <span className="font-medium">{isPro ? 'Pro Subscription' : 'Upgrade to Pro'}</span>
          </div>
          {isPro ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-400 hover:text-purple-300"
              disabled
            >
              <Check className="h-4 w-4 mr-1" />
              Active
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
              onClick={handlePurchase}
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
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 py-1 px-4 text-center">
          <span className="text-sm font-medium text-purple-300">Pro Plan Active</span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          {isPro ? 'Pro Subscription' : 'Upgrade to Pro'}
        </CardTitle>
        <CardDescription>
          {isPro 
            ? `Your subscription is active until ${formattedExpirationDate || 'ongoing'}`
            : 'Unlock all premium features and get more from your style analysis'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {!isPro && (
            <div className="text-center mb-4">
              <span className="text-2xl font-bold text-white">{formattedPrice}</span>
              <span className="text-sm text-white/70 ml-1">/ month</span>
            </div>
          )}
          
          <div className="space-y-2">
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
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {isPro ? (
          <Button 
            disabled
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Subscription Active
          </Button>
        ) : (
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            onClick={handlePurchase}
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isLoading ? 'Processing...' : `Upgrade for ${formattedPrice}/month`}
          </Button>
        )}
        
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
