
import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
};

// Replace with your actual RevenueCat public API key
const REVENUECAT_API_KEY = 'appl_YOUR_API_KEY_HERE'; // iOS public key
const ENTITLEMENT_ID = 'pro';
const PRODUCT_ID = 'gs_1299_1m';

let isInitialized = false;

export const useRevenueCatSimple = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
    expirationDate: null,
    productId: null,
  });
  const { toast } = useToast();
  const { user } = useSession();

  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`🚀 RevenueCat Simple: ${message}`, data || '');
  }, []);

  // Initialize RevenueCat
  const initializeRevenueCat = useCallback(async () => {
    if (isInitialized) {
      debugLog('Already initialized');
      return;
    }

    try {
      debugLog('🍎 Starting RevenueCat initialization...');
      
      // Skip on web platform
      if (!Capacitor.isNativePlatform()) {
        debugLog('Web platform - using development mode');
        setSubscription({
          isActive: false, // Change to true for testing paywall
          expirationDate: null,
          productId: 'web-dev'
        });
        setIsLoading(false);
        return;
      }

      // Configure RevenueCat
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: user?.id || null
      });

      debugLog('✅ RevenueCat configured successfully');
      isInitialized = true;

      // Fetch initial data
      await Promise.all([
        fetchOfferings(),
        fetchSubscriptionStatus()
      ]);

    } catch (error) {
      debugLog('❌ RevenueCat initialization failed', error);
      
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('Invalid API key')) {
        toast({
          title: "RevenueCat API Key Error",
          description: "Please check your RevenueCat API key configuration.",
          variant: "destructive",
          duration: 8000
        });
      } else if (errorMessage.includes('None of the products registered')) {
        toast({
          title: "Product Configuration Error",
          description: "Product gs_1299_1m not found. Check App Store Connect and RevenueCat dashboard.",
          variant: "destructive",
          duration: 8000
        });
      }
      
      // Fallback to free mode
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: 'error-fallback'
      });
      
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debugLog, toast]);

  // Fetch offerings
  const fetchOfferings = useCallback(async () => {
    try {
      if (!isInitialized || !Capacitor.isNativePlatform()) {
        return;
      }

      debugLog('🛒 Fetching offerings...');
      const offeringsData = await Purchases.getOfferings();
      
      debugLog('📦 Offerings received:', {
        current: offeringsData.current?.identifier,
        allCount: Object.keys(offeringsData.all || {}).length
      });

      if (offeringsData.current) {
        const packages = offeringsData.current.availablePackages || [];
        debugLog('📋 Available packages:', packages.map(pkg => ({
          identifier: pkg.identifier,
          productId: pkg.product.identifier,
          price: pkg.product.priceString
        })));

        // Check for our specific product
        const hasTargetProduct = packages.some(
          pkg => pkg.product.identifier === PRODUCT_ID
        );
        debugLog(`🎯 Target product '${PRODUCT_ID}' found: ${hasTargetProduct}`);
        
        if (!hasTargetProduct) {
          debugLog('❌ Target product not found in offerings');
          toast({
            title: "Product Not Available",
            description: `Product ${PRODUCT_ID} not found in App Store Connect offerings.`,
            variant: "destructive",
            duration: 8000
          });
        }
      }

      const allOfferings = Object.values(offeringsData.all || {});
      setOfferings(allOfferings);

    } catch (error) {
      debugLog('❌ Failed to fetch offerings', error);
      toast({
        variant: "destructive",
        title: "Failed to Load Products",
        description: "Could not load subscription options from App Store.",
        duration: 6000
      });
    }
  }, [debugLog, toast]);

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      if (!isInitialized || !Capacitor.isNativePlatform()) {
        return subscription;
      }

      debugLog('👤 Fetching customer info...');
      const { customerInfo } = await Purchases.getCustomerInfo();
      
      const isProActive = Boolean(customerInfo.entitlements.active?.[ENTITLEMENT_ID]?.isActive);
      debugLog(`🎖️ Pro subscription status: ${isProActive ? 'Active' : 'Inactive'}`);

      let expirationDate = null;
      let productId = null;

      if (isProActive && customerInfo.activeSubscriptions?.length > 0) {
        const subId = customerInfo.activeSubscriptions[0];
        
        if (customerInfo.allExpirationDates?.[subId]) {
          expirationDate = new Date(customerInfo.allExpirationDates[subId] * 1000);
          debugLog('📅 Subscription expires:', expirationDate);
        }
        
        productId = subId;
      }

      const newStatus = {
        isActive: isProActive,
        expirationDate,
        productId
      };

      setSubscription(newStatus);
      return newStatus;

    } catch (error) {
      debugLog('❌ Failed to fetch subscription status', error);
      return subscription;
    }
  }, [debugLog, subscription]);

  // Purchase product
  const purchaseProduct = useCallback(async (productId: string = PRODUCT_ID) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        debugLog('🌐 Web purchase simulation');
        setSubscription({
          isActive: true,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          productId: productId
        });
        toast({
          title: "Development Mode",
          description: "Simulated successful purchase for web testing."
        });
        return true;
      }

      if (!isInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog(`💳 Starting purchase for: ${productId}`);
      setIsLoading(true);

      const result = await Purchases.purchaseStoreProduct({ 
        productIdentifier: productId 
      });
      
      const isProActive = result.customerInfo.entitlements.active?.[ENTITLEMENT_ID]?.isActive || false;
      
      if (isProActive) {
        debugLog('✅ Purchase successful - Pro access activated');
        toast({
          title: "Welcome to Pro! 🎉",
          description: "Your subscription is now active!"
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        debugLog('⚠️ Purchase completed but Pro access not activated');
        toast({
          variant: "destructive",
          title: "Subscription Issue",
          description: "Purchase processed but Pro access not activated."
        });
        return false;
      }

    } catch (error: any) {
      debugLog('❌ Purchase failed', error);
      
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('cancelled')) {
        toast({
          title: "Purchase Cancelled",
          description: "You cancelled the purchase."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Purchase Failed",
          description: "There was an error processing your purchase."
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Web Development Mode",
          description: "Restore purchases is simulated on web platform."
        });
        return false;
      }

      if (!isInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog('🔄 Starting purchase restoration...');
      setIsLoading(true);

      const { customerInfo } = await Purchases.restorePurchases();
      const isProActive = Boolean(customerInfo.entitlements.active?.[ENTITLEMENT_ID]?.isActive);

      debugLog(`🔄 Restore completed - Pro status: ${isProActive}`);

      if (isProActive) {
        toast({
          title: "Purchases Restored! 🎉",
          description: "Your Pro subscription has been restored."
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous Pro subscriptions."
        });
        return false;
      }

    } catch (error) {
      debugLog('❌ Restore failed', error);
      
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Could not restore purchases. Try again later."
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Initialize on mount
  useEffect(() => {
    initializeRevenueCat();
  }, [initializeRevenueCat]);

  return {
    isLoading,
    subscription,
    offerings,
    initialized: isInitialized,
    fetchOfferings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  };
};
