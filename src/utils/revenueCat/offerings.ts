
import { Purchases } from '@revenuecat/purchases-capacitor';
import { toast } from "@/hooks/use-toast";
import { PurchasesPackage, DemoPackage } from './types';
import { isCapacitorAvailable } from './config';

const demoPackages: DemoPackage[] = [
  {
    identifier: 'monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'premium_monthly',
      title: 'Monthly Premium',
      description: 'Unlimited style scans and personalized tips',
      price: 4.99,
      priceString: '$4.99/month',
      currencyCode: 'USD',
      subscriptionPeriod: 'P1M'
    },
    offering: 'default',
    offeringIdentifier: 'default',
    presentedOfferingContext: {},
  },
  {
    identifier: 'yearly',
    packageType: 'ANNUAL',
    product: {
      identifier: 'premium_yearly',
      title: 'Annual Premium',
      description: 'Our best value plan with additional perks',
      price: 39.99,
      priceString: '$39.99/year',
      currencyCode: 'USD',
      subscriptionPeriod: 'P1Y'
    },
    offering: 'default',
    offeringIdentifier: 'default',
    presentedOfferingContext: {},
  }
];

// Convert demo packages to the format expected by the app
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
      console.warn('No offerings available from RevenueCat');
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    console.log('RevenueCat offerings retrieved:', offerings.current.availablePackages.length);
    return offerings.current.availablePackages;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    toast({
      title: "Error",
      description: "Failed to load subscription options",
      variant: "destructive",
    });
    // Fallback to demo packages when there's an error
    return convertDemoPackagesToPurchasesPackages(demoPackages);
  }
}
