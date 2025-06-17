
import { createContext, useContext, ReactNode } from 'react';
import { useRevenueCatSimple } from '@/hooks/useRevenueCatSimple';

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  expirationDate: Date | null;
  checkSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  offerings: any[];
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  isLoading: true,
  expirationDate: null,
  checkSubscription: async () => false,
  refreshSubscription: async () => {},
  purchaseProduct: async () => false,
  restorePurchases: async () => false,
  offerings: [],
});

export const useSubscription = () => useContext(SubscriptionContext);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const {
    isLoading,
    customerInfo,
    offerings,
    getCustomerInfo,
    purchasePackage,
    restorePurchases,
    hasActiveSubscription
  } = useRevenueCatSimple();

  // Check if user has Pro subscription
  const checkSubscription = async (): Promise<boolean> => {
    await getCustomerInfo();
    return hasActiveSubscription();
  };

  // Force refresh the subscription status
  const refreshSubscription = async (): Promise<void> => {
    await getCustomerInfo();
  };

  const purchaseProduct = async (productId: string): Promise<boolean> => {
    const availablePackages = offerings?.availablePackages || [];
    const packageToPurchase = availablePackages[0];
    
    if (!packageToPurchase) return false;
    
    try {
      await purchasePackage(packageToPurchase);
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  };

  const handleRestorePurchases = async (): Promise<boolean> => {
    try {
      await restorePurchases();
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  };

  const expirationDate = customerInfo?.entitlements?.active?.pro?.expirationDate 
    ? new Date(customerInfo.entitlements.active.pro.expirationDate)
    : null;

  const value = {
    isPro: hasActiveSubscription(),
    isLoading,
    expirationDate,
    checkSubscription,
    refreshSubscription,
    purchaseProduct,
    restorePurchases: handleRestorePurchases,
    offerings: offerings?.availablePackages || []
  };

  console.log('🔄 SubscriptionProvider: isPro =', value.isPro, 'isLoading =', value.isLoading);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
