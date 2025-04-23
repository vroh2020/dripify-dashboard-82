
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
    
    // Check Purchases instance state
    if (typeof Purchases === 'undefined') {
      console.error('Purchases SDK is undefined');
      throw new Error('RevenueCat SDK not available');
    }
    
    // Log available methods for debugging
    console.log('Available RevenueCat methods:', 
      Object.getOwnPropertyNames(Purchases).filter(m => typeof Purchases[m] === 'function'));
    
    const offerings = await Purchases.getOfferings();
    
    console.log('Offerings response:', JSON.stringify(offerings, null, 2));
    
    if (!offerings) {
      console.warn('No offerings object returned from RevenueCat');
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    if (!offerings.current) {
      console.warn('No current offering found in RevenueCat response');
      toast({
        title: "RevenueCat Setup",
        description: "No default offering found. Check your RevenueCat dashboard configuration.",
        variant: "destructive",
      });
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    if (!offerings.current.availablePackages?.length) {
      console.warn('No packages available in current offering');
      
      // Show more specific error for missing product configuration
      toast({
        title: "RevenueCat Products Missing",
        description: "No products found in your RevenueCat offering. Check product configuration in RevenueCat dashboard.",
        variant: "destructive",
      });
      
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    console.log('RevenueCat offerings retrieved:', offerings.current.availablePackages.length);
    console.log('Package details:', offerings.current.availablePackages.map(pkg => ({
      identifier: pkg.identifier,
      productIdentifier: pkg.product.identifier,
      title: pkg.product.title,
      price: pkg.product.price
    })));
    
    return offerings.current.availablePackages;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    
    // More specific error message based on error type
    let errorMessage = "Failed to load subscription options";
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', JSON.stringify(error));
      
      // Try to extract more detailed error info
      if ('message' in error) {
        const errorStr = String(error.message);
        
        if (errorStr.includes('no products registered') || errorStr.includes('No products')) {
          errorMessage = "No products found in RevenueCat. Check product configuration in App Store Connect/Google Play.";
        } else if (errorStr.includes('initialization') || errorStr.includes('configure')) {
          errorMessage = "RevenueCat not properly initialized. Check API key configuration.";
        } else if (errorStr.includes('network') || errorStr.includes('connection')) {
          errorMessage = "Network error connecting to RevenueCat. Check internet connection.";
        }
      }
    }
    
    toast({
      title: "RevenueCat Error",
      description: errorMessage,
      variant: "destructive",
    });
    
    // Fallback to demo packages when there's an error
    return convertDemoPackagesToPurchasesPackages(demoPackages);
  }
}
