import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Check, Star, Zap, Sparkles } from "lucide-react";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useToast } from "@/hooks/use-toast";
import { REVENUECAT_CONFIG } from "@/config/revenueCat";
import { useState } from "react";

interface PaywallStepProps {
  onPurchase: () => void;
}

export const PaywallStep = ({ onPurchase }: PaywallStepProps) => {
  const { purchaseProduct, offerings, isLoading } = useRevenueCat();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly'); // Default to monthly
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    try {
      const productId = selectedPlan === 'weekly' 
        ? REVENUECAT_CONFIG.products.weekly 
        : REVENUECAT_CONFIG.products.monthly;

      // First try to find the product from offerings
      const product = offerings?.[0]?.availablePackages?.find(pkg => 
        pkg.product.identifier === productId
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
        console.log('⚠️ Product not found in offerings, trying direct purchase with:', productId);
        const success = await purchaseProduct(productId);
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
    } finally {
      setIsPurchasing(false);
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

  // Get pricing from offerings or use fallbacks
  const weeklyPackage = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier === REVENUECAT_CONFIG.products.weekly
  );
  const monthlyPackage = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.product.identifier === REVENUECAT_CONFIG.products.monthly
  );

  const weeklyPrice = weeklyPackage?.product?.priceString || "$4.99";
  const monthlyPrice = monthlyPackage?.product?.priceString || "$10.99";

  const plans = [
    {
      id: 'weekly' as const,
      name: 'Weekly',
      price: weeklyPrice,
      period: '/week',
      description: 'Perfect for trying out premium features',
      popular: false
    },
    {
      id: 'monthly' as const,
      name: 'Monthly',
      price: monthlyPrice,
      period: '/month',
      description: 'Best value for regular users',
      popular: true
    }
  ];

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

        {/* Plan Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-3"
        >
          {plans.map((plan) => (
            <motion.button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 relative ${
                selectedPlan === plan.id
                  ? 'border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-400/20 scale-105'
                  : 'border-white/20 bg-white/5 hover:border-white/30'
              }`}
              whileHover={{ scale: selectedPlan === plan.id ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                    POPULAR
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-white font-bold text-lg">{plan.name}</div>
                  <div className="text-white/60 text-sm">{plan.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-xl">{plan.price}</div>
                  <div className="text-white/60 text-sm">{plan.period}</div>
                </div>
              </div>
            </motion.button>
          ))}
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
            disabled={isPurchasing}
            className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            {isPurchasing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <Crown className="mr-3 h-6 w-6" />
                Start {selectedPlan === 'weekly' ? 'Weekly' : 'Monthly'} Plan
              </>
            )}
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
            By continuing, you agree to our Terms of Service and Privacy Policy. {selectedPlan === 'weekly' ? weeklyPrice + '/week' : monthlyPrice + '/month'}. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}; 