import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting
const clientRequests = new Map();

function checkRateLimit(clientId: string, maxRequests = 5, windowMs = 60000) {
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

const OUTFIT_GENERATION_PROMPT = `You are a professional fashion stylist and AI outfit curator. Your task is to create stunning outfit combinations using items from a user's digital closet.

INSTRUCTIONS:
1. Analyze the user's closet items and their attributes (category, color, style, brand, etc.)
2. Create 3-5 different outfit combinations that match the specified occasion and preferences
3. Each outfit should include 3-6 items from their closet (tops, bottoms, shoes, accessories, etc.)
4. Provide detailed styling rationale for each outfit
5. Score each outfit based on style coherence, appropriateness, and visual appeal (1-100)
6. Suggest missing items that would enhance the outfit (optional)

RESPOND IN THIS EXACT JSON FORMAT:
{
  "outfits": [
    {
      "id": "outfit_1",
      "item_ids": ["item_id_1", "item_id_2", "item_id_3"],
      "score": 85,
      "rationale": "This outfit combines your navy blazer with white jeans for a perfect smart-casual look. The brown leather shoes add sophistication while the minimalist accessories keep it modern and clean.",
      "style_notes": ["smart-casual", "color-coordinated", "versatile"],
      "missing_items": [
        {
          "category": "accessories",
          "description": "A leather watch or bracelet",
          "reason": "Would add a polished finishing touch",
          "priority": "medium"
        }
      ]
    }
  ],
  "total_generated": 3,
  "generation_metadata": {
    "occasion": "work",
    "style_preference": "classic",
    "weather": "mild"
  }
}

STYLING GUIDELINES:
- Ensure color coordination and harmony
- Consider the occasion's dress code and appropriateness  
- Balance proportions and silhouettes
- Include practical elements (weather, comfort, functionality)
- Mix textures and patterns thoughtfully
- Consider the user's style preferences
- Suggest versatile pieces that work for multiple occasions

SCORING CRITERIA:
90-100: Exceptional - Perfect coordination, highly appropriate, fashion-forward
80-89: Great - Well-coordinated, appropriate, stylish
70-79: Good - Decent coordination, mostly appropriate
60-69: Okay - Basic coordination, somewhat appropriate
Below 60: Needs improvement

Be creative, practical, and focus on making the user look and feel amazing!`;

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

    const { 
      occasion, 
      weather, 
      style_preference, 
      color_preference, 
      specific_requirements,
      closet_items,
      user_preferences 
    } = await req.json();
    
    if (!occasion || !closet_items || !Array.isArray(closet_items)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: occasion and closet_items' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (closet_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No closet items provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get API key from environment
    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    if (!nebiusApiKey) {
      console.error('NEBIUS_API_KEY not found in environment');
      throw new Error('Service configuration error - API key missing');
    }

    // Prepare closet items summary for AI
    const closetSummary = closet_items.map((item: any) => ({
      id: item.id,
      title: item.title || 'Untitled',
      category: item.category,
      brand: item.brand,
      color: item.color,
      season: item.season,
      tags: item.tags || [],
      attributes: item.attributes || {}
    }));

    // Build context for AI
    const contextPrompt = `
OCCASION: ${occasion}
WEATHER: ${weather || 'mild'}
STYLE PREFERENCE: ${style_preference || 'classic'}
${color_preference ? `COLOR PREFERENCE: ${color_preference}` : ''}
${specific_requirements ? `SPECIAL REQUIREMENTS: ${specific_requirements}` : ''}

USER'S CLOSET ITEMS:
${closetSummary.map((item: any, index: number) => 
  `${index + 1}. ID: ${item.id}
     Title: ${item.title}
     Category: ${item.category}
     Brand: ${item.brand || 'Unknown'}
     Color: ${item.color || 'Unknown'}
     Tags: ${item.tags.join(', ') || 'None'}
     Season: ${item.season || 'All-season'}`
).join('\n\n')}

Please create 3-4 outfit combinations using these items. Focus on creating cohesive, stylish outfits that are perfect for the specified occasion.
    `;

    // Prepare API payload for Nebius
    const apiPayload = {
      model: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
      temperature: 0.7, // Balanced creativity and consistency
      messages: [
        {
          role: "system",
          content: OUTFIT_GENERATION_PROMPT
        },
        {
          role: "user",
          content: contextPrompt
        }
      ]
    };

    console.log('Calling Nebius API for outfit generation...');
    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload),
      signal: AbortSignal.timeout(45000) // Longer timeout for complex generation
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

    const generationContent = data.choices[0].message.content;
    console.log('Raw generation response:', generationContent);

    // Parse JSON response
    let generationResult;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = generationContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : generationContent;
      generationResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      
      // Fallback: create a basic outfit using available items
      const fallbackOutfit = createFallbackOutfit(closet_items, occasion);
      generationResult = {
        outfits: [fallbackOutfit],
        total_generated: 1,
        generation_metadata: {
          occasion,
          style_preference: style_preference || 'classic',
          weather: weather || 'mild',
          fallback: true
        }
      };
    }

    // Validate and enhance the result
    if (!generationResult.outfits || !Array.isArray(generationResult.outfits)) {
      throw new Error('Invalid outfit generation result');
    }

    // Enhance outfits with actual item data
    const enhancedOutfits = generationResult.outfits.map((outfit: any) => {
      const outfitItems = outfit.item_ids
        .map((id: string) => closet_items.find((item: any) => item.id === id))
        .filter(Boolean);

      return {
        ...outfit,
        items: outfitItems,
        missing_items: outfit.missing_items || []
      };
    }).filter((outfit: any) => outfit.items.length > 0); // Only include outfits with valid items

    console.log('Outfit generation completed successfully');
    
    return new Response(JSON.stringify({
      outfits: enhancedOutfits,
      total_generated: enhancedOutfits.length,
      generation_metadata: {
        occasion,
        style_preference: style_preference || 'classic',
        weather: weather || 'mild',
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in generate-outfits function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Outfit generation service temporarily unavailable',
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

// Fallback outfit creation function
function createFallbackOutfit(closetItems: any[], occasion: string) {
  // Simple logic to create a basic outfit
  const tops = closetItems.filter(item => item.category === 'tops');
  const bottoms = closetItems.filter(item => item.category === 'bottoms');
  const shoes = closetItems.filter(item => item.category === 'shoes');
  const outerwear = closetItems.filter(item => item.category === 'outerwear');
  
  const outfitItems = [];
  
  // Add a top
  if (tops.length > 0) outfitItems.push(tops[0].id);
  
  // Add bottoms
  if (bottoms.length > 0) outfitItems.push(bottoms[0].id);
  
  // Add shoes
  if (shoes.length > 0) outfitItems.push(shoes[0].id);
  
  // Add outerwear for formal occasions
  if ((occasion === 'work' || occasion === 'formal') && outerwear.length > 0) {
    outfitItems.push(outerwear[0].id);
  }

  return {
    id: "fallback_outfit_1",
    item_ids: outfitItems,
    score: 75,
    rationale: `A classic ${occasion} outfit combining your available pieces. This combination provides a solid foundation that you can accessorize and personalize to match your style.`,
    style_notes: ["classic", "versatile", "appropriate"],
    missing_items: []
  };
}

console.log('Outfit Generation Edge Function is running...');
