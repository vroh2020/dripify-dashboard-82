
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

// Create analysis prompt
function createAnalysisPrompt(style?: string): string {
  const basePrompt = `You are an expert fashion stylist with 15+ years of experience. Analyze this outfit photo with professional expertise.

CRITICAL: Your response MUST follow this EXACT format with numerical scores:

**Overall Score:** [number 1-100]

**Color Coordination:** [number 1-100]
Analyze color harmony, seasonal appropriateness, skin tone compatibility, and color balance.

**Fit & Proportion:** [number 1-100]
Evaluate garment fit, silhouette flattery, proportion balance, and how well clothes complement the body shape.

**Style Coherence:** [number 1-100]
Assess how well different pieces work together, consistency in formality level, and overall aesthetic harmony.

**Accessories:** [number 1-100]
Review accessory choices, proportion to outfit, color coordination with main pieces.

**Outfit Creativity:** [number 1-100]
Rate originality, personal expression, unique combinations, and creative styling choices.

**Trend Awareness:** [number 1-100]
Evaluate current trend incorporation, timeless vs trendy balance.

**Summary:**
[Provide 3-4 sentences highlighting the outfit's strongest elements and suggestions for improvement]

**Improvement Suggestions:**

**Color Coordination:**
• [Specific actionable tip]
• [Color theory-based suggestion]

**Fit & Proportion:**
• [Tailoring or sizing suggestion]
• [Silhouette enhancement tip]

**Style Coherence:**
• [Styling consistency tip]
• [Piece coordination suggestion]

**Accessories:**
• [Specific accessory recommendation]
• [Enhancement suggestion]

**Creativity & Personal Style:**
• [Unique expression encouragement]
• [Creative combination idea]

**Trend Integration:**
• [Current trend suggestion]
• [Modern update idea]

IMPORTANT: Be specific, actionable, and encouraging while maintaining professional honesty.`;

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

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }

    const { image, style } = requestBody;

    // Validate input
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

    // Prepare API payload
    const apiPayload = {
      model: "google/gemma-3-27b-it",
      temperature: 0.3,
      max_tokens: 2000,
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
                detail: 'high'
              }
            }
          ]
        }
      ]
    };

    console.log('Calling Nebius API...');
    
    // Call API
    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nebius API error:', errorText);
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response format:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from analysis service');
    }

    const markdownContent = data.choices[0].message.content;
    console.log('Analysis completed successfully. Content length:', markdownContent.length);
    
    // Extract overall score
    const scorePattern = /\*\*Overall Score:\*\*\s*(\d+)/;
    const overallScoreMatch = markdownContent.match(scorePattern);
    const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : null;

    return new Response(JSON.stringify({ 
      feedback: markdownContent,
      overallScore,
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
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Analysis failed'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

console.log('Style Analysis Edge Function is running...');
