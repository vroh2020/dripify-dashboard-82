declare module '@revenuecat/purchases-capacitor' {
  export interface CustomerInfo {
    entitlements: {
      active: {
        [key: string]: {
          isActive: boolean;
          willRenew: boolean;
          periodType: string;
          latestPurchaseDate: string;
          originalPurchaseDate: string;
          expirationDate: string | null;
          store: string;
          productIdentifier: string;
          productPlanIdentifier: string | null;
          unsubscribeDetectedAt: string | null;
          billingIssueDetectedAt: string | null;
          gracePeriodExpirationDate: string | null;
        };
      };
    };
  }

  export interface PurchasesPackage {
    identifier: string;
    offeringIdentifier: string;
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

  export enum LOG_LEVEL {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
  }

  export class Purchases {
    static setLogLevel({ level }: { level: LOG_LEVEL }): Promise<void>;
    static configure({ apiKey, appUserID }: { apiKey: string; appUserID: string | null }): Promise<void>;
    static getOfferings(): Promise<{ current: { availablePackages: PurchasesPackage[] } }>;
    static purchasePackage({ offeringIdentifier, packageIdentifier }: { offeringIdentifier: string; packageIdentifier: string }): Promise<{ customerInfo: CustomerInfo }>;
    static restorePurchases(): Promise<{ customerInfo: CustomerInfo }>;
    static getCustomerInfo(): Promise<{ customerInfo: CustomerInfo }>;
    static logIn({ appUserID }: { appUserID: string }): Promise<void>;
    static logOut(): Promise<void>;
    static addCustomerInfoUpdateListener(callback: (info: { customerInfo: CustomerInfo }) => void): Promise<void>;
  }
} 