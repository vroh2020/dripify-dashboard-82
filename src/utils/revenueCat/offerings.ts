
import { Purchases } from '@revenuecat/purchases-capacitor';
import { toast } from "@/hooks/use-toast";
import { PurchasesPackage, DemoPackage } from './types';
import { isCapacitorAvailable } from './config';

// Specific offering ID provided by user
const SPECIFIC_OFFERING_ID = 'ofrng4657c81eae';

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
    offering: SPECIFIC_OFFERING_ID,
    offeringIdentifier: SPECIFIC_OFFERING_ID,
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
    console.log(`Fetching RevenueCat offerings for specific offering: ${SPECIFIC_OFFERING_ID}`);
    
    if (typeof Purchases === 'undefined') {
      console.error('Purchases SDK is undefined');
      throw new Error('RevenueCat SDK not available');
    }
    
    const offerings = await Purchases.getOfferings();
    
    console.log('Full offerings response:', JSON.stringify(offerings, null, 2));
    
    // Look for the specific offering by ID
    const specificOffering = offerings.all[SPECIFIC_OFFERING_ID];
    
    if (!specificOffering) {
      console.warn(`Specific offering ${SPECIFIC_OFFERING_ID} not found`);
      toast({
        title: "Offering Not Found",
        description: `Offering ${SPECIFIC_OFFERING_ID} is not configured in RevenueCat`,
        variant: "destructive",
      });
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    if (!specificOffering.availablePackages?.length) {
      console.warn('No packages available in the specified offering');
      
      toast({
        title: "No Products Available",
        description: "No products found in the specified RevenueCat offering",
        variant: "destructive",
      });
      
      return convertDemoPackagesToPurchasesPackages(demoPackages);
    }
    
    console.log('Packages in specific offering:', 
      specificOffering.availablePackages.map(pkg => ({
        identifier: pkg.identifier,
        productIdentifier: pkg.product.identifier,
        title: pkg.product.title,
        price: pkg.product.price
      }))
    );
    
    return specificOffering.availablePackages;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    
    toast({
      title: "RevenueCat Error",
      description: "Failed to load subscription options",
      variant: "destructive",
    });
    
    // Fallback to demo packages when there's an error
    return convertDemoPackagesToPurchasesPackages(demoPackages);
  }
}
