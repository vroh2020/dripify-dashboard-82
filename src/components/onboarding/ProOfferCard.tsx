import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Check, Lock, Bell, Crown } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ProOfferCardProps {
  onContinue: () => void;
}

// Plan configuration - now dynamic from RevenueCat
const getPlanConfig = (offerings: any) => {
  if (!offerings || offerings.length === 0) {
    // Fallback config if offerings not loaded
    return {
      weekly: {
        identifier: "og_499_1w",
        title: "Weekly Subscription of 4.99",
        price: "$4.99",
        period: "/week",
        length: "1 week",
        label: null,
        savings: null,
        hasTrial: true,
        trialDays: 3,
        trialText: "3-day free trial, then $4.99/week",
        fallback: {
          identifier: "og_499_1w",
          title: "Weekly Subscription of 4.99",
          description: "Weekly subscription for unlimited style analyses",
          price: 4.99,
          priceString: "$4.99",
          currencyCode: "USD",
          subscriptionPeriod: "P1W",
        }
      },
      monthly: {
        identifier: "og_999_1m", 
        title: "Monthly Subscription of 9.99",
        price: "$9.99",
        period: "/month",
        length: "1 month",
        label: null,
        savings: null,
        hasTrial: false,
        trialDays: 0,
        trialText: "$9.99/month",
        fallback: {
          identifier: "og_999_1m",
          title: "Monthly Subscription of 9.99",
          description: "Monthly subscription for unlimited style analyses",
          price: 9.99,
          priceString: "$9.99",
          currencyCode: "USD",
          subscriptionPeriod: "P1M",
        }
      }
    };
  }

  const packages = offerings[0]?.availablePackages || [];
  const config = {
    weekly: {
      identifier: "og_499_1w",
      title: "Weekly Subscription of 4.99",
      price: "$4.99",
      period: "/week",
      length: "1 week",
      label: null,
      savings: null,
      hasTrial: true,
      trialDays: 3,
      trialText: "3-day free trial, then $4.99/week",
      fallback: {
        identifier: "og_499_1w",
        title: "Weekly Subscription of 4.99",
        description: "Weekly subscription for unlimited style analyses",
        price: 4.99,
        priceString: "$4.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1W",
      }
    },
    monthly: {
      identifier: "og_999_1m", 
      title: "Monthly Subscription of 9.99",
      price: "$9.99",
      period: "/month",
      length: "1 month",
      label: null,
      savings: null,
      hasTrial: false,
      trialDays: 0,
      trialText: "$9.99/month",
      fallback: {
        identifier: "og_999_1m",
        title: "Monthly Subscription of 9.99",
        description: "Monthly subscription for unlimited style analyses",
        price: 9.99,
        priceString: "$9.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1M",
      }
    }
  };

  packages.forEach((pkg: any) => {
    const product = pkg.product;
    const identifier = product.identifier;
    
    if (identifier.includes('1w')) {
      config.weekly = {
        identifier: identifier,
        title: product.title || "Weekly Subscription",
        price: product.priceString || "$4.99",
        period: product.subscriptionPeriod === 'P1W' ? "/week" : "/period",
        length: "1 week",
        label: null,
        savings: null,
        hasTrial: true,
        trialDays: 3,
        trialText: `3-day free trial, then ${product.priceString || "$4.99"}/week`,
        fallback: {
          identifier: identifier,
          title: product.title || "Weekly Subscription",
          description: "Weekly subscription for unlimited style analyses",
          price: product.price || 4.99,
          priceString: product.priceString || "$4.99",
          currencyCode: product.currencyCode || "USD",
          subscriptionPeriod: product.subscriptionPeriod || "P1W",
        }
      };
    } else if (identifier.includes('1m')) {
      config.monthly = {
        identifier: identifier,
        title: product.title || "Monthly Subscription",
        price: product.priceString || "$9.99",
        period: product.subscriptionPeriod === 'P1M' ? "/month" : "/period",
        length: "1 month",
        label: null,
        savings: null,
        hasTrial: false,
        trialDays: 0,
        trialText: `${product.priceString || "$9.99"}/month`,
        fallback: {
          identifier: identifier,
          title: product.title || "Monthly Subscription",
          description: "Monthly subscription for unlimited style analyses",
          price: product.price || 9.99,
          priceString: product.priceString || "$9.99",
          currencyCode: product.currencyCode || "USD",
          subscriptionPeriod: product.subscriptionPeriod || "P1M",
        }
      };
    }
  });

  return config;
};

