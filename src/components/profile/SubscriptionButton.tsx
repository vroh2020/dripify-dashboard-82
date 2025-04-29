
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { PaywallModal } from '../paywall/PaywallModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

export function SubscriptionButton() {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isSubscribed, isInitializing, refreshSubscriptionStatus } = useSubscription();
  const { toast } = useToast();

  const handleOpenPaywall = () => {
    setPaywallOpen(true);
  };

  const handlePurchaseSuccess = () => {
    toast({
      title: "Subscription Activated",
      description: "Thank you for subscribing to Gen Style Pro!",
      variant: "success",
    });
    refreshSubscriptionStatus();
  };

  return (
    <>
      <Button
        onClick={handleOpenPaywall}
        disabled={isInitializing}
        className={`${
          isSubscribed 
            ? "bg-gradient-to-r from-purple-500 to-blue-500" 
            : "bg-gradient-to-r from-orange-500 to-orange-400"
        } hover:opacity-90`}
      >
        {isInitializing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
        ) : isSubscribed ? (
          <><Sparkles className="mr-2 h-4 w-4" /> Pro Active</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" /> Upgrade to Pro</>
        )}
      </Button>
      
      <PaywallModal 
        open={paywallOpen} 
        onOpenChange={setPaywallOpen} 
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </>
  );
}
