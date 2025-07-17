import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useToast } from '@/hooks/use-toast';

interface PaywallProps {
  onClose?: () => void;
  onPurchaseSuccess?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchaseSuccess }) => {
  const { offerings, purchaseProduct, isLoading, restorePurchases } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (productId: string) => {
    setPurchasing(true);
    try {
      const success = await purchaseProduct(productId);
      if (success) {
        toast({
          title: "Purchase Successful!",
          description: "Welcome to Dripify AI Premium! Enjoy unlimited style analyses.",
        });
        onPurchaseSuccess?.();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      toast({
        title: "Purchases Restored",
        description: "Your previous purchases have been restored.",
      });
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "No purchases found to restore.",
        variant: "destructive",
      });
    }
  };

  const features = [
    { name: 'Unlimited outfit analyses', included: true },
    { name: 'Personalized style reports', included: true },
    { name: 'AI-powered recommendations', included: true },
    { name: 'Advanced color palette analysis', included: true },
    { name: 'Exclusive style trends', included: true },
    { name: 'Priority customer support', included: true },
    { name: 'Wardrobe organization tools', included: true },
    { name: 'Export your style profiles', included: true },
  ];

  const freeFeatures = [
    { name: '3 outfit analyses per month', included: true },
    { name: 'Basic style recommendations', included: true },
    { name: 'Limited color analysis', included: true },
    { name: 'Standard support', included: true },
    { name: 'Advanced features', included: false },
    { name: 'Unlimited analyses', included: false },
    { name: 'Personalized reports', included: false },
    { name: 'Premium trends', included: false },
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

  const monthlyOffering = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.packageType === 'MONTHLY'
  );
  
  const yearlyOffering = offerings?.[0]?.availablePackages?.find(pkg => 
    pkg.packageType === 'ANNUAL'
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Unlock Premium Styling</h2>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">
              Get unlimited outfit analyses, personalized style reports, and early access to trends
            </p>
          </div>

          {/* Subscription Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Free Plan */}
            <Card className="p-4 border-2">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Free</h3>
                <div className="text-2xl font-bold">$0</div>
                <p className="text-sm text-muted-foreground">Forever</p>
              </div>
              
              <div className="space-y-2 mb-4">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${!feature.included ? 'text-muted-foreground line-through' : ''}`}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onClose}
              >
                Continue with Free
              </Button>
            </Card>

            {/* Premium Plan */}
            <Card className="p-4 border-2 border-primary relative">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Premium</h3>
                <div className="text-2xl font-bold">
                  ${monthlyOffering?.product?.price || '9.99'}
                </div>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              
              <div className="space-y-2 mb-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{feature.name}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => handlePurchase(monthlyOffering?.product?.identifier || '')}
                disabled={purchasing}
              >
                {purchasing ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </Card>
          </div>

          {/* Yearly Option */}
          {yearlyOffering && (
            <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Yearly Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Save 20% with annual billing
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ${yearlyOffering.product?.price || '99.99'}
                  </div>
                  <div className="text-sm text-muted-foreground">per year</div>
                </div>
              </div>
              <Button 
                className="w-full mt-4"
                variant="outline"
                onClick={() => handlePurchase(yearlyOffering.product?.identifier || '')}
                disabled={purchasing}
              >
                {purchasing ? 'Processing...' : 'Choose Yearly'}
              </Button>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Subscriptions auto-renew. Cancel anytime from your device settings.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                variant="link" 
                size="sm"
                onClick={handleRestore}
                className="text-xs"
              >
                Restore Purchases
              </Button>
              <Button 
                variant="link" 
                size="sm"
                className="text-xs"
                onClick={() => window.open('/privacy-policy.html', '_blank')}
              >
                Privacy Policy
              </Button>
              <Button 
                variant="link" 
                size="sm"
                className="text-xs"
                onClick={() => window.open('/terms-of-service.html', '_blank')}
              >
                Terms of Service
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};