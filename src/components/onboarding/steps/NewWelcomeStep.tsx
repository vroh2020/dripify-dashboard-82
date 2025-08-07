import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleAnonymousSign } from "../utils/auth";

interface NewWelcomeStepProps {
  onNext: () => void;
}

export const NewWelcomeStep = ({ onNext }: NewWelcomeStepProps) => {
  const { toast } = useToast();

  const handleGetStarted = async () => {
    try {
      console.log('🎯 Starting anonymous authentication...');
      
      const success = await handleAnonymousSign();
      
      if (success) {
        console.log('✅ Anonymous authentication successful, proceeding to onboarding');
        // Removed welcome toast notification
        // Proceed to next onboarding step
        onNext();
      } else {
        console.error('❌ Anonymous authentication failed');
        toast({
          title: "Authentication Error",
          description: "Unable to start the app. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Error in handleGetStarted:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 px-6 py-8 flex flex-col"
    >
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex-1 flex flex-col justify-center"
      >
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Camera className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Get your outfit checked with
          </h1>
          <h2 className="text-4xl font-bold text-red-500 mb-6">
            OutfitGrader AI
          </h2>
          <p className="text-gray-300 text-lg max-w-sm mx-auto">
            Take a selfie and get personalized advice on how to improve your style
          </p>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mb-8"
      >
        <Button
          onClick={handleGetStarted}
          className="w-full bg-red-500 hover:bg-red-600 text-white h-16 text-xl font-semibold rounded-xl transition-all duration-300"
        >
          Get Started
        </Button>
      </motion.div>
    </motion.div>
  );
}; 