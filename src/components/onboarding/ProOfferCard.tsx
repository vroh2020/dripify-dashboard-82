import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Check, RefreshCw } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useState } from "react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface ProOfferCardProps {
  onContinue: () => void;
}

export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, restorePurchases } = useRevenueCat();
  const { isPro } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Find the Pro product
  const proProduct = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier.includes('pro') || pkg.product.title.toLowerCase().includes('pro')
  );

  // Format the price
  const formattedPrice = proProduct?.product.priceString || "$4.99";

  const handleUpgrade = async () => {
    if (!proProduct) {
      onContinue();
      return;
    }

    setIsProcessing(true);
    try {
      const success = await purchaseProduct(proProduct.product.identifier);
      if (success) {
        setTimeout(onContinue, 1000);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        setTimeout(onContinue, 1500);
      }
    } catch (error) {
      console.error("Restore error:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  if (isPro) {
    return (
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-purple-500/20 p-3">
              <Crown className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">You're Already Pro!</h3>
          <p className="text-white/70 mb-4">
            You already have full access to all premium features and benefits.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            onClick={onContinue}
          >
            Continue to App
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-lg border-white/10 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 py-2 px-4 text-center">
        <span className="text-sm font-medium text-purple-300">Special Offer</span>
      </div>

      <CardContent className="p-6">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-purple-500/20 p-3">
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-white text-center mb-2">Upgrade to Pro</h3>
        <p className="text-white/70 text-center mb-4">
          Get the most out of your style journey with premium features
        </p>
        
        <div className="text-center mb-4">
          <span className="text-2xl font-bold text-white">{formattedPrice}</span>
          <span className="text-sm text-white/70 ml-1">/ month</span>
        </div>
        
        <div className="space-y-3 mb-4">
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
            <span className="text-sm text-white/80">Personalized recommendations</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm text-white/80">Save unlimited outfits</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          onClick={handleUpgrade}
          disabled={isProcessing || isRestoring}
        >
          {isProcessing ? 'Processing...' : `Upgrade for ${formattedPrice}/month`}
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"
          onClick={handleRestore}
          disabled={isProcessing || isRestoring}
        >
          {isRestoring ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Restoring...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Purchases
            </>
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full text-white/70"
          onClick={onContinue}
          disabled={isProcessing || isRestoring}
        >
          Continue with Free Plan
        </Button>
      </CardFooter>
    </Card>
  );
};
