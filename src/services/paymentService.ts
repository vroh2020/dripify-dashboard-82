import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesPackage } from '@revenuecat/purchases-capacitor';

export interface PaymentResult {
  success: boolean;
  subscriptionStatus?: 'active' | 'inactive';
  expirationDate?: Date | undefined;
  error?: string;
}

export class PaymentService {
  private static instance: PaymentService;
  
  private constructor() {}
  
  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // Initialize RevenueCat
  async initializeRevenueCat(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Web platform - skipping RevenueCat initialization');
      return true;
    }

    try {
      // Get API key from Supabase function
      const { data: config, error: configError } = await supabase.functions.invoke('revenuecat-config');
      if (configError || !config.publicKey) {
        console.error('Failed to fetch RevenueCat API key:', configError);
        return false;
      }

      // Configure RevenueCat
      await Purchases.configure({
        apiKey: config.publicKey,
        appUserID: null
      });

      console.log('✅ RevenueCat initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  // Login user to RevenueCat
  async loginUser(userId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      await Purchases.logIn({ appUserID: userId });
      console.log('✅ User logged in to RevenueCat:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to login user to RevenueCat:', error);
      return false;
    }
  }

  // Purchase product
  async purchaseProduct(product: PurchasesPackage['product'], userId: string): Promise<PaymentResult> {
    try {
      if (!Capacitor.isNativePlatform() || !userId) {
        // Web platform - simulate purchase
        return this.simulateWebPurchase(userId || 'demo');
      }

      // Native platform - actual purchase
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      
      const isActive = customerInfo.entitlements.active?.['pro']?.isActive || false;
      
      if (isActive) {
        // Update Supabase profile
        await this.updateSubscriptionStatus(userId, 'active', customerInfo.latestExpirationDate || undefined);
        
        return {
          success: true,
          subscriptionStatus: 'active',
          expirationDate: customerInfo.latestExpirationDate ? new Date(customerInfo.latestExpirationDate) : undefined
        };
      } else {
        return {
          success: false,
          error: 'Purchase completed but subscription not active'
        };
      }
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      // Handle specific error types
      if (error.message?.includes('cancelled')) {
        return {
          success: false,
          error: 'Purchase cancelled by user'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  // Simulate web purchase
  private async simulateWebPurchase(userId: string): Promise<PaymentResult> {
    try {
      const confirmed = window.confirm(
        '🌐 Web Demo Mode\n\nThis is a web demo of the payment flow. Would you like to simulate a successful subscription purchase?\n\nIn the real app, this would connect to your payment provider.'
      );
      
      if (!confirmed) {
        return {
          success: false,
          error: 'Purchase cancelled by user'
        };
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days trial
      
      // For web demo, completely skip any database operations
      console.log('🌐 Web demo - simulating successful purchase without database operations');
      
      return {
        success: true,
        subscriptionStatus: 'active' as const,
        expirationDate: expiryDate
      };
    } catch (error) {
      console.error('❌ Web purchase simulation failed:', error);
      return {
        success: false,
        error: 'Web purchase simulation failed'
      };
    }
  }

  // Restore purchases
  async restorePurchases(userId: string): Promise<PaymentResult> {
    try {
      if (!Capacitor.isNativePlatform()) {
        // Web platform - check Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_expiry')
          .eq('id', userId)
          .single();

        if (profile?.subscription_status === 'active') {
          return {
            success: true,
            subscriptionStatus: 'active',
            expirationDate: profile.subscription_expiry ? new Date(profile.subscription_expiry) : undefined
          };
        } else {
          return {
            success: false,
            error: 'No active subscription found'
          };
        }
      }

      // Native platform - restore from RevenueCat
      const { customerInfo } = await Purchases.restorePurchases();
      const isActive = customerInfo.entitlements.active?.['pro']?.isActive || false;
      
      if (isActive) {
        await this.updateSubscriptionStatus(userId, 'active', customerInfo.latestExpirationDate || undefined);
        
        return {
          success: true,
          subscriptionStatus: 'active',
          expirationDate: customerInfo.latestExpirationDate ? new Date(customerInfo.latestExpirationDate) : undefined
        };
      } else {
        return {
          success: false,
          error: 'No active subscription found'
        };
      }
    } catch (error: any) {
      console.error('❌ Restore purchases failed:', error);
      return {
        success: false,
        error: error.message || 'Restore failed'
      };
    }
  }

  // Update subscription status in Supabase
  private async updateSubscriptionStatus(userId: string, status: string, expiryDate?: string): Promise<void> {
    try {
      const updateData: any = {
        subscription_status: status,
        updated_at: new Date().toISOString()
      };

      if (expiryDate) {
        updateData.subscription_expiry = expiryDate;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('❌ Failed to update subscription status:', error);
        throw error;
      }

      console.log('✅ Subscription status updated successfully');
    } catch (error) {
      console.error('❌ Error updating subscription status:', error);
      throw error;
    }
  }

  // Get subscription status
  async getSubscriptionStatus(userId: string): Promise<PaymentResult> {
    try {
      if (!Capacitor.isNativePlatform()) {
        // Web platform - check Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_expiry')
          .eq('id', userId)
          .single();

        return {
          success: true,
          subscriptionStatus: (profile?.subscription_status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
          expirationDate: profile?.subscription_expiry ? new Date(profile.subscription_expiry) : undefined
        };
      }

      // Native platform - check RevenueCat
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isActive = customerInfo.entitlements.active?.['pro']?.isActive || false;
      
      return {
        success: true,
        subscriptionStatus: isActive ? 'active' : 'inactive',
        expirationDate: customerInfo.latestExpirationDate ? new Date(customerInfo.latestExpirationDate) : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get subscription status:', error);
      return {
        success: false,
        error: 'Failed to get subscription status'
      };
    }
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance(); 