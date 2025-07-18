import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, Zap, Sparkles } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useToast } from "@/hooks/use-toast";

interface PaywallStepProps {
  onPurchase: () => void;
  onContinueFree: () => void;
}

export const PaywallStep = ({ onPurchase, onContinueFree }: PaywallStepProps) => {
  const { offerings, purchaseProduct, isLoading } = useRevenueCat();
  const { toast } = useToast();

  const handlePurchase = async () => {
    if (!offerings || offerings.length === 0) {
      console.error('No subscription options available');
      toast({
        title: "Subscription Unavailable",
        description: "Please try again later or continue with the free version.",
        variant: "destructive"
      });
      return;
    }
    
    const product = offerings[0]?.availablePackages?.[0]?.product;
    if (!product) {
      console.error('No subscription product found');
      toast({
        title: "Product Error",
        description: "Subscription product not found. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const success = await purchaseProduct(product.identifier);
      if (success) {
        toast({
          title: "Welcome to Premium! 🎉",
          description: "Your subscription is now active. Enjoy unlimited style analyses!",
        });
        onPurchase();
      } else {
        toast({
          title: "Purchase Cancelled",
          description: "You can continue with the free version or try again later.",
        });
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again or continue with the free version.",
        variant: "destructive"
      });
    }
  };

  const features = [
    { icon: Zap, text: 'Unlimited outfit analyses' },
    { icon: Sparkles, text: 'Personalized style reports' },
    { icon: Star, text: 'Early-access trends' },
    { icon: Crown, text: 'Advanced color palette analysis' },
    { icon: Check, text: 'Priority customer support' },
    { icon: Check, text: 'Export your style profiles' }
  ];

  const price = offerings?.[0]?.availablePackages?.[0]?.product?.priceString || "$12.99/month";
  const trialText = "7-day free trial"; // Default trial text

  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-6"
            >
              <Crown className="w-16 h-16 text-orange-400 mx-auto" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Unlock Your Style Potential</h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Get unlimited outfit analyses, personalized style reports, and early access to trends
            </p>
          </motion.div>
        </div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-sm space-y-3 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
              className="flex items-center space-x-3"
            >
              <feature.icon className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <span className="text-white/80 text-sm">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-sm space-y-4"
        >
          <div className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-2xl p-4 border border-orange-500/30">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{price}</div>
              {trialText && (
                <div className="text-orange-400 text-sm font-medium">{trialText}</div>
              )}
              <div className="text-white/60 text-xs mt-1">Cancel anytime</div>
            </div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="space-y-3"
          >
            <Button
              onClick={handlePurchase}
              disabled={isLoading}
              className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <Crown className="mr-3 h-6 w-6" />
                  Unlock Premium
                </>
              )}
            </Button>
            
            <Button
              onClick={onContinueFree}
              variant="outline"
              className="w-full h-14 text-base font-medium rounded-2xl border-white/20 text-white hover:bg-white/10 transition-all duration-300"
            >
              Continue with Free
            </Button>
          </motion.div>
        </motion.div>

        {/* Legal Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-6"
        >
          <p className="text-white/40 text-xs leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy. 
            {trialText && ` ${trialText} then ${price}.`}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}; 