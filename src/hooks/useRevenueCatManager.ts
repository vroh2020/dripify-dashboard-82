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
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const lastPurchaseAttempt = useRef<Date | null>(null);

  const logDebugInfo = (step: string, data?: any) => {
    console.log(`🍎 RevenueCat Debug [${step}]:`, data || '');
  };

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      return { isActive: false, expirationDate: null, productId: null, offeringId: null };
    }

    try {
      if (Capacitor.isNativePlatform()) {
        if (!hasInitialized.current) {
          logDebugInfo('Fetch Status', 'RevenueCat not initialized yet');
          return subscription;
        }
        const { customerInfo } = await Purchases.getCustomerInfo();
        const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
        
        logDebugInfo('Subscription Status', { isPro, userId: user.id });
        
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
      logDebugInfo('Purchase Start', { productId: product.identifier });
      
      // CRITICAL FIX: Always attempt actual purchase, don't assume existing subscription
      const result = await Purchases.purchaseStoreProduct(product);
      logDebugInfo('Purchase Result', result);
      
      // Validate the purchase was actually completed
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      const hasNewPurchase = result.customerInfo.latestExpirationDate;
      
      logDebugInfo('Purchase Validation', { isPro, hasNewPurchase, productId: product.identifier });
      
      if (isPro && hasNewPurchase) {
        // Update Supabase profile
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: new Date(result.customerInfo.latestExpirationDate).toISOString()
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
        logDebugInfo('Purchase Failed', 'No new subscription detected');
        toast({ 
          variant: "destructive", 
          title: "Purchase Validation Failed", 
          description: "Please try again or contact support." 
        });
        return false;
      }
      
    } catch (error: unknown) {
      console.error('Native purchase failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('cancelled')) {
        toast({ 
          title: "Payment Cancelled", 
          description: "You can try again anytime." 
        });
      } else if (errorMessage?.includes('already active')) {
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
      setInitializationError(null);
      
      try {
        logDebugInfo('Platform', Capacitor.getPlatform());
        
        if (!Capacitor.isNativePlatform()) {
          // Web platform initialization
          logDebugInfo('Web Init', 'Loading web subscription status');
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
          
          // Create a mock offering for web
          setOfferings([{
            identifier: 'web-offering',
            serverDescription: 'Web Demo Offering',
            metadata: {},
            availablePackages: [{
              identifier: 'web-monthly',
              packageType: 'MONTHLY',
              product: {
                identifier: 'gs_1299_1m',
                description: 'Dripify AI Pro Monthly',
                title: 'Dripify AI Pro Monthly',
                price: 12.99,
                priceString: '$12.99',
                currencyCode: 'USD',
                introPrice: null,
                discounts: []
              },
              offeringIdentifier: 'web-offering'
            }]
          }] as PurchasesOffering[]);
          
          hasInitialized.current = true;
          logDebugInfo('Web Init Complete', 'Web offerings and status loaded');
          return;
        }

        // Native platform initialization
        logDebugInfo('Native Init', 'Starting RevenueCat configuration');

        // Fetch API key from Supabase function
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        if (error || !data?.publicKey) {
          throw new Error(`RevenueCat API key not configured: ${error?.message || 'No public key'}`);
        }

        logDebugInfo('API Key', 'RevenueCat API key retrieved successfully');

        // Configure RevenueCat with debug logging
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: null // Required by type definition
        });

        logDebugInfo('SDK Config', 'RevenueCat SDK configured');

        // Login the user to RevenueCat
        try {
          await Purchases.logIn({ appUserID: user.id });
          logDebugInfo('User Login', `RevenueCat user logged in: ${user.id}`);
          
          // Check their subscription status
          const { customerInfo } = await Purchases.getCustomerInfo();
          const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
          
          logDebugInfo('Initial Status', { isPro, entitlements: customerInfo.entitlements.active });
          
          setSubscription({
            isActive: isPro,
            expirationDate: null,
            productId: null,
            offeringId: null
          });
        } catch (loginError) {
          console.error('RevenueCat login failed:', loginError);
          setSubscription({
            isActive: false,
            expirationDate: null,
            productId: null,
            offeringId: null
          });
        }

        // Fetch offerings with retry logic
        logDebugInfo('Offerings Fetch', 'Starting offerings fetch');
        let offeringsAttempts = 0;
        let offeringsData;
        
        while (offeringsAttempts < 3) {
          try {
            offeringsData = await Purchases.getOfferings();
            if (offeringsData && Object.keys(offeringsData.all || {}).length > 0) {
              break;
            }
            offeringsAttempts++;
            if (offeringsAttempts < 3) {
              logDebugInfo('Offerings Retry', `Attempt ${offeringsAttempts + 1}/3`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (offeringsError) {
            console.error(`Offerings fetch attempt ${offeringsAttempts + 1} failed:`, offeringsError);
            offeringsAttempts++;
            if (offeringsAttempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (offeringsData && Object.keys(offeringsData.all || {}).length > 0) {
          const offeringsArray = Object.values(offeringsData.all || {});
          setOfferings(offeringsArray);
          logDebugInfo('Offerings Success', {
            count: offeringsArray.length,
            offerings: offeringsArray.map(o => ({
              id: o.identifier,
              packages: o.availablePackages.map(p => p.product.identifier)
            }))
          });
        } else {
          const errorMsg = 'No offerings found after 3 attempts. Please check RevenueCat dashboard configuration.';
          setInitializationError(errorMsg);
          logDebugInfo('Offerings Failed', errorMsg);
        }

        hasInitialized.current = true;
        logDebugInfo('Init Complete', 'RevenueCat initialization finished');

      } catch (error) {
        const errorMsg = `RevenueCat initialization failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        setInitializationError(errorMsg);
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
    initializationError
  };
};
