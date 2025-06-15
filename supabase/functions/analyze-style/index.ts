
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

// Rate limiting (simple in-memory store)
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

// Enhanced prompt for better scoring
function createAnalysisPrompt(style?: string): string {
  const basePrompt = `You are an expert fashion stylist with 15+ years of experience. Analyze this outfit photo and provide specific scores out of 100 for each category.

CRITICAL: Your response MUST follow this EXACT format with scores out of 100:

**Overall Score:** [number 1-100]

**Color Coordination:** [number 1-100]
Analyze color harmony, seasonal appropriateness, and how colors work together.

**Fit & Proportion:** [number 1-100]
Evaluate garment fit, silhouette, and how well clothes complement the body shape.

**Style Coherence:** [number 1-100]
Assess how well different pieces work together and overall aesthetic harmony.

**Accessories:** [number 1-100]
Review accessory choices and how they enhance the overall look.

**Outfit Creativity:** [number 1-100]
Rate originality, personal expression, and creative styling choices.

**Trend Awareness:** [number 1-100]
Evaluate current trend incorporation and fashion-forward elements.

SCORING GUIDELINES (out of 100):
- 90-100: Exceptional, runway-worthy styling
- 80-89: Very well-styled with great choices
- 70-79: Good outfit with minor improvements needed
- 60-69: Decent outfit with several areas for enhancement
- 50-59: Average outfit with significant room for improvement
- Below 50: Major styling issues that need addressing

**Summary:**
[Provide 2-3 sentences highlighting the outfit's strongest elements and gentle suggestions]

**Style Tips:**
• [Specific actionable tip for color coordination]
• [Specific actionable tip for fit and proportion]
• [Specific actionable tip for style coherence]`;

  if (style) {
    return basePrompt + `\n\nSPECIAL FOCUS: Pay particular attention to how well this outfit aligns with "${style}" style elements.`;
  }
  
  return basePrompt;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const requestBody = await req.json();
    const { image, style } = requestBody;

    if (!validateImageData(image)) {
      throw new Error('Invalid image data. Please provide a valid image URL or base64 data.');
    }

    console.log('Processing style analysis request...', { 
      hasImage: !!image, 
      style: style || 'general',
      imageType: image.startsWith('data:') ? 'base64' : 'url'
    });

    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    if (!nebiusApiKey) {
      console.error('Nebius API key not configured');
      throw new Error('Service configuration error - API key missing');
    }

    const apiPayload = {
      model: "google/gemma-3-27b-it",
      temperature: 0.3,
      max_tokens: 1500,
      top_p: 0.9,
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
                detail: 'high'
              }
            }
          ]
        }
      ]
    };

    console.log('Calling Nebius API...');
    
    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nebius API error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid response from AI service');
    }

    const markdownContent = data.choices[0].message.content;
    console.log('Analysis completed successfully. Content length:', markdownContent.length);
    
    // Extract overall score for quick reference
    const scorePattern = /\*\*Overall Score:\*\*\s*(\d+)/;
    const overallScoreMatch = markdownContent.match(scorePattern);
    const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : null;

    if (!overallScore || overallScore < 1 || overallScore > 100) {
      console.warn('Could not extract valid overall score, using default');
    }

    return new Response(JSON.stringify({ 
      feedback: markdownContent,
      overallScore: overallScore || 75,
      analysisMetadata: {
        model: 'google/gemma-3-27b-it',
        timestamp: new Date().toISOString(),
        style: style || 'general'
      }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    // Return proper error without confusing fallback
    return new Response(JSON.stringify({ 
      error: error.message || 'Analysis service temporarily unavailable',
      details: 'Please try again in a moment. If the problem persists, contact support.'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

console.log('Style Analysis Edge Function is running...');
