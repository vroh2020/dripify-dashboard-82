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
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Create fallback offering for when RevenueCat fails to load products
  const createFallbackOffering = useCallback((): PurchasesOffering => {
    return {
      identifier: 'default',
      serverDescription: 'Default Offering',
      metadata: {},
      availablePackages: [{
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: REVENUECAT_CONFIG.products.monthly,
          description: 'Monthly subscription to unlock premium features',
          title: 'Premium Monthly',
          price: 12.99,
          priceString: '$12.99',
          currencyCode: 'USD',
          introPrice: null,
          discounts: []
        },
        offeringIdentifier: 'default'
      }],
      lifetime: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly: {
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: REVENUECAT_CONFIG.products.monthly,
          description: 'Monthly subscription to unlock premium features',
          title: 'Premium Monthly',
          price: 12.99,
          priceString: '$12.99',
          currencyCode: 'USD',
          introPrice: null,
          discounts: []
        },
        offeringIdentifier: 'default'
      },
      weekly: null
    } as PurchasesOffering;
  }, []);

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
      console.log('🔄 Starting native purchase flow for:', product.identifier);
      
      // CRITICAL FIX: Always attempt actual purchase, don't assume existing subscription
      const result = await Purchases.purchaseStoreProduct(product);
      console.log('✅ Purchase result:', result);
      
      // Validate the purchase was actually completed
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      const hasNewPurchase = result.customerInfo.latestExpirationDate;
      
      console.log('🔍 Purchase validation:', { isPro, hasNewPurchase, productId: product.identifier });
      
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
        console.log('❌ Purchase validation failed - no new subscription detected');
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
            title: "Purchases Restored!", 
            description: "Your active subscription has been restored." 
          });
          await fetchSubscriptionStatus();
          return true;
        } else {
          toast({ 
            title: "No Purchases Found", 
            description: "We couldn't find any active subscriptions to restore." 
          });
          return false;
        }
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

    if (!hasInitialized.current) {
      console.error('RevenueCat not initialized');
      toast({ 
        variant: "destructive", 
        title: "Restore Error", 
        description: "Payment system not ready. Please try again." 
      });
      return false;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Starting restore purchases...');
      
      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
      
      if (isPro) {
        // Update Supabase profile
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: customerInfo.latestExpirationDate ? new Date(customerInfo.latestExpirationDate).toISOString() : null
        }).eq('id', user.id);

        if (profileError) {
          console.error('Failed to update profile after restore:', profileError);
        }

        toast({ 
          title: "Purchases Restored! 🎉", 
          description: "Your subscription has been restored successfully." 
        });
        await fetchSubscriptionStatus();
        return true;
      } else {
        toast({ 
          title: "No Purchases Found", 
          description: "We couldn't find any active subscriptions to restore." 
        });
        return false;
      }
    } catch (error: unknown) {
      console.error('Native restore failed:', error);
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

  // Enhanced initialization with retry logic and fallback offerings
  const initializeRevenueCat = useCallback(async () => {
    if (!user || hasInitialized.current) return;
    
    setIsLoading(true);
    console.log('🚀 Initializing RevenueCat for user:', user.id);
    
    try {
      if (!Capacitor.isNativePlatform()) {
        // Web platform initialization with fallback offering
        console.log('🌐 Web platform detected - using fallback offering');
        const fallbackOffering = createFallbackOffering();
        setOfferings([fallbackOffering]);
        
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

      // Native platform initialization with retry logic
      console.log('📱 Native platform detected - initializing RevenueCat SDK');
      
      let revenueCatInitialized = false;
      let offeringsLoaded = false;
      
      try {
        // Try to get RevenueCat configuration
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        if (error || !data?.publicKey) {
          console.warn('⚠️ RevenueCat API key not available, using fallback mode');
          throw new Error('No API key available');
        }

        console.log('🔑 RevenueCat API key retrieved, configuring SDK...');
        
        // Configure RevenueCat
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: null
        });

        // Log in the user
        await Purchases.logIn({ appUserID: user.id });
        console.log('✅ RevenueCat user logged in:', user.id);
        revenueCatInitialized = true;

        // Try to load offerings with retry logic
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`🔄 Attempting to load offerings (attempt ${attempt}/${maxRetries})`);
            const offeringsData = await Purchases.getOfferings();
            const offeringsArray = Object.values(offeringsData.all || {});
            
            if (offeringsArray.length > 0) {
              console.log('✅ Offerings loaded successfully:', offeringsArray.length);
              setOfferings(offeringsArray);
              offeringsLoaded = true;
              break;
            } else {
              console.warn(`⚠️ No offerings returned (attempt ${attempt})`);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
              }
            }
          } catch (offeringsError) {
            console.error(`❌ Failed to load offerings (attempt ${attempt}):`, offeringsError);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
            }
          }
        }

        // Check subscription status
        const { customerInfo } = await Purchases.getCustomerInfo();
        const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
        
        setSubscription({
          isActive: isPro,
          expirationDate: null,
          productId: null,
          offeringId: null
        });

      } catch (revenueCatError) {
        console.error('❌ RevenueCat initialization failed:', revenueCatError);
        revenueCatInitialized = false;
      }

      // If RevenueCat failed or no offerings loaded, use fallback
      if (!revenueCatInitialized || !offeringsLoaded) {
        console.log('🔄 Using fallback offering due to RevenueCat initialization issues');
        const fallbackOffering = createFallbackOffering();
        setOfferings([fallbackOffering]);
        
        // Set subscription to false for safety
        setSubscription({
          isActive: false,
          expirationDate: null,
          productId: null,
          offeringId: 'fallback'
        });
      }

      hasInitialized.current = true;
      
    } catch (error) {
      console.error('💥 Critical initialization error:', error);
      
      // Always provide fallback offering as last resort
      console.log('🆘 Using emergency fallback offering');
      const fallbackOffering = createFallbackOffering();
      setOfferings([fallbackOffering]);
      
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: null,
        offeringId: 'emergency-fallback'
      });
      
      hasInitialized.current = true; // Mark as initialized to prevent infinite loops
    } finally {
      setIsLoading(false);
    }
  }, [user, createFallbackOffering]);

  useEffect(() => {
    if (!user) {
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: null,
        offeringId: null
      });
      setOfferings([]);
      hasInitialized.current = false;
      retryCount.current = 0;
      return;
    }

    initializeRevenueCat();
  }, [user, initializeRevenueCat]);

  return {
    subscription,
    isLoading,
    offerings,
    purchaseProduct,
    restorePurchases,
    refreshSubscription
  };
};
