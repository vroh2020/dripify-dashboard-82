import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, ExternalLink, Sparkles, Crown, Zap, TrendingUp, Shield, Star } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface ProOfferCardProps {
  onContinue: () => void;
}

// Plan configuration - now dynamic from RevenueCat
const getPlanConfig = (offerings) => {
  if (!offerings || offerings.length === 0) {
    // Fallback config if offerings not loaded
    return {
      weekly: {
        identifier: "di_499_1w",
        title: "Dripify AI Weekly",
        price: "$4.99",
        period: "/week",
        length: "1 week",
        label: null,
        savings: null,
        fallback: {
          identifier: "di_499_1w",
          title: "Dripify AI Weekly",
          description: "Unlimited style analyses for $4.99/week",
          price: 4.99,
          priceString: "$4.99",
          currencyCode: "USD",
          subscriptionPeriod: "P1W",
        }
      },
      monthly: {
        identifier: "di_999_1m", 
        title: "Dripify AI Monthly",
        price: "$9.99",
        period: "/month",
        length: "1 month",
        label: null,
        savings: null,
        fallback: {
          identifier: "di_999_1m",
          title: "Dripify AI Monthly",
          description: "Unlimited style analyses for $9.99/month",
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
      identifier: "di_499_1w",
      title: "Dripify AI Weekly",
      price: "$4.99",
      period: "/week",
      length: "1 week",
      label: null,
      savings: null,
      fallback: {
        identifier: "di_499_1w",
        title: "Dripify AI Weekly",
        description: "Unlimited style analyses for $4.99/week",
        price: 4.99,
        priceString: "$4.99",
        currencyCode: "USD",
        subscriptionPeriod: "P1W",
      }
    },
    monthly: {
      identifier: "di_999_1m", 
      title: "Dripify AI Monthly",
      price: "$9.99",
      period: "/month",
      length: "1 month",
      label: null,
      savings: null,
      fallback: {
        identifier: "di_999_1m",
        title: "Dripify AI Monthly",
        description: "Unlimited style analyses for $9.99/month",
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
        title: product.title || "Dripify AI Weekly",
        price: product.priceString || "$4.99",
        period: product.subscriptionPeriod === 'P1W' ? "/week" : "/period",
        length: "1 week",
        label: null,
        savings: null,
        fallback: {
          identifier: identifier,
          title: product.title || "Dripify AI Weekly",
          description: "Unlimited style analyses for $4.99/week",
          price: product.price || 4.99,
          priceString: product.priceString || "$4.99",
          currencyCode: product.currencyCode || "USD",
          subscriptionPeriod: product.subscriptionPeriod || "P1W",
        }
      };
    } else if (identifier.includes('1m')) {
      config.monthly = {
        identifier: identifier,
        title: product.title || "Dripify AI Monthly",
        price: product.priceString || "$9.99",
        period: product.subscriptionPeriod === 'P1M' ? "/month" : "/period",
        length: "1 month",
        label: null,
        savings: null,
        fallback: {
          identifier: identifier,
          title: product.title || "Dripify AI Monthly",
          description: "Unlimited style analyses for $9.99/month",
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

const FEATURES = [
  {
    title: "Unlimited style analyses",
    description: "Get unlimited style recommendations",
    icon: Zap,
    gradient: "from-yellow-400 to-orange-500"
  },
  {
    title: "Advanced AI recommendations",
    description: "AI-powered personalized suggestions",
    icon: TrendingUp,
    gradient: "from-green-400 to-blue-500"
  },
  {
    title: "Personal style insights", 
    description: "Track your style evolution",
    icon: Crown,
    gradient: "from-purple-400 to-pink-500"
  },

];

// Feature Item Component
const FeatureItem = ({ title, description, icon: IconComponent, gradient }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
    <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center shadow-lg`}>
      <IconComponent className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-white font-bold text-sm leading-tight mb-1">
        {title}
      </p>
      <p className="text-white/60 text-xs leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

// Plan Option Component
const PlanOption = ({ planKey, config, isSelected, onSelect }) => (
  <button 
    className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 ${
      isSelected 
        ? 'border-orange-500 bg-gradient-to-r from-orange-500/20 to-pink-500/20 shadow-xl shadow-orange-500/25 scale-105' 
        : 'border-white/20 bg-white/5 backdrop-blur-sm hover:border-white/30 hover:bg-white/10 hover:scale-102'
    }`}
    onClick={() => onSelect(planKey)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected 
            ? 'border-orange-400 bg-orange-500' 
            : 'border-white/40'
        }`}>
          {isSelected && (
            <div className="w-3 h-3 bg-white rounded-full"></div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white font-bold text-lg">{config.title}</p>
            {planKey === 'monthly' && (
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-black px-3 py-1 rounded-full text-xs font-black">
                50% OFF
              </span>
            )}
          </div>
          <p className="text-white/60 text-sm">Billed {config.period}</p>
          <p className="text-white/50 text-xs mt-1">Auto-renewable subscription</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black text-white">{config.price}</div>
        <div className="text-sm text-white/60">{config.period}</div>
      </div>
    </div>
  </button>
);

// Error Message Component
const ErrorMessage = ({ message = "Payment didn't go through. Please try again." }) => (
  <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 mb-6 text-center backdrop-blur-sm">
    <div className="flex items-center justify-center gap-2 mb-2">
      <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center">
        <span className="text-red-300 text-lg">⚠️</span>
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
        <Crown className="w-5 h-5" />
        <span>Start Premium Journey</span>
      </div>
    );
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 h-16 text-lg font-black rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/75 text-white mb-6 border-0"
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
    <div className="text-center mb-6">
      <div className="flex items-center justify-center gap-6 mb-4">
        <button
          onClick={openPrivacyPolicy}
          className="text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1 text-sm underline"
        >
          <span>Privacy Policy</span>
          <ExternalLink className="w-3 h-3" />
        </button>
        <span className="text-white/40">•</span>
        <button
          onClick={openTermsOfUse}
          className="text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1 text-sm underline"
        >
          <span>Terms of Use</span>
          <ExternalLink className="w-3 h-3" />
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
  // Check if we're on a native platform
  const isNativePlatform = () => {
    return !!(window as any).Capacitor || 
           !!(window as any).cordova || 
           /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
  };

  const handleRestoreClick = () => {
    if (!isNativePlatform()) {
      // Show web-specific message
      onRestore('web');
    } else {
      // Call native restore
      onRestore('native');
    }
  };

  return (
    <div className="mb-6">
      <Button
        onClick={handleRestoreClick}
        disabled={isRestoring}
        variant="outline"
        className="w-full border-2 border-blue-500/50 text-blue-300 hover:text-blue-200 hover:border-blue-400 bg-blue-500/10 backdrop-blur-sm font-semibold py-4 rounded-2xl transition-all duration-300 hover:bg-blue-500/20"
      >
        {isRestoring ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-300/50 border-t-blue-300 rounded-full animate-spin"></div>
            <span>Restoring Purchases...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="w-4 h-4" />
            <span>Restore Purchases</span>
          </div>
        )}
      </Button>
      
      {/* Restore Status Message */}
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
  const { offerings, purchaseProduct, isPro, isLoading, restorePurchases, refreshSubscription } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [shouldContinueAfterRestore, setShouldContinueAfterRestore] = useState(false);

  // Watch for isPro changes and continue if restore was successful
  useEffect(() => {
    if (shouldContinueAfterRestore && isPro) {
      setShouldContinueAfterRestore(false);
      onContinue();
    }
  }, [isPro, shouldContinueAfterRestore, onContinue]);

  // Get products from offerings
  const getProduct = (planKey) => {
    const config = getPlanConfig(offerings)[planKey];
    const product = offerings?.[0]?.availablePackages?.find(
      (pkg) => pkg.product.identifier === config.identifier
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
        // For web, show appropriate message
        setRestoreMsg('Restore Purchases is only available on iOS/Android apps. Please use the mobile app to restore your purchases.');
      } else {
        // For native platforms, call the actual restore function
        const success = await restorePurchases();
        if (success) {
          setRestoreMsg('✓ Welcome back! Your subscription has been restored successfully.');
          // Set flag to continue when isPro becomes true
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
      // Clear message after 6 seconds for web message
      setTimeout(() => setRestoreMsg(''), platform === 'web' ? 6000 : 4000);
    }
  };

  const selectedConfig = getPlanConfig(offerings)[selectedPlan];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-black to-pink-900/50"></div>
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col px-6 py-6">
        {/* Main Content Container */}
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full pt-4">
          
          {/* Impactful but Manageable Header */}
          <header className="text-center mb-6">
            <div className="relative mb-3">
              {/* Smaller animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg animate-pulse"></div>
              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-2xl shadow-xl shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-2xl animate-pulse"></div>
                <Sparkles className="w-8 h-8 text-white relative z-10" />
              </div>
            </div>
            
            <h1 className="text-3xl font-black text-white mb-2 leading-tight">
              Level Up Your
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-pulse">
                Style Game
              </span>
            </h1>
            
            <p className="text-white/70 text-base font-medium max-w-sm mx-auto">
              Get AI-powered insights that transform your fashion choices
            </p>
            
            {/* Fewer floating elements */}
            <div className="absolute top-16 left-8 w-2 h-2 bg-purple-400 rounded-full animate-bounce opacity-60"></div>
            <div className="absolute top-24 right-6 w-1 h-1 bg-pink-400 rounded-full animate-bounce opacity-60 delay-100"></div>
          </header>

          {/* Compact Features Section */}
          <section className="space-y-2 mb-5">
            {FEATURES.map((feature, index) => (
              <FeatureItem 
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                gradient={feature.gradient}
              />
            ))}
          </section>

          {/* Pricing Plans Section */}
          <section className="space-y-3 mb-5">
            <h3 className="text-white font-bold text-lg text-center mb-3">Choose Your Plan</h3>
            {Object.entries(getPlanConfig(offerings)).map(([planKey, config]) => (
              <PlanOption
                key={planKey}
                planKey={planKey}
                config={config}
                isSelected={selectedPlan === planKey}
                onSelect={setSelectedPlan}
              />
            ))}
          </section>

          {/* Terms Section */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-white/80 text-sm font-medium">No Commitment - Cancel Anytime</p>
          </div>

          {/* Error Display */}
          {hasError && <ErrorMessage />}

          {/* CTA Section */}
          <CTAButton
            isProcessing={isProcessing}
            hasError={hasError}
            onClick={handlePurchase}
            disabled={isProcessing}
          />

          {/* Restore Purchases Button - Apple Guideline 3.1.1 */}
          <RestorePurchasesButton 
            onRestore={handleRestorePurchases}
            isRestoring={isRestoring}
            restoreMsg={restoreMsg}
          />

          {/* Legal Links - Apple Guideline 3.1.2 */}
          <LegalLinks />
          
        </div>
      </div>
    </div>
  );
};