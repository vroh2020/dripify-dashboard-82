import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, ExternalLink, Sparkles, Crown, Zap, TrendingUp, Shield, Star, ArrowLeft } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { paymentService } from "../../services/paymentService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';

interface ProOfferCardProps {
  onContinue: () => void;
}

// Plan configuration - now dynamic from RevenueCat
const getPlanConfig = (offerings) => {
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

  packages.forEach(pkg => {
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

// Plan Option Component - Dark Theme
const PlanOption = ({ planKey, config, isSelected, onSelect }) => (
  <button 
    className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-300 ${
      isSelected 
        ? 'border-red-500 bg-gradient-to-r from-red-500/20 to-red-600/20 shadow-lg shadow-red-500/25' 
        : 'border-white/20 bg-white/5 backdrop-blur-sm hover:border-white/30 hover:bg-white/10'
    }`}
    onClick={() => onSelect(planKey)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected 
            ? 'border-red-500 bg-red-500' 
            : 'border-white/40'
        }`}>
          {isSelected && (
            <div className="w-2 h-2 bg-white rounded-full"></div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white font-semibold text-sm">{planKey === 'weekly' ? 'Weekly' : 'Monthly'}</p>
            {planKey === 'monthly' && (
              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                Save 50%
              </span>
            )}
          </div>
          <p className="text-white/60 text-xs">Billed {config.period}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-white">{config.price}</div>
        <div className="text-xs text-white/60">{config.period}</div>
      </div>
    </div>
  </button>
);

// Error Message Component
const ErrorMessage = ({ message = "Payment didn't go through. Please try again." }) => (
  <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 mb-6 text-center backdrop-blur-sm">
    <div className="flex items-center justify-center gap-2 mb-2">
      <div className="w-6 h-6 bg-red-500/30 rounded-full flex items-center justify-center">
        <span className="text-red-300 text-sm">⚠️</span>
      </div>
    </div>
    <p className="text-red-300 text-sm font-medium">
      {message}
    </p>
  </div>
);

// CTA Button Component
const CTAButton = ({ isProcessing, hasError, onClick, disabled }) => {
  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Activating Premium...</span>
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5" />
          <span>Try Again</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center gap-3">
        <Sparkles className="w-5 h-5" />
        <span>Get Your AI Style Analysis →</span>
      </div>
    );
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 h-14 text-base font-semibold rounded-xl transition-all duration-300 hover:scale-102 active:scale-98 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 text-white mb-4 border-0"
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
    <div className="text-center mb-4">
      <div className="flex items-center justify-center gap-4 mb-2">
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
const RestorePurchasesButton = ({ onRestore, isRestoring, restoreMsg }) => {
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
      <Button
        onClick={handleRestoreClick}
        disabled={isRestoring}
        variant="outline"
        className="w-full border-2 border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 backdrop-blur-sm font-medium py-3 rounded-xl transition-all duration-300 hover:bg-white/10"
      >
        {isRestoring ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-sm">Restoring Purchases...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-3 h-3" />
            <span className="text-sm">Already purchased?</span>
          </div>
        )}
      </Button>
      
      {restoreMsg && (
        <div className={`mt-3 p-3 rounded-xl text-center text-sm font-medium ${
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
              <div className="w-5 h-5 bg-blue-500/30 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-xs">ℹ</span>
              </div>
              <span>Restore Purchases is only available on iOS/Android apps</span>
            </div>
          ) : restoreMsg.includes('Ready to unlock') ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-purple-500/30 rounded-full flex items-center justify-center">
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

// Main Component
export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  console.log('🎯 ProOfferCard rendered');
  
  const { offerings, purchaseProduct, isPro, isLoading, restorePurchases, refreshSubscription } = useSubscription();
  const { user, refreshSession } = useAuth();
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
  const [selectedPlan, setSelectedPlan] = useState('weekly');
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

  const getProduct = (planKey) => {
    const config = getPlanConfig(offerings)[planKey];
    const product = offerings?.[0]?.availablePackages?.find(
      (pkg) => pkg.product.identifier === config.identifier
    );
    return product || config.fallback;
  };

  const handlePurchase = async () => {
    console.log('🔄 Purchase button clicked!');
    console.log('📊 Current state:', { isProcessing, user: !!user, selectedPlan });
    
    if (isProcessing) {
      console.log('❌ Already processing, ignoring click');
      return;
    }
    
    if (!effectiveUser) {
      console.log('⚠️ No effective user found, but proceeding with payment simulation');
      if (isWebPlatform) {
        console.log('🌐 Web platform - proceeding with payment simulation');
      } else {
        console.log('❌ No effective user found, cannot proceed');
        toast({ 
          variant: "destructive", 
          title: "Authentication Error", 
          description: "Please refresh the page and try again." 
        });
        return;
      }
    }
    
    console.log('🌐 Platform context:', { 
      isWebPlatform, 
      hasRealUser: !!user, 
      effectiveUserId: effectiveUser?.id 
    });
    
    setIsProcessing(true);
    setHasError(false);
    
    try {
      console.log('🔄 Getting product for plan:', selectedPlan);
      const selectedProduct = getProduct(selectedPlan);
      console.log('📦 Selected product:', selectedProduct);
      
      console.log('🔄 Calling payment service...');
      
      let result;
      if (isWebPlatform) {
        console.log('🌐 Web platform detected - using simulation');
        const userId = effectiveUser?.id || 'anonymous-user';
        result = await paymentService.purchaseProduct(null, userId);
      } else {
        const userId = effectiveUser?.id || 'anonymous-user';
        result = await paymentService.purchaseProduct(selectedProduct, userId);
      }
      
      console.log('📊 Payment result:', result);
      
      if (result.success) {
        console.log('✅ Payment successful!');
        toast({ 
          title: "Welcome to Pro! 🎉", 
          description: "Your subscription is now active." 
        });
        
        console.log('🎯 Payment successful - calling onContinue callback');
        onContinue();
      } else {
        console.log('❌ Payment failed:', result.error);
        if (result.error?.includes('cancelled')) {
          toast({ 
            title: "Payment Cancelled", 
            description: "You can try again anytime." 
          });
        } else if (result.error?.includes('already active')) {
          toast({ 
            title: "Subscription Already Active", 
            description: "You already have an active subscription!" 
          });
          console.log('🎯 Subscription already active - calling onContinue callback');
          onContinue();
        } else {
          setHasError(true);
          // Show more specific error messages
          let errorMessage = "Please try again or contact support.";
          if (result.error?.includes('subscription not active')) {
            errorMessage = "Payment processed but subscription activation failed. Please contact support.";
          } else if (result.error?.includes('network') || result.error?.includes('timeout')) {
            errorMessage = "Network error. Please check your connection and try again.";
          } else if (result.error?.includes('payment')) {
            errorMessage = "Payment method issue. Please try a different payment method.";
          }
          
          toast({ 
            variant: "destructive", 
            title: "Purchase Failed", 
            description: errorMessage
          });
        }
      }
    } catch (error) {
      console.error("❌ Purchase error:", error);
      setHasError(true);
      toast({ 
        variant: "destructive", 
        title: "Purchase Failed", 
        description: "Please try again or contact support." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async (platform: 'web' | 'native') => {
    if (isRestoring || !effectiveUser) return;
    
    setIsRestoring(true);
    setRestoreMsg('');
    setHasError(false);
    
    try {
      if (platform === 'web') {
        setRestoreMsg('Restore Purchases is only available on iOS/Android apps. Please use the mobile app to restore your purchases.');
      } else {
        const result = await paymentService.restorePurchases(effectiveUser.id);
        if (result.success) {
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

  const selectedConfig = getPlanConfig(offerings)[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex flex-col">
      {/* Black Content Area */}
      <div className="flex-1 bg-black rounded-t-3xl shadow-2xl mx-4 mt-8 mb-4 p-6">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            OutfitGraderAI Premium
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Get personalized style plans, expert outfit matches, 24/7 style assistant, and AI-powered style analysis to achieve your best look ever!
          </p>
        </div>

        {/* Subscription Options */}
        <div className="mb-6">
          <h3 className="text-white font-semibold text-sm mb-3">Choose Your Plan</h3>
          <div className="space-y-3">
            {Object.entries(getPlanConfig(offerings)).map(([planKey, config]) => (
              <PlanOption
                key={planKey}
                planKey={planKey}
                config={config}
                isSelected={selectedPlan === planKey}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-6">
          <h3 className="text-white font-semibold text-sm mb-3">Here's what you'll get:</h3>
          
          {/* Personal AI Style Coach */}
          <div className="mb-4">
            <h4 className="text-white font-medium text-sm mb-2">Personal AI Style Coach</h4>
            <div className="bg-red-500/20 rounded-xl p-3 border border-red-500/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium mb-1">"What should I wear for a job interview?"</p>
                  <div className="text-white/70 text-xs space-y-1">
                    <p>• Professional blazer with tailored pants</p>
                    <p>• Neutral colors: navy, gray, or black</p>
                    <p>• Clean, minimal accessories</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {hasError && <ErrorMessage />}

        {/* CTA Button */}
        <CTAButton
          isProcessing={isProcessing}
          hasError={hasError}
          onClick={handlePurchase}
          disabled={isProcessing}
        />

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