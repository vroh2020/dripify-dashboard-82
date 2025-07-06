import { ScoreBreakdown, StyleTip } from "@/types/styleTypes";

interface AnalysisResult {
  breakdown: ScoreBreakdown[];
  tips?: StyleTip[];
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
  console.log('Parsing analysis...');
  console.log('🔍 DEBUG: Raw AI response (first 500 chars):', rawAnalysis.substring(0, 500));
  console.log('🔍 DEBUG: Looking for tips in response...');
  
  try {
    const breakdown: ScoreBreakdown[] = [];
    const tips: StyleTip[] = [];
    
    // Extract the overall score - strict numerical extraction
    const overallScoreMatch = rawAnalysis.match(/\*\*Overall Score:\*\*\s*(\d+)/i);
    const overallScore = overallScoreMatch 
      ? parseInt(overallScoreMatch[1], 10) 
      : extractFallbackScore(rawAnalysis);
    
    if (overallScore === undefined) {
      console.warn('Could not find overall score in analysis');
    }
    
    // Extract the summary section
    const summaryMatch = rawAnalysis.match(/\*\*Summary:\*\*([\s\S]*?)(?:\*\*|$)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : undefined;
    
    // Fixed category regex to better extract numerical scores
    // This now uses a more strict pattern to get only the numerical value after the category header
    const categoryRegex = /\*\*([^*:]+):\*\*\s*(\d+)(?:\s*|\n)([\s\S]*?)(?=\*\*[^*]+:\*\*|$)/g;
    let match;
    
    while ((match = categoryRegex.exec(rawAnalysis)) !== null) {
      const category = match[1].trim();
      const scoreText = match[2].trim();
      let details = match[3].trim();
      
      // Skip overall score and summary which are handled separately
      if (category.toLowerCase() === 'overall score' || category.toLowerCase() === 'summary') {
        continue;
      }
      
      // Clean up potential numerical prefixes in details (some responses include the score again)
      details = details.replace(/^\d+\s*/, '');
      
      const score = parseInt(scoreText, 10);
      
      if (!isNaN(score)) {
        const emoji = categoryEmojis[category] || "✅";
        
        breakdown.push({
          category,
          score,
          emoji,
          details
        });
      } else {
        console.warn(`Invalid score "${scoreText}" for category: ${category}`);
        
        // Try to extract score from the first line of details
        const detailsScoreMatch = details.match(/^(\d+)/);
        if (detailsScoreMatch) {
          const detailsScore = parseInt(detailsScoreMatch[1], 10);
          if (!isNaN(detailsScore)) {
            const emoji = categoryEmojis[category] || "✅";
            breakdown.push({
              category,
              score: detailsScore,
              emoji,
              details: details.replace(/^\d+\s*/, '')
            });
          }
        }
      }
    }
    
    // If we found fewer than 4 categories, try a more flexible approach
    if (breakdown.length < 4) {
      extractCategoriesFlexible(rawAnalysis, breakdown);
    }
    
    // Extract tips from the analysis
    extractAllTips(rawAnalysis, tips);
    console.log('🔍 DEBUG: Tips extracted:', tips.length, tips);
    
    // Sort categories by score (highest first)
    breakdown.sort((a, b) => b.score - a.score);
    
    // Make sure we have a valid overall score (now on /100 scale)
    const validOverallScore = (overallScore !== undefined && !isNaN(overallScore)) 
      ? overallScore 
      : breakdown.length > 0 
        ? Math.round(breakdown.reduce((sum, item) => sum + item.score, 0) / breakdown.length) 
        : 75; // Use 75 as absolute fallback for /100 scale
    
    return { 
      breakdown, 
      tips, 
      overallScore: validOverallScore,
      summary 
    };
    
  } catch (error) {
    console.error('Error parsing analysis:', error);
    // Return minimal valid data in case of error
    return {
      breakdown: [],
      tips: [],
      overallScore: 75, // Fallback score for /100 scale
      summary: "We encountered an error analyzing your outfit. Please try again with a different image."
    };
  }
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

// Extract all tips from analysis
function extractAllTips(text: string, tips: StyleTip[]): void {
  console.log('🔍 DEBUG: Starting tip extraction from text...');
  
  // Look for the Style Tips section specifically
  const tipsSectionMatch = text.match(/\*\*Style Tips:\*\*([\s\S]*?)(?:\*\*|$)/i);
  
  if (!tipsSectionMatch) {
    console.log('🔍 DEBUG: No Style Tips section found');
    return;
  }
  
  const tipsContent = tipsSectionMatch[1];
  console.log('🔍 DEBUG: Found tips content:', tipsContent);
  
  // Split by lines and look for bullet points
  const lines = tipsContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Look for bullet points (• or *)
    const tipMatch = trimmedLine.match(/^[•*\-—]\s*(.+)$/);
    if (tipMatch) {
      const fullTip = tipMatch[1].trim();
      
      // Extract category and tip content
      const categoryMatch = fullTip.match(/^([^:]+):\s*(.+)$/);
      if (categoryMatch) {
        const category = categoryMatch[1].trim();
        const tipContent = categoryMatch[2].trim();
        
        if (tipContent && tipContent.length > 15) { // Ensure substantial tip
          tips.push({
            category,
            tip: tipContent,
            level: "intermediate"
          });
          console.log('🔍 DEBUG: Extracted tip:', { category, tip: tipContent });
        }
      } else if (fullTip.length > 15) {
        // Fallback for tips without clear category separation
        tips.push({
          category: "General",
          tip: fullTip,
          level: "intermediate"
        });
        console.log('🔍 DEBUG: Extracted general tip:', fullTip);
      }
    }
  }
  
  // If we didn't find exactly 3 tips, try alternative extraction
  if (tips.length !== 3) {
    console.log('🔍 DEBUG: Did not find 3 tips, trying alternative extraction. Found:', tips.length);
    
    // Clear and try again with more flexible parsing
    tips.length = 0;
    
    // Try to find any bullet points in the entire text after "Style Tips"
    const afterTipsIndex = text.toLowerCase().indexOf('style tips');
    if (afterTipsIndex !== -1) {
      const afterTipsText = text.substring(afterTipsIndex);
      const bulletPoints = afterTipsText.match(/[•*\-—]\s*[^•*\-—\n]+/g);
      
      if (bulletPoints) {
        console.log('🔍 DEBUG: Found bullet points:', bulletPoints);
        
        bulletPoints.slice(0, 3).forEach((bullet, index) => {
          const cleanBullet = bullet.replace(/^[•*\-—]\s*/, '').trim();
          if (cleanBullet.length > 15) {
            tips.push({
              category: `Tip ${index + 1}`,
              tip: cleanBullet,
              level: "intermediate"
            });
          }
        });
      }
    }
  }
  
  // Final fallback: create generic tips if still none found
  if (tips.length === 0) {
    console.log('🔍 DEBUG: No tips extracted, creating fallback tips');
    tips.push(
      {
        category: "Style Enhancement",
        tip: "Consider experimenting with different color combinations to create more visual interest and personal expression.",
        level: "intermediate"
      },
      {
        category: "Fit Improvement", 
        tip: "Focus on proper fit and proportions - well-fitted clothes instantly elevate any outfit and boost confidence.",
        level: "intermediate"
      },
      {
        category: "Confidence Boost",
        tip: "Add one statement piece or accessory that reflects your personality to make the outfit uniquely yours.",
        level: "intermediate"
      }
    );
  }
  
  console.log('🔍 DEBUG: Final tips extracted:', tips.length, tips);
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
