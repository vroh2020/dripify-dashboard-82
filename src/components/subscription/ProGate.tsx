
import { ReactNode } from 'react';
import { useSubscription } from './SubscriptionProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ProGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProGate = ({ children, fallback }: ProGateProps) => {
  const { isPro, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-black/20 backdrop-blur-lg border-white/10">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-purple-500/20 p-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Pro Feature</h3>
          <p className="text-white/70 mb-4">
            This feature is only available to Pro subscribers.
            Upgrade to unlock all premium features.
          </p>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            onClick={() => navigate('/profile')}
          >
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
