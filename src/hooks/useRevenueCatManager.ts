import { useState, useEffect, useCallback, useRef } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
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
        
        console.log('🔄 fetchSubscriptionStatus result:', { isPro });
        
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
          .select('subscription_status, subscription_expiry')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        const newStatus = {
          isActive: profile?.subscription_status === 'active',
          expirationDate: profile?.subscription_expiry ? new Date(profile.subscription_expiry) : null,
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
  }, [user, subscription]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const purchaseProduct = useCallback(async (product: PurchasesPackage['product']) => {
    if (!user) return false;

    // Prevent rapid purchase attempts
    if (lastPurchaseAttempt.current) {
      const timeSinceLastAttempt = Date.now() - lastPurchaseAttempt.current.getTime();
      if (timeSinceLastAttempt < 2000) { // 2 seconds
        return false;
      }
    }
    lastPurchaseAttempt.current = new Date();

    if (!Capacitor.isNativePlatform()) {
      try {
        setIsLoading(true);
        
        // Show payment confirmation dialog
        const confirmed = window.confirm(
          'This is a web demo. In production, this would open a payment flow. Would you like to simulate a successful payment?'
        );
        
        if (!confirmed) {
          toast({ 
            title: "Payment Cancelled", 
            description: "You can try again anytime." 
          });
          return false;
        }
        
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
        
        // Update Supabase profile
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: expiryDate.toISOString()
        }).eq('id', user.id);

        if (profileError) throw profileError;
        
        setSubscription(newSubscription);
        toast({ 
          title: "Welcome to Pro! 🎉", 
          description: "Your 7-day trial is now active." 
        });
        return true;
      } catch (error) {
        console.error('Web purchase simulation failed:', error);
        toast({ 
          variant: "destructive", 
          title: "Payment Failed", 
          description: "Please try again or contact support if the issue persists." 
        });
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
        title: "Payment Error", 
        description: "Payment system not ready. Please try again." 
      });
      return false;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Starting native purchase flow for:', product.identifier);
      
      const result = await Purchases.purchaseStoreProduct(product);
      console.log('✅ Purchase result:', result);
      
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      
      if (isPro) {
        // Update Supabase profile
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: result.customerInfo.latestExpirationDate
            ? new Date(result.customerInfo.latestExpirationDate).toISOString()
            : null
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
      }
      
      return false;
    } catch (error: any) {
      console.error('Native purchase failed:', error);
      
      if (!error.message?.includes('cancelled')) {
        toast({ 
          variant: "destructive", 
          title: "Purchase Failed", 
          description: error.message?.includes('already active') 
            ? "You already have an active subscription."
            : "Please try again or contact support if the issue persists." 
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
          .select('subscription_status, subscription_expiry')
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
      } catch (error) {
        console.error('Web restore failed:', error);
        toast({ 
          variant: "destructive", 
          title: "Restore Failed", 
          description: "Please try again or contact support." 
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    if (!hasInitialized.current) return false;

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
          description: "We couldn't find any previous subscriptions." 
        });
        return false;
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Restore Failed", 
        description: "Please try again or contact support." 
      });
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
            .select('subscription_status, subscription_expiry')
            .eq('id', user.id)
            .maybeSingle();

          setSubscription({
            isActive: profile?.subscription_status === 'active',
            expirationDate: profile?.subscription_expiry ? new Date(profile.subscription_expiry) : null,
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

        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: user.id
        });

        hasInitialized.current = true;

        const { customerInfo } = await Purchases.getCustomerInfo();
        const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
        
        setSubscription({
          isActive: isPro,
          expirationDate: null,
          productId: null,
          offeringId: null
        });

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
