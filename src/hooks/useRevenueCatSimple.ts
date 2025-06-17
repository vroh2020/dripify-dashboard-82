import { useState, useEffect } from 'react'
import { Purchases, LOG_LEVEL, type CustomerInfo, type PurchasesOffering } from '@revenuecat/purchases-capacitor'
import { Capacitor } from '@capacitor/core'

const API_KEY = 'appl_xeXwsXdzeTPLDObsCBanrDrxUWV'

export interface SubscriptionStatus {
  isActive: boolean;
  expirationDate: Date | null;
  productId?: string;
}

export function useRevenueCatSimple() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null)

  // Check if we're on a supported platform
  const isNativePlatform = Capacitor.isNativePlatform()

  // Configure RevenueCat
  const configure = async () => {
    // Skip RevenueCat configuration on web
    if (!isNativePlatform) {
      console.log('🌐 Web platform detected - RevenueCat skipped (mobile-only)');
      setIsConfigured(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true)
      setError(null)

      // Set debug logs for development
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
      
      // Configure with API key
      await Purchases.configure({
        apiKey: API_KEY,
        appUserID: null // Let RevenueCat generate anonymous ID
      })

      setIsConfigured(true)
      console.log('✅ RevenueCat configured successfully')
    } catch (err: any) {
      setError(`Configuration failed: ${err.message}`)
      console.error('❌ RevenueCat configuration error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get customer info
  const getCustomerInfo = async () => {
    if (!isNativePlatform) return null;

    try {
      setIsLoading(true)
      const result = await Purchases.getCustomerInfo()
      setCustomerInfo(result.customerInfo)
      return result.customerInfo
    } catch (err: any) {
      setError(`Failed to get customer info: ${err.message}`)
      console.error('❌ Customer info error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Get offerings
  const getOfferings = async () => {
    if (!isNativePlatform) return null;

    try {
      setIsLoading(true)
      const result = await Purchases.getOfferings()
      setOfferings(result.current)
      return result
    } catch (err: any) {
      setError(`Failed to get offerings: ${err.message}`)
      console.error('❌ Offerings error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Make a purchase
  const purchasePackage = async (packageToPurchase: any) => {
    if (!isNativePlatform) {
      throw new Error('Purchases only available on mobile platforms');
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await Purchases.purchasePackage({ 
        offeringIdentifier: packageToPurchase.offeringIdentifier,
        packageIdentifier: packageToPurchase.identifier
      })
      
      // Update customer info after purchase
      setCustomerInfo(result.customerInfo)
      
      console.log('✅ Purchase successful:', result)
      return result
    } catch (err: any) {
      setError(`Purchase failed: ${err.message}`)
      console.error('❌ Purchase error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Restore purchases
  const restorePurchases = async () => {
    if (!isNativePlatform) {
      throw new Error('Restore only available on mobile platforms');
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await Purchases.restorePurchases()
      setCustomerInfo(result.customerInfo)
      
      console.log('✅ Purchases restored:', result)
      return result
    } catch (err: any) {
      setError(`Restore failed: ${err.message}`)
      console.error('❌ Restore error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user has active subscription
  const hasActiveSubscription = (entitlementId = 'pro') => {
    if (!isNativePlatform || !customerInfo) return false
    return customerInfo.entitlements.active[entitlementId]?.isActive || false
  }

  // Get subscription status in the format expected by the provider
  const getSubscriptionStatus = (): SubscriptionStatus => {
    const isActive = hasActiveSubscription('pro');
    const expirationDate = customerInfo?.entitlements?.active?.pro?.expirationDate 
      ? new Date(customerInfo.entitlements.active.pro.expirationDate) 
      : null;
    
    return {
      isActive,
      expirationDate,
      productId: customerInfo?.entitlements?.active?.pro?.productIdentifier
    };
  }

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await configure()
      if (isConfigured && isNativePlatform) {
        await getCustomerInfo()
        await getOfferings()
      }
    }
    init()
  }, [])

  return {
    // State
    isConfigured,
    isLoading,
    error,
    customerInfo,
    offerings,
    isNativePlatform,
    
    // Methods
    configure,
    getCustomerInfo,
    getOfferings,
    purchasePackage,
    restorePurchases,
    hasActiveSubscription,
    getSubscriptionStatus
  }
}
