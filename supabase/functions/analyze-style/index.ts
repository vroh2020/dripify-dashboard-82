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
  const basePrompt = `You are a Gen Z fashion expert and style consultant who understands modern drip culture. Analyze this outfit photo and rate it using contemporary style categories that resonate with young people.

CRITICAL: Your response MUST follow this EXACT format with scores out of 100:

**Overall Score:** [number 1-100]

**Aura:** [number 1-100]
Rate the overall vibe, confidence projection, and how much presence this outfit commands.

**Drip Quality:** [number 1-100] 
Evaluate the overall freshness and quality of styling execution.

**Potential:** [number 1-100]
Assess how much this outfit could be elevated with small changes.

**Color Coordination:** [number 1-100]
Analyze color harmony and how well the colors work together.

**Attractiveness:** [number 1-100]
Rate how appealing and eye-catching this outfit is.

ENHANCED SCORING GUIDELINES (out of 100):
- 95-100: Absolutely iconic, viral-worthy drip, perfect execution
- 85-94: Fire outfit with serious drip, minimal flaws
- 75-84: Really solid fit with good style choices
- 65-74: Decent outfit with good foundation, some improvements needed
- 55-64: Mid-tier fit with potential but several areas to work on
- 45-54: Below average outfit with noticeable styling issues
- 35-44: Poor styling choices that need major fixes
- 25-34: Bad outfit with fundamental problems
- Below 25: Serious style disasters requiring complete redo

**Summary:**
[Provide 2-3 sentences highlighting what makes this outfit work or not work, using modern style language]

**Style Tips:**
• Aura: [Specific tip about boosting confidence and presence through styling]
• Drip: [Specific tip about elevating the overall freshness and coolness]
• Colors: [Specific tip about color choices and coordination]
• Potential: [Specific tip about small changes that would level up the look]
• Overall: [Specific tip for maximizing the outfit's impact and appeal]

Be honest but encouraging. Use contemporary style language that Gen Z understands.`;

  if (style) {
    return basePrompt + `\n\nSPECIAL STYLE FOCUS: Analyze how well this outfit represents the "${style}" aesthetic.`;
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
