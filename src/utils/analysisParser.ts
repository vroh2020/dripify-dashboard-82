import { ScoreBreakdown, StyleTip } from "@/types/styleTypes";

interface AnalysisResult {
  breakdown: ScoreBreakdown[];
  tips: StyleTip[];
  overallScore?: number;
  summary?: string;
  vibe?: string;
  whatsWorking?: string;
  whatsNot?: string;
  elevateTheDrip?: string;
}

const categoryEmojis: Record<string, string> = {
  "Aura": "✨",
  "Drip Quality": "💎", 
  "Potential": "🚀",
  "Color Coordination": "🎨",
  "Attractiveness": "🔥",
  // Keep some traditional ones as fallback
  "Fit & Proportion": "📏",
  "Style Coherence": "✨",
  "Accessories": "💍",
  "Outfit Creativity": "🌟",
  "Trend Awareness": "📱",
};

export const parseAnalysis = (rawAnalysis: string): AnalysisResult => {
  const breakdown: ScoreBreakdown[] = [];
  const tips: StyleTip[] = [];
  
  const overallScoreMatch = rawAnalysis.match(/\*\*Overall Score:\*\*\s*(\d+)/i);
  const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : undefined;
  
  const summaryMatch = rawAnalysis.match(/\*\*Summary:\*\*([\s\S]*?)(?=\*\*|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : undefined;
  
  const vibeMatch = rawAnalysis.match(/\*\*Vibe:\*\*\s*(.*)/i);
  const vibe = vibeMatch ? vibeMatch[1].trim() : undefined;

  const whatsWorkingMatch = rawAnalysis.match(/\*\*What's Working:\*\*\s*•\s*([\s\S]*?)(?=\*\*|$)/i);
  const whatsWorking = whatsWorkingMatch ? whatsWorkingMatch[1].trim() : undefined;

  const whatsNotMatch = rawAnalysis.match(/\*\*What's Not:\*\*\s*•\s*([\s\S]*?)(?=\*\*|$)/i);
  const whatsNot = whatsNotMatch ? whatsNotMatch[1].trim() : undefined;

  const elevateTheDripMatch = rawAnalysis.match(/\*\*Elevate The Drip:\*\*\s*•\s*([\s\S]*?)(?=\*\*|$)/i);
  const elevateTheDrip = elevateTheDripMatch ? elevateTheDripMatch[1].trim() : undefined;

  const categoryRegex = /\*\*(Aura|Drip Quality|Potential|Color Coordination|Attractiveness):\*\*\s*(\d+)/gi;
  let match;
  while ((match = categoryRegex.exec(rawAnalysis)) !== null) {
    const category = match[1].trim();
    const score = parseInt(match[2], 10);
    if (!isNaN(score)) {
      breakdown.push({
        category,
        score,
        emoji: categoryEmojis[category] || "✅",
        details: ''
      });
    }
  }

  extractAllTips(rawAnalysis, tips);

  return { 
    breakdown, 
    tips, 
    overallScore,
    summary,
    vibe,
    whatsWorking,
    whatsNot,
    elevateTheDrip
  };
};

// Fallback score extraction for when the standard regex fails
function extractFallbackScore(text: string): number | undefined {
  // Try different formats that might appear in the text - updated for /100 scale
  const patterns = [
    /overall score.*?(\d+)/i,
    /total score.*?(\d+)/i,
    /score.*?(\d+).*?100/i,
    /score.*?(\d+).*?10/i,
    /rating.*?(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const score = parseInt(match[1], 10);
      if (!isNaN(score) && score >= 0 && score <= 100) {
        return score;
      }
      // Also handle legacy /10 scores by converting them
      if (!isNaN(score) && score >= 0 && score <= 10) {
        return score * 10; // Convert /10 to /100
      }
    }
  }
  
  return undefined;
}

// More flexible category extraction for different AI response formats
function extractCategoriesFlexible(text: string, breakdown: ScoreBreakdown[]): void {
  const categories = [
    "Aura", 
    "Drip Quality", 
    "Potential", 
    "Color Coordination", 
    "Attractiveness"
  ];
  
  for (const category of categories) {
    // Skip categories we already have
    if (breakdown.some(item => item.category === category)) {
      continue;
    }
    
    // Look for category with different formatting patterns
    const patterns = [
      new RegExp(`\\*\\*${category}:\\*\\*\\s*(\\d+)[^\\d]*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
      new RegExp(`\\*\\*${category}\\*\\*\\s*-?\\s*(\\d+)[^\\d]*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
      new RegExp(`${category}:\\s*(\\d+)[^\\d]*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
      new RegExp(`${category}\\s*-?\\s*(\\d+)\\s*/\\s*10([\\s\\S]*?)(?=\\*\\*|$)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const score = parseInt(match[1], 10);
        if (!isNaN(score)) {
          const emoji = categoryEmojis[category] || "✅";
          const details = match[2] ? match[2].trim() : "";
          
          breakdown.push({
            category,
            score,
            emoji,
            details
          });
          break; // Found the category, move to next one
        }
      }
    }
  }
}

function extractAllTips(text: string, tips: StyleTip[]): void {
  const tipsSectionMatch = text.match(/\*\*Style Tips:\*\*([\s\S]*)/i);
  if (tipsSectionMatch) {
    const tipsContent = tipsSectionMatch[1];
    const tipLines = tipsContent.split(/•/g).filter(line => line.trim());

    tipLines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const category = parts[0].trim();
        const tipText = parts.slice(1).join(':').trim();
        
        tips.push({
          category,
          tip: tipText,
          level: 'intermediate'
        });
      }
    });
  }
}

// Helper function to determine the level of a tip
function determineLevel(tip: string): "beginner" | "intermediate" | "advanced" {
  const tip_lower = tip.toLowerCase();
  
  // Check for advanced indicators
  if (tip_lower.includes('advanced') || 
      tip_lower.includes('expert') || 
      tip_lower.includes('professional') || 
      tip_lower.includes('next level') ||
      tip_lower.includes('complex')) {
    return "advanced";
  }
  
  // Check for beginner indicators
  if (tip_lower.includes('start') || 
      tip_lower.includes('basic') || 
      tip_lower.includes('simple') || 
      tip_lower.includes('beginner') ||
      tip_lower.includes('first step')) {
    return "beginner";
  }
  
  // Default to intermediate
  return "intermediate";
}
