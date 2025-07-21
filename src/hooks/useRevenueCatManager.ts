import { useState, useEffect, useCallback, useRef } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';
import { debugRevenueCatSetup, validateRevenueCatConfig } from '@/utils/revenueCatDebug';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
  offeringId: string | null;
};

// Removed web fallback - only native RevenueCat now

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
        // Web platform - no RevenueCat available
        console.log('🌐 Web platform - no RevenueCat subscription status available');
        return { isActive: false, expirationDate: null, productId: null, offeringId: null };
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

    // CRITICAL: Check if we have a current offering (this is what RevenueCat uses by default)
    const currentOffering = offerings.find(o => o.identifier === REVENUECAT_CONFIG.offering.identifier);
    if (!currentOffering) {
      console.error('❌ CRITICAL: Current offering not found!');
      console.error('🔍 Expected offering:', REVENUECAT_CONFIG.offering.identifier);
      console.error('🔍 Available offerings:', offerings.map(o => o.identifier));
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Subscription service is not properly configured."
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
      console.log('❌ Web platform detected - RevenueCat purchases only work on native platforms');
      toast({
        title: "Not Available",
        description: "Purchases are only available on mobile devices.",
        variant: "destructive"
      });
      return false;
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
      
      // Use package-based purchase with PACKAGE OBJECT (not identifiers!)
      const result = await Purchases.purchasePackage(targetPackage);

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
      console.log('❌ Web platform detected - RevenueCat restore only works on native platforms');
      toast({
        title: "Not Available",
        description: "Restore purchases is only available on mobile devices.",
        variant: "destructive"
      });
      return false;
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
          console.log('🌐 Web platform detected - RevenueCat only works on native platforms');
          console.log('❌ Skipping RevenueCat initialization on web');
          hasInitialized.current = true;
          return;
        }

        // Native platform initialization
        console.log('📱 Native platform detected - fetching RevenueCat config...');
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        if (error || !data?.publicKey) {
          console.error('❌ Failed to get RevenueCat API key:', error);
          throw new Error('No API key');
        }

        console.log('🔑 RevenueCat API key retrieved successfully');

        // First configure RevenueCat
        console.log('⚙️ Configuring RevenueCat with API key...');
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: null // Required by type definition
        });

        // Set log level for debugging
        console.log('🔍 Setting RevenueCat log level to DEBUG');
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        // Set user ID
        console.log('👤 Logging user into RevenueCat:', user.id);
        await Purchases.logIn(user.id);

        // Force Canada locale to use the ready localization
        console.log('🌍 Setting locale to en_CA for Canada localization');
        
        // Get offerings
        console.log('📦 Fetching RevenueCat offerings...');
        const offeringsData = await Purchases.getOfferings();
        const offeringsArray = Object.values(offeringsData.all || {});
        setOfferings(offeringsArray as PurchasesOffering[]);
        
        // CRITICAL: Check if offerings.current is nil (this is the main issue!)
        if (offeringsData.current) {
          console.log('✅ Offerings.current is available:', {
            identifier: offeringsData.current.identifier,
            packages: offeringsData.current.availablePackages.length
          });
          offeringsData.current.availablePackages.forEach(pkg => {
            console.log(`  📦 Current offering package: ${pkg.identifier} -> ${pkg.product.identifier}`);
          });
        } else {
          console.error('❌ CRITICAL: offerings.current is nil!');
          console.error('🔍 This means:');
          console.error('   - No current offering is set in RevenueCat dashboard');
          console.error('   - Products not properly configured');
          console.error('   - This will cause all purchase attempts to fail silently');
        }
        
        console.log('📦 All offerings count:', offeringsArray.length);
        if (offeringsArray.length === 0) {
          console.error('❌ CRITICAL: No offerings returned from RevenueCat!');
          console.log('🔍 This usually means:');
          console.log('   - Products not configured in App Store Connect');
          console.log('   - RevenueCat not properly linked to App Store Connect');
          console.log('   - API key issues');
        } else {
          offeringsArray.forEach(offering => {
            console.log(`  - ${offering.identifier}: ${offering.availablePackages.length} packages`);
            offering.availablePackages.forEach(pkg => {
              console.log(`    📦 Package: ${pkg.identifier} -> Product: ${pkg.product.identifier}`);
            });
          });
        }

        // Get initial subscription status
        await fetchSubscriptionStatus();
        
        // Run debug validation to check for offerings.current issue
        console.log('🔍 Running RevenueCat debug validation...');
        validateRevenueCatConfig();
        await debugRevenueCatSetup();
        
        hasInitialized.current = true;
      } catch (error) {
        console.error('RevenueCat initialization failed:', error);
        
        // No web fallback - let errors show the real issues
        
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
