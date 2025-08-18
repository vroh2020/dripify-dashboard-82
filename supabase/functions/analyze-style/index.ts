import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
// Enhanced validation function
function validateImageData(image) {
  if (!image || typeof image !== 'string') return false;
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
  const urlPattern = /^https?:\/\/.+\.(jpeg|jpg|png|webp)(\?.*)?$/i;
  return base64Pattern.test(image) || urlPattern.test(image);
}
// Rate limiting (simple in-memory store)
const rateLimitStore = new Map();
function checkRateLimit(clientId, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const client = rateLimitStore.get(clientId);
  if (!client || now > client.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  if (client.count >= maxRequests) {
    return false;
  }
  client.count++;
  return true;
}

// Prompt templates
const SYSTEM_PROMPT = `You are a STRICT fashion consultant who gives HONEST, REALISTIC scores. Do not be generous with scores.

BEFORE YOU SCORE: Look at this outfit carefully. Is it just basic clothes? If yes, score 50-70. Only creative, well-executed outfits get 80+.

Analyze this outfit using OBJECTIVE criteria and score accurately. Be truthful and CRITICAL - do not inflate scores for basic outfits.

🎯 SCORING CRITERIA (Rate honestly based on these factors):

**Fit & Proportion (25%):** Does clothing fit properly? Are proportions flattering?
**Color Harmony (20%):** Do colors work well together? Is there a cohesive palette?
**Style Consistency (20%):** Does the outfit have a clear aesthetic direction?
**Appropriateness (15%):** Is the outfit suitable for its context/occasion?
**Quality & Details (10%):** Are garments well-maintained? Good fabric quality visible?
**Creativity & Personal Expression (10%):** Does the outfit show personality and intentional choices?

📊 STRICT Scoring Guidelines

90–100: EXCEPTIONAL (VERY RARE) - Flawless execution, celebrity-level styling
70–79: GOOD - Well put together, cohesive, above average effort
60–69: DECENT/AVERAGE - Basic but acceptable, typical everyday styling
50–59: NEEDS IMPROVEMENT - Several noticeable issues, below average
Below 50: POOR - Major problems, significant styling issues

🚨 MANDATORY SCORING RULES - NO EXCEPTIONS:

BASIC OUTFIT EXAMPLES (SCORE 50-70 MAX):
- Any hoodie + leggings = 55-65
- Basic jeans + plain t-shirt = 55-65
- Simple athletic wear = 60-70
- Sweatpants + hoodie = 50-60
- Any monochrome basic outfit = 60-70 MAX

---

Your response MUST follow this EXACT format:

**Overall Score:** [1–100]
**Aura:** [1–100]
**Drip Quality:** [1–100]
**Potential:** [1–100]
**Color Coordination:** [1–100]
**Attractiveness:** [1–100]

---

**Summary:** 2–3 sentences highlighting strengths first, then gently suggesting improvements.

**Style Tips:**
• Fit: [One actionable idea]
• Colors: [One color suggestion]
• Styling: [One accessory or styling tweak]`;

const createAnalysisPrompt = (style) => `${SYSTEM_PROMPT}

If the style is "${style || 'general'}", mention how well it represents that aesthetic without penalizing if it's a different vibe.`;

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please try again in a minute.'
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
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
      model: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: createAnalysisPrompt(style)
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: createAnalysisPrompt(style)
            }
          ]
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: ""
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: createAnalysisPrompt(style)
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "high"
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload),
      signal: AbortSignal.timeout(30000)
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
    const scorePattern = /\*\*Overall Score:\*\*\s*(\d+)/;
    const overallScoreMatch = markdownContent.match(scorePattern);
    const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : null;
    if (!overallScore || overallScore < 1 || overallScore > 100) {
      console.warn('Could not extract valid overall score, using default');
    }
    return new Response(JSON.stringify({
      feedback: markdownContent,
      overallScore: overallScore || 70,
      analysisMetadata: {
        model: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
        timestamp: new Date().toISOString(),
        style: style || 'general'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in analyze-style function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Analysis service temporarily unavailable',
      details: 'Please try again in a moment. If the problem persists, contact support.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
console.log('Style Analysis Edge Function is running...');
