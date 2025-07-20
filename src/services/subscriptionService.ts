import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';

export interface Product {
  id: string;
  price: string;
  period: string;
  name: string;
}

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
      // Continue without subscription service for now
      this.isInitialized = true;
    }
  }

  private async initializeNative(): Promise<void> {
    try {
      // Get API key from Supabase function
      const { data, error } = await supabase.functions.invoke('revenuecat-config');
      if (error || !data?.publicKey) {
        throw new Error('Failed to get RevenueCat API key');
      }

      // Configure RevenueCat
      await Purchases.configure({
        apiKey: data.publicKey,
        appUserID: null
      });

      // Get offerings
      const offeringsData = await Purchases.getOfferings();
      this.offerings = Object.values(offeringsData.all || {});
      
      console.log('🔍 RevenueCat offerings loaded:', this.offerings.length);
    } catch (error) {
      console.error('Native RevenueCat initialization failed:', error);
      throw error;
    }
  }

  private async initializeWeb(): Promise<void> {
    // Web platform - use simulation mode
    console.log('🌐 Web platform subscription service ready');
  }

  getAvailableProducts(): Product[] {
    const products: Product[] = [];

    if (this.isNative && this.offerings.length > 0) {
      // Extract products from RevenueCat offerings
      for (const offering of this.offerings) {
        for (const pkg of offering.availablePackages) {
          const product = pkg.product;
          products.push({
            id: product.identifier,
            price: product.priceString,
            period: this.getPeriodFromProduct(product.identifier),
            name: this.getNameFromProduct(product.identifier)
          });
        }
      }
    } else {
      // Fallback products for web or when RevenueCat fails
      products.push(
        {
          id: 'gs_499_1w',
          price: '$4.99',
          period: '/week',
          name: 'Weekly Premium'
        },
        {
          id: 'gs_1099_1m',
          price: '$10.99',
          period: '/month',
          name: 'Monthly Premium'
        }
      );
    }

    return products;
  }

  private getPeriodFromProduct(productId: string): string {
    if (productId.includes('1w')) return '/week';
    if (productId.includes('1m')) return '/month';
    if (productId.includes('1y')) return '/year';
    return '/month';
  }

  private getNameFromProduct(productId: string): string {
    if (productId.includes('1w')) return 'Weekly Premium';
    if (productId.includes('1m')) return 'Monthly Premium';
    if (productId.includes('1y')) return 'Yearly Premium';
    return 'Premium';
  }

  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    const store = useAppStore.getState();
    
    try {
      if (this.isNative) {
        return await this.purchaseNative(productId);
      } else {
        return await this.purchaseWeb(productId);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async purchaseNative(productId: string): Promise<PurchaseResult> {
    try {
      // Find the package containing this product
      let targetPackage = null;
      let targetOffering = null;

      for (const offering of this.offerings) {
        for (const pkg of offering.availablePackages) {
          if (pkg.product.identifier === productId) {
            targetPackage = pkg;
            targetOffering = offering;
            break;
          }
        }
        if (targetPackage) break;
      }

      if (!targetPackage || !targetOffering) {
        throw new Error(`Product ${productId} not found in offerings`);
      }

      // Make the purchase
      const result = await Purchases.purchasePackage({
        offeringIdentifier: targetOffering.identifier,
        packageIdentifier: targetPackage.identifier
      });

      // Check if purchase was successful
      const isPro = result.customerInfo.entitlements.active?.['pro']?.isActive || false;

      if (isPro) {
        // Update app store
        useAppStore.getState().setSubscription({
          isActive: true,
          productId,
          expirationDate: result.customerInfo.latestExpirationDate 
            ? new Date(result.customerInfo.latestExpirationDate) 
            : null
        });

        return { success: true, productId };
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

  private async purchaseWeb(productId: string): Promise<PurchaseResult> {
    // Web simulation
    const confirmed = window.confirm(
      `Would you like to simulate purchasing ${productId}?\n\nThis is a demo environment.`
    );

    if (!confirmed) {
      return { success: false, error: 'Purchase cancelled' };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update app store
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 day trial

    useAppStore.getState().setSubscription({
      isActive: true,
      productId,
      expirationDate
    });

    console.log('✅ Web purchase simulation successful');
    return { success: true, productId };
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
    const store = useAppStore.getState();
    const subscription = store.subscription;
    
    if (!subscription.isActive) return false;
    
    // Check expiration date
    if (subscription.expirationDate) {
      return new Date() < subscription.expirationDate;
    }
    
    return subscription.isActive;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();