
import { PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';

export type { PurchasesPackage, CustomerInfo };

export interface DemoPackage extends PurchasesPackage {
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
    subscriptionPeriod: string;
  };
}
