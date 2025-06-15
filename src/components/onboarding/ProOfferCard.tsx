
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface ProOfferCardProps {
  onContinue: () => void;
}

export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, restorePurchases, isPro, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Find the Pro product - look for gs_1299_1m specifically
  const proProduct = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier === 'gs_1299_1m' || 
    pkg.product.identifier.includes('pro') || 
    pkg.product.title.toLowerCase().includes('pro')
  );

  // Format the price
  const formattedPrice = proProduct?.product.priceString || "$12.99";

  const handleUpgrade = async () => {
    if (!proProduct) {
      console.log('🚫 No pro product found, using fallback product ID');
      // Use the specific product ID we know exists
      setIsProcessing(true);
      try {
        const success = await purchaseProduct('gs_1299_1m');
        if (success) {
          setTimeout(onContinue, 1000);
        }
      } catch (error) {
        console.error("Purchase error:", error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);
    try {
      const success = await purchaseProduct(proProduct.product.identifier);
      if (success) {
        setTimeout(onContinue, 1000);
      }
    } catch (error) {
      console.error("Purchase error:", error);
    } finally {
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
      <Card className="bg-black/30 backdrop-blur-lg border-purple-500/30 max-w-sm w-full">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-purple-500/20 p-4">
              <Crown className="h-12 w-12 text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-4">You're Already Pro! 🎉</h3>
          <p className="text-white/70 text-lg mb-6">
            You have full access to all premium features and benefits.
          </p>
        </CardContent>
        <CardFooter className="p-8 pt-0">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white h-14 text-lg font-bold rounded-2xl"
            onClick={onContinue}
          >
            Continue to App
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-black/30 backdrop-blur-lg border-white/10 overflow-hidden max-w-sm w-full">
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 py-3 px-6 text-center">
        <span className="text-sm font-medium text-purple-300">Special Launch Offer</span>
      </div>

      <CardContent className="p-8">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-purple-500/20 p-4">
            <Sparkles className="h-12 w-12 text-purple-400" />
          </div>
        </div>
        
        <h3 className="text-2xl font-semibold text-white text-center mb-4">Upgrade to Pro</h3>
        <p className="text-white/70 text-center mb-6 text-lg">
          Get the most out of your style journey with premium features
        </p>
        
        <div className="text-center mb-6">
          <span className="text-3xl font-bold text-white">{formattedPrice}</span>
          <span className="text-base text-white/70 ml-1">/ month</span>
          <div className="text-sm text-purple-300 mt-1">7-day free trial included</div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-purple-400 flex-shrink-0" />
            <span className="text-white/80">Unlimited style analyses</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-purple-400 flex-shrink-0" />
            <span className="text-white/80">Detailed breakdown reports</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-purple-400 flex-shrink-0" />
            <span className="text-white/80">Personalized recommendations</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-purple-400 flex-shrink-0" />
            <span className="text-white/80">Save unlimited outfits</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-3 p-8 pt-0">
        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white h-14 text-lg font-bold rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
          onClick={handleUpgrade}
          disabled={isProcessing || isRestoring || isLoading}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </div>
          ) : (
            `Start Free Trial - ${formattedPrice}/month`
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"
          onClick={handleRestore}
          disabled={isProcessing || isRestoring || isLoading}
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
          className="w-full text-white/70 hover:text-white hover:bg-white/5"
          onClick={onContinue}
          disabled={isProcessing || isRestoring}
        >
          Continue with Free Plan
        </Button>
      </CardFooter>
    </Card>
  );
};
