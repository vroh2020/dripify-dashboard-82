import { useState } from 'react';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { useSubscription } from '../hooks/useSubscription';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';
import { REVENUECAT_CONFIG } from '../config/revenueCat';

interface PaywallProps {
  onPurchaseComplete?: () => void;
}

export const Paywall = ({ onPurchaseComplete }: PaywallProps) => {
  const { packages, isLoading, error, purchasePackage, restorePurchases } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      setIsPurchasing(true);
      await purchasePackage(selectedPackage);
      onPurchaseComplete?.();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isRestoring) return;
    
    setIsRestoring(true);
    setRestoreMsg('');
    
    try {
      const success = await restorePurchases();
      if (success) {
        setRestoreMsg('✓ Welcome back! Your subscription has been restored successfully.');
      } else {
        setRestoreMsg('Ready to unlock premium features? Choose a plan above to get started!');
      }
    } catch (error) {
      console.error("Restore error:", error);
      setRestoreMsg('Connection issue. Please try again or contact support.');
    } finally {
      setIsRestoring(false);
      setTimeout(() => setRestoreMsg(''), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error loading subscription options. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Upgrade to Pro</h1>
        <p className="text-lg text-muted-foreground">
          Get access to all premium features with our monthly subscription
        </p>
      </div>
      {/* Restore Purchases Link */}
      <div className="text-center mb-4">
        <button
          onClick={handleRestorePurchases}
          className="text-gray-500 underline text-sm font-medium hover:text-gray-700"
          disabled={isRestoring}
        >
          {isRestoring ? 'Restoring...' : 'Restore purchases'}
        </button>
        {restoreMsg && (
          <div className={`mt-2 text-xs ${
            restoreMsg.includes('✓') || restoreMsg.includes('success') 
              ? 'text-green-600' 
              : restoreMsg.includes('Ready to unlock') 
              ? 'text-purple-600'
              : 'text-red-600'
          }`}>
            {restoreMsg}
          </div>
        )}
      </div>
      <div className="grid gap-6">
        {packages.map((pkg) => (
          <Card
            key={pkg.identifier}
            className={`cursor-pointer transition-all ${
              selectedPackage?.identifier === pkg.identifier
                ? 'border-primary ring-2 ring-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedPackage(pkg)}
          >
            <CardHeader>
              <CardTitle className="text-2xl">Pro Subscription</CardTitle>
              <CardDescription>Unlock all premium features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {pkg.product.priceString}
                <span className="text-base font-normal text-muted-foreground">
                  {' '}
                  / month
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Access to all premium features
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Cancel anytime
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Free trial available
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handlePurchase}
                disabled={!selectedPackage || isPurchasing}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Subscribe Now'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}; 