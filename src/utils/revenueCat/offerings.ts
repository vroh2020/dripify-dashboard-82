
import { Purchases } from '@revenuecat/purchases-capacitor';
import { toast } from "@/hooks/use-toast";
import { PurchasesPackage, DemoPackage } from './types';
import { isCapacitorAvailable } from './config';

const demoPackages: DemoPackage[] = [
  {
    identifier: 'gs_1299_1m',
    packageType: 'MONTHLY',
    product: {
      identifier: 'gs_1299_1m',
      title: 'Monthly $12.99',
      description: 'Monthly subscription for Gen Style',
      price: 12.99,
      priceString: '$12.99/month',
      currencyCode: 'USD',
      subscriptionPeriod: 'P1M'
    },
    offering: 'default',
    offeringIdentifier: 'default',
    presentedOfferingContext: {},
  }
];

function convertDemoPackagesToPurchasesPackages(demos: DemoPackage[]): PurchasesPackage[] {
  return demos as unknown as PurchasesPackage[];
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  if (!isCapacitorAvailable) {
    console.log('Web environment detected, returning demo packages');
    return convertDemoPackagesToPurchasesPackages(demoPackages);
  }
  
  try {
    console.log('Fetching RevenueCat offerings on mobile device...');
    const offerings = await Purchases.getOfferings();
    
    console.log('Offerings response:', JSON.stringify(offerings));
    
    if (!offerings?.current?.availablePackages?.length) {
      console.warn('No offerings available from RevenueCat - showing demo packages instead');
      
      // Show more specific error for missing product configuration
      toast({
        title: "RevenueCat Configuration Required",
        description: "You need to set up product 'gs_1299_1m' in the RevenueCat dashboard. Using demo products for now.",
        variant: "destructive",
      });
      
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    console.log('RevenueCat offerings retrieved:', offerings.current.availablePackages.length);
    return offerings.current.availablePackages;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    
    // More specific error message for missing products
    let errorMessage = "Failed to load subscription options";
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const errorStr = String(error.message);
      if (errorStr.includes('no products registered') || errorStr.includes('No products')) {
        errorMessage = "Product 'gs_1299_1m' not found in RevenueCat. Please add it in the dashboard.";
      }
    }
    
    toast({
      title: "RevenueCat Setup Required",
      description: errorMessage,
      variant: "destructive",
    });
    
    // Fallback to demo packages when there's an error
    return convertDemoPackagesToPurchasesPackages(demoPackages);
  }
}
