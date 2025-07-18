import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Apple, User } from "lucide-react";
import { handleAppleSignIn } from "../utils/auth";
import { useToast } from "@/hooks/use-toast";

interface AccountChoiceStepProps {
  onNext: (choice: 'Sign In with Apple' | 'Continue as Guest') => void;
}

export const AccountChoiceStep = ({ onNext }: AccountChoiceStepProps) => {
  const { toast } = useToast();

  const handleAppleClick = async () => {
    try {
      console.log('🍎 Starting Apple Sign-In...');
      const success = await handleAppleSignIn();
      
      if (success) {
        console.log('✅ Apple Sign-In initiated successfully');
        onNext('Sign In with Apple');
      } else {
        console.error('❌ Apple Sign-In failed to initiate');
        toast({
          title: "Sign In Failed",
          description: "Apple Sign-In is not available. Please continue as guest.",
          variant: "destructive"
        });
        // Fallback to guest mode if Apple sign-in fails
        onNext('Continue as Guest');
      }
    } catch (error) {
      console.error('💥 Apple Sign-In error:', error);
      toast({
        title: "Sign In Error",
        description: "Something went wrong. Please continue as guest.",
        variant: "destructive"
      });
      // Fallback to guest mode on error
      onNext('Continue as Guest');
    }
  };

  return (
    <motion.div
      key="account-choice"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Save your progress?</h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Sign in to sync your style profile across devices and never lose your preferences
            </p>
          </motion.div>
        </div>

        {/* Options */}
        <div className="w-full max-w-sm space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Button
              onClick={handleAppleClick}
              className="w-full h-16 text-lg font-bold rounded-2xl bg-black hover:bg-gray-900 text-white border-2 border-white/10 transition-all duration-300 hover:scale-105 shadow-xl flex items-center justify-center"
            >
              <Apple className="mr-3 h-6 w-6" />
              Sign In with Apple
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Button
              onClick={() => onNext('Continue as Guest')}
              className="w-full h-16 text-lg font-medium rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 hover:scale-105"
            >
              <User className="mr-3 h-5 w-5" />
              Continue as Guest
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-white/40 text-xs">
            You can always sign in later from your profile
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}; 