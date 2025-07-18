import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Apple, User, X } from "lucide-react";
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
      className="min-h-screen bg-gradient-to-b from-purple-900/40 via-purple-800/20 to-black flex flex-col justify-center items-center px-6 py-8 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Alert Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white rounded-lg p-4 flex items-center space-x-3"
        >
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <X className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-black">Subscription Unavailable</div>
            <div className="text-sm text-gray-600">Please try again later or continue with the free version.</div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={handleAppleClick}
            className="w-full h-16 text-lg font-bold rounded-2xl bg-black hover:bg-gray-900 text-white border-2 border-white/10 transition-all duration-300 hover:scale-105 shadow-xl flex items-center justify-center"
          >
            <Apple className="mr-3 h-6 w-6" />
            Sign In with Apple
          </Button>

          <Button
            onClick={() => onNext('Continue as Guest')}
            className="w-full h-16 text-lg font-medium rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 hover:scale-105 flex items-center justify-center"
          >
            <User className="mr-3 h-5 w-5" />
            Continue as Guest
          </Button>
        </motion.div>

        {/* Footer Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-white/60 text-sm">
            You can always sign in later from your profile
          </p>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-4 right-4 text-white/30 text-xs flex items-center gap-1"
      >
        <span>Edit with</span>
        <span className="text-red-400">♥</span>
        <span>Lovable</span>
      </motion.div>
    </motion.div>
  );
}; 