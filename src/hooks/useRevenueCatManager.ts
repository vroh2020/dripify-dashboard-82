import { useState, useEffect, useCallback, useRef } from 'react';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
  offeringId: string | null;
};

export const useRevenueCatManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
    expirationDate: null,
    productId: null,
    offeringId: null,
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const lastPurchaseAttempt = useRef<Date | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      return { isActive: false, expirationDate: null, productId: null, offeringId: null };
    }

    try {
      if (Capacitor.isNativePlatform()) {
        if (!hasInitialized.current) {
          return subscription;
        }
        const { customerInfo } = await Purchases.getCustomerInfo();
        const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
        
        console.log('🔄 fetchSubscriptionStatus result:', { isPro, userId: user.id });
        
        const newStatus = {
          isActive: isPro,
          expirationDate: subscription.expirationDate,
          productId: subscription.productId,
          offeringId: subscription.offeringId
        };
        
        setSubscription(newStatus);
        return newStatus;
      } else {
        // Web platform - check Supabase for subscription status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_expires_at')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        const newStatus = {
          isActive: profile?.subscription_status === 'active',
          expirationDate: profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null,
          productId: subscription.productId,
          offeringId: 'web'
        };

        setSubscription(newStatus);
        return newStatus;
      }
    } catch (error) {
      console.error('fetchSubscriptionStatus failed:', error);
      return subscription;
    }
  }, [user?.id]); // FIXED: Only depend on user.id, not the entire subscription object

  const refreshSubscription = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const purchaseProduct = useCallback(async (product: PurchasesPackage['product']) => {
    if (!user) return false;

    // Prevent rapid purchase attempts
    if (lastPurchaseAttempt.current) {
      const timeSinceLastAttempt = Date.now() - lastPurchaseAttempt.current.getTime();
      if (timeSinceLastAttempt < 2000) { // 2 seconds
        toast({ 
          title: "Please Wait", 
          description: "Please wait a moment before trying again." 
        });
        return false;
      }
    }
    lastPurchaseAttempt.current = new Date();

    if (!Capacitor.isNativePlatform()) {
      try {
        setIsLoading(true);
        
        console.log('🔄 Starting web purchase simulation for user:', user?.id);
        
        // Show payment confirmation dialog
        const confirmed = window.confirm(
          'This is a web demo. In production, this would open a payment flow. Would you like to simulate a successful payment?'
        );
        
        if (!confirmed) {
          console.log('❌ User cancelled web purchase simulation');
          toast({ 
            title: "Payment Cancelled", 
            description: "You can try again anytime." 
          });
          return false;
        }
        
        console.log('✅ User confirmed web purchase simulation');
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 days trial

        const newSubscription = {
          isActive: true,
          expirationDate: expiryDate,
          productId: product.identifier,
          offeringId: 'web-simulation'
        };
        
        console.log('🔄 Updating Supabase profile for user:', user?.id);
        console.log('📝 Update data:', {
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: expiryDate.toISOString()
        });
        
        // Update Supabase profile
        const { data, error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: expiryDate.toISOString()
        }).eq('id', user.id).select();

        console.log('📊 Supabase update result:', { data, error: profileError });

        if (profileError) {
          console.error('❌ Supabase profile update failed:', profileError);
          throw profileError;
        }
        
        console.log('✅ Supabase profile updated successfully');
        
        setSubscription(newSubscription);
        toast({ 
          title: "Welcome to Pro! 🎉", 
          description: "Your subscription is now active." 
        });
        return true;
      } catch (error: any) {
        console.error('❌ Web purchase simulation failed:', error);
        
        // Handle specific error types
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
          toast({ 
            variant: "destructive", 
            title: "Network Error", 
            description: "Please check your internet connection and try again." 
          });
        } else if (error.message?.includes('profile') || error.message?.includes('database') || error.message?.includes('auth')) {
          toast({ 
            variant: "destructive", 
            title: "Save Error", 
            description: "Payment succeeded but failed to save. Please contact support." 
          });
        } else {
          toast({ 
            variant: "destructive", 
            title: "Payment Failed", 
            description: "Please try again or contact support if the issue persists." 
          });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    // Native iOS RevenueCat flow
    if (!hasInitialized.current) {
      console.error('RevenueCat not initialized');
      toast({ 
        variant: "destructive", 
        title: "Payment System Not Ready", 
        description: "Please wait a moment and try again." 
      });
      return false;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Starting native purchase flow for:', product.identifier);
      
      // CRITICAL FIX: Always attempt actual purchase, don't assume existing subscription
      const result = await Purchases.purchaseStoreProduct(product);
      console.log('✅ Purchase result:', result);
      
      // Validate the purchase was actually completed
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      const hasActiveEntitlement = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER];
      
      console.log('🔍 Purchase validation:', { 
        isPro, 
        hasActiveEntitlement: !!hasActiveEntitlement,
        productId: product.identifier,
        entitlements: Object.keys(result.customerInfo.entitlements.active || {})
      });
      
      if (isPro) {
        // Update Supabase profile
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: result.customerInfo.latestExpirationDate ? 
            new Date(result.customerInfo.latestExpirationDate).toISOString() : 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days fallback
        }).eq('id', user.id);

        if (profileError) {
          console.error('Failed to update profile after purchase:', profileError);
        }

        toast({ 
          title: "Welcome to Pro! 🎉", 
          description: "Your subscription is now active!" 
        });
        await fetchSubscriptionStatus();
        return true;
      } else {
        console.log('❌ Purchase validation failed - no new subscription detected');
        toast({ 
          variant: "destructive", 
          title: "Purchase Validation Failed", 
          description: "Please try again or contact support." 
        });
        return false;
      }
      
    } catch (error: any) {
      console.error('Native purchase failed:', error);
      
      // Handle specific RevenueCat error types
      if (error.message?.includes('cancelled') || error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
        toast({ 
          title: "Payment Cancelled", 
          description: "You can try again anytime." 
        });
      } else if (error.message?.includes('already active') || error.message?.includes('already subscribed')) {
        toast({ 
          title: "Subscription Already Active", 
          description: "You already have an active subscription!" 
        });
        await fetchSubscriptionStatus();
        return true;
      } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        toast({ 
          variant: "destructive", 
          title: "Too Many Requests", 
          description: "Please wait a moment and try again." 
        });
      } else if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('connection')) {
        toast({ 
          variant: "destructive", 
          title: "Network Error", 
          description: "Please check your internet connection and try again." 
        });
      } else if (error.message?.includes('payment') || error.message?.includes('billing')) {
        toast({ 
          variant: "destructive", 
          title: "Payment Issue", 
          description: "There was an issue with your payment method. Please try again." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Purchase Failed", 
          description: "Please try again or contact support if the issue persists." 
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchSubscriptionStatus, user]);

  const restorePurchases = useCallback(async () => {
    if (!user) return false;

    if (!Capacitor.isNativePlatform()) {
      try {
        setIsLoading(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_expires_at')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.subscription_status === 'active') {
          toast({ 
            title: "Subscription Active", 
            description: "Your Pro subscription is already active." 
          });
          return true;
        }

        toast({ 
          title: "No Active Subscription", 
          description: "We couldn't find any active subscriptions." 
        });
        return false;
      } catch (error: any) {
        console.error('Web restore failed:', error);
        
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
          toast({ 
            variant: "destructive", 
            title: "Network Error", 
            description: "Please check your internet connection and try again." 
          });
        } else {
          toast({ 
            variant: "destructive", 
            title: "Restore Failed", 
            description: "Please try again or contact support." 
          });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    if (!hasInitialized.current) {
      toast({ 
        variant: "destructive", 
        title: "System Not Ready", 
        description: "Please wait a moment and try again." 
      });
      return false;
    }

    try {
      setIsLoading(true);
      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);

      if (isPro) {
        toast({ 
          title: "Purchases Restored!", 
          description: "Your Pro subscription has been restored." 
        });
        await fetchSubscriptionStatus();
        return true;
      } else {
        toast({ 
          title: "No Purchases Found", 
          description: "We couldn't find any previous subscriptions to restore." 
        });
        return false;
      }
    } catch (error: any) {
      console.error('Restore purchases failed:', error);
      
      // Handle specific error types
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        toast({ 
          variant: "destructive", 
          title: "Too Many Requests", 
          description: "Please wait a moment and try again." 
        });
      } else if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('connection')) {
        toast({ 
          variant: "destructive", 
          title: "Network Error", 
          description: "Please check your internet connection and try again." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Restore Failed", 
          description: "Unable to restore purchases. Please try again or contact support." 
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchSubscriptionStatus, user]);

  useEffect(() => {
    if (!user) {
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: null,
        offeringId: null
      });
      return;
    }

    if (hasInitialized.current) {
      return;
    }
    
    const init = async () => {
      setIsLoading(true);
      try {
        if (!Capacitor.isNativePlatform()) {
          // Web platform initialization
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, subscription_expires_at')
            .eq('id', user.id)
            .maybeSingle();

          setSubscription({
            isActive: profile?.subscription_status === 'active',
            expirationDate: profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null,
            productId: null,
            offeringId: 'web'
          });
          
          hasInitialized.current = true;
          return;
        }

        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        if (error || !data?.publicKey) {
          throw new Error('No API key');
        }

        // First configure RevenueCat
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: null // Required by type definition
        });

        // Then explicitly log in the user to switch to their account
        try {
          await Purchases.logIn({ appUserID: user.id });
          console.log('🔄 Logged in RevenueCat user:', user.id);
          
          // Now check their subscription status
          const { customerInfo } = await Purchases.getCustomerInfo();
          const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
          
          setSubscription({
            isActive: isPro,
            expirationDate: null,
            productId: null,
            offeringId: null
          });
        } catch (loginError) {
          console.error('RevenueCat login failed:', loginError);
          // If login fails, ensure subscription is marked as inactive
          setSubscription({
            isActive: false,
            expirationDate: null,
            productId: null,
            offeringId: null
          });
        }

        hasInitialized.current = true;

        const offeringsData = await Purchases.getOfferings();
        setOfferings(Object.values(offeringsData.all || {}));
      } catch (error) {
        console.error('RevenueCat initialization failed:', error);
        setSubscription({
          isActive: false,
          expirationDate: null,
          productId: null,
          offeringId: null
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user]);

  return {
    subscription,
    isLoading,
    offerings,
    purchaseProduct,
    restorePurchases,
    refreshSubscription
  };
};