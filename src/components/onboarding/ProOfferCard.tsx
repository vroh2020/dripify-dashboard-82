import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';
import { motion } from "framer-motion";

interface ProOfferCardProps {
  onContinue: () => void;
}

// Plan configuration - now dynamic from RevenueCat (because magic isn't free! 🪄✨)
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
        title: product.title || "Weekly Subscription of 4.99",
        price: product.priceString || "$4.99",
        period: product.subscriptionPeriod === 'P1W' ? "/week" : "/period",
        length: "1 week",
        label: null,
        savings: null,
        hasTrial: true,
        trialDays: 3,
        trialText: "3-day free trial, then $4.99/week",
        fallback: {
          identifier: identifier,
          title: product.title || "Weekly Subscription of 4.99",
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
        title: product.title || "Monthly Subscription of 9.99",
        price: product.priceString || "$9.99",
        period: product.subscriptionPeriod === 'P1M' ? "/month" : "/period",
        length: "1 month",
        label: null,
        savings: null,
        hasTrial: false,
        trialDays: 0,
        trialText: "$9.99/month",
        fallback: {
          identifier: identifier,
          title: product.title || "Monthly Subscription of 9.99",
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
const PlanOption = ({ planKey, isSelected, onSelect }: { planKey: string; isSelected: boolean; onSelect: (key: 'weekly' | 'monthly') => void }) => (
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
          <span className="text-sm text-gray-400">then $4.99 per week</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 line-through whitespace-nowrap">$19.99</span>
            <span className="text-base font-semibold text-white whitespace-nowrap">$9.99 per month</span>
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

// Clean Auto-Scrollable Feature Display Component
const FeatureDisplay = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  // Your specific images
  const images = [
    {
      id: 1,
      src: "/lovable-uploads/image111.png",
      alt: "AI Style Analysis"
    },
    {
      id: 2, 
      src: "/lovable-uploads/image222.png",
      alt: "Expert Outfit Matches"
    },
    {
      id: 3,
      src: "/lovable-uploads/image333.png",
      alt: "24/7 Style Assistant"
    }
  ];

  // Auto-scroll functionality - always going right
  useEffect(() => {
    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000); // Change every 3 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [images.length]);

  // Scroll to current image
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const imageWidth = container.scrollWidth / images.length;
      container.scrollTo({
        left: currentIndex * imageWidth,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, images.length]);

  return (
    <div className="rounded-xl overflow-hidden border border-white/20">
      <div 
        ref={scrollRef}
        className="flex overflow-x-hidden scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {images.map((image) => (
          <div 
            key={image.id} 
            className="w-full flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-80 object-cover"
            />
          </div>
        ))}
      </div>
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
    <div className="text-center mb-3">
      <div className="flex items-center justify-center gap-3 mb-1">
        <button
          onClick={openPrivacyPolicy}
          className="text-white/60 hover:text-white font-medium transition-colors flex items-center gap-1 text-xs underline"
        >
          <span>Privacy Policy</span>
          <ExternalLink className="w-2 h-2" />
        </button>
        <span className="text-white/40">•</span>
        <button
          onClick={openTermsOfUse}
          className="text-white/60 hover:text-white font-medium transition-colors flex items-center gap-1 text-xs underline"
        >
          <span>Terms of Use</span>
          <ExternalLink className="w-2 h-2" />
        </button>
      </div>
      <p className="text-white/50 text-xs">
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
        className="w-full border-2 border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 backdrop-blur-sm font-medium py-2 rounded-xl transition-all duration-300 hover:bg-white/10"
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
                <span className="text-purple-400 text-xs">✨</span>
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

// Main Component - The magical subscription gateway! ✨
export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  console.log('🎯 ProOfferCard rendered - Ready to make some magic happen! ✨');
  
  const { offerings, purchaseProduct, isPro, isLoading, restorePurchases } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isWebPlatform = !Capacitor.isNativePlatform();
  const effectiveUser = user;
  
  console.log('📊 ProOfferCard state:', { 
    user: !!user, 
    effectiveUser: !!effectiveUser,
    isWebPlatform,
    offerings: !!offerings, 
    isPro, 
    isLoading 
  });
  
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
      console.log('✅ Real user authenticated:', user.id);
    } else {
      console.log('ℹ️ No user found');
    }
  }, [user]);

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
          title: "Welcome to Pro! 🎉", 
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
      className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex flex-col px-3 py-3 relative"
      style={{ 
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        minHeight: '100vh',
        minHeight: '100dvh'
      }}
    >
      {/* Compact Content Area */}
      <div className="flex-1 bg-black/90 backdrop-blur-sm rounded-xl shadow-2xl p-4 flex flex-col max-w-sm mx-auto w-full border border-white/10">
        
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-3"
        >
          <h1 className="text-xl font-bold text-white mb-1">
            OutfitGraderAI Premium
          </h1>
          <p className="text-white/70 text-xs leading-tight">
            Get personalized style plans, expert outfit matches, 24/7 style assistant, and AI-powered style analysis!
          </p>
        </motion.div>

        {/* Feature Carousel Section - Compact */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-3"
        >
          <h3 className="text-white font-semibold text-xs mb-2 text-center">
            Here's what you'll get
          </h3>
          <FeatureDisplay />
        </motion.div>

        {/* Compact Subscription Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-3"
        >
          <div className="space-y-1.5">
            {(['monthly', 'weekly'] as Array<'monthly' | 'weekly'>).map((planKey) => (
              <PlanOption
                key={planKey}
                planKey={planKey}
                isSelected={selectedPlan === planKey}
                onSelect={(key: 'weekly' | 'monthly') => setSelectedPlan(key)}
              />
            ))}
          </div>
        </motion.div>

        {/* Free Trial Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="mb-4"
        >
                     <button
             onClick={() => setSelectedPlan(prev => (prev === 'weekly' ? 'monthly' : 'weekly'))}
             className="w-full flex items-center justify-between rounded-lg border border-gray-600 bg-gray-900/50 px-4 py-3 hover:border-gray-500 transition-colors"
           >
             <span className="text-base font-semibold text-white">Free Trial Enabled</span>
            <span
              role="switch"
              aria-checked={selectedPlan === 'weekly'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                selectedPlan === 'weekly' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  selectedPlan === 'weekly' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </span>
          </button>
        </motion.div>

        {/* Error Display */}
        {hasError && <ErrorMessage />}

        {/* CTA Button - Moved to bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-auto pt-4"
        >
          <CTAButton
            isProcessing={isProcessing}
            hasError={hasError}
            onClick={handlePurchase}
            disabled={isProcessing}
            selectedPlan={selectedPlan}
          />

          {/* Restore Purchases */}
          <RestorePurchasesButton 
            onRestore={handleRestorePurchases}
            isRestoring={isRestoring}
            restoreMsg={restoreMsg}
          />

          {/* Legal Links */}
          <LegalLinks />
        </motion.div>
        
      </div>
    </motion.div>
  );
};