import { create } from 'zustand';
import { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { revenueCatService } from '../services/revenueCatService';
import { REVENUECAT_CONFIG } from '../config/revenueCat';

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
  developmentMode: boolean;
  initialize: (apiKey: string) => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  setCustomerInfo: (info: CustomerInfo) => void;
  setError: (error: Error | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  customerInfo: null,
  isSubscribed: false,
  isLoading: true,
  error: null,
  developmentMode: REVENUECAT_CONFIG.DEVELOPMENT_MODE,

  initialize: async (apiKey: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // If no API key provided, simulate subscription in development mode
      if (!apiKey || apiKey.trim() === '') {
        console.log('RevenueCat: Development mode - simulating subscription features');
        set({
          customerInfo: null,
          isSubscribed: true, // Grant access in development mode
          isLoading: false,
          developmentMode: true,
        });
        return;
      }

      await revenueCatService.initialize(apiKey);
      const customerInfo = await revenueCatService.getCustomerInfo();
      set({
        customerInfo,
        isSubscribed: customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false,
        isLoading: false,
        developmentMode: false,
      });
    } catch (error) {
      console.warn('RevenueCat initialization failed, falling back to development mode:', error);
      // Fallback to development mode if RevenueCat fails
      set({ 
        error: null, // Don't treat this as an error in development
        isLoading: false,
        isSubscribed: true, // Grant access
        developmentMode: true,
      });
    }
  },

  refreshCustomerInfo: async () => {
    const currentState = useSubscriptionStore.getState();
    
    // Skip refresh in development mode
    if (currentState.developmentMode) {
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const customerInfo = await revenueCatService.getCustomerInfo();
      set({
        customerInfo,
        isSubscribed: customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  setCustomerInfo: (info: CustomerInfo) => {
    set({
      customerInfo: info,
      isSubscribed: info.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false,
    });
  },

  setError: (error: Error | null) => set({ error }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
})); 