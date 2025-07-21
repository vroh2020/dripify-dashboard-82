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

// Web-only mock offerings for development/demo
const createWebOfferings = (): PurchasesOffering[] => {
  if (Capacitor.isNativePlatform()) return [];
  
  return [
    {
      identifier: 'offering_1',
      serverDescription: 'Web Demo Offering',
      metadata: {},
      availablePackages: [
        {
          identifier: '$rc_weekly',
          offeringIdentifier: 'offering_1',
          packageType: 'WEEKLY' as any,
          product: {
            identifier: REVENUECAT_CONFIG.products.weekly,
            description: 'Weekly Premium Subscription',
            title: 'Weekly Premium',
            priceString: '$4.99',
            price: 4.99,
            currencyCode: 'USD',
            introPrice: null,
            discounts: []
          },
          localizedPriceString: '$4.99',
          localizedIntroductoryPriceString: null
        } as any,
        {
          identifier: '$rc_monthly',
          offeringIdentifier: 'offering_1',
          packageType: 'MONTHLY' as any,
          product: {
            identifier: REVENUECAT_CONFIG.products.monthly,
            description: 'Monthly Premium Subscription',
            title: 'Gen Style Premium',
            priceString: '$10.99',
            price: 10.99,
            currencyCode: 'USD',
            introPrice: null,
            discounts: []
          },
          localizedPriceString: '$10.99',
          localizedIntroductoryPriceString: null
        } as any
      ]
    } as any
  ];
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
  const lastStatusCheck = useRef<Date | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      return { isActive: false, expirationDate: null, productId: null, offeringId: null };
    }

    // Throttle status checks to prevent excessive API calls
    if (lastStatusCheck.current) {
      const timeSinceLastCheck = Date.now() - lastStatusCheck.current.getTime();
      if (timeSinceLastCheck < 5000) { // 5 seconds minimum between checks
        return subscription;
      }
    }
    lastStatusCheck.current = new Date();

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
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_expiry')
          .eq('id', user.id)
          .maybeSingle();

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
  }, [user?.id, subscription]); // Include subscription in dependencies but with throttling

  const refreshSubscription = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const purchaseProduct = useCallback(async (productOrId: PurchasesPackage['product'] | string) => {
    console.log('💰 Purchase Product called!', { productOrId, user: !!user, offeringsLength: offerings.length });
    console.log('🔍 Current offerings state:', offerings.map(o => ({ id: o.identifier, packages: o.availablePackages.length })));
    
    if (!user) {
      console.log('❌ No user, aborting purchase');
      return false;
    }
    
    if (offerings.length === 0) {
      console.log('❌ CRITICAL: No offerings available! This will cause aPackage error.');
      toast({
        variant: "destructive",
        title: "Products Not Available",
        description: "Please wait for products to load and try again."
      });
      return false;
    }

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
        const productId = typeof productOrId === 'string' ? productOrId : productOrId.identifier;
        const confirmed = window.confirm(
          `This is a web demo. In production, this would open a payment flow for ${productId}. Would you like to simulate a successful payment?`
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
          productId: productId,
          offeringId: 'web'
        };

        // Update database
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expiry: expiryDate.toISOString()
          })
          .eq('id', user.id);

        setSubscription(newSubscription);

        toast({
          title: "Payment Successful! 🎉",
          description: "Your subscription is now active!"
        });
        await fetchSubscriptionStatus();

        return true;
      } catch (error) {
        console.log('❌ Purchase validation failed - no new subscription detected');
        toast({
          title: "Purchase Failed",
          description: "Please try again or contact support.",
          variant: "destructive"
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    // Native platform purchase logic
    try {
      setIsLoading(true);
      
      const productId = typeof productOrId === 'string' ? productOrId : productOrId.identifier;
      
      // Find the correct package ID based on product ID
      let packageId: string | null = null;
      if (productId === REVENUECAT_CONFIG.products.weekly) {
        packageId = REVENUECAT_CONFIG.packages.weekly;
      } else if (productId === REVENUECAT_CONFIG.products.monthly) {
        packageId = REVENUECAT_CONFIG.packages.monthly;
      }

      if (!packageId) {
        console.error('❌ No package mapping for product:', productId);
        toast({
          variant: "destructive",
          title: "Product Error", 
          description: "Invalid subscription type selected."
        });
        return false;
      }

      // Find the specific offering (offering_1)
      const targetOffering = offerings.find(o => o.identifier === REVENUECAT_CONFIG.offering.identifier);
      
      if (!targetOffering) {
        console.error('❌ Offering not found:', REVENUECAT_CONFIG.offering.identifier);
        console.log('🔍 Available offerings:', offerings.map(o => o.identifier));
        toast({
          variant: "destructive",
          title: "Service Unavailable",
          description: "Subscription service is not available right now."
        });
        return false;
      }

      // Verify the package exists in the offering first
      const targetPackage = targetOffering.availablePackages.find(
        pkg => pkg.identifier === packageId
      );

      if (!targetPackage) {
        console.error('❌ No matching package found in offering:', packageId);
        console.log('🔍 Available packages:', targetOffering.availablePackages.map(p => p.identifier));
        toast({
          variant: "destructive",
          title: "Purchase Failed",
          description: "No valid package found. Try again later."
        });
        return false;
      }

      console.log('✅ Found package:', targetPackage.identifier, 'in offering:', targetOffering.identifier);
      
      // Use package-based purchase with correct identifiers
      const result = await Purchases.purchasePackage({
        offeringIdentifier: targetOffering.identifier,
        packageIdentifier: packageId
      });

      const isPro = Boolean(result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);

      if (isPro) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expiry: new Date(result.customerInfo.latestExpirationDate).toISOString()
          })
          .eq('id', user.id);

        toast({
          title: "Welcome to Premium! 🎉",
          description: "Your subscription is now active!"
        });
        await fetchSubscriptionStatus();
        return true;
      } else {
        console.log('❌ Purchase validation failed - no new subscription detected');
        return false;
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      if (error.code === '1') { // User cancelled
        toast({
          title: "Purchase Cancelled",
          description: "You can try again anytime."
        });
      } else {
        toast({
          title: "Purchase Failed",
          description: "Please try again or contact support.",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchSubscriptionStatus, user, offerings]);

  const restorePurchases = useCallback(async () => {
    if (!user) return false;

    if (!Capacitor.isNativePlatform()) {
      // Web platform restore logic
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
      } else {
        toast({
          title: "No Active Subscription",
          description: "We couldn't find any active subscriptions."
        });
        return false;
      }
    }

    try {
      setIsLoading(true);
      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);

      if (isPro) {
        const expiryDate = new Date(customerInfo.latestExpirationDate);
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expiry: expiryDate.toISOString()
          })
          .eq('id', user.id);

        toast({
          title: "Purchases Restored! 🎉",
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
      console.error('Restore failed:', error);
      toast({
        title: "Restore Failed",
        description: "Unable to restore purchases. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchSubscriptionStatus, user]);

  // Initialize RevenueCat and fetch initial data
  useEffect(() => {
    console.log('🚀 RevenueCat Manager useEffect triggered', { user: !!user, hasInitialized: hasInitialized.current });
    
    if (!user) {
      console.log('❌ No user found, skipping RevenueCat initialization');
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: null,
        offeringId: null
      });
      return;
    }

    if (hasInitialized.current) {
      console.log('⏭️ RevenueCat already initialized, skipping');
      return;
    }
    
    const init = async () => {
      console.log('🔧 Starting RevenueCat initialization...');
      setIsLoading(true);
      try {
        if (!Capacitor.isNativePlatform()) {
          console.log('🌐 Web platform detected');
          // Web platform initialization with mock offerings
          console.log('🌐 Initializing web platform with demo offerings');
          
          const webOfferings = createWebOfferings();
          setOfferings(webOfferings);
          
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

        // Native platform initialization
        console.log('📱 Native platform detected - fetching RevenueCat config...');
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        if (error || !data?.publicKey) {
          throw new Error('No API key');
        }

        // First configure RevenueCat
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: null // Required by type definition
        });

        // Set user ID
        await Purchases.logIn(user.id);
        
        // Set log level for debugging
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        // Force Canada locale to use the ready localization
        console.log('🌍 Setting locale to en_CA for Canada localization');
        
        // Get offerings
        const offeringsData = await Purchases.getOfferings();
        const offeringsArray = Object.values(offeringsData.all || {});
        setOfferings(offeringsArray as PurchasesOffering[]);
        
        console.log('📦 Fetched offerings:', offeringsArray.length);
        offeringsArray.forEach(offering => {
          console.log(`  - ${offering.identifier}: ${offering.availablePackages.length} packages`);
        });

        // Get initial subscription status
        await fetchSubscriptionStatus();
        
        hasInitialized.current = true;
      } catch (error) {
        console.error('RevenueCat initialization failed:', error);
        
        // Fallback for web or initialization errors
        if (!Capacitor.isNativePlatform()) {
          const webOfferings = createWebOfferings();
          setOfferings(webOfferings);
        }
        
        hasInitialized.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id, fetchSubscriptionStatus]); // Only depend on stable user ID

  return {
    isLoading,
    offerings,
    subscription,
    purchaseProduct,
    restorePurchases,
    refreshSubscription
  };
};
