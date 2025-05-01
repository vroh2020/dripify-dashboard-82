import { create } from 'zustand';
import { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { revenueCatService } from '../services/revenueCatService';
import { REVENUECAT_CONFIG } from '../config/revenueCat';

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
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

  initialize: async (apiKey: string) => {
    try {
      set({ isLoading: true, error: null });
      await revenueCatService.initialize(apiKey);
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

  refreshCustomerInfo: async () => {
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