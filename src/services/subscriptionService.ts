import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';

export interface PurchaseResult {
  success: boolean;
  error?: string;
  productId?: string;
}

class SubscriptionService {
  private isInitialized = false;
  private offerings: PurchasesOffering[] = [];
  private isNative = Capacitor.isNativePlatform();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.isNative) {
        await this.initializeNative();
      } else {
        await this.initializeWeb();
      }
      this.isInitialized = true;
      console.log('✅ Subscription service initialized');
    } catch (error) {
      console.error('❌ Subscription service initialization failed:', error);
      this.isInitialized = true;
    }
  }

  private async initializeNative(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('revenuecat-config');
      if (error || !data?.publicKey) throw new Error('Failed to get RevenueCat API key');

      await Purchases.configure({ apiKey: data.publicKey, appUserID: null });

      const offeringsData = await Purchases.getOfferings();
      this.offerings = Object.values(offeringsData.all || {});
      
      console.log('🔍 RevenueCat offerings loaded:', this.offerings.length);
    } catch (error) {
      console.error('Native RevenueCat initialization failed:', error);
      throw error;
    }
  }

  private async initializeWeb(): Promise<void> {
    console.log('🌐 Web platform subscription service ready');
  }

  getAvailablePackages(): PurchasesPackage[] {
    if (this.isNative && this.offerings.length > 0) {
      return this.offerings.flatMap(offering => offering.availablePackages);
    }
    
    // Fallback mock packages for web or when RevenueCat fails
    return [
      {
        identifier: '$rc_weekly',
        packageType: 'CUSTOM',
        product: {
          identifier: 'gs_499_1w',
          description: 'Weekly Premium',
          title: 'Weekly Premium',
          price: 4.99,
          priceString: '$4.99',
          currencyCode: 'USD',
          subscriptionPeriod: 'P1W',
        },
      },
      {
        identifier: '$rc_monthly',
        packageType: 'CUSTOM',
        product: {
          identifier: 'gs_1099_1m',
          description: 'Monthly Premium',
          title: 'Monthly Premium',
          price: 10.99,
          priceString: '$10.99',
          currencyCode: 'USD',
          subscriptionPeriod: 'P1M',
        },
      },
    ] as PurchasesPackage[];
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
    try {
      if (this.isNative) {
        return await this.purchaseNative(pkg);
      } else {
        return await this.purchaseWeb(pkg);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async purchaseNative(pkg: PurchasesPackage): Promise<PurchaseResult> {
    try {
      console.log('🔍 Starting native purchase for package:', pkg.identifier);
      console.log('🔍 Available offerings:', this.offerings.map(o => ({
        identifier: o.identifier,
        packages: o.availablePackages.map(p => p.identifier)
      })));

      // Find the offering this package belongs to
      let offering = this.offerings.find(o => 
        o.availablePackages.some(p => p.identifier === pkg.identifier)
      );

      if (!offering) {
        console.warn('⚠️ Could not find offering for package, using first available offering');
        offering = this.offerings[0];
      }

      if (!offering) {
        throw new Error(`No offerings available. Make sure RevenueCat is properly configured.`);
      }

      console.log('✅ Using offering:', offering.identifier, 'for package:', pkg.identifier);

      const result = await Purchases.purchasePackage(pkg);

      const isPro = result.customerInfo.entitlements.active?.['pro']?.isActive || false;

      if (isPro) {
        useAppStore.getState().setSubscription({
          isActive: true,
          productId: pkg.product.identifier,
          expirationDate: result.customerInfo.latestExpirationDate 
            ? new Date(result.customerInfo.latestExpirationDate) 
            : null
        });
        return { success: true, productId: pkg.product.identifier };
      } else {
        throw new Error('Purchase verification failed');
      }
    } catch (error) {
      console.error('Native purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  private async purchaseWeb(pkg: PurchasesPackage): Promise<PurchaseResult> {
    const confirmed = window.confirm(
      `Simulate purchasing ${pkg.product.title} for ${pkg.product.priceString}?`
    );

    if (!confirmed) return { success: false, error: 'Purchase cancelled' };

    await new Promise(resolve => setTimeout(resolve, 1500));

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    useAppStore.getState().setSubscription({
      isActive: true,
      productId: pkg.product.identifier,
      expirationDate
    });

    console.log('✅ Web purchase simulation successful');
    return { success: true, productId: pkg.product.identifier };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    if (!this.isNative) {
      return { success: false, error: 'Restore not available on web' };
    }
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = customerInfo.entitlements.active?.['pro']?.isActive || false;

      if (isPro) {
        useAppStore.getState().setSubscription({
          isActive: true,
          expirationDate: customerInfo.latestExpirationDate 
            ? new Date(customerInfo.latestExpirationDate) 
            : null
        });
        return { success: true };
      } else {
        return { success: false, error: 'No active subscriptions found' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed'
      };
    }
  }

  isSubscriptionActive(): boolean {
    const { subscription } = useAppStore.getState();
    if (!subscription.isActive) return false;
    if (subscription.expirationDate) {
      return new Date() < subscription.expirationDate;
    }
    return subscription.isActive;
  }

  async purchasePackageByIds(offeringId: string, packageId: string): Promise<PurchaseResult> {
    // Helper for hard-coded flow requested by the team
    try {
      let pkg: PurchasesPackage | undefined;
      let off: PurchasesOffering | undefined;

      // Try direct match on offeringId first
      const directOffering = this.offerings.find(o => o.identifier === offeringId);
      pkg = directOffering?.availablePackages.find(p => p.identifier === packageId);
      off = directOffering;

      // Fallback: search any offering that contains the packageId
      if (!pkg) {
        for (const o of this.offerings) {
          const found = o.availablePackages.find(p => p.identifier === packageId);
          if (found) {
            pkg = found;
            off = o;
            break;
          }
        }
      }

      if (pkg) {
        return this.purchasePackage(pkg);
      }

      // Fallback – if offerings array is empty (web or failed fetch) create mock package
      const mockPkg: PurchasesPackage = {
        identifier: packageId,
        packageType: 'CUSTOM',
        offeringIdentifier: offeringId,
        product: {
          identifier: packageId === '$rc_weekly' ? 'gs_499_1w' : 'gs_1099_1m',
          title: packageId === '$rc_weekly' ? 'Weekly Premium' : 'Monthly Premium',
          description: '',
          price: packageId === '$rc_weekly' ? 4.99 : 10.99,
          priceString: packageId === '$rc_weekly' ? '$4.99' : '$10.99',
          currencyCode: 'USD',
          subscriptionPeriod: packageId === '$rc_weekly' ? 'P1W' : 'P1M',
        },
      } as PurchasesPackage;

      return this.purchasePackage(mockPkg);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }
}

export const subscriptionService = new SubscriptionService();