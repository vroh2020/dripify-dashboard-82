import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown } from "lucide-react";
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface PaywallStepProps {
  onPurchase: () => void;
  onContinueFree: () => void;
}

export const PaywallStep = ({ onPurchase, onContinueFree }: PaywallStepProps) => {
  const { offerings, purchaseProduct, isLoading } = useRevenueCat();

  const handlePurchase = async () => {
    if (!offerings || offerings.length === 0) {
      console.error('No subscription options available');
      return;
    }
    
    const product = offerings[0]?.availablePackages?.[0]?.product;
    if (!product) {
      console.error('No subscription product found');
      return;
    }
    
    try {
      const success = await purchaseProduct(product.identifier);
      if (success) {
        onPurchase();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const features = [
    'Unlimited outfit analyses',
    'Personalized style reports', 
    'Early-access trends',
    'Advanced color palette analysis',
    'Priority customer support',
    'Export your style profiles'
  ];

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
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-6"
        >
          <Crown className="w-16 h-16 text-orange-400 mx-auto" />
        </motion.div>
        
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Unlock Premium Styling</h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Get unlimited outfit analyses, personalized style reports, and early-access trends
            </p>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10 w-full max-w-sm mb-8"
        >
          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                className="flex items-center space-x-3"
              >
                <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-white/90 text-sm">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Button Area - Fixed bottom */}
      <div className="px-6 pb-8 space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            <Sparkles className="mr-3 h-5 w-5" />
            {isLoading ? 'Loading...' : 'Unlock Premium'}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Button
            onClick={onContinueFree}
            className="w-full h-14 text-lg font-medium rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 hover:scale-105"
          >
            Continue with Free Plan
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-white/60 text-xs text-center"
        >
          Cancel anytime. No account required for purchase.
        </motion.p>
      </div>
    </motion.div>
  );
}; 