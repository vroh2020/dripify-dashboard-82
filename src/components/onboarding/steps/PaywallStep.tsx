import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, Zap, Sparkles } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useToast } from "@/hooks/use-toast";
import { REVENUECAT_CONFIG } from "@/config/revenueCat";

interface PaywallStepProps {
  onPurchase: () => void;
}

export const PaywallStep = ({ onPurchase }: PaywallStepProps) => {
  const { purchaseProduct, offerings, isLoading } = useRevenueCat();
  const { toast } = useToast();

  const handlePurchase = async () => {
    try {
      // First try to find the product from offerings
      const product = offerings?.[0]?.availablePackages?.find(pkg => 
        pkg.product.identifier === REVENUECAT_CONFIG.products.monthly
      )?.product;

      if (product) {
        console.log('✅ Found product from offerings:', product.identifier);
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
            description: "Please try again to unlock premium features.",
          });
        }
      } else {
        // Fallback: try with the configured product ID directly
        console.log('⚠️ Product not found in offerings, trying direct purchase with:', REVENUECAT_CONFIG.products.monthly);
        const success = await purchaseProduct(REVENUECAT_CONFIG.products.monthly);
        if (success) {
          toast({
            title: "Welcome to Premium! 🎉",
            description: "Your subscription is now active. Enjoy unlimited style analyses!",
          });
          onPurchase();
        } else {
          throw new Error('Product not available');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "Product temporarily unavailable. Please try again later or contact support.",
        variant: "destructive"
      });
    }
  };

  // Show loading state during RevenueCat initialization
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-b from-indigo-900/60 via-purple-800/40 to-black flex flex-col justify-center items-center px-6 py-8"
      >
        <div className="text-center text-white space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
          <p>Loading subscription options...</p>
        </div>
      </motion.div>
    );
  }

  // Get pricing from offerings or use fallback
  const monthlyPackage = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier === REVENUECAT_CONFIG.products.monthly
  );
  const priceString = monthlyPackage?.product?.priceString || "$12.99";

  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-b from-indigo-900/60 via-purple-800/40 to-black flex flex-col justify-center items-center px-6 py-8 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-4"
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
            className="flex justify-center"
          >
            <Crown className="w-16 h-16 text-orange-400" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Unlock Your Style Potential
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Get unlimited outfit analyses, personalized style reports, and early access to trends
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-3"
        >
          {["Unlimited outfit analyses", "Personalized style reports", "Early-access trends", "Advanced color palette analysis", "Priority customer support", "Export your style profiles"].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
              className="flex items-center space-x-3"
            >
              <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <span className="text-white/80 text-sm">{feature}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-gradient-to-r from-purple-900/40 to-purple-700/40 rounded-2xl p-4 border border-purple-500/30"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">{priceString}/month</div>
            <div className="text-white/60 text-xs">Cancel anytime</div>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={handlePurchase}
            disabled={false} // Always enable the button, handle errors in the function
            className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            <Crown className="mr-3 h-6 w-6" />
            Unlock Premium
          </Button>
        </motion.div>

        {/* Legal Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-white/40 text-xs leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy. {priceString}/month.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}; 