import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export const ProUpgrade = () => {
  const { isPro, subscription, restorePurchases } = useSubscription();

  if (!isPro) {
    return null; // Don't show anything if user is not pro
  }

  return null;
};
