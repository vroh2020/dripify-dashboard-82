import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface SecondPaywallProps {
  onContinue: () => void;
  onSkip: () => void;
}

// Track paywall interactions
const trackPaywallEvent = async (userId: string, event: string, data: any = {}) => {
  try {
    // Get current step_data
    const { data: currentData } = await supabase
      .from('onboarding_v2')
      .select('step_data')
      .eq('user_id', userId)
      .single();
    
    const stepData = (currentData?.step_data as any) || {};
    const paywallTracking = stepData.paywall_tracking || {};
    
    // Add new event
    paywallTracking[event] = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    // Update with merged data
    await supabase
      .from('onboarding_v2')
      .update({
        step_data: {
          ...stepData,
          paywall_tracking: paywallTracking
        }
      })
      .eq('user_id', userId);
    
    console.log('✅ Paywall event tracked:', event, data);
  } catch (error) {
    console.error('❌ Failed to track paywall event:', error);
  }
};

export const SecondPaywall = ({ onContinue, onSkip }: SecondPaywallProps) => {
  const { offerings, purchaseProduct } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Track paywall 2 view on mount
  useEffect(() => {
    if (user?.id) {
      trackPaywallEvent(user.id, 'paywall_2_viewed', {
        offerings_loaded: !!offerings,
        source: 'dismissed_paywall_1'
      });
    }
  }, [user?.id]);

  // Get the second paywall offering
  const budgetOffering = offerings?.find((o: any) => o.identifier === 'new_paywall_2');
  const weeklyPackage = budgetOffering?.availablePackages?.find(
    (p: any) => p.identifier === '$rc_weekly'
  );

  const handlePurchase = async () => {
    if (isProcessing || !weeklyPackage) return;
    
    setIsProcessing(true);
    setHasError(false);
    
    // Track purchase attempt
    if (user?.id) {
      trackPaywallEvent(user.id, 'paywall_2_purchase_attempt', {
        package: weeklyPackage?.identifier,
        price: weeklyPackage?.product?.priceString
      });
    }
    
    try {
      const success = await purchaseProduct(weeklyPackage);
      
      if (success) {
        // Track successful purchase
        if (user?.id) {
          trackPaywallEvent(user.id, 'paywall_2_purchase_success', {
            tier: 'budget',
            package: weeklyPackage?.identifier
          });
        }
        
        toast({ 
          title: "Welcome!", 
          description: "Your subscription is now active." 
        });
        setTimeout(onContinue, 1000);
      } else {
        setHasError(true);
        
        // Track failed purchase
        if (user?.id) {
          trackPaywallEvent(user.id, 'paywall_2_purchase_failed', {
            reason: 'purchase_returned_false'
          });
        }
      }
    } catch (error) {
      console.error("Purchase error:", error);
      setHasError(true);
      
      // Track error
      if (user?.id) {
        trackPaywallEvent(user.id, 'paywall_2_purchase_error', {
          error: String(error)
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    console.log('❌ SecondPaywall: X button clicked - entering free tier');
    
    // Track X button click (entering free tier)
    if (user?.id) {
      console.log('💾 SecondPaywall: Tracking dismiss event');
      trackPaywallEvent(user.id, 'paywall_2_dismissed', {
        action: 'clicked_x_button',
        result: 'entering_free_tier'
      });
    }
    
    console.log('🔄 SecondPaywall: Calling onSkip()');
    onSkip();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* X Button - Top Right */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
      >
        <X className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex-1 flex flex-col px-6 pt-16 pb-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8"
        >
          {/* SPECIAL OFFER Badge with Pulse + Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: [1, 1.05, 1],
            }}
            transition={{
              opacity: { duration: 0.4 },
              scale: { 
                repeat: Infinity, 
                duration: 2, 
                ease: "easeInOut" 
              }
            }}
            className="inline-block mb-4"
          >
            <div 
              className="bg-orange-100 text-orange-600 text-sm font-bold px-4 py-2 rounded-full relative"
              style={{
                boxShadow: '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(251, 146, 60, 0.2)'
              }}
            >
              🔥 SPECIAL OFFER - 50% OFF
            </div>
          </motion.div>

          {/* Main Header - Slide from top */}
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-[32px] font-bold text-black mb-2 leading-tight"
          >
            Wait! Try for just $0.99/week
          </motion.h1>

          {/* Subheader */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-gray-600 text-base"
          >
            Get started for less than a dollar per week
          </motion.p>
        </motion.div>

        {/* Product Card with Gradient + Float Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -5, 0]
          }}
          transition={{
            opacity: { duration: 0.5, delay: 0.4 },
            scale: { duration: 0.5, delay: 0.4 },
            y: {
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut",
              delay: 1
            }
          }}
          className="bg-gradient-to-br from-black via-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white relative"
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
          whileHover={{ 
            scale: 1.02,
            boxShadow: '0 15px 50px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Pricing Section */}
          <div className="flex justify-between items-start mb-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <p className="text-[40px] font-bold leading-none">$0.99</p>
              <p className="text-white/70 text-sm mt-1">per week</p>
            </motion.div>
            
            {/* BEST DEAL Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full"
            >
              BEST DEAL
            </motion.div>
          </div>
          
          {/* Features List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="space-y-3 mb-4"
          >
            {[
              'Unlimited outfit ratings',
              'AI style feedback',
              'Outfit history tracking',
              'Cancel anytime'
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.9 + (i * 0.1) }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-white/90">{feature}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            className="text-white/50 text-xs italic"
          >
            That's only $3.96/month - less than a coffee!
          </motion.p>

          {/* Subtle shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['200% 0', '-200% 0']
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "linear",
              delay: 2
            }}
          />
        </motion.div>

        {/* Error Message */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center"
          >
            <p className="text-red-600 text-sm font-medium">
              Payment didn't go through. Please try again.
            </p>
          </motion.div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="w-full bg-black text-white font-semibold py-6 rounded-2xl text-lg hover:bg-gray-900 mb-3 transition-all duration-300"
            style={{
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
            }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start for $0.99/week
              </motion.span>
            )}
          </Button>
        </motion.div>

        {/* Fine Print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-sm text-gray-500"
        >
          Cancel anytime. No commitments.
        </motion.p>
      </div>
    </div>
  );
};
