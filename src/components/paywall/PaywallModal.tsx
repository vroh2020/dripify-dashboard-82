
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import revenueCatService from "@/services/revenueCat";
import { PurchasesOffering, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import Logger from "@/utils/logger";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseSuccess?: () => void;
}

export function PaywallModal({ open, onOpenChange, onPurchaseSuccess }: PaywallModalProps) {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadOfferings();
    }
  }, [open]);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await revenueCatService.initialize();
      const offer = await revenueCatService.getOfferings();
      
      setOffering(offer);
      
      // Auto-select first package if available
      if (offer && offer.availablePackages.length > 0) {
        setSelectedPackage(offer.availablePackages[0]);
      }
      
    } catch (error) {
      Logger.error("Failed to load offerings:", error);
      setError("Could not load subscription options. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    try {
      setPurchasing(true);
      setError(null);
      
      const success = await revenueCatService.purchasePackage(selectedPackage);
      
      if (success) {
        onPurchaseSuccess?.();
        onOpenChange(false);
      } else {
        setError("Purchase completed but subscription wasn't activated. Please contact support.");
      }
    } catch (error: any) {
      // Check if user canceled the purchase
      if (error.message?.includes('cancel') || error.code === 'E_USER_CANCELLED') {
        Logger.info("Purchase canceled by user");
      } else {
        Logger.error("Purchase failed:", error);
        setError("Purchase failed. Please try again or contact support.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      setError(null);
      
      const success = await revenueCatService.restorePurchases();
      
      if (success) {
        onPurchaseSuccess?.();
        onOpenChange(false);
      } else {
        setError("No previous purchases found to restore.");
      }
    } catch (error) {
      Logger.error("Restore failed:", error);
      setError("Failed to restore purchases. Please try again later.");
    } finally {
      setRestoring(false);
    }
  };

  const proFeatures = [
    "Unlimited style analyses",
    "Advanced style recommendations",
    "Access to premium fashion tips",
    "Save and export your style reports",
    "Personalized outfit suggestions"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-orange-400 to-orange-300 text-transparent bg-clip-text">
            Upgrade to Gen Style Pro
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Unlock premium features to enhance your style journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          ) : error ? (
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 text-center">
              <p className="text-red-400">{error}</p>
              <Button 
                variant="outline" 
                className="mt-3 border-red-500/30 text-red-400 hover:bg-red-900/30"
                onClick={loadOfferings}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="font-medium text-lg text-white">Pro Features</h3>
                <ul className="space-y-2">
                  {proFeatures.map((feature, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-white/90">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-3 pt-2">
                <h3 className="font-medium text-lg text-white">Choose Your Plan</h3>
                <div className="grid gap-3">
                  {offering?.availablePackages?.map((pkg) => (
                    <div 
                      key={pkg.identifier}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedPackage?.identifier === pkg.identifier 
                          ? "border-orange-400/70 bg-orange-400/10" 
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{pkg.product.title}</h4>
                          <p className="text-sm text-white/60">{pkg.product.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{pkg.product.priceString}</p>
                          {pkg.packageType === 'MONTHLY' && <p className="text-xs text-white/60">per month</p>}
                          {pkg.packageType === 'ANNUAL' && <p className="text-xs text-white/60">per year</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!offering || offering.availablePackages.length === 0) && (
                    <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-center">
                      <p className="text-yellow-400">No subscription packages found.</p>
                      <p className="text-xs text-yellow-400/70 mt-1">
                        This could be due to sandbox testing environment configuration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:opacity-90 transition-opacity"
                  disabled={!selectedPackage || purchasing || restoring}
                  onClick={handlePurchase}
                >
                  {purchasing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <>Subscribe Now</>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full border-white/10 text-white/70 hover:bg-white/10"
                  onClick={handleRestore}
                  disabled={restoring || purchasing}
                >
                  {restoring ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restoring...</>
                  ) : (
                    <>Restore Purchases</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
        
        <div className="text-center text-xs text-white/40 mt-2">
          <p>Subscription will auto-renew. Cancel anytime.</p>
          <p className="mt-1">By subscribing you agree to our Terms & Privacy Policy</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
