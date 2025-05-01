import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  public async initialize(apiKey: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey,
        appUserID: null, // Let RevenueCat generate a unique ID
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  public async getOfferings(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages || [];
    } catch (error) {
      console.error('Failed to get offerings:', error);
      throw error;
    }
  }

  public async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage({ 
        offeringIdentifier: packageToPurchase.offeringIdentifier,
        packageIdentifier: packageToPurchase.identifier
      });
      return customerInfo;
    } catch (error) {
      console.error('Failed to purchase package:', error);
      throw error;
    }
  }

  public async restorePurchases(): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  public async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      throw error;
    }
  }

  public async identifyUser(userId: string): Promise<void> {
    try {
      await Purchases.logIn({ appUserID: userId });
    } catch (error) {
      console.error('Failed to identify user:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  }
}

export const revenueCatService = RevenueCatService.getInstance(); 