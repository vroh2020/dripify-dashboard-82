
import { PurchasesPackage, CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';

export type { PurchasesPackage, CustomerInfo, PurchasesStoreProduct };

// Create a simplified product structure for demo purposes
export interface DemoProduct {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
  subscriptionPeriod: string;
}

// Create a separate DemoPackage that matches PurchasesPackage structure
export interface DemoPackage {
  identifier: string;
  packageType: string;
  product: DemoProduct;
  offering: string;
  offeringIdentifier: string;
  presentedOfferingContext: Record<string, unknown>;
}
