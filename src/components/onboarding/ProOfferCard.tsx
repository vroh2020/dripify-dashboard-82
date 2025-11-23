import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Sparkles } from "lucide-react";
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

// Plan Option Component - Vertical Stacking Design
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
      className={`w-full rounded-lg border p-4 transition-all duration-300 relative mb-3 ${
        isSelected 
          ? 'border-blue-400 bg-gray-800/50' 
          : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
      }`}
      onClick={() => onSelect(planKey as 'weekly' | 'monthly')}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Title and pricing */}
        <div className="text-left flex-1">
          <p className="font-semibold text-base text-white">
            {planKey === 'weekly' ? '3-Day Trial' : 'Monthly Plan'}
          </p>
          
          {planKey === 'weekly' ? (
            <span className="text-sm text-gray-400">then {planConfig.price} per week</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 line-through whitespace-nowrap">$19.99</span>
              <span className="text-base font-semibold text-white whitespace-nowrap">{planConfig.price} per month</span>
            </div>
          )}
        </div>

        {/* Right side - Badge and selection */}
        <div className="flex items-center gap-3">
          {planKey === 'weekly' ? (
            <span className="text-lg font-bold text-white">FREE</span>
          ) : (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              SAVE 50%
            </div>
          )}
          
          {/* Radio button */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? 'border-blue-400 bg-blue-400' 
              : 'border-gray-400'
          }`}>
            {isSelected && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

// Clean Auto-Scrollable Feature Display Component
const FeatureDisplay = () => {
  const features = [
    {
      id: 1,
      title: "Unlimited Outfit Grading",
      description: "Get AI feedback on every outfit",
      image: "/lovable-uploads/image111.png"
    },
    {
      id: 2,
      title: "Style Score Tracking",
      description: "See your style improve over time",
      image: "/lovable-uploads/image222.png"
    },
    {
      id: 3,
      title: "Outfit Suggestions",
      description: "Get new looks from your closet",
      image: "/lovable-uploads/image333.png"
    }
  ];

  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <div 
          key={feature.id}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={feature.image}
                alt={feature.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 pt-1">
              <h3 
                className="text-[20px] font-bold text-black mb-1 leading-tight" 
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
              >
                {feature.title}
              </h3>
              <p 
                className="text-[15px] text-gray-600 leading-snug" 
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
              >
                {feature.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Error Message Component
const ErrorMessage = ({ message = "Payment didn't go through. Please try again." }) => (
  <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-4 text-center backdrop-blur-sm">
    <div className="flex items-center justify-center gap-2 mb-1">
      <div className="w-5 h-5 bg-red-500/30 rounded-full flex items-center justify-center">
        <span className="text-red-300 text-xs">⚠️</span>
      </div>
    </div>
    <p className="text-red-300 text-xs font-medium">
      {message}
    </p>
  </div>
);

// CTA Button Component
const CTAButton = ({ isProcessing, hasError, onClick, disabled, selectedPlan }: { isProcessing: any; hasError: any; onClick: any; disabled: any; selectedPlan: string }) => {
  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span className="text-sm">Activating Premium...</span>
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Try Again</span>
        </div>
      );
    }
    
    // Show different CTA text based on selected plan
    if (selectedPlan === 'weekly') {
      return (
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Start 3-Day Free Trial →</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Unlock Premium Access →</span>
        </div>
      );
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 h-12 text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-102 active:scale-98 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 text-white mb-3 border-0"
    >
      {getButtonContent()}
    </Button>
  );
};

// Legal Links Component
const LegalLinks = () => {
  const openPrivacyPolicy = () => {
    window.open('https://dripcheck.framer.website/privacy-policy', '_blank', 'noopener,noreferrer');
  };

  const openTermsOfUse = () => {
    window.open('https://dripcheck.framer.website/terms-of-services', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="text-center mt-4">
      <div className="flex items-center justify-center gap-3 mb-2">
        <button
          onClick={openPrivacyPolicy}
          className="text-gray-500 hover:text-black font-medium transition-colors flex items-center gap-1 text-xs"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          <span>Privacy Policy</span>
          <ExternalLink className="w-3 h-3" />
        </button>
        <span className="text-gray-300">•</span>
        <button
          onClick={openTermsOfUse}
          className="text-gray-500 hover:text-black font-medium transition-colors flex items-center gap-1 text-xs"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          <span>Terms of Use</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <p className="text-gray-500 text-xs" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}>
        By subscribing, you agree to our Terms and Privacy Policy
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
    <div className="mb-4">
      <button
        onClick={handleRestoreClick}
        disabled={isRestoring}
        className="w-full text-gray-600 hover:text-black font-medium py-2 transition-colors text-sm"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
      >
        {isRestoring ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            <span>Restoring Purchases...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-3 h-3" />
            <span>Already purchased?</span>
          </div>
        )}
      </Button>
      
      {restoreMsg && (
        <div className={`mt-2 p-2 rounded-xl text-center text-xs font-medium ${
          restoreMsg.includes('✓') || restoreMsg.includes('success') 
            ? 'bg-green-500/20 border border-green-500/30 text-green-300' 
            : restoreMsg.includes('web') 
            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
            : restoreMsg.includes('Ready to unlock') 
            ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
            : 'bg-red-500/20 border border-red-500/30 text-red-300'
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading your experience...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if no user after loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-900 text-xl">!</span>
          </div>
          <p className="text-gray-900 text-sm mb-2">Authentication Error</p>
          <p className="text-gray-600 text-xs">Please refresh the page and try again</p>
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-white flex flex-col px-4 pt-12 pb-6 relative"
      style={{ minHeight: '100dvh' }}
    >
      {/* Close Button - Top Right */}
      <button 
        onClick={onContinue}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
      >
        <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content Area */}
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-[34px] font-bold text-black mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}>
            Start Your Free Trial
          </h1>
          <p className="text-[15px] text-gray-600 leading-relaxed px-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}>
            Get unlimited outfit grading and personalized style insights
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8 space-y-4"
        >
          <FeatureDisplay />
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pricing Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="text-[28px] font-bold text-black mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}>
            $4.99/week
          </div>
          <p className="text-[15px] text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}>
            Billed weekly after 3-day free trial
          </p>
        </motion.div>

        {/* Error Display */}
        {hasError && <ErrorMessage />}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-4"
        >
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="w-full bg-black text-white font-semibold py-4 px-8 rounded-xl text-[18px] transition-all duration-200 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
              height: '64px'
            }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              "Start Free Trial"
            )}
          </button>
        </motion.div>

        {/* Other Plans Link */}
        <button 
          onClick={() => setSelectedPlan(prev => prev === 'weekly' ? 'monthly' : 'weekly')}
          className="text-[15px] text-gray-600 text-center mb-6 underline hover:text-black transition-colors"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          Other plans
        </button>

        {/* Restore Purchases */}
        <RestorePurchasesButton 
          onRestore={handleRestorePurchases}
          isRestoring={isRestoring}
          restoreMsg={restoreMsg}
        />

        {/* Legal Links */}
        <LegalLinks />
      </div>
    </motion.div>
  );
};