import React from 'react';
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useScanStore } from "@/store/scanStore";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { StyleTips } from "./analysis/StyleTips";

export const TipsView = () => {
  const scans = useScanStore((state) => state.scans);
  const navigate = useNavigate();

  const allTips = scans.flatMap(scan => scan.tips || []);

  if (allTips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        <div className="text-center space-y-4">
          <Camera className="w-12 h-12 text-purple-400 mx-auto" />
          <h2 className="text-xl font-semibold text-white">No Style Tips Yet</h2>
          <p className="text-white/60 max-w-sm">
            Take your first style scan to get personalized tips and insights about your outfit
          </p>
          <Button 
            onClick={() => navigate('/scan')}
            className="bg-purple-500 hover:bg-purple-600"
          >
            Take a Style Scan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <StyleTips 
        tips={allTips} 
        analysis={{
          vibe: scans[0]?.summary,
          whatsWorking: scans[0]?.breakdown?.find(b => b.score > 7)?.details,
          whatsNot: scans[0]?.breakdown?.find(b => b.score <= 7)?.details,
          elevateTheDrip: allTips[0]?.tip
        }}
      />
    </div>
  );
};

export default TipsView;
