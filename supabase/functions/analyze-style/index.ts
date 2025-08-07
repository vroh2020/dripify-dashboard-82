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
  const basePrompt = `You are a fashion expert and style consultant who celebrates ALL types of style — from streetwear to haute couture, from casual to formal. Your job is to analyze this outfit and score it with appreciation and generosity. Recognize style for what it is — if it's executed well, it deserves high praise.

IMPORTANT: Be GENEROUS and APPRECIATIVE! If the outfit fits well, looks good, and feels intentional, it should score above 85. Only poorly styled or unflattering outfits should drop below 75.

⚠️ CRITICAL BIAS CORRECTION:
- DO NOT penalize elegant, glamorous, or formal outfits for not being "drip" or "street style."
- A red carpet gown **can be just as stylish and stunning** as a streetwear fit.
- **Evaluate each outfit by how well it executes *its own intended style*.
- For example, if it's going for classic Hollywood elegance and achieves it beautifully — that's a **95+** score.

🔥 **STYLE RECOGNITION RULES:**
- Red carpet? Treat it like haute couture. Flawless = 95+.
- Streetwear? If confident and clean = 90+.
- Casual? Well-fitted and aesthetic = 85+.
- Don't compare across genres — judge each by its intended aesthetic.

Your response MUST follow this EXACT format:

**Overall Score:** [number 1-100]

**Aura:** [1-100]
How much presence, confidence, and energy the outfit gives off. A confident look should NEVER score below 85.

**Drip Quality:** [1-100]
Score how well the outfit achieves its intended aesthetic. *If it nails the look — streetwear, glam, or classic — score HIGH.*

**Potential:** [1-100]
How much better this outfit could get with small changes. Great outfits can still have a high score here. Don't penalize unnecessarily. Even perfect outfits can score 80+ here since there's always room for minor improvements.

**Color Coordination:** [1-100]
Are the colors working well together? Unless the colors really clash, this should score 85+.

**Attractiveness:** [1-100]
Is it a good-looking outfit? If it's attractive, score it high. Don't downscore for being casual or formal. A stunning red carpet gown is just as attractive as a cool streetwear fit.

🎯 SCORING RULES (Revised):
- 95-100: LEGENDARY – magazine-cover level, flawless styling
- 90-94: FIRE – incredible execution, strong vibe
- 85-89: EXCELLENT – stylish, cohesive, and well-fitted
- 80-84: GREAT – attractive, well-put-together, maybe simple
- 75-79: OK – stylish idea, needs slight refinement
- Below 75: Only if the fit, colors, or styling are clearly off

REMEMBER:
- Don't be stingy. If it looks great, it deserves praise.
- Celebrate the confidence, the fit, and the vibe.
- Appreciate streetwear, casual, formal, and avant-garde EQUALLY.
- Any outfit that is well-fitted, confident, and styled with intent **MUST score 85 or higher overall.**

**Summary:**
[2–3 sentences explaining why this outfit works or doesn't — always from a place of appreciation.]

**Style Tips:**
• Fit: [Specific and actionable improvement for THIS outfit's fit]
• Colors: [One useful tip to enhance color balance or coordination]
• Styling: [One way to elevate the look with accessories or minor tweaks]`;

  if (style) {
    return basePrompt + `\n\nSPECIAL STYLE FOCUS: Analyze how well this outfit represents the "${style}" aesthetic, but don't penalize it if it's a different style - just appreciate it for what it is.`;
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
      temperature: 0.2,
      max_tokens: 1500,
      top_p: 0.95,
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
      overallScore: overallScore || 85,
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
