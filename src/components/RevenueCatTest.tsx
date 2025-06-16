
import { useSimpleSubscription } from '@/components/subscription/SimpleSubscriptionProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const RevenueCatTest = () => {
  const { 
    isPro, 
    isLoading, 
    purchaseProduct, 
    restorePurchases,
    offerings 
  } = useSimpleSubscription();

  return (
    <Card className="max-w-md mx-auto m-4">
      <CardHeader>
        <CardTitle>RevenueCat Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>Pro Status:</strong> {isPro ? '✅ Active' : '❌ Inactive'}</p>
          <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Offerings:</strong> {offerings.length} available</p>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={() => purchaseProduct()}
            disabled={isLoading}
            className="w-full"
          >
            Test Purchase (gs_1299_1m)
          </Button>
          
          <Button 
            onClick={() => restorePurchases()}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            Test Restore Purchases
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
