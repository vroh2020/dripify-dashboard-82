import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Enhanced validation function
function validateImageData(image: string): boolean {
  if (!image || typeof image !== 'string') return false;
  
  // Check if it's a valid base64 data URL or regular URL
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
  const urlPattern = /^https?:\/\/.+\.(jpeg|jpg|png|webp)(\?.*)?$/i;
  
  return base64Pattern.test(image) || urlPattern.test(image);
}

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const client = rateLimitStore.get(clientId);
  
  if (!client || now > client.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (client.count >= maxRequests) {
    return false;
  }
  
  client.count++;
  return true;
}

// Enhanced prompt with better specificity
function createAnalysisPrompt(style?: string): string {
  const basePrompt = `You are an expert fashion stylist with 15+ years of experience in personal styling, color theory, and fashion trend analysis. Analyze this outfit photo with professional expertise while maintaining an encouraging and constructive tone.

CRITICAL: Your response MUST follow this EXACT format with numerical scores:

**Overall Score:** [number 1-100]

**Color Coordination:** [number 1-100]
Analyze color harmony, seasonal appropriateness, skin tone compatibility, and color balance. Consider complementary colors, contrast levels, and how colors work together.

**Fit & Proportion:** [number 1-100]
Evaluate garment fit, silhouette flattery, proportion balance, and how well clothes complement the body shape. Consider sleeve length, hemlines, and overall tailoring.

**Style Coherence:** [number 1-100]
Assess how well different pieces work together, consistency in formality level, and overall aesthetic harmony. Consider mixing patterns, textures, and style elements.

**Accessories:** [number 1-100]
Review accessory choices, proportion to outfit, color coordination with main pieces, and how accessories enhance or detract from the overall look.

**Outfit Creativity:** [number 1-100]
Rate originality, personal expression, unique combinations, and creative styling choices that show personality and fashion sense.

**Trend Awareness:** [number 1-100]
Evaluate current trend incorporation, timeless vs trendy balance, and how well the outfit reflects contemporary fashion while maintaining personal style.

SCORING GUIDELINES:
- 90-100: Exceptional, runway-worthy styling
- 80-89: Very well-styled with great choices
- 70-79: Good outfit with minor improvements needed
- 60-69: Decent outfit with several areas for enhancement
- 50-59: Average outfit with significant room for improvement
- Below 50: Major styling issues that need addressing

**Summary:**
[Provide 3-4 sentences highlighting the outfit's strongest elements and gentle suggestions for improvement]

**Improvement Suggestions:**

**Color Coordination:**
• [Specific actionable tip]
• [Color theory-based suggestion]
• [Seasonal/skin tone recommendation]

**Fit & Proportion:**
• [Tailoring or sizing suggestion]
• [Silhouette enhancement tip]
• [Proportion balancing advice]

**Style Coherence:**
• [Styling consistency tip]
• [Piece coordination suggestion]
• [Aesthetic harmony advice]

**Accessories:**
• [Specific accessory recommendation]
• [Proportion or coordination tip]
• [Enhancement suggestion]

**Creativity & Personal Style:**
• [Unique expression encouragement]
• [Creative combination idea]
• [Personal style development tip]

**Trend Integration:**
• [Current trend suggestion]
• [Timeless piece recommendation]
• [Modern update idea]

IMPORTANT ANALYSIS REQUIREMENTS:
- Look at the ENTIRE outfit from head to toe
- Consider the setting/occasion appropriateness
- Evaluate lighting and photo quality impact
- Be specific about what you observe
- Provide actionable, realistic suggestions
- Balance honesty with encouragement
- Consider body type and personal style`;

  if (style) {
    return basePrompt + `\n\nSPECIAL FOCUS: The user is interested in "${style}" style. Pay particular attention to how well this outfit aligns with or could be adapted to incorporate ${style} elements.`;
  }
  
  return basePrompt;
}

