
import { Purchases } from '@revenuecat/purchases-capacitor';
import { toast } from "@/hooks/use-toast";
import { PurchasesPackage, CustomerInfo } from './types';
import { isCapacitorAvailable } from './config';

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (!isCapacitorAvailable) {
    console.log('RevenueCat not available - web environment');
    toast({
      title: "Feature Not Available",
      description: "Purchases are only available in the mobile app.",
      variant: "destructive",
    });
    return null;
  }
  
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return customerInfo;
  } catch (error) {
    console.error('Failed to purchase package:', error);
    toast({
      title: "Purchase Failed",
      description: error.message || "Failed to complete purchase. Please try again.",
      variant: "destructive",
    });
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isCapacitorAvailable) return null;
  
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

export async function hasActiveSubscription(): Promise<boolean> {
  if (!isCapacitorAvailable) return false;
  
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}
