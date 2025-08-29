import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Palette, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ColorProfile {
  undertone: 'cool' | 'warm' | 'neutral';
  season: string;
  palette: string[];
  faceMetrics: Record<string, unknown>;
}

interface ItemMatchResult {
  match: boolean;
  score: number;
  factors: {
    color: string;
    shape: string;
    print: string;
    fabric: string;
  };
}

export const ColorAnalysisView = () => {
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [colorProfile, setColorProfile] = useState<ColorProfile | null>(null);
  const [itemToCheck, setItemToCheck] = useState<File | null>(null);
  const [matchResult, setMatchResult] = useState<ItemMatchResult | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSelfieUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelfieImage(file);
    }
  };

  const analyzeColors = async () => {
    if (!selfieImage) return;
    
    setIsAnalyzing(true);
    try {
      const base64 = await fileToBase64(selfieImage);
      const { data, error } = await supabase.functions.invoke('color-analysis', {
        body: { image: base64 }
      });
      
      if (error) throw error;
      setColorProfile(data);
      toast({
        title: "Color Analysis Complete! 🎨",
        description: `You're a ${data.season} with ${data.undertone} undertones`
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Please try again with a clear selfie",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkItemMatch = async () => {
    if (!itemToCheck || !colorProfile) return;
    
    try {
      // Mock match result for now
      const mockResult: ItemMatchResult = {
        match: Math.random() > 0.3,
        score: Math.floor(Math.random() * 100),
        factors: {
          color: Math.random() > 0.5 ? 'Perfect' : 'Good',
          shape: 'Good',
          print: 'Perfect',
          fabric: 'Good'
        }
      };
      setMatchResult(mockResult);
    } catch (error) {
      toast({
        title: "Match check failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Premium Header */}
      <div className="sticky top-0 z-10 bg-white px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl text-black" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              TRENDZA
            </span>
          </div>
          <div className="px-3 py-1 bg-gray-50 rounded-full">
            <span className="text-sm text-gray-600" style={{ fontWeight: 600 }}>Color Analysis</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-2xl text-black mb-3" style={{ fontWeight: 700 }}>
              Discover Your Perfect Palette
            </h1>
            <p className="text-gray-600 text-base" style={{ fontWeight: 500 }}>
              AI-powered color analysis for your unique style
            </p>
          </div>

          {/* Selfie Upload */}
          {!colorProfile && (
            <Card className="mb-6 border-0 bg-white" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <CardContent className="p-6">
                <h3 className="text-lg text-black mb-3" style={{ fontWeight: 600 }}>
                  Capture Your Colors
                </h3>
                <p className="text-gray-600 mb-6" style={{ fontWeight: 500 }}>
                  Get your personalized color palette and seasonal analysis
                </p>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-gray-300 transition-all duration-200 bg-gray-50"
                >
                  {selfieImage ? (
                    <div>
                      <img 
                        src={URL.createObjectURL(selfieImage)} 
                        alt="Selfie preview" 
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      />
                      <p className="text-black" style={{ fontWeight: 600 }}>Ready for analysis</p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-black mb-2" style={{ fontWeight: 600 }}>Take or upload a selfie</p>
                      <p className="text-gray-500 text-sm">
                        Natural lighting works best
                      </p>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleSelfieUpload}
                  className="hidden"
                />
                
                {selfieImage && (
                  <Button 
                    onClick={analyzeColors}
                    disabled={isAnalyzing}
                    className="w-full mt-6 bg-black hover:bg-gray-800 text-white py-3 rounded-xl"
                    style={{ fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Discover My Palette'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Color Profile Results */}
          {colorProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="mb-6 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Your Color Type
                      </h3>
                      <p className="text-xl font-semibold text-black mt-1">
                        {colorProfile.season}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIChat(true)}
                      className="border-gray-200"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      AI Stylist
                    </Button>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-500 mb-3">Your Perfect Colors</p>
                    <div className="flex flex-wrap gap-2">
                      {colorProfile.palette.map((color, index) => (
                        <div 
                          key={index}
                          className="w-12 h-12 rounded-lg border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-gray-200"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Result
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-gray-200"
                    >
                      <Palette className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Item Match Checker */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Check if the item matches you
                  </h3>
                  
                  <div 
                    onClick={() => itemInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors mb-4"
                  >
                    {itemToCheck ? (
                      <img 
                        src={URL.createObjectURL(itemToCheck)} 
                        alt="Item to check" 
                        className="w-20 h-20 object-cover mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 text-black mx-auto mb-2" />
                        <p className="text-gray-900">Upload item photo</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={itemInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setItemToCheck(file);
                        setMatchResult(null);
                      }
                    }}
                    className="hidden"
                  />
                  
                  {itemToCheck && (
                    <Button 
                      onClick={checkItemMatch}
                      className="w-full bg-black hover:bg-gray-800 text-white"
                    >
                      Check if it matches me
                    </Button>
                  )}
                  
                  {matchResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-4 rounded-lg ${
                        matchResult.match ? 'bg-blue-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {matchResult.match ? `Yes! It's ${matchResult.score}% Match!` : 'Not the best match'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ℹ️
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {Object.entries(matchResult.factors).map(([factor, rating]) => (
                          <div key={factor} className="text-center">
                            <div className="text-xs text-gray-500 capitalize">
                              {factor}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {rating}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