// Plan Option Component - Side-by-side Design (White Theme)
const PlanOption = ({ planKey, isSelected, onSelect, offerings }: { 
  planKey: string; 
  isSelected: boolean; 
  onSelect: (key: 'weekly' | 'monthly') => void;
  offerings: any;
}) => {
  const config = getPlanConfig(offerings);
  const planConfig = config[planKey as 'weekly' | 'monthly'];
  
  return (
    <button 
      className={`flex-1 rounded-xl border-2 p-4 transition-all relative ${
        isSelected 
          ? 'border-black bg-black text-white' 
          : 'border-gray-200 bg-white text-black hover:border-gray-300'
      }`}
      onClick={() => onSelect(planKey as 'weekly' | 'monthly')}
    >
      {/* 3 DAYS FREE Badge for weekly */}
      {planKey === 'weekly' && (
        <div className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold px-2 py-1 rounded">
          3 DAYS FREE
        </div>
      )}
      <div className="text-left">
        <p className="font-semibold text-base mb-1">
          {planKey === 'weekly' ? 'Weekly' : 'Monthly'}
        </p>
        <p className="text-sm">
          {planKey === 'weekly' ? `${planConfig.price} /week` : `${planConfig.price} /mo`}
        </p>
      </div>
      <div className="flex justify-end mt-2">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected
              ? 'border-white bg-white'
              : 'border-gray-300 bg-white'
          }`}
        >
          {isSelected && (
            <Check className="w-3 h-3 text-black" strokeWidth={3} />
          )}
        </div>
      </div>
    </button>
  );
};

// Calculate billing date (3 days from now)
const getBillingDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Error Message Component
const ErrorMessage = ({ message = "Payment didn't go through. Please try again." }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
    <p className="text-red-600 text-sm font-medium">
      {message}
    </p>
  </div>
);

// Legal Links Component
const LegalLinks = () => {
  const openPrivacyPolicy = () => {
    window.open('https://dripcheck.framer.website/privacy-policy', '_blank', 'noopener,noreferrer');
  };

  const openTermsOfUse = () => {
    window.open('https://dripcheck.framer.website/terms-of-services', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="text-center mb-3">
      <div className="flex items-center justify-center gap-3 mb-1">
        <button
          onClick={openPrivacyPolicy}
          className="text-gray-500 hover:text-gray-700 font-medium transition-colors flex items-center gap-1 text-xs underline"
        >
          <span>Privacy Policy</span>
          <ExternalLink className="w-2 h-2" />
        </button>
        <span className="text-gray-400">•</span>
        <button
          onClick={openTermsOfUse}
          className="text-gray-500 hover:text-gray-700 font-medium transition-colors flex items-center gap-1 text-xs underline"
        >
          <span>Terms of Use</span>
          <ExternalLink className="w-2 h-2" />
        </button>
      </div>
      <p className="text-gray-400 text-xs">
        By subscribing, you agree to our Terms of Use and Privacy Policy
      </p>
    </div>
  );
};

// Restore Purchases Button Component
const RestorePurchasesButton = ({ onRestore, isRestoring, restoreMsg }: { onRestore: any; isRestoring: any; restoreMsg: any }) => {
  const isNativePlatform = () => {
    return !!(window as any).Capacitor || 
           !!(window as any).cordova || 
           /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
  };

  const handleRestoreClick = () => {
    if (!isNativePlatform()) {
      onRestore('web');
    } else {
      onRestore('native');
    }
  };

  return (
    <div className="mb-3">
      <Button
        onClick={handleRestoreClick}
        disabled={isRestoring}
        variant="outline"
        className="w-full border-2 border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 bg-white font-medium py-2 rounded-xl transition-all duration-300 hover:bg-gray-50"
      >
        {isRestoring ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-xs">Restoring Purchases...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-3 h-3" />
            <span className="text-xs">Already purchased?</span>
          </div>
        )}
      </Button>
      
      {restoreMsg && (
        <div className={`mt-2 p-2 rounded-xl text-center text-xs font-medium ${
          restoreMsg.includes('✓') || restoreMsg.includes('success') 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : restoreMsg.includes('web') 
            ? 'bg-blue-50 border border-blue-200 text-blue-700'
            : restoreMsg.includes('Ready to unlock') 
            ? 'bg-purple-50 border border-purple-200 text-purple-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {restoreMsg.includes('web') ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 bg-blue-500/30 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-xs">ℹ</span>
              </div>
              <span>Restore Purchases is only available on iOS/Android apps</span>
            </div>
          ) : restoreMsg.includes('Ready to unlock') ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 bg-purple-500/30 rounded-full flex items-center justify-center">
                <span className="text-purple-400 text-xs">•</span>
              </div>
              <span>Ready to unlock premium features? Choose a plan above to get started!</span>
            </div>
          ) : (
            restoreMsg
          )}
        </div>
      )}
    </div>
  );
};

