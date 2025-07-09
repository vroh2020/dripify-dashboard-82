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

  // Ensure we always have tips
  if (tips.length === 0) {
    console.log('⚠️ No tips found after extraction, this should not happen with fallbacks');
    addFallbackTips(tips);
  }

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
  console.log('🔍 Extracting tips from text:', text.substring(0, 500));
  
  // Multiple parsing strategies for different AI response formats
  let extracted = false;
  
  // Strategy 1: Standard format with **Style Tips:**
  const tipsSectionMatch = text.match(/\*\*Style Tips:\*\*([\s\S]*?)(?=\n\n|\*\*|$)/i);
  if (tipsSectionMatch) {
    console.log('📋 Found Style Tips section');
    const tipsContent = tipsSectionMatch[1];
    extracted = parseStandardFormat(tipsContent, tips);
  }
  
  // Strategy 2: Look for bullet points anywhere in the text
  if (!extracted || tips.length === 0) {
    console.log('🔄 Trying bullet point extraction...');
    extracted = parseBulletPoints(text, tips);
  }
  
  // Strategy 3: Look for category-specific patterns throughout the text
  if (!extracted || tips.length === 0) {
    console.log('🔄 Trying category pattern extraction...');
    extracted = parseCategoryPatterns(text, tips);
  }
  
  // Strategy 4: Fallback - generate helpful tips based on the analysis
  if (!extracted || tips.length === 0) {
    console.log('⚠️ No tips extracted, using fallback tips');
    addFallbackTips(tips);
  }
  
  console.log(`✅ Final tips extracted: ${tips.length}`, tips.map(t => t.category));
}

function parseStandardFormat(tipsContent: string, tips: StyleTip[]): boolean {
  const tipLines = tipsContent.split(/[•·\-\*]/g).filter(line => line.trim());
  let extracted = false;
  
  tipLines.forEach(line => {
    const cleanLine = line.trim();
    if (cleanLine.length < 5) return; // Skip very short lines
    
    const colonIndex = cleanLine.indexOf(':');
    if (colonIndex > 0 && colonIndex < 20) { // Reasonable category length
      const category = cleanLine.substring(0, colonIndex).trim();
      const tipText = cleanLine.substring(colonIndex + 1).trim();
      
      if (tipText.length > 10) { // Ensure we have substantial tip content
        tips.push({
          category: category || 'Style',
          tip: tipText,
          level: determineLevel(tipText)
        });
        extracted = true;
      }
    }
  });
  
  return extracted;
}

function parseBulletPoints(text: string, tips: StyleTip[]): boolean {
  // Look for bullet point patterns throughout the text
  const bulletPatterns = [
    /[•·\-\*]\s*([^:]+):\s*(.+?)(?=\n|$)/g,
    /(\w+):\s*([^•·\-\*\n]+)/g
  ];
  
  let extracted = false;
  
  for (const pattern of bulletPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const category = match[1]?.trim();
      const tipText = match[2]?.trim();
      
      if (category && tipText && tipText.length > 15 && 
          !tips.some(t => t.category.toLowerCase() === category.toLowerCase())) {
        
        // Filter out scores and non-tip content
        if (!/^\d+/.test(tipText) && !tipText.includes('Rate ') && !tipText.includes('Evaluate ')) {
          tips.push({
            category: category,
            tip: tipText,
            level: determineLevel(tipText)
          });
          extracted = true;
        }
      }
    }
  }
  
  return extracted;
}

function parseCategoryPatterns(text: string, tips: StyleTip[]): boolean {
  // Look for specific style-related advice patterns
  const advicePatterns = [
    /(?:try|consider|add|wear|choose|opt for|go for|pair)\s+([^.!?]{20,100})[.!?]/gi,
    /(?:to improve|to enhance|to elevate|to upgrade)\s+([^.!?]{15,80})[.!?]/gi,
    /(?:would suggest|recommend|advice)\s+([^.!?]{15,80})[.!?]/gi
  ];
  
  let extracted = false;
  const categories = ['Style', 'Improvement', 'Enhancement', 'Recommendation'];
  let categoryIndex = 0;
  
  for (const pattern of advicePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && categoryIndex < categories.length) {
      const advice = match[1]?.trim();
      if (advice && advice.length > 15) {
        tips.push({
          category: categories[categoryIndex],
          tip: advice.charAt(0).toUpperCase() + advice.slice(1),
          level: 'intermediate'
        });
        categoryIndex++;
        extracted = true;
      }
    }
  }
  
  return extracted;
}

function addFallbackTips(tips: StyleTip[]): void {
  const fallbackTips = [
    {
      category: 'Confidence',
      tip: 'The most important accessory is confidence. Own your style choices and wear them with pride.',
      level: 'intermediate' as const
    },
    {
      category: 'Fit',
      tip: 'Proper fit is everything. Well-fitted basics will always look better than expensive clothes that don\'t fit right.',
      level: 'beginner' as const
    },
    {
      category: 'Color Harmony',
      tip: 'Start with neutral bases and add one or two accent colors. This creates a cohesive, intentional look.',
      level: 'intermediate' as const
    },
    {
      category: 'Personal Style',
      tip: 'Experiment with different styles to find what makes you feel most authentic and confident.',
      level: 'beginner' as const
    },
    {
      category: 'Details Matter',
      tip: 'Small details like properly rolled sleeves, clean shoes, or a well-chosen accessory can elevate any outfit.',
      level: 'advanced' as const
    }
  ];
  
  // Add 3-4 random fallback tips
  const shuffled = fallbackTips.sort(() => 0.5 - Math.random());
  tips.push(...shuffled.slice(0, 4));
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
