import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

interface ProOfferCardProps {
  onContinue: () => void;
}

// Plan configuration
const PLAN_CONFIG = {
  weekly: {
    identifier: "gs_499_1w",
    title: "Weekly Subscription",
    price: "$4.99",
    period: "/week",
    label: null,
    fallback: {
      identifier: "gs_499_1w",
      title: "Weekly Subscription",
      description: "Weekly subscription",
      price: 4.99,
      priceString: "$4.99",
      currencyCode: "USD",
      subscriptionPeriod: "P1W",
    }
  },
  monthly: {
    identifier: "gs_1099_1m", 
    title: "Monthly Subscription",
    price: "$10.99",
    period: "/month",
    label: "Most Popular",
    fallback: {
      identifier: "gs_1099_1m",
      title: "Monthly Subscription", 
      description: "Monthly subscription",
      price: 10.99,
      priceString: "$10.99",
      currencyCode: "USD",
      subscriptionPeriod: "P1M",
    }
  }
};

const FEATURES = [
  {
    title: "Unlimited style analyses",
    description: "Get unlimited style recommendations"
  },
  {
    title: "Advanced AI recommendations",
    description: "AI-powered personalized suggestions"
  },
  {
    title: "Personal style insights", 
    description: "Track your style evolution"
  },
  {
    title: "Priority support",
    description: "Get help when you need it"
  }
];

// Feature Item Component
const FeatureItem = ({ title, description }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
      <Check className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-white font-semibold text-base leading-tight mb-1">
        {title}
      </p>
      <p className="text-white/60 text-sm">
        {description}
      </p>
    </div>
  </div>
);

// Plan Option Component
const PlanOption = ({ planKey, config, isSelected, onSelect }) => (
  <div 
    className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 ${
      isSelected 
        ? 'border-orange-500 bg-orange-500/10 shadow-lg' 
        : 'border-white/20 bg-white/5 hover:border-white/30'
    }`}
    onClick={() => onSelect(planKey)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected 
            ? 'border-orange-500 bg-orange-500' 
            : 'border-white/40'
        }`}>
          {isSelected && (
            <div className="w-2 h-2 bg-white rounded-full"></div>
          )}
        </div>
        <div>
          <p className="text-white font-semibold capitalize">{planKey}</p>
          <p className="text-white/60 text-sm">{config.price}{config.period}</p>
        </div>
      </div>
      {config.label && (
        <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          {config.label}
        </div>
      )}
    </div>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message = "Payment didn't go through. Please try again." }) => (
  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4 text-center backdrop-blur-sm">
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
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Processing...
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Try Again
        </div>
      );
    }
    
    return "Start My Journey";
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-400 disabled:to-orange-500 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl text-white mb-6"
    >
      {getButtonContent()}
    </Button>
  );
};

// Main Component
export const ProOfferCard = ({ onContinue }: ProOfferCardProps) => {
  const { offerings, purchaseProduct, isPro, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  // Get products from offerings
  const getProduct = (planKey) => {
    const config = PLAN_CONFIG[planKey];
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-8">
      {/* Main Content Container */}
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full pt-8">
        
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
            Unlock Dripify AI to reach your goals faster.
          </h1>
        </header>

        {/* Features Section */}
        <section className="space-y-4 mb-8">
          {FEATURES.map((feature, index) => (
            <FeatureItem 
              key={index}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </section>

        {/* Pricing Plans Section */}
        <section className="space-y-3 mb-6">
          {Object.entries(PLAN_CONFIG).map(([planKey, config]) => (
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
        <div className="flex items-center justify-center gap-2 mb-6">
          <Check className="w-4 h-4 text-green-500" />
          <p className="text-white/60 text-sm">No Commitment - Cancel Anytime</p>
        </div>

        {/* Error Display */}
        {hasError && <ErrorMessage />}

        {/* CTA Section */}
        <CTAButton
          isProcessing={isProcessing}
          hasError={hasError}
          onClick={handlePurchase}
          disabled={isProcessing} // Only disable when processing, not when loading
        />

        {/* Footer */}
        <footer className="text-center">
          <p className="text-white/40 text-xs leading-relaxed">
            Subscription renews automatically. Cancel anytime in settings.
          </p>
        </footer>
        
      </div>
    </div>
  );
};