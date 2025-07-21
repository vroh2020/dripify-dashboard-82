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
      console.log('🔄 Starting native RevenueCat initialization...');
      
      const { data, error } = await supabase.functions.invoke('revenuecat-config');
      if (error) {
        console.error('❌ Failed to get RevenueCat config:', error);
        throw new Error(`Failed to get RevenueCat API key: ${error.message}`);
      }
      if (!data?.publicKey) {
        console.error('❌ No public key in config response:', data);
        throw new Error('No public key returned from revenuecat-config');
      }

      console.log('✅ Got RevenueCat config, configuring SDK...');
      await Purchases.configure({ apiKey: data.publicKey, appUserID: null });

      console.log('🔄 Fetching offerings...');
      const offeringsData = await Purchases.getOfferings();
      this.offerings = Object.values(offeringsData.all || {});
      
      console.log('🔍 RevenueCat offerings loaded:', {
        count: this.offerings.length,
        current: offeringsData.current?.identifier || 'none',
        all: this.offerings.map(o => ({ id: o.identifier, packages: o.availablePackages.length }))
      });

      if (this.offerings.length === 0) {
        console.warn('⚠️ No offerings found! Check RevenueCat dashboard and App Store Connect configuration');
      }
    } catch (error) {
      console.error('❌ Native RevenueCat initialization failed:', error);
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
    // No mock/fallback packages
    return [];
  }

  async purchaseProduct(product: PurchasesPackage['product']): Promise<PurchaseResult> {
    try {
      if (this.isNative) {
        const result = await Purchases.purchaseStoreProduct(product);
        const isPro = result.customerInfo.entitlements.active?.['pro']?.isActive || false;
        if (isPro) {
          useAppStore.getState().setSubscription({
            isActive: true,
            productId: product.identifier,
            expirationDate: result.customerInfo.latestExpirationDate
              ? new Date(result.customerInfo.latestExpirationDate)
              : null
          });
          return { success: true, productId: product.identifier };
        } else {
          return { success: false, error: 'Purchase verification failed' };
        }
      } else {
        // Web simulation
        return { success: false, error: 'Purchases not available on web' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
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
}

export const subscriptionService = new SubscriptionService();