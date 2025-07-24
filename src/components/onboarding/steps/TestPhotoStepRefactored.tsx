import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Camera, Upload } from "lucide-react";
import { useState } from "react";

// Capacitor Camera support
let isCapacitor = false;
try {
  isCapacitor = !!window.Capacitor;
} catch {}

interface TestPhotoStepRefactoredProps {
  selectedImage: File | null;
  onImageSelect: (file: File | null) => void;
  onContinue: () => void;
}

const fakeResult = {
  score: 83,
  breakdown: [
    { label: 'Aura', value: 98 },
    { label: 'Fit', value: 75 },
    { label: 'Color', value: 80 }
  ],
  percentile: 70,
  summary: "Your style aura is off the charts! Fit and color are solid. Unlock the full breakdown by upgrading."
};

export const TestPhotoStepRefactored = ({ selectedImage, onImageSelect, onContinue }: TestPhotoStepRefactoredProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<typeof fakeResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Capacitor Camera handler
  const handleTakePhoto = async () => {
    if (!isCapacitor) return;
    try {
      const { Camera } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: 'dataUrl',
        source: 'CAMERA',
      });
      if (photo?.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'photo.jpg', { type: blob.type });
        onImageSelect(file);
        setImageUrl(photo.dataUrl);
      }
    } catch (e) {
      alert('Camera error: ' + e);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setResult(fakeResult);
      setShowResult(true);
      setIsAnalyzing(false);
    }, 2200); // Simulate AI delay
  };

  // Only allow one analysis per onboarding
  if (showResult && result) {
    return (
      <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col items-center justify-center px-8 py-12">
        <div className="mb-8">
          <Sparkles className="w-16 h-16 text-orange-400 mx-auto animate-bounce" />
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">Your Style Score: <span className="text-orange-400">{result.score}</span></h2>
        <div className="flex gap-6 mb-4">
          {result.breakdown.map((b) => (
            <div key={b.label} className="text-center">
              <div className="text-2xl font-bold text-orange-300">{b.value}</div>
              <div className="text-white/70 text-sm">{b.label}</div>
            </div>
          ))}
        </div>
        <div className="text-white/80 mb-4">You're better than <span className="text-orange-400 font-bold">{result.percentile}%</span> of users!</div>
        <div className="text-white/60 mb-8 max-w-md mx-auto">{result.summary}</div>
        {imageUrl && <img src={imageUrl} alt="Your style" className="w-40 h-40 object-cover rounded-2xl mb-6 mx-auto" />}
        <Button onClick={onContinue} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl">Continue</Button>
      </motion.div>
    );
  }

  return (
    <motion.div key="test-photo" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col">
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-xs mx-auto">
            <div className="flex flex-col items-center">
              <Sparkles className="w-16 h-16 text-orange-400 animate-spin mb-4" />
              <div className="text-white text-lg mb-2">Analyzing your style...</div>
              <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-2">
                <motion.div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{ width: '80%' }} animate={{ width: ['0%', '80%'] }} transition={{ duration: 2 }} />
              </div>
              <div className="text-white/60 text-xs">This usually takes a few seconds</div>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="mb-8">
          <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
        </motion.div>
        <div className="space-y-4 text-center mb-8">
          <h2 className="text-4xl font-bold text-white">Let's test it out!</h2>
          <p className="text-white/70 text-xl leading-relaxed max-w-sm">Upload or take a photo to get your first style rating</p>
        </div>
        <div className="w-full max-w-sm mb-8">
          {!selectedImage ? (
            <div className="border-2 border-dashed border-white/30 rounded-2xl p-8 text-center bg-white/5">
              <Camera className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 mb-4">Choose a photo</p>
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="photo-upload" />
              <label htmlFor="photo-upload" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl cursor-pointer transition-all duration-300">
                <Upload className="w-4 h-4" />Select Photo
              </label>
              {isCapacitor && (
                <Button onClick={handleTakePhoto} className="w-full mt-4 bg-orange-500 text-white">Take Photo</Button>
              )}
            </div>
          ) : (
            <div className="relative">
              <img src={imageUrl || URL.createObjectURL(selectedImage)} alt="Selected" className="w-full h-64 object-cover rounded-2xl" />
              <button onClick={() => { onImageSelect(null); setImageUrl(null); }} className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">×</button>
            </div>
          )}
        </div>
      </div>
      {selectedImage && !showResult && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="px-8 pb-8">
          <Button onClick={handleAnalyze} disabled={isUploading || isAnalyzing} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl disabled:opacity-50">
            {isAnalyzing ? (<div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</div>) : (<><Sparkles className="mr-3 h-5 w-5" />Get My Style Rating</>)}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}; 