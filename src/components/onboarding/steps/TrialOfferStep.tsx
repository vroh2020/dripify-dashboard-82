import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { Capacitor } from '@capacitor/core';

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  return (
    <motion.div
      key="trial-offer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-8"
    >
      <div className="w-full max-w-lg mx-auto flex flex-col items-center bg-black/60 rounded-3xl shadow-2xl p-8 border border-white/10">
        <div className="flex flex-col items-center mb-6">
          <span className="text-5xl mb-2">🔥</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-2 tracking-tight">DRIP AI EXCLUSIVE ACCESS</h1>
          <p className="text-orange-400 font-semibold text-lg mb-2">Join 50,000+ who discovered their style secret</p>
        </div>
        <div className="w-full mb-6">
          <h2 className="text-xl font-bold text-white mb-2 text-center">✨ WHAT YOU GET:</h2>
          <ul className="text-white/90 space-y-2 text-base list-disc list-inside">
            <li>Unlimited AI style analysis <span className="text-orange-400">(usually $200/session)</span></li>
            <li>Personalized outfit recommendations daily</li>
            <li>Color palette perfectly matched to your skin tone</li>
            <li>Body-type specific styling secrets</li>
            <li>Confidence transformation in 7 days</li>
          </ul>
        </div>
        <div className="w-full mb-6">
          <h2 className="text-xl font-bold text-white mb-2 text-center">💎 EXCLUSIVE FEATURES:</h2>
          <ul className="text-white/90 space-y-2 text-base list-disc list-inside">
            <li>Celebrity stylist-level insights</li>
            <li>Instagram-worthy outfit planning</li>
            <li>Shopping links for your exact style</li>
            <li>Style challenges with rewards</li>
          </ul>
        </div>
        <div className="w-full mb-6 flex flex-col items-center">
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-center w-full mb-2">
            <span className="text-2xl font-bold text-orange-400 line-through mr-2">$39.99</span>
            <span className="text-2xl font-bold text-green-400">$12.99/month</span>
            <div className="text-orange-300 text-sm mt-1">LIMITED TIME: 67% OFF</div>
          </div>
          <div className="text-pink-300 text-xs mb-2">🔴 LIVE: 234 people viewing this offer</div>
        </div>
        <div className="w-full mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-white/80 text-center text-base italic">
            <div className="mb-2">"I went from getting ignored to getting compliments daily" <span className="text-orange-300">- Sarah M.</span></div>
            <div>"My Instagram engagement went up 400%" <span className="text-orange-300">- Maya K.</span></div>
          </div>
        </div>
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-extrabold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white mt-2 mb-4"
        >
          UNLOCK MY STYLE TRANSFORMATION
        </Button>
        <div className="text-white/60 text-xs text-center mt-2">"While others guess, you'll know exactly what works"</div>
      </div>
    </motion.div>
  );
};
