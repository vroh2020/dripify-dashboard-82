import { useState, useEffect } from 'react';
import { Purchases, PurchasesOffering, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';
import { REVENUECAT_CONFIG, debugRevenueCat } from '@/config/revenueCat';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
  offeringId: string | null;
};

export const useRevenueCat = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false, // Changed to false so we can test the paywall
    expirationDate: null,
    productId: null,
    offeringId: null,
  });
  const { toast } = useToast();
  const { user } = useSession();

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (initialized) return;
      
      // Debug logging for troubleshooting
      debugRevenueCat();
      
      // Skip RevenueCat initialization on web platform
      if (!Capacitor.isNativePlatform()) {
        console.log('🌐 RevenueCat: Skipping initialization on web platform');
        setInitialized(true);
        setIsLoading(false);
        setSubscription({
          isActive: false, // Changed to false so we can test the paywall
          expirationDate: null,
          productId: 'development',
          offeringId: 'development'
        });
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('🍎 Starting RevenueCat initialization...');
        
        // Fetch API key from Supabase Edge Function
        console.log('🔑 Fetching API key from Supabase Edge Function...');
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error) {
          console.error('❌ Error fetching RevenueCat config:', error);
          throw new Error('Failed to fetch RevenueCat configuration: ' + error.message);
        }
        
        console.log('📋 RevenueCat config response:', data);
        
        // Handle both development and production modes
        let apiKey = data.publicKey;
        if (!apiKey || data.developmentMode) {
          console.log('🛠️ No API key found - using development mode fallback');
          // Use a fallback for development testing
          setInitialized(true);
          setSubscription({
            isActive: false,
            expirationDate: null,
            productId: 'development',
            offeringId: 'development'
          });
          setIsLoading(false);
          return;
        }
        
        console.log('🔐 API Key found, initializing RevenueCat SDK...');
        console.log('👤 User ID:', user?.id);
        console.log('📱 Platform:', Capacitor.getPlatform());
        console.log('🏷️ Bundle ID:', REVENUECAT_CONFIG.bundleId);
        
        // Initialize RevenueCat with the API key
        await Purchases.configure({ 
          apiKey: apiKey,
          appUserID: user?.id 
        });
        
        console.log('✅ RevenueCat initialized successfully');
        setInitialized(true);
        
        // Once initialized, fetch offerings and subscription status
        console.log('🛒 Fetching offerings and subscription status...');
        await Promise.all([fetchOfferings(), fetchSubscriptionStatus()]);
        
      } catch (error) {
        console.error('❌ RevenueCat initialization error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Fallback to development mode instead of showing error
        setInitialized(true);
        setSubscription({
          isActive: false, // Changed to false so we can test the paywall
          expirationDate: null,
          productId: 'fallback',
          offeringId: 'fallback'
        });
        console.log('🛠️ RevenueCat: Using development mode fallback due to error');
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize if we have a user
    if (user?.id) {
      initializeRevenueCat();
    } else {
      console.log('⏳ Waiting for user authentication...');
      setIsLoading(false);
    }
  }, [user?.id, initialized]);

  // Fetch available offerings
  const fetchOfferings = async () => {
    try {
      if (!initialized || !Capacitor.isNativePlatform()) {
        console.log('⚠️ Skipping offerings fetch - not initialized or not native platform');
        return;
      }
      
      console.log('🛒 Fetching RevenueCat offerings...');
      console.log('🔍 Looking for product ID:', REVENUECAT_CONFIG.products.monthly);
      
      const offeringsData = await Purchases.getOfferings();
      
      console.log('📦 Raw offerings data:', JSON.stringify(offeringsData, null, 2));
      
      if (offeringsData.current) {
        console.log('🎯 Current offering found:', offeringsData.current);
        console.log('📋 Available packages:', offeringsData.current.availablePackages);
        
        // Check if our specific product is available
        const hasOurProduct = offeringsData.current.availablePackages?.some(
          pkg => pkg.product.identifier === REVENUECAT_CONFIG.products.monthly
        );
        console.log(`🎯 Our product (${REVENUECAT_CONFIG.products.monthly}) found:`, hasOurProduct);
      } else {
        console.warn('⚠️ No current offering found');
      }
      
      if (offeringsData.all) {
        console.log('📂 All offerings:', Object.keys(offeringsData.all));
        const offeringsArray = Object.values(offeringsData.all);
        setOfferings(offeringsArray);
        console.log('✅ Processed offerings count:', offeringsArray.length);
        
        // Log each offering for debugging
        offeringsArray.forEach((offering, index) => {
          console.log(`📦 Offering ${index + 1}:`, {
            identifier: offering.identifier,
            serverDescription: offering.serverDescription,
            packagesCount: offering.availablePackages?.length || 0,
            packages: offering.availablePackages?.map(pkg => ({
              identifier: pkg.identifier,
              productId: pkg.product.identifier,
              price: pkg.product.priceString
            }))
          });
        });
      } else {
        console.warn('⚠️ No offerings available in RevenueCat dashboard');
        console.log('💡 This could mean:');
        console.log('  1. Products not configured in RevenueCat dashboard');
        console.log('  2. Products not imported from App Store Connect');
        console.log('  3. API key doesn\'t have access to products');
        console.log('  4. Bundle ID mismatch between app and App Store Connect');
        setOfferings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        userInfo: error.userInfo
      });
      
      // Log specific RevenueCat error codes
      if (error.code) {
        switch (error.code) {
          case 'NETWORK_ERROR':
            console.log('🌐 Network error - check internet connection');
            break;
          case 'INVALID_CREDENTIALS':
            console.log('🔑 Invalid API key or configuration');
            break;
          case 'PRODUCT_NOT_AVAILABLE':
            console.log('🛒 Product not available - check App Store Connect setup');
            break;
          default:
            console.log('❓ Unknown RevenueCat error code:', error.code);
        }
      }
    }
  };

  // Fetch current subscription status
  const fetchSubscriptionStatus = async () => {
    try {
      if (!initialized || !Capacitor.isNativePlatform()) return;
      
      const { customerInfo } = await Purchases.getCustomerInfo();
      
      // Check if user has an active subscription
      const isPro = Boolean(customerInfo.entitlements.active?.["pro"]?.isActive);
      
      // Get the expiration date if available
      let expirationDate = null;
      let productId = null;
      let offeringId = null;
      
      if (isPro && customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0) {
        const subId = customerInfo.activeSubscriptions[0];
        
        if (customerInfo.allExpirationDates && customerInfo.allExpirationDates[subId]) {
          expirationDate = new Date(customerInfo.allExpirationDates[subId] * 1000);
        }
        
        productId = subId;
        
        // Try to determine the offering ID from purchased products
        if (customerInfo.allPurchasedProductIdentifiers && customerInfo.allPurchasedProductIdentifiers.length > 0) {
          offeringId = customerInfo.allPurchasedProductIdentifiers[0];
        }
      }
      
      setSubscription({
        isActive: isPro,
        expirationDate,
        productId,
        offeringId
      });
      
      console.log('Subscription status:', isPro ? 'Active' : 'Inactive');
      
      return { isActive: isPro, expirationDate, productId, offeringId };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return subscription;
    }
  };

  // Purchase a product
  const purchaseProduct = async (productId: string) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Feature Available on Mobile",
          description: "Subscription purchases are available on the mobile app."
        });
        return false;
      }
      
      if (!initialized) {
        throw new Error('RevenueCat not initialized');
      }
      
      setIsLoading(true);
      const result = await Purchases.purchaseStoreProduct({ productIdentifier: productId });
      
      if (result) {
        // Check if purchase was successful and entitlement is active
        const isProActive = result.customerInfo.entitlements.active && 
                           result.customerInfo.entitlements.active["pro"]?.isActive || false;
        
        if (isProActive) {
          toast({
            title: "Upgrade Successful",
            description: "You've successfully upgraded to Pro!"
          });
          
          // Update subscription status
          await fetchSubscriptionStatus();
          return true;
        } else {
          toast({
            variant: "destructive",
            title: "Upgrade Failed",
            description: "Your purchase was processed, but Pro access could not be activated. Please contact support."
          });
        }
      }
      
      return false;
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: "There was an error processing your purchase. Please try again later."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Feature Available on Mobile",
          description: "Restore purchases is only available on the mobile app."
        });
        return false;
      }
      
      if (!initialized) {
        throw new Error('RevenueCat not initialized');
      }
      
      setIsLoading(true);
      
      // Call RevenueCat restore - this only restores, doesn't trigger purchase flows
      const { customerInfo } = await Purchases.restorePurchases();
      
      // Update subscription status after restore
      const isPro = Boolean(customerInfo.entitlements.active?.["pro"]?.isActive);
      
      let expirationDate = null;
      let productId = null;
      let offeringId = null;
      
      if (isPro && customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0) {
        const subId = customerInfo.activeSubscriptions[0];
        
        if (customerInfo.allExpirationDates && customerInfo.allExpirationDates[subId]) {
          expirationDate = new Date(customerInfo.allExpirationDates[subId] * 1000);
        }
        
        productId = subId;
        
        if (customerInfo.allPurchasedProductIdentifiers && customerInfo.allPurchasedProductIdentifiers.length > 0) {
          offeringId = customerInfo.allPurchasedProductIdentifiers[0];
        }
      }
      
      setSubscription({
        isActive: isPro,
        expirationDate,
        productId,
        offeringId
      });
      
      if (isPro) {
        toast({
          title: "Purchases Restored Successfully",
          description: "Your Pro subscription has been restored!"
        });
        return true;
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous Pro subscriptions associated with your account."
        });
        return false;
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('cancelled')) {
        toast({
          title: "Restore Cancelled",
          description: "The restore process was cancelled."
        });
        return false;
      }
      
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Could not restore your previous purchases. Please try again or contact support if this continues."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    subscription,
    offerings,
    initialized,
    fetchOfferings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  };
};
