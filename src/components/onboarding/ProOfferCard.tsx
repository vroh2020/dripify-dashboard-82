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
        description: "Pro subscription",
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-8">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center bg-black/70 rounded-3xl shadow-2xl p-8 border border-white/10">
        <div className="flex flex-col items-center mb-6">
          <span className="text-5xl mb-2">🚨</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-2 tracking-tight">YOUR TRANSFORMATION IS READY</h1>
          <p className="text-orange-400 font-semibold text-lg mb-2">Your Style Potential: <span className="text-green-400">94/100 (Top 2% of women)</span></p>
        </div>
        <div className="w-full mb-6">
          <h2 className="text-xl font-bold text-white mb-2 text-center">🔥 WHAT YOU GET RIGHT NOW:</h2>
          <ul className="text-white/90 space-y-2 text-base list-disc list-inside">
            <li>💎 <b>Complete Style DNA Report</b> ($400 value)</li>
            <li>✨ 47-point detailed analysis</li>
            <li>👗 Your exact style archetype</li>
            <li>🌟 Celebrity lookalike matches</li>
            <li>🧬 Body-type specific secrets</li>
            <li>🛍️ AI outfit recommendations</li>
            <li>🎨 Color palette generator</li>
            <li>🛒 Shopping links for your items</li>
            <li>📸 Mirror selfie rating system</li>
          </ul>
        </div>
        <div className="w-full mb-6">
          <h2 className="text-xl font-bold text-white mb-2 text-center">🎯 EXCLUSIVE BONUSES (Today Only):</h2>
          <ul className="text-white/90 space-y-2 text-base list-disc list-inside">
            <li>🎁 "Glow Up in 7 Days" challenge ($97 value)</li>
            <li>🎁 "Date Night Emergency Kit" ($67 value)</li>
            <li>🎁 "Instagram Baddie" photo guide ($47 value)</li>
            <li>🎁 "Confidence Affirmations" audio ($37 value)</li>
          </ul>
        </div>
        <div className="w-full mb-6 flex flex-col items-center">
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-center w-full mb-2">
            <span className="text-2xl font-bold text-orange-400 line-through mr-2">$948</span>
            <span className="text-2xl font-bold text-green-400">$12.99/month</span>
            <div className="text-orange-300 text-sm mt-1">LIMITED TIME: 98% OFF</div>
          </div>
          <div className="text-pink-300 text-xs mb-2">⏰ EXPIRES IN: 09:23 &nbsp;|&nbsp; ONLY 3 SPOTS LEFT TODAY</div>
        </div>
        <div className="w-full mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-white/80 text-center text-base italic">
            <div className="mb-2">"Went from invisible to getting asked out daily" <span className="text-orange-300">- Maya K.</span></div>
            <div className="mb-2">"My boss asked if I hired a stylist" <span className="text-orange-300">- Sarah M.</span></div>
            <div>"Strangers literally stop me to compliment my outfits" <span className="text-orange-300">- Alex T.</span></div>
          </div>
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
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-extrabold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white mt-2 mb-4"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Starting Subscription...
            </div>
          ) : hasError ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Try Again
            </div>
          ) : (
            "CLAIM MY TRANSFORMATION NOW"
          )}
        </Button>
        <div className="text-white/60 text-xs text-center mt-2">"Most women stay invisible forever. You're different."</div>
        <div className="text-white/40 text-xs text-center mt-1">💭 "A year from now, you'll wish you started today"</div>
      </div>
    </div>
  );
};