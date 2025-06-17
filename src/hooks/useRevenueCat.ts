import config from "@/config";
import { Capacitor } from "@capacitor/core";
import { LOG_LEVEL, Purchases } from "@revenuecat/purchases-capacitor";
import { useEffect, useState } from "react";

/**
 * Initialize RevenueCat SDK when device is ready
 * @param userId - User ID for identifying the customer
 */
const onDeviceReady = async (userId: string) => {
  try {
    if (!userId) throw new Error("User ID is required");

    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    // Configure RevenueCat only for iOS platform
    if (Capacitor.getPlatform() === "ios") {
      await Purchases.configure({
        apiKey: config.revenuecat.apiKey || "",
        appUserID: userId,
      });
    }
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
    return;
  }
};

/**
 * Restore previous purchases for the current user
 * @returns Promise resolving to restored purchase status
 */
const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("Error restoring purchases:", error);
    throw error;
  }
};

/**
 * Purchase a subscription or lifetime access
 * @param type - The subscription type: "lifetime", "monthly", or "annually"
 * @returns Promise resolving to purchase result
 */
const purchasePro = async (type: "lifetime" | "monthly" | "annually") => {
  try {
    const productIdentifier = getProductIdentifier(type);

    // Process purchase directly with product identifier
    const purchaseResult = await Purchases.purchaseStoreProduct({
      productIdentifier: productIdentifier,
    });

    // Check purchase status
    const hasPurchasedProducts =
      purchaseResult.customerInfo.allPurchasedProductIdentifiers.length > 0;

    return {
      success: hasPurchasedProducts,
      customerInfo: purchaseResult.customerInfo,
    };
  } catch (error) {
    console.error("Purchase failed:", error);
    throw error;
  }
};

/**
 * Helper function to get product identifier based on subscription type
 */
const getProductIdentifier = (
  type: "lifetime" | "monthly" | "annually"
): string => {
  const { lifetimeProductId, monthlyProductId, annuallyProductId } = config.revenuecat;
  
  switch (type) {
    case "lifetime":
      if (!lifetimeProductId) {
        throw new Error("Lifetime product ID is not configured yet. Please add it to config.");
      }
      return lifetimeProductId;
    case "monthly":
      if (!monthlyProductId) {
        throw new Error("Monthly product ID is not configured");
      }
      return monthlyProductId;
    case "annually":
      if (!annuallyProductId) {
        throw new Error("Annual product ID is not configured yet. Please add it to config.");
      }
      return annuallyProductId;
    default:
      // Default to monthly since it's the only one available
      if (!monthlyProductId) {
        throw new Error("No product IDs are configured");
      }
      return monthlyProductId;
  }
};

/**
 * Custom hook for managing RevenueCat subscriptions
 * @param userId - User ID for identifying the customer
 * @returns Object containing subscription state and functions
 */
export const useRevenueCat = (userId: string) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPro, setIsPro] = useState(false);

  // Initialize RevenueCat when the hook is first used
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await onDeviceReady(userId);

        // Get customer info after initialization
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        // Check if user has active subscriptions
        const hasActiveSubscription =
          info.customerInfo.entitlements.active &&
          Object.keys(info.customerInfo.entitlements.active).length > 0;
        setIsPro(hasActiveSubscription);

        setIsInitialized(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error during initialization")
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && !isInitialized) {
      initialize();
    }
  }, [userId, isInitialized]);

  // Function to handle purchases
  const purchase = async (type: "lifetime" | "monthly" | "annually") => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await purchasePro(type);
      setCustomerInfo(result.customerInfo);
      setIsPro(result.success);
      return result;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error during purchase")
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to restore purchases
  const restore = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await restorePurchases();

      setCustomerInfo(info);

      // Check if user has active subscriptions after restore
      const hasActiveSubscription =
        info.customerInfo.entitlements.active &&
        Object.keys(info.customerInfo.entitlements.active).length > 0;
      setIsPro(hasActiveSubscription);

      return info;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error during restore")
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check which product types are available
  const getAvailableProductTypes = () => {
    const available: Array<"lifetime" | "monthly" | "annually"> = [];
    
    if (config.revenuecat.monthlyProductId) available.push("monthly");
    if (config.revenuecat.lifetimeProductId) available.push("lifetime");
    if (config.revenuecat.annuallyProductId) available.push("annually");
    
    return available;
  };

  return {
    isInitialized,
    isLoading,
    customerInfo,
    error,
    isPro,
    purchase,
    restore,
    getAvailableProductTypes, // Helper to know which products can be purchased
  };
}; 