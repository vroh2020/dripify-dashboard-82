import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Star, Zap, Sparkles } from 'lucide-react';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { SubscriptionDescription } from '@/components/subscription/SubscriptionDescription';
import { OptionalRegistration } from '@/components/auth/OptionalRegistration';

interface PaywallProps {
  onPurchaseSuccess?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchaseSuccess }) => {
  const { offerings, purchaseProduct, isLoading, restorePurchases } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (productId: string) => {
    setPurchasing(true);
    try {
      const success = await purchaseProduct(productId);
      if (success) {
        toast({
          title: "Purchase Successful!",
          description: "Welcome to Dripify AI Premium! Enjoy unlimited style analyses.",
        });
        onPurchaseSuccess?.();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      toast({
        title: "Purchases Restored",
        description: "Your previous purchases have been restored.",
      });
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "No purchases found to restore.",
        variant: "destructive",
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background p-8 rounded-lg">
          <div className="text-center">Loading subscription options...</div>
        </div>
      </div>
    );
  }

  const monthlyOffering = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.packageType === 'MONTHLY'
  );
  
  const yearlyOffering = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.packageType === 'ANNUAL'
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-gradient-to-b from-indigo-900/60 via-purple-800/40 to-black border-white/10">
          <div className="p-6">
            {/* Subscription Description */}
            <SubscriptionDescription />
            {/* Optional Registration */}
            <OptionalRegistration onPurchase={() => handlePurchase(monthlyOffering?.product?.identifier || '')} />
            {/* Header */}
            <div className="text-center mb-6">
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
                className="flex justify-center mb-4"
              >
                <Crown className="w-16 h-16 text-orange-400" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-4">Unlock Your Style Potential</h2>
              <p className="text-white/70 text-base leading-relaxed">
                Get unlimited outfit analyses, personalized style reports, and early access to trends
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <feature.icon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <span className="text-white/80 text-sm">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Pricing Box */}
            <div className="bg-gradient-to-r from-purple-900/40 to-purple-700/40 rounded-2xl p-4 border border-purple-500/30 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  ${monthlyOffering?.product?.price || '12.99'}/month
                </div>
                <div className="text-white/60 text-xs">Cancel anytime</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handlePurchase(monthlyOffering?.product?.identifier || '')}
                disabled={purchasing || isLoading}
                className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
              >
                {purchasing ? (
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
                onClick={handleRestore}
                variant="outline"
                className="w-full h-14 text-base font-medium rounded-2xl border-white/20 text-white hover:bg-white/10 transition-all duration-300"
              >
                Restore Purchase
              </Button>
            </div>

            {/* Legal Text */}
            <div className="text-center mt-6">
              <p className="text-white/40 text-xs leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy. {monthlyOffering?.product?.price || '12.99'}/month.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};