import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Star, Zap, Sparkles } from 'lucide-react';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { SubscriptionDescription } from '@/components/subscription/SubscriptionDescription';
import { OptionalRegistration } from '@/components/auth/OptionalRegistration';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

interface PaywallProps {
  onPurchaseSuccess?: () => void;
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchaseSuccess }) => {
  const { offerings, purchaseProduct, isLoading, restorePurchases } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');
  const { toast } = useToast();
  
  // Add logging throttle
  const lastLogTimeRef = useRef(0);
  const logCountRef = useRef(0);

  const handlePurchase = async (productId: string) => {
    setPurchasing(true);
    try {
      const success = await purchaseProduct(productId);
      if (success) {
        toast({
          title: "Purchase Successful!",
          description: "Welcome to Premium! 🎉"
        });
        onPurchaseSuccess?.();
      } else {
        toast({
          title: "Purchase Cancelled",
          description: "No worries, you can upgrade anytime!",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const success = await restorePurchases();
      if (success) {
        toast({
          title: "Purchases Restored!",
          description: "Your premium features have been restored."
        });
        onPurchaseSuccess?.();
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous purchases to restore.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Unable to restore purchases. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  // Memoize the pricing calculation to prevent excessive re-computation
  const pricingData = useMemo(() => {
    let weeklyOffering = null;
    let monthlyOffering = null;

    if (offerings && offerings.length > 0) {
      for (const offering of offerings) {
        for (const pkg of offering.availablePackages) {
          if (pkg.product.identifier === REVENUECAT_CONFIG.products.weekly) {
            weeklyOffering = pkg;
          }
          if (pkg.product.identifier === REVENUECAT_CONFIG.products.monthly) {
            monthlyOffering = pkg;
          }
        }
      }
    }

    const weeklyPrice = weeklyOffering?.product?.priceString || "$4.99";
    const monthlyPrice = monthlyOffering?.product?.priceString || "$10.99";

    // Throttled logging to prevent console spam
    const now = Date.now();
    if (now - lastLogTimeRef.current > 1000) { // Log at most once per second
      logCountRef.current += 1;
      lastLogTimeRef.current = now;
      
      if (logCountRef.current <= 5) { // Limit to 5 logs total
        console.log('💰 Main Paywall pricing determined:', { weeklyPrice, monthlyPrice, weeklyOffering, monthlyOffering });
      } else if (logCountRef.current === 6) {
        console.warn('⚠️ Paywall pricing logs throttled - preventing console spam');
      }
    }

    return {
      weeklyPrice,
      monthlyPrice,
      weeklyOffering,
      monthlyOffering
    };
  }, [offerings]); // Only recalculate when offerings change

  const plans = [
    {
      id: 'weekly' as const,
      name: 'Weekly Premium',
      price: pricingData.weeklyPrice,
      period: '/week',
      productId: REVENUECAT_CONFIG.products.weekly,
      description: 'Perfect for trying premium features',
      popular: false,
      savings: null
    },
    {
      id: 'monthly' as const,
      name: 'Monthly Premium',
      price: pricingData.monthlyPrice,
      period: '/month',
      productId: REVENUECAT_CONFIG.products.monthly,
      description: 'Best value for serious users',
      popular: true,
      savings: 'Save 60%'
    }
  ];

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
        <Card className="relative bg-gradient-to-br from-purple-900/90 to-black/90 border-purple-500/30 text-white">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white z-10"
            >
              <X className="h-6 w-6" />
            </button>
          )}
          
          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
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
              >
                <Crown className="h-16 w-16 text-orange-400 mx-auto" />
              </motion.div>
              <h2 className="text-3xl font-bold">Unlock Premium Features</h2>
              <p className="text-white/70">
                Get unlimited access to all AI style analysis features
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <Icon className="h-5 w-5 text-orange-400 flex-shrink-0" />
                    <span className="text-sm">{feature.text}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Plan Selection */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">Choose Your Plan</h3>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <motion.button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 relative ${
                      selectedPlan === plan.id
                        ? 'border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-400/20'
                        : 'border-white/20 bg-white/5 hover:border-white/30'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-4 bg-orange-500 text-white">
                        POPULAR
                      </Badge>
                    )}
                    {plan.savings && (
                      <Badge className="absolute -top-2 right-4 bg-green-500 text-white">
                        {plan.savings}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-left">
                        <div className="font-semibold text-lg">{plan.name}</div>
                        <div className="text-white/60 text-sm">{plan.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-2xl">{plan.price}</div>
                        <div className="text-white/60 text-sm">{plan.period}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={() => {
                  const selectedPlanData = plans.find(p => p.id === selectedPlan);
                  if (selectedPlanData) {
                    handlePurchase(selectedPlanData.productId);
                  }
                }}
                disabled={purchasing}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {purchasing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Crown className="mr-2 h-5 w-5" />
                    Start {selectedPlan === 'weekly' ? 'Weekly' : 'Monthly'} Plan
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleRestore}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Restore Purchases
              </Button>
            </div>

            {/* Legal */}
            <p className="text-xs text-white/40 text-center">
              By purchasing, you agree to our Terms of Service and Privacy Policy. 
              Subscriptions auto-renew unless cancelled. Cancel anytime.
            </p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};