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

// Cryptographically secure password generation
const generateSecurePassword = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(36)).join('').substring(0, 16);
};

// Generate unique email with timestamp to avoid duplicates
const generateUniqueEmail = (deviceId: string): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `user-${deviceId}-${timestamp}-${randomSuffix}@dripify.app`;
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

  const createUserAccount = useCallback(async (deviceId: string) => {
    try {
      // Get onboarding data from temp_onboard_users
      const { data: tempData, error: tempError } = await supabase
        .from('temp_onboard_users')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (tempError) {
        console.error('Error fetching onboarding data:', tempError);
        throw new Error('Could not find your onboarding data. Please complete onboarding first.');
      }

      // Generate unique credentials
      const email = generateUniqueEmail(deviceId);
      const password = generateSecurePassword();
      
      console.log('🎯 Creating user account with email:', email);
      
      // Check if user already exists and try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData.user) {
        console.log('✅ User already exists, signed in successfully');
        return signInData.user;
      }

      // If sign in failed, create new account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: `StyleUser${Date.now()}`,
            age_range: tempData.age_range,
            main_goal: tempData.style_goal,
            onboarding_completed: true
          }
        }
      });

      if (authError) {
        // If it's a duplicate email error, try with a new email
        if (authError.message?.includes('already been registered')) {
          console.log('📧 Email already exists, generating new one...');
          const newEmail = generateUniqueEmail(deviceId);
          const newPassword = generateSecurePassword();
          
          const { data: retryData, error: retryError } = await supabase.auth.signUp({
            email: newEmail,
            password: newPassword,
            options: {
              data: {
                username: `StyleUser${Date.now()}`,
                age_range: tempData.age_range,
                main_goal: tempData.style_goal,
                onboarding_completed: true
              }
            }
          });

          if (retryError) {
            console.error('Error creating user account on retry:', retryError);
            throw new Error('Could not create your premium account. Please try again.');
          }

          if (!retryData.user) {
            throw new Error('Could not create your premium account. Please try again.');
          }

          return retryData.user;
        } else {
          console.error('Error creating user account:', authError);
          throw new Error('Could not create your premium account. Please try again.');
        }
      }

      if (!authData.user) {
        throw new Error('Could not create your premium account. Please try again.');
      }

      return authData.user;
    } catch (error) {
      console.error('Account creation failed:', error);
      throw error;
    }
  }, []);

  const transferOnboardingData = useCallback(async (userId: string, deviceId: string) => {
    try {
      // Get onboarding data from temp_onboard_users
      const { data: tempData, error: tempError } = await supabase
        .from('temp_onboard_users')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (tempError) {
        console.error('Error fetching temp onboarding data:', tempError);
        return;
      }

      if (tempData) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 days trial

        // Transfer onboarding data to the new user profile
        const { error: profileError } = await supabase.from('profiles').update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_expiry: expiryDate.toISOString(),
          age_range: tempData.age_range,
          main_goal: tempData.style_goal,
          onboarding_data: {
            heard_about: tempData.heard_about,
            gender: tempData.gender,
            clothing_category: tempData.clothing_category,
            budget: tempData.budget,
            favorite_brands: tempData.favorite_brands,
            color_preference: tempData.color_preference,
            occasions: tempData.occasions,
            weekly_reports: tempData.weekly_reports,
            instant_suggestions: tempData.instant_suggestions,
            color_palette: tempData.color_palette,
            shop_frequency: tempData.shop_frequency,
            selfie_url: tempData.selfie_url
          }
        }).eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        } else {
          console.log('✅ Successfully transferred onboarding data to user profile');
          
          // Clean up temp data
          await supabase.from('temp_onboard_users').delete().eq('device_id', deviceId);
        }
      }
    } catch (error) {
      console.error('Error transferring onboarding data:', error);
    }
  }, []);

  const purchaseProduct = useCallback(async (product: PurchasesPackage['product']) => {
    // In premium-only model, we create user during purchase if needed
    console.log('🎯 RevenueCat: Starting purchase flow', { hasUser: !!user, productId: product.identifier });

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
        
        // Get device ID to fetch onboarding data
        const { Device } = await import('@capacitor/device');
        const deviceInfo = await Device.getId();
        const deviceId = deviceInfo.identifier;
        
        // Show payment confirmation dialog
        const confirmed = window.confirm(
          'This will create your premium account and process payment. Continue?'
        );
        
        if (!confirmed) {
          toast({ 
            title: "Payment Cancelled", 
            description: "You can try again anytime." 
          });
          return false;
        }
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create user account if needed
        let currentUser = user;
        if (!currentUser) {
          currentUser = await createUserAccount(deviceId);
        }
        
        // Transfer onboarding data
        await transferOnboardingData(currentUser.id, deviceId);

        const newSubscription = {
          isActive: true,
          expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          productId: product.identifier,
          offeringId: 'web-premium'
        };
        
        setSubscription(newSubscription);
        toast({ 
          title: "Welcome to Premium! 🎉", 
          description: "Your premium account is now active!" 
        });
        return true;
      } catch (error) {
        console.error('Web purchase simulation failed:', error);
        toast({ 
          variant: "destructive", 
          title: "Payment Failed", 
          description: error instanceof Error ? error.message : "Please try again or contact support if the issue persists." 
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
      
      // Get device ID for data transfer
      const { Device } = await import('@capacitor/device');
      const deviceInfo = await Device.getId();
      const deviceId = deviceInfo.identifier;
      
      // CRITICAL FIX: Create user account BEFORE purchase if needed
      let currentUser = user;
      if (!currentUser) {
        console.log('🎯 No user found, creating account before purchase...');
        currentUser = await createUserAccount(deviceId);
      }
      
      // Now attempt the purchase with a valid user
      const result = await Purchases.purchaseStoreProduct(product);
      console.log('✅ Purchase result:', result);
      
      // Validate the purchase was actually completed
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      const hasNewPurchase = result.customerInfo.latestExpirationDate;
      
      console.log('🔍 Purchase validation:', { isPro, hasNewPurchase, productId: product.identifier });
      
      if (isPro && hasNewPurchase) {
        // Transfer onboarding data to user profile
        await transferOnboardingData(currentUser.id, deviceId);

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
  }, [toast, fetchSubscriptionStatus, user, createUserAccount, transferOnboardingData]);

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
          console.log('🎯 RevenueCat: Initializing web platform with mock offerings');
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
          
          // Set mock offerings for web platform to ensure paywall can render
          setOfferings([{
            identifier: 'web-offering',
            serverDescription: 'Web platform offering',
            metadata: {},
            availablePackages: [{
              identifier: 'gs_1299_1m',
              packageType: 'MONTHLY',
              offeringIdentifier: 'web-offering',
              product: {
                identifier: 'gs_1299_1m',
                description: 'Premium Monthly Subscription',
                title: 'Premium Monthly',
                price: 12.99,
                priceString: '$12.99',
                currencyCode: 'USD',
                introPrice: null,
                discounts: []
              }
            }]
          } as any]);
          
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
        console.log('🎯 RevenueCat: Fetched offerings:', offeringsData);
        const allOfferings = Object.values(offeringsData.all || {});
        console.log('🎯 RevenueCat: All offerings:', allOfferings);
        setOfferings(allOfferings);
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