// Main Component - The subscription gateway
export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, isPro, restorePurchases } = useSubscription();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // ALL hooks must be called before any conditional returns
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('weekly'); // Default to trial option
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [shouldContinueAfterRestore, setShouldContinueAfterRestore] = useState(false);

  useEffect(() => {
    if (shouldContinueAfterRestore && isPro) {
      setShouldContinueAfterRestore(false);
      onContinue();
    }
  }, [isPro, shouldContinueAfterRestore, onContinue]);

  useEffect(() => {
    if (user) {
      console.log('✅ ProOfferCard: User authenticated:', user.id);
    }
  }, [user]);
  
  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Loading your experience...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if no user after loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-white/70 text-sm mb-2">Authentication Error</p>
          <p className="text-white/50 text-xs">Please refresh the page and try again</p>
        </div>
      </div>
    );
  }

  const getProduct = (planKey: 'weekly' | 'monthly') => {
    const config = getPlanConfig(offerings)[planKey];
    const product = offerings?.[0]?.availablePackages?.find(
      (pkg: any) => pkg.product.identifier === config.identifier
    );
    return product || config.fallback;
  };

  const handlePurchase = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setHasError(false);
    
    try {
      const selectedProduct = getProduct(selectedPlan);
      const success = await purchaseProduct(selectedProduct);
      
      if (success) {
        toast({ 
          title: "Welcome to Pro!", 
          description: "Your subscription is now active." 
        });
        setTimeout(onContinue, 1000);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async (platform: 'web' | 'native') => {
    if (isRestoring) return;
    
    setIsRestoring(true);
    setRestoreMsg('');
    setHasError(false);
    
    try {
      if (platform === 'web') {
        setRestoreMsg('Restore Purchases is only available on iOS/Android apps. Please use the mobile app to restore your purchases.');
      } else {
        const success = await restorePurchases();
        if (success) {
          setRestoreMsg('✓ Welcome back! Your subscription has been restored successfully.');
          setShouldContinueAfterRestore(true);
        } else {
          setRestoreMsg('Ready to unlock premium features? Choose a plan above to get started!');
        }
      }
    } catch (error) {
      console.error("Restore error:", error);
      setRestoreMsg('Connection issue. Please try again or contact support.');
    } finally {
      setIsRestoring(false);
      setTimeout(() => setRestoreMsg(''), platform === 'web' ? 6000 : 4000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-12 pb-8">
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[28px] font-bold text-black text-center mb-8 leading-tight"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          Start your 3-day FREE trial to continue.
        </motion.h1>

        {/* Timeline Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 space-y-6"
        >
          {/* Today */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mt-1">
              <Lock className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-black font-semibold text-base mb-1">Today</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Unlock all OutfitGrader AI features like style analysis, outfit matching, and more.
              </p>
            </div>
          </div>

          {/* In 2 Days - Reminder */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mt-1">
              <Bell className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-black font-semibold text-base mb-1">In 2 Days - Reminder</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                We&apos;ll send you a reminder that your trial is ending soon.
              </p>
            </div>
          </div>

          {/* In 3 Days - Billing Starts */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mt-1">
              <Crown className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-black font-semibold text-base mb-1">In 3 Days - Billing Starts</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                You&apos;ll be charged on {getBillingDate()} unless you cancel anytime before.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Subscription Options - Side by Side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex gap-3">
            {(['monthly', 'weekly'] as Array<'monthly' | 'weekly'>).map((planKey) => (
              <PlanOption
                key={planKey}
                planKey={planKey}
                isSelected={selectedPlan === planKey}
                onSelect={(key: 'weekly' | 'monthly') => setSelectedPlan(key)}
                offerings={offerings}
              />
            ))}
          </div>
        </motion.div>

        {/* No Payment Due */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" strokeWidth={3} />
          </div>
          <span className="text-black font-medium text-sm">No Payment Due Now</span>
        </motion.div>

        {/* Error Display */}
        {hasError && <ErrorMessage />}

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={handlePurchase}
          disabled={isProcessing}
          className="w-full bg-black text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-200 hover:bg-gray-900 active:scale-98 mb-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Activating Premium...</span>
            </div>
          ) : hasError ? (
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </div>
          ) : selectedPlan === 'weekly' ? (
            <span>Start My 3-Day Free Trial</span>
          ) : (
            <span>Start My Journey</span>
          )}
        </motion.button>

        {/* Fine Print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center text-sm text-gray-500 mb-4"
        >
          {selectedPlan === 'weekly' 
            ? '3 days free, then $4.99 per week'
            : 'Just $9.99 per month'
          }
        </motion.p>

        {/* Restore Purchases */}
        <RestorePurchasesButton 
          onRestore={handleRestorePurchases}
          isRestoring={isRestoring}
          restoreMsg={restoreMsg}
        />

        {/* Legal Links */}
        <LegalLinks />
      </div>
    </div>
  );
};
