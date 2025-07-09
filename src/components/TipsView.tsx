import React, { useState } from 'react';
import { motion } from "framer-motion";
import { 
  Camera, 
  MapPin
} from "lucide-react";
import { useScanStore } from "@/store/scanStore";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { StyleTip } from "@/types/styleTypes";

export const TipsView = () => {
  const latestScan = useScanStore((state) => state.latestScan);
  const navigate = useNavigate();

  if (!latestScan || !latestScan.tips || latestScan.tips.length === 0) {
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

  const tips = latestScan.tips;

  return (
    <div className="min-h-screen bg-black px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white leading-tight">
          Get tips to become<br />
          more attractive
        </h1>
      </div>

      {/* Score Card */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 mb-6 border border-[#333333] shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-white mb-1">
              {latestScan.overallScore}
            </div>
            <div className="text-[#888888] text-sm">
              You're getting there!
            </div>
          </div>
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#333333"
                strokeWidth="2"
              />
              {/* Progress circle */}
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#ff6b35"
                strokeWidth="2"
                strokeDasharray={`${latestScan.overallScore}, 100`}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-[#ff6b35] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Header */}
      <div className="flex items-center space-x-2 mb-4">
        <MapPin className="w-5 h-5 text-[#ff6b35]" />
        <h2 className="text-white font-semibold text-lg">Recommendations</h2>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {tips.slice(0, 3).map((tip, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl p-4 border border-white/10 bg-zinc-900/50 backdrop-blur-sm"
          >
            <div className="flex items-start space-x-3">
              {/* Orange bullet point */}
              <div className="flex-shrink-0 mt-2">
                <div className="w-2 h-2 bg-[#ff6b35] rounded-full"></div>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-white font-semibold text-base mb-2 leading-snug">
                  {tip.category}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {tip.tip}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex justify-center mt-8">
        <Button 
          onClick={() => navigate('/scan')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 rounded-xl font-medium transition-all duration-200"
        >
          Analyze Another Outfit
        </Button>
      </div>
    </div>
  );
};

export default TipsView;
