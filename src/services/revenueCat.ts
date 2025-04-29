
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import Logger from '@/utils/logger';

export type SubscriptionStatus = 'active' | 'inactive' | 'unknown';

export interface RevenueCatStatus {
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  offerings: PurchasesOffering[] | null;
  currentOffering: PurchasesOffering | null;
  entitlements: string[];
}

/**
 * Service for managing RevenueCat subscriptions and in-app purchases
 */
class RevenueCatService {
  private isInitialized = false;
  private readonly PRO_ENTITLEMENT = 'pro_features';

  /**
   * Initialize RevenueCat with appropriate API key
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.debug('RevenueCat already initialized');
      return;
    }

    try {
      Logger.debug('Initializing RevenueCat...');
      
      // Fetch configuration from our edge function
      const apiKeyResponse = await this.fetchRevenueCatConfig();

      if (!apiKeyResponse || !apiKeyResponse.publicKey) {
        throw new Error('Could not fetch RevenueCat API key');
      }

      Logger.debug('RevenueCat config fetched successfully');
      
      // Configure RevenueCat with the API key
      await Purchases.configure({
        apiKey: apiKeyResponse.publicKey,
        observerMode: false,
        appUserID: null // Let RevenueCat generate anonymous user IDs
      });

      Logger.info('RevenueCat initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      Logger.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Fetch RevenueCat configuration from edge function
   */
  private async fetchRevenueCatConfig() {
    try {
      const platform = this.getPlatform();
      
      const response = await fetch('https://jjqwhxamjxsiotnhhqco.supabase.co/functions/v1/revenuecat-config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-app-platform': platform
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch RevenueCat config: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      Logger.error('Error fetching RevenueCat config:', error);
      throw error;
    }
  }

  /**
   * Get the current platform (iOS or Android)
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
      return 'ios';
    } else if (userAgent.includes('android')) {
      return 'android';
    }
    return 'unknown';
  }

  /**
   * Get current offerings from RevenueCat
   */
  public async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const offerings = await Purchases.getOfferings();
      
      if (!offerings || !offerings.current) {
        Logger.warn('No offerings found in RevenueCat');
        return null;
      }

      Logger.debug('RevenueCat offerings:', offerings.current);
      return offerings.current;
    } catch (error) {
      Logger.error('Error fetching offerings:', error);
      throw error;
    }
  }

  /**
   * Purchase a package from RevenueCat
   */
  public async purchasePackage(pack: PurchasesPackage): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      Logger.info('Purchasing package:', pack.identifier);
      
      // Fix the type error by using the correct property structure
      const purchaseResult = await Purchases.purchasePackage({ 
        packageIdentifier: pack.identifier
      });
      
      const isPro = purchaseResult.customerInfo.entitlements.active[this.PRO_ENTITLEMENT] !== undefined;
      
      if (isPro) {
        Logger.info('Purchase successful, Pro features unlocked');
      } else {
        Logger.warn('Purchase completed but Pro entitlement not found');
      }
      
      return isPro;
    } catch (error) {
      Logger.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Get current subscription status
   */
  public async getSubscriptionStatus(): Promise<RevenueCatStatus> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const offerings = await Purchases.getOfferings();
      
      const isPro = customerInfo.entitlements.active[this.PRO_ENTITLEMENT] !== undefined;
      
      const entitlements = Object.keys(customerInfo.entitlements.active);
      
      const status: RevenueCatStatus = {
        isPro,
        subscriptionStatus: isPro ? 'active' : 'inactive',
        offerings: offerings.all ? Object.values(offerings.all) : [],
        currentOffering: offerings.current || null,
        entitlements
      };

      Logger.debug('Subscription status:', status);
      return status;
    } catch (error) {
      Logger.error('Error getting subscription status:', error);
      return {
        isPro: false,
        subscriptionStatus: 'unknown',
        offerings: null,
        currentOffering: null,
        entitlements: []
      };
    }
  }

  /**
   * Restore purchases from App Store or Google Play
   */
  public async restorePurchases(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      Logger.info('Restoring purchases...');
      const restoreResult = await Purchases.restorePurchases();
      
      const isPro = restoreResult.customerInfo.entitlements.active[this.PRO_ENTITLEMENT] !== undefined;
      
      if (isPro) {
        Logger.info('Purchases restored successfully, Pro features unlocked');
      } else {
        Logger.warn('Purchases restored but no Pro entitlement found');
      }
      
      return isPro;
    } catch (error) {
      Logger.error('Error restoring purchases:', error);
      throw error;
    }
  }
}

export default new RevenueCatService();
