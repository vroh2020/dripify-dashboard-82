import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleSelector } from "@/components/StyleSelector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { useScanStore } from "@/store/scanStore";
import { Sparkles, Camera } from "lucide-react";
import { StyleTips } from "./analysis/StyleTips";
import { StyleLoadingOverlay } from "./StyleLoadingOverlay";
import { ModernRatingsDisplay } from "./ModernRatingsDisplay";
import type { ScoreBreakdown, StyleTip } from "@/types/styleTypes";

export const ScanView = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("casual");
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const addScan = useScanStore((state) => state.addScan);
  const [result, setResult] = useState<{ 
    overallScore: number; 
    rawAnalysis: string; 
    imageUrl: string; 
    breakdown?: ScoreBreakdown[];
    tips?: StyleTip[];
    summary?: string;
  } | null>(null);

  const handleAnalyzeTimeout = () => {
    console.log('Analysis timeout triggered');
    setAnalyzing(false);
    toast({
      title: "Analysis timed out",
      description: "The style analysis is taking too long. Please try again with a different image.",
      variant: "destructive",
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image to analyze",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting analysis process...');
    setAnalyzing(true);
    setShowResults(false);
    
    try {
      console.log('Calling analyzeStyle function...');
      const analysisResult = await analyzeStyle(selectedImage, false);
      console.log('Analysis result received:', analysisResult);
      
      setResult(analysisResult);
      addScan(analysisResult); // Use addScan to save to history
      
      toast({
        title: "Analysis Complete! 🎉",
        description: `Your style scored ${analysisResult.overallScore}/100!`,
      });
      
      // Show results after a brief delay
      setTimeout(() => {
        setShowResults(true);
        setAnalyzing(false);
      }, 1000);
      
    } catch (error) {
      console.error("Analysis error:", error);
      console.error('🔍 MAIN SCAN ERROR DETAILS:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown',
        fullError: error
      });
      setAnalyzing(false);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "There was an error analyzing your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestart = () => {
    console.log('Restarting scan process...');
    setShowResults(false);
    setSelectedImage(null);
    setResult(null);
    setAnalyzing(false);
  };

  const handleShare = () => {
    toast({
      title: "Shared! 📸",
      description: "Your style analysis has been shared!",
    });
  };

  const handleSave = () => {
    toast({
      title: "Saved! 💾",
      description: "Your style analysis has been saved to your profile!",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-4 relative"
    >
      {/* Style Loading Overlay */}
      <StyleLoadingOverlay 
        isAnalyzing={analyzing} 
        onTimeout={handleAnalyzeTimeout}
        timeoutDuration={90000}
      />

      {!showResults ? (
        <Card className="backdrop-blur-xl bg-black/30 border-white/10">
          <CardContent className="space-y-8 p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ImageUpload onImageSelect={setSelectedImage} />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-medium text-center text-white">
                What's the occasion?
              </h3>
              <StyleSelector selected={selectedStyle} onSelect={setSelectedStyle} />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center pt-4"
            >
              <Button
                onClick={handleAnalyze}
                disabled={!selectedImage || analyzing}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-10 py-6 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                {analyzing ? (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 animate-pulse text-yellow-300" />
                    <span>Analyzing Style...</span>
                  </div>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Analyze Style
                  </>
                )}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="pb-20"
        >
          {result && (
            <div className="w-full max-w-2xl mx-auto space-y-6">
              {/* Modern Ratings Display */}
              <ModernRatingsDisplay
                overallScore={result.overallScore}
                profileImage={result.imageUrl}
                breakdown={result.breakdown || []}
                onSave={handleSave}
                onShare={handleShare}
                isOnboarding={false}
              />

              {/* Action Buttons */}
              <div className="p-6 bg-zinc-900/50 rounded-b-2xl">
                <Button 
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full h-14 text-lg"
                >
                  <Camera className="mr-2" />
                  Retake
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
