import { useState, useEffect, useCallback, useRef } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

// Global flag to prevent duplicate RevenueCat configuration across multiple hook instances
let RC_GLOBAL_INITIALIZED = false;
let RC_LAST_LOGGED_IN_USER: string | null = null;

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
        const expiryTimestamp = customerInfo.latestExpirationDate || null;
        const expiryDate = expiryTimestamp ? new Date(expiryTimestamp) : null;
        
        console.log('🔄 fetchSubscriptionStatus result:', { isPro, expiryDate });
        
        // Check if subscription is expired or expiring soon
        if (expiryDate) {
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isWeekly = subscription.productId === REVENUECAT_CONFIG.products.weekly;
          const planName = isWeekly ? 'Weekly Premium' : 'Monthly Premium';
          
          // Log subscription status for debugging
          console.log(`📅 ${planName} expires in ${daysUntilExpiry} days`);
          
          // If subscription expired, ensure access is revoked
          if (expiryDate < now && isPro) {
            console.warn('⚠️ Subscription appears expired but still marked as active');
            toast({
              title: "Subscription Expired",
              description: `Your ${planName} subscription has expired. Please renew to continue using Pro features.`,
              variant: "destructive"
            });
          }
          
          // Warn if expiring soon (adjust warning period based on plan type)
          const warningDays = isWeekly ? 2 : 3; // 2 days for weekly, 3 days for monthly
          if (daysUntilExpiry <= warningDays && daysUntilExpiry > 0 && isPro) {
            toast({
              title: "Subscription Expiring Soon",
              description: `Your ${planName} subscription expires in ${daysUntilExpiry} day(s). Renew now to avoid interruption.`,
            });
          }
        }
        
        // Determine current product ID from active entitlements if available
        const activeEntitlement = customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER];
        const currentProductId = activeEntitlement?.productIdentifier ?? subscription.productId;

        const newStatus = {
          isActive: isPro,
          expirationDate: expiryDate,
          productId: currentProductId,
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
        const isWeekly = product.identifier === REVENUECAT_CONFIG.products.weekly;
        const planName = isWeekly ? 'Weekly Premium ($4.99/week)' : 'Monthly Premium ($12.99/month)';
        
        const confirmed = window.confirm(
          `This is a web demo. In production, this would open a payment flow. Would you like to simulate a successful payment for ${planName}?`
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
        
        // Calculate expiration date properly
        const expiryDate = new Date();
        if (isWeekly) {
          expiryDate.setDate(expiryDate.getDate() + 7);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        // Set time to end of day to avoid timezone issues
        expiryDate.setHours(23, 59, 59, 999);

        const newSubscription = {
          isActive: true,
          expirationDate: expiryDate,
          productId: product.identifier,
          offeringId: 'web-simulation'
        };
        
        // Update Supabase profile with precise expiration timing
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: expiryDate.toISOString(),
          // The following optional fields may not exist in all databases. Ignore errors if they do.
          subscription_product_id: (product as any).identifier ?? product.identifier,
          subscription_platform: 'web'
        }).eq('id', user.id);

        if (profileError) {
          // Don't block the simulated payment flow – log and continue.
          console.warn('Non-fatal profile update error (web purchase):', profileError.message || profileError);
        }
        
        setSubscription(newSubscription);
        const planType = isWeekly ? 'weekly' : 'monthly';
        toast({ 
          title: "Welcome to Pro! 🎉", 
          description: `Your ${planType} subscription is now active until ${expiryDate.toLocaleDateString()}.` 
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
      
      // CRITICAL FIX: Always attempt actual purchase, don't assume existing subscription
      const result = await Purchases.purchaseStoreProduct({ productIdentifier: product.identifier });
      console.log('✅ Purchase result:', result);
      
      // Validate the purchase was actually completed
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      const hasNewPurchase = result.customerInfo.latestExpirationDate;
      
      console.log('🔍 Purchase validation:', { isPro, hasNewPurchase, productId: product.identifier });
      
      if (isPro && hasNewPurchase) {
        // Calculate proper expiry date (1 month from today for new subscription)
        const expiryTimestamp = result.customerInfo.latestExpirationDate || null;
        const expiryDate = expiryTimestamp ? new Date(expiryTimestamp) : null;
        
        // Update Supabase profile with correct expiry if available
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: expiryDate ? expiryDate.toISOString() : null,
          subscription_product_id: product.identifier,
          subscription_platform: 'ios',
          device_id: result.customerInfo.originalAppUserId
        }).eq('id', user.id);

        if (profileError) {
          console.error('Failed to update profile after purchase:', profileError);
        }

        // Update local subscription state with proper expiry
        setSubscription({
          isActive: true,
          expirationDate: expiryDate,
          productId: product.identifier,
          offeringId: null
        });

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
      
      if (error.message?.includes('cancelled')) {
        toast({ 
          title: "Payment Cancelled", 
          description: "You can try again anytime." 
        });
      } else if (error.message?.includes('already active')) {
        // Handle existing subscription case
        toast({ 
          title: "Subscription Already Active", 
          description: "You already have an active subscription!" 
        });
        await fetchSubscriptionStatus();
        return true;
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

        // First configure RevenueCat (only once per app lifetime)
        if (!RC_GLOBAL_INITIALIZED) {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          await Purchases.configure({
            apiKey: data.publicKey,
            appUserID: null // Let RevenueCat generate one, we'll logIn right after
          });
          RC_GLOBAL_INITIALIZED = true;
        } else {
          console.log('ℹ️ RevenueCat already configured globally, skipping duplicate call');
        }

        // Then explicitly log in the user to switch to their account
        try {
          if (RC_LAST_LOGGED_IN_USER !== user.id) {
            await Purchases.logIn({ appUserID: user.id });
            RC_LAST_LOGGED_IN_USER = user.id;
            console.log('🔄 Logged in RevenueCat user:', user.id);
          } else {
            console.log('ℹ️ RevenueCat already logged in as user', user.id);
          }
          
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
    refreshSubscription,
    fetchSubscriptionStatus
  };
};
