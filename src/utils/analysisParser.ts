import { ScoreBreakdown, StyleTip } from "@/types/styleTypes";

interface AnalysisResult {
  breakdown: ScoreBreakdown[];
  tips: StyleTip[];
  overallScore?: number;
  summary?: string;
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
  console.log('🔍 Starting analysis parsing...', rawAnalysis.substring(0, 200));
  
  const breakdown: ScoreBreakdown[] = [];
  const tips: StyleTip[] = [];
  
  // Extract overall score
  const overallScoreMatch = rawAnalysis.match(/\*\*Overall Score:\*\*\s*(\d+)/i);
  const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : extractFallbackScore(rawAnalysis);
  
  // Extract summary
  const summaryMatch = rawAnalysis.match(/\*\*Summary:\*\*([\s\S]*?)(?=\*\*|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : generateFallbackSummary(overallScore);
  
  // Extract category scores
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

  // Add fallback categories if none found
  if (breakdown.length === 0) {
    console.log('⚠️ No categories found, adding fallback breakdown');
    addFallbackBreakdown(breakdown, overallScore || 75);
  }

  // Extract tips using our robust extraction
  extractAllTips(rawAnalysis, tips);

  // NO FALLBACK BULLSHIT - if AI doesn't give tips, that's it
  console.log('✅ Analysis parsing complete:', {
    overallScore,
    breakdownCount: breakdown.length,
    tipsCount: tips.length,
    summaryLength: summary?.length || 0
  });

  return { 
    breakdown, 
    tips, 
    overallScore,
    summary
  };
};

function generateFallbackSummary(score?: number): string {
  const scoreValue = score || 75;
  
  if (scoreValue >= 85) {
    return "Great style choices! Your outfit shows excellent coordination and a strong sense of personal aesthetic. You're making confident style decisions that work well together.";
  } else if (scoreValue >= 70) {
    return "Solid style foundation with good color choices and fit. There's potential to elevate this look with a few strategic adjustments.";
  } else {
    return "Good base pieces with room for improvement. Focus on fit, color coordination, and adding one statement piece to elevate your style.";
  }
}

function addFallbackBreakdown(breakdown: ScoreBreakdown[], baseScore: number): void {
  const categories = [
    { name: "Aura", emoji: "✨" },
    { name: "Drip Quality", emoji: "💎" },
    { name: "Potential", emoji: "🚀" },
    { name: "Color Coordination", emoji: "🎨" },
    { name: "Attractiveness", emoji: "🔥" }
  ];
  
  categories.forEach(({ name, emoji }) => {
    // Add some variation around the base score
    const variation = Math.floor(Math.random() * 20) - 10; // -10 to +10
    const score = Math.max(25, Math.min(95, baseScore + variation));
    
    breakdown.push({
      category: name,
      score,
      emoji,
      details: ''
    });
  });
}

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
  console.log('🔍 Extracting tips from AI response...');
  
  // Find the Style Tips section
  const tipsSectionMatch = text.match(/\*\*Style Tips:\*\*([\s\S]*?)(?=\*\*SPECIAL|$)/i);
  if (!tipsSectionMatch) {
    console.log('⚠️ No Style Tips section found in AI response');
    return;
  }
  
  const tipsContent = tipsSectionMatch[1];
  console.log('📋 Found Style Tips section with', tipsContent.length, 'characters');
  
  // Extract tips with bullet points and handle **bold** formatting
  const lines = tipsContent.split('\n').filter(line => line.trim().startsWith('•'));
  
  console.log('🔍 Found bullet lines:', lines.length);
  
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    
    // Extract category and tip from format: • **Category:** tip text
    const match = line.match(/•\s*\*\*([^*]+)\*\*:?\s*(.*)/);
    if (match) {
      const category = match[1].trim().replace(':', ''); // Remove colon
      const tipText = match[2].trim();
      
      if (category && tipText && tipText.length > 15) {
        tips.push({
          category: category,
          tip: tipText,
          level: 'intermediate'
        });
      }
    }
  }
  
  console.log(`✅ Extracted ${tips.length} tips from AI response`);
}

// Remove all the fallback bullshit - we only want real AI tips
function parseStandardFormat(tipsContent: string, tips: StyleTip[]): boolean {
  // This function is no longer needed - keeping it simple
  return false;
}

function parseBulletPoints(text: string, tips: StyleTip[]): boolean {
  // This function is no longer needed - keeping it simple  
  return false;
}

function parseCategoryPatterns(text: string, tips: StyleTip[]): boolean {
  // This function is no longer needed - keeping it simple
  return false;
}

function addFallbackTips(tips: StyleTip[]): void {
  // NO FALLBACK BULLSHIT - if AI doesn't give tips, we don't show any
  console.log('🚫 No fallback tips - AI must provide real tips');
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
