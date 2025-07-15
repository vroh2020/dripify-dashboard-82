import { useState } from 'react';
import { motion } from 'framer-motion';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { useRevenueCatManager } from '../hooks/useRevenueCatManager';
import { Button } from './ui/button';
import { Loader2, Crown, Sparkles, Star, Check, Zap, Heart, Trophy } from 'lucide-react';

interface PaywallProps {
  onPurchaseComplete?: () => void;
}

export const Paywall = ({ onPurchaseComplete }: PaywallProps) => {
  const { offerings, isLoading, purchaseProduct } = useRevenueCatManager();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Get packages from offerings
  const packages = offerings.length > 0 ? offerings[0].availablePackages : [];
  const error = null; // No error prop available, handle differently

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (!pkg) return;

    try {
      setIsPurchasing(true);
      await purchaseProduct(pkg.product);
      onPurchaseComplete?.();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-white/70">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (packages.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">No Packages Available</h2>
          <p className="text-white/70 mb-6">Unable to load subscription options</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-orange-500 hover:bg-orange-600"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-20 right-10 w-40 h-40 bg-orange-400/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-40 left-8 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, delay: 2 }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-400/5 rounded-full blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="pt-16 pb-8 px-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-orange-400 to-orange-500 rounded-3xl mb-6 shadow-2xl"
          >
            <Crown className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Unlock Your Style
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
              Superpowers
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white/70 text-xl mb-8"
          >
            Join 10,000+ users who've transformed their style
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="flex-1 px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            {[
              { icon: Sparkles, text: "Unlimited AI Analyses", color: "from-orange-400 to-orange-500" },
              { icon: Star, text: "Personal Style Coach", color: "from-purple-400 to-purple-500" },
              { icon: Zap, text: "Instant Feedback", color: "from-blue-400 to-blue-500" },
              { icon: Trophy, text: "Style Achievements", color: "from-green-400 to-green-500" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 text-center"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mx-auto mb-3`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-medium text-sm leading-tight">{feature.text}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Features List */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-8"
          >
            <div className="space-y-4">
              {[
                "Unlimited style analyses with advanced AI",
                "Personalized outfit recommendations",
                "Detailed breakdown of your style strengths",
                "Trending fashion insights & tips",
                "Style progress tracking & achievements",
                "Priority customer support"
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 + index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/90 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Pricing & CTA */}
        <div className="px-8 pb-12">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.identifier}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1 + index * 0.1 }}
              className="mb-6"
            >
              {/* Pricing Display */}
              <div className="text-center mb-6">
                <div className="inline-flex items-baseline space-x-3 mb-2">
                  <span className="text-5xl font-bold text-white">{pkg.product.priceString}</span>
                  <span className="text-white/50 text-xl">/month</span>
                </div>
                <div className="bg-gradient-to-r from-orange-400/20 to-orange-500/20 border border-orange-500/30 rounded-xl p-3 mx-auto max-w-sm">
                  <p className="text-orange-300 font-medium flex items-center justify-center">
                    <Heart className="w-4 h-4 mr-2" />
                    Cancel anytime • Secure payment
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handlePurchase(pkg)}
                disabled={isPurchasing}
                className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurchasing ? (
                  <div className="flex items-center">
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Sparkles className="w-6 h-6 mr-3" />
                    Subscribe Now
                  </div>
                )}
              </Button>

              <p className="text-white/40 text-sm text-center mt-4">
                Secure payment • Powered by Apple/Google Pay
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};