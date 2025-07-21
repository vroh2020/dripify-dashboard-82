import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Crown, Sparkles, Zap, Star, X, Check, ArrowRight, Shield } from 'lucide-react';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';

interface StrategicUpgradePromptProps {
  trigger: 'analysis_complete' | 'onboarding_midway' | 'paywall' | 'feature_limit';
  onUpgrade?: () => void;
  onSkip?: () => void;
  userContext?: {
    analysisCount?: number;
    timeSpent?: number;
    featuresUsed?: string[];
  };
}

export const StrategicUpgradePrompt: React.FC<StrategicUpgradePromptProps> = ({
  trigger,
  onUpgrade,
  onSkip,
  userContext
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const { toast } = useToast();
  const { purchaseProduct, offerings, isPro } = useSubscription();

  const getTriggerContent = () => {
    switch (trigger) {
      case 'analysis_complete':
        return {
          title: "Unlock Unlimited Style Analysis",
          subtitle: "You've completed your first analysis! Upgrade to Pro for unlimited insights.",
          features: [
            "Unlimited style analysis",
            "Advanced AI recommendations",
            "Personalized style reports",
            "Priority customer support"
          ],
          cta: "Upgrade to Pro",
          highlight: "Perfect timing! Your style journey is just beginning."
        };
      
      case 'onboarding_midway':
        return {
          title: "Complete Your Style Profile",
          subtitle: "You're halfway there! Upgrade to Pro to unlock your full potential.",
          features: [
            "Complete style assessment",
            "Personalized recommendations",
            "Advanced color analysis",
            "Style evolution tracking"
          ],
          cta: "Complete Setup",
          highlight: "You've invested time in your style - let's make it count!"
        };
      
      case 'paywall':
        return {
          title: "Unlock Premium Features",
          subtitle: "Take your style to the next level with Pro features.",
          features: [
            "Unlimited AI analysis",
            "Advanced style insights",
            "Personalized recommendations",
            "Exclusive style tips"
          ],
          cta: "Get Pro Access",
          highlight: "Join thousands of users who've transformed their style!"
        };
      
      case 'feature_limit':
        return {
          title: "You've Hit Your Limit",
          subtitle: "Upgrade to Pro to continue your style journey without restrictions.",
          features: [
            "Remove all limits",
            "Unlimited analysis",
            "Advanced features",
            "Premium support"
          ],
          cta: "Remove Limits",
          highlight: "Don't let limits hold back your style potential!"
        };
      
      default:
        return {
          title: "Upgrade to Pro",
          subtitle: "Unlock premium features and unlimited style analysis.",
          features: [
            "Unlimited analysis",
            "Advanced features",
            "Premium support",
            "Exclusive content"
          ],
          cta: "Upgrade Now",
          highlight: "Transform your style with Pro features!"
        };
    }
  };

  const handleUpgrade = async () => {
    try {
      // Find the appropriate offering
      const offering = offerings.find(o => 
        o.identifier === 'default' || 
        o.identifier === 'pro' ||
        o.identifier === 'premium'
      );

      if (!offering) {
        toast({
          title: "No offerings available",
          description: "Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Find the selected package
      const packageToPurchase = offering.availablePackages.find(pkg => {
        if (selectedPlan === 'yearly') {
          return pkg.product.identifier.includes('year') || 
                 pkg.product.identifier.includes('annual') ||
                 pkg.product.identifier.includes('12');
        } else {
          return pkg.product.identifier.includes('month') || 
                 pkg.product.identifier.includes('1');
        }
      }) || offering.availablePackages[0];

      if (!packageToPurchase) {
        toast({
          title: "Package not found",
          description: "Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const success = await purchaseProduct(packageToPurchase.product);
      
      if (success) {
        toast({
          title: "Welcome to Pro!",
          description: "You now have access to all premium features.",
        });
        
        if (onUpgrade) {
          onUpgrade();
        }
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    if (onSkip) {
      onSkip();
    }
  };

  const content = getTriggerContent();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-black border border-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
            }} />
          </div>

          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 relative z-10">
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
              className="mb-4"
            >
              <Crown className="w-16 h-16 text-orange-400 mx-auto" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {content.title}
            </h2>
            
            <p className="text-gray-400 text-base mb-4">
              {content.subtitle}
            </p>

            {/* Highlight */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
              <p className="text-orange-400 text-sm font-medium">
                ✨ {content.highlight}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6 relative z-10">
            {content.features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                <span className="text-gray-300 text-sm">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Plan Selection */}
          <div className="mb-6 relative z-10">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  selectedPlan === 'monthly'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">Monthly</div>
                  <div className="text-xs opacity-75">$9.99/month</div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`p-4 rounded-lg border transition-all duration-300 relative ${
                  selectedPlan === 'yearly'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  SAVE 50%
                </div>
                <div className="text-center">
                  <div className="font-semibold">Yearly</div>
                  <div className="text-xs opacity-75">$59.99/year</div>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 relative z-10">
            <Button
              onClick={handleUpgrade}
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {content.cta}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full h-12 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-300"
            >
              Maybe Later
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 text-center relative z-10">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Instant Access</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};