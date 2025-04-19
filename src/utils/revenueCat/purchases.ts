
import { Purchases } from '@revenuecat/purchases-capacitor';
import { toast } from "@/hooks/use-toast";
import { PurchasesPackage, CustomerInfo } from './types';
import { isCapacitorAvailable } from './config';

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (!isCapacitorAvailable) {
    console.log('RevenueCat not available - web environment');
    toast({
      title: "Feature Not Available",
      description: "Purchases are only available in the mobile app",
      variant: "destructive",
    });
    return null;
  }
  
  try {
    console.log('Attempting to purchase package:', pkg.identifier);
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    console.log('Purchase successful');
    return customerInfo;
  } catch (error: any) {
    console.error('Failed to purchase package:', error);
    
    // Handle specific error cases
    let errorMessage = "Failed to complete purchase";
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('canceled')) {
        errorMessage = "Purchase was canceled";
      } else if (error.message.includes('network')) {
        errorMessage = "Network error. Please check your connection";
      }
    }
    
    toast({
      title: "Purchase Failed",
      description: errorMessage,
      variant: "destructive",
    });
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isCapacitorAvailable) return null;
  
  try {
    console.log('Fetching customer info');
    const { customerInfo } = await Purchases.getCustomerInfo();
    console.log('Customer info retrieved successfully');
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

export async function hasActiveSubscription(): Promise<boolean> {
  if (!isCapacitorAvailable) return false;
  
  try {
    console.log('Checking subscription status');
    const { customerInfo } = await Purchases.getCustomerInfo();
    const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
    console.log('Active subscription:', hasActive);
    return hasActive;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}
