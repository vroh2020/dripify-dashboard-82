import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { useScanStore } from "@/store/scanStore";
import type { ScoreBreakdown, StyleTip } from "@/types/styleTypes";

export const ScanView = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setShowResults(false);
      setResult(null);
    }
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

    setAnalyzing(true);
    setShowResults(false);
    
    try {
      const analysisResult = await analyzeStyle(selectedImage, false);
      setResult(analysisResult);
      addScan(analysisResult);
      
      toast({
        title: "Analysis Complete!",
        description: `Your style scored ${analysisResult.overallScore}/100!`,
      });
      
      setTimeout(() => {
        setShowResults(true);
        setAnalyzing(false);
      }, 1000);
      
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalyzing(false);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "There was an error analyzing your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestart = () => {
    setShowResults(false);
    setSelectedImage(null);
    setResult(null);
    setAnalyzing(false);
  };

  if (showResults && result) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-white p-4"
      >
        <div className="max-w-sm mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestart}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Scan
            </Button>
          </motion.div>

          {/* Results Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="trendza-card">
              <CardContent className="p-6">
                {/* Score Display */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">{result.overallScore}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Style Score</h2>
                  <p className="text-gray-600">Your outfit analysis is complete</p>
                </div>

                {/* Score Breakdown */}
                {result.breakdown && result.breakdown.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Breakdown</h3>
                    <div className="space-y-3">
                      {result.breakdown.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{item.emoji}</span>
                            <span className="font-medium text-gray-900">{item.category}</span>
                          </div>
                          <span className="font-bold text-gray-900">{item.score}/100</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Style Tips */}
                {result.tips && result.tips.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Style Tips</h3>
                    <div className="space-y-3">
                      {result.tips.map((tip, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-start space-x-3">
                            <Sparkles className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900 mb-1">{tip.category}</p>
                              <p className="text-sm text-gray-600">{tip.tip}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white p-4"
    >
      <div className="max-w-sm mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Style Analysis</h1>
          <p className="text-gray-600">Upload a photo to get your style score</p>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="trendza-card">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                {/* Upload Icon */}
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  {selectedImage ? (
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Selected"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                {/* Upload Text */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedImage ? "Image Selected" : "Choose a Photo"}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {selectedImage 
                      ? "Ready to analyze your style" 
                      : "Upload a photo of your outfit for analysis"
                    }
                  </p>
                </div>

                {/* Upload Button */}
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {selectedImage ? "Change Photo" : "Select Photo"}
                      </span>
                    </Button>
                  </label>

                  {selectedImage && (
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full"
                    >
                      {analyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze Style
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="text-sm text-gray-500">
            Get instant feedback on your outfit's style, fit, and coordination
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
