import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Enhanced validation function
function validateImageData(image: any): boolean {
  if (!image || typeof image !== 'string') return false;
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;
  const urlPattern = /^https?:\/\/.+\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i;
  return base64Pattern.test(image) || urlPattern.test(image);
}

// Rate limiting
const clientRequests = new Map();

function checkRateLimit(clientId: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const client = clientRequests.get(clientId) || { count: 0, resetTime: now + windowMs };
  
  if (now > client.resetTime) {
    client.count = 1;
    client.resetTime = now + windowMs;
    clientRequests.set(clientId, client);
    return true;
  }
  
  if (client.count >= maxRequests) {
    return false;
  }
  client.count++;
  return true;
}

const CLOSET_ANALYSIS_PROMPT = `You are a fashion AI assistant specialized in analyzing clothing items for digital closet organization.

Analyze this clothing item image and extract the following information:

1. **Category**: Determine the main clothing category - use ONLY these 4 categories: 'tops', 'bottoms', 'shoes', 'accessories' (accessories includes bags, jewelry, hats, belts, outerwear, dresses etc.)
2. **Item Details**: Extract brand, color, style, and other attributes
3. **Tags**: Generate relevant tags for organization and styling
4. **Attributes**: Additional metadata like material, fit, occasion, etc.

Respond in this EXACT JSON format:
{
  "category": "tops|bottoms|shoes|accessories",
  "title": "descriptive item name",
  "brand": "brand name if visible",
  "color": "primary color",
  "style": "style description",
  "material": "material if identifiable",
  "fit": "fit type (loose, regular, tight)",
  "occasion": "suitable occasions",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "attributes": {
    "pattern": "solid/striped/printed etc",
    "neckline": "for tops",
    "length": "for bottoms/dresses",
    "heel_height": "for shoes",
    "closure": "buttons/zipper etc"
  },
  "confidence": 0.95
}

Be accurate and specific. If uncertain about any field, use null or provide your best estimate with lower confidence.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { image } = await req.json();
    
    if (!image) {
      console.error('❌ No image provided in request');
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!validateImageData(image)) {
      console.error('❌ Invalid image data format:', typeof image, image.substring(0, 50));
      return new Response(
        JSON.stringify({ error: 'Invalid image data. Please provide a valid image URL or base64 data.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Image validated:', {
      hasImage: !!image,
      imageType: image.startsWith('data:') ? 'base64' : 'url',
      imageLength: image.length
    });

    // Get API key from environment
    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    if (!nebiusApiKey) {
      console.error('NEBIUS_API_KEY not found in environment');
      throw new Error('Service configuration error - API key missing');
    }

    // Prepare API payload for Nebius
    const apiPayload = {
      model: "Qwen/Qwen2.5-VL-72B-Instruct",
      temperature: 0.3, // Lower temperature for more consistent categorization
      messages: [
        {
          role: "system",
          content: CLOSET_ANALYSIS_PROMPT
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this clothing item and provide the structured information."
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

    console.log('🚀 Calling Nebius API for closet item analysis...');
    console.log('📝 Request details:', {
      model: apiPayload.model,
      imageType: image.startsWith('data:') ? 'base64' : 'url',
      hasApiKey: !!nebiusApiKey
    });
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
      console.error('❌ Nebius API error:', response.status, errorText);
      console.error('Request payload:', JSON.stringify(apiPayload).substring(0, 500));
      throw new Error(`AI service error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid response from AI service');
    }

    const analysisContent = data.choices[0].message.content;
    console.log('Raw analysis response:', analysisContent);

    // Parse JSON response
    let analysisResult;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : analysisContent;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      
      // Fallback: try to extract key information with regex
      analysisResult = {
        category: extractWithRegex(analysisContent, /category['":\s]*([^,}\n]+)/) || 'tops',
        title: extractWithRegex(analysisContent, /title['":\s]*([^,}\n]+)/) || null,
        brand: extractWithRegex(analysisContent, /brand['":\s]*([^,}\n]+)/) || null,
        color: extractWithRegex(analysisContent, /color['":\s]*([^,}\n]+)/) || null,
        suggestedTags: ['clothing', 'fashion'],
        attributes: {},
        confidence: 0.5
      };
    }

    // Validate and clean the result - enforce 4 main categories only
    const validCategories = ['tops', 'bottoms', 'shoes', 'accessories'];
    if (!validCategories.includes(analysisResult.category)) {
      // Smart fallback based on common clothing types
      const categoryLower = (analysisResult.category || '').toLowerCase();
      if (categoryLower.includes('dress') || 
          categoryLower.includes('shirt') ||
          categoryLower.includes('blouse') ||
          categoryLower.includes('jacket') ||
          categoryLower.includes('sweater') ||
          categoryLower.includes('outerwear') ||
          categoryLower.includes('top')) {
        analysisResult.category = 'tops';
      } else if (categoryLower.includes('pant') ||
                 categoryLower.includes('jean') ||
                 categoryLower.includes('short') ||
                 categoryLower.includes('skirt') ||
                 categoryLower.includes('bottom')) {
        analysisResult.category = 'bottoms';
      } else if (categoryLower.includes('shoe') ||
                 categoryLower.includes('boot') ||
                 categoryLower.includes('sandal') ||
                 categoryLower.includes('sneaker')) {
        analysisResult.category = 'shoes';
      } else {
        analysisResult.category = 'accessories'; // bags, jewelry, hats, etc.
      }
    }

    // Ensure suggestedTags is an array
    if (!Array.isArray(analysisResult.suggestedTags)) {
      analysisResult.suggestedTags = ['clothing'];
    }

    // Limit tags to reasonable number
    analysisResult.suggestedTags = analysisResult.suggestedTags.slice(0, 8);

    console.log('Closet item analysis completed successfully');
    
    return new Response(JSON.stringify(analysisResult), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Error in analyze-closet-item function:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error name:', error?.name);
    
    // More detailed error response for debugging
    const errorMessage = error?.message || 'Analysis service temporarily unavailable';
    const errorDetails = {
      error: errorMessage,
      details: 'Please try again in a moment. If the problem persists, contact support.',
      type: error?.name || 'UnknownError',
      stack: process.env.DENO_ENV === 'development' ? error?.stack : undefined
    };
    
    return new Response(JSON.stringify(errorDetails), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

// Helper function to extract values with regex
function extractWithRegex(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match ? match[1].replace(/['"]/g, '').trim() : null;
}

console.log('Closet Item Analysis Edge Function is running...');