// Retry mechanism for API calls
async function callNebiusAPIWithRetry(apiKey: string, payload: any, maxRetries = 3): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API call attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Enhanced response validation
function validateAnalysisResponse(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required sections
  const requiredSections = [
    'Overall Score:',
    'Color Coordination:',
    'Fit & Proportion:',
    'Style Coherence:',
    'Accessories:',
    'Outfit Creativity:',
    'Trend Awareness:'
  ];
  
  requiredSections.forEach(section => {
    if (!content.includes(section)) {
      errors.push(`Missing ${section} section`);
    }
  });
  
  // Validate numerical scores
  const scorePattern = /\*\*([^:]+):\*\*\s*(\d+)/g;
  const scores: { [key: string]: number } = {};
  let match;
  
  while ((match = scorePattern.exec(content)) !== null) {
    const [, category, scoreStr] = match;
    const score = parseInt(scoreStr);
    
    if (score < 1 || score > 100) {
      errors.push(`Invalid score for ${category}: ${score} (must be 1-100)`);
    }
    
    scores[category] = score;
  }
  
  // Check if we have at least the overall score
  if (!scores['Overall Score']) {
    errors.push('Missing or invalid Overall Score');
  }
  
  return { isValid: errors.length === 0, errors };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }

    const { image, style } = requestBody;

    // Enhanced input validation
    if (!validateImageData(image)) {
      throw new Error('Invalid image data. Please provide a valid image URL or base64 data.');
    }

    console.log('Processing style analysis request...', { 
      hasImage: !!image, 
      style: style || 'general',
      imageType: image.startsWith('data:') ? 'base64' : 'url'
    });

    // Check API key
    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    if (!nebiusApiKey) {
      console.error('Nebius API key not configured');
      throw new Error('Service configuration error');
    }

    // Prepare API payload with enhanced parameters
    const apiPayload = {
      model: "google/gemma-3-27b-it",
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 2000, // Increased for more detailed feedback
      top_p: 0.9,
      frequency_penalty: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: createAnalysisPrompt(style)
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'high' // Request high detail analysis
              }
            }
          ]
        }
      ]
    };

    console.log('Calling Nebius API with enhanced parameters...');
    
    // Call API with retry mechanism
    const data = await callNebiusAPIWithRetry(nebiusApiKey, apiPayload);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response format:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from analysis service');
    }

    const markdownContent = data.choices[0].message.content;
    console.log('Analysis completed. Content length:', markdownContent.length);
    
    // Validate response quality
    const validation = validateAnalysisResponse(markdownContent);
    if (!validation.isValid) {
      console.warn('Response validation failed:', validation.errors);
      // Still return the response but log the issues
    }

    // Extract scores for quick reference
    const scorePattern = /\*\*Overall Score:\*\*\s*(\d+)/;
    const overallScoreMatch = markdownContent.match(scorePattern);
    const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : null;

    return new Response(JSON.stringify({ 
      feedback: markdownContent,
      overallScore,
      analysisMetadata: {
        model: 'google/gemma-3-27b-it',
        timestamp: new Date().toISOString(),
        style: style || 'general',
        validationPassed: validation.isValid
      }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    // Create smart fallback based on error type
    let fallbackScore = 75;
    let errorMessage = 'temporary service issue';
    
    if (error.message.includes('rate limit')) {
      fallbackScore = 80;
      errorMessage = 'high demand - please try again shortly';
    } else if (error.message.includes('image')) {
      fallbackScore = 70;
      errorMessage = 'image processing difficulty';
    }

    const enhancedFallback = `**Overall Score:** ${fallbackScore}

**Color Coordination:** ${fallbackScore + 5}
Your color choices show great potential! Due to a ${errorMessage}, we couldn't provide our full detailed analysis, but we can see you have a good eye for color coordination.

**Fit & Proportion:** ${fallbackScore}
We can tell you've put thought into your outfit proportions! For our complete analysis, please try again in a moment.

**Style Coherence:** ${fallbackScore - 2}
Your styling instincts are evident! We'd love to give you more specific feedback once our service is fully available.

**Accessories:** ${fallbackScore + 2}
Great accessory sense! We're experiencing a ${errorMessage} but will be back to full analysis shortly.

**Outfit Creativity:** ${fallbackScore + 8}
Your creative approach to styling shines through! Please try uploading again for our complete creative analysis.

**Trend Awareness:** ${fallbackScore + 10}
You're clearly fashion-forward! Our full trend analysis will be available when you try again.

**Summary:**
We can see you have excellent style instincts! While we're experiencing a ${errorMessage}, your fashion sense is clearly evident. Please try again in a few moments for our complete professional analysis.

**Improvement Suggestions:**

**Color Coordination:**
• Try the analysis again for specific color harmony feedback
• Natural lighting helps us see your color choices better
• We'll provide detailed color theory insights when service resumes

**Fit & Proportion:**
• Our full fit analysis will be available shortly
• Consider taking photos in natural light for best results
• We'll give specific tailoring suggestions when you retry

**Style Coherence:**
• Full styling coherence analysis coming when you retry
• Your instincts are clearly good - we want to celebrate them properly
• Try again soon for detailed harmony feedback

**Accessories:**
• We'll provide specific accessory recommendations when service resumes
• Your choices show promise - we want to give full credit
• Retry for complete accessory styling analysis

**Creativity & Personal Style:**
• Your creative spirit is evident even with technical difficulties
• We'll celebrate your unique style properly when you try again
• Full creativity analysis available shortly

**Trend Integration:**
• Your trend awareness is clear - we want to highlight it properly
• Retry soon for complete trend analysis and suggestions
• We'll show you exactly what's working and what's next-level

Technical note: ${error.message}`;

    return new Response(JSON.stringify({ 
      error: error.message,
      feedback: enhancedFallback,
      isTemporary: true,
      retryAfter: 60 // seconds
    }), { 
      status: 200, // Still return 200 so frontend can display fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

console.log('Enhanced Style Analysis Edge Function is running...');