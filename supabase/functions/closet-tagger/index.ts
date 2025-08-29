import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type TagBody = { image: string; title?: string; brand?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { 
      status: 200,
      headers: corsHeaders 
    });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const { image, title, brand } = (await req.json()) as TagBody;
    if (!image) {
      return new Response(JSON.stringify({ error: "Missing 'image' base64" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Nebius API key for AI analysis
    const nebiusApiKey = Deno.env.get("NEBIUS_API_KEY");
    if (!nebiusApiKey) {
      throw new Error('Service configuration error - API key missing');
    }

    // Improved prompt for better JSON output
    const systemPrompt = `You are a fashion expert AI. Analyze clothing items and return ONLY valid JSON in this exact format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "attributes": {
    "color": "specific color name",
    "category": "tops|bottoms|dresses|shoes|accessories",
    "brand": "brand name if visible",
    "season": "spring|summer|fall|winter|all",
    "material": "cotton|denim|silk|etc",
    "fit": "loose|regular|fitted|oversized"
  }
}

Be specific and accurate. If you can't determine something, use "unknown".`;

    const userPrompt = `Analyze this clothing item image and return ONLY the JSON object. Focus on:
- What type of clothing is it? (tops, bottoms, dresses, shoes, accessories, outerwear)
- What color is it? (be specific: navy blue, light blue, white, black, charcoal gray, etc.)
- What material does it look like? (cotton, denim, silk, polyester, wool, etc.)
- What's the fit? (loose, regular, fitted, oversized)
- BRAND DETECTION: Look VERY carefully for ANY visible brand names, logos, or text on the clothing, bags, accessories, or anywhere in the image. Common brands include Nike, Adidas, TRAPSTAR, Supreme, Off-White, Balenciaga, Gucci, etc. Check ALL areas: chest, sleeves, back, bags, accessories, shoes, hats, etc.
- What season is it appropriate for?

CRITICAL: Scan the ENTIRE image for any text, logos, or brand names. Look at accessories, bags, shoes, and all clothing items. If you see ANY brand text or logos, identify them.

Return ONLY valid JSON, no other text.`;

    // Optimized for speed and accuracy
    const apiPayload = {
      model: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
      temperature: 0.1, // Very low temperature for consistent results
      max_tokens: 200, // Limit response length for speed
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "medium" // Lower detail for speed
              }
            }
          ]
        }
      ]
    };

    console.log('Calling Nebius API for clothing analysis...');
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

    const aiResponse = data.choices[0].message.content;
    console.log('AI clothing analysis response:', aiResponse);

    // Parse AI response with improved JSON extraction
    let tags = ["clothing", "casual"];
    let attributes = { color: "unknown", category: "clothing", brand: "unknown" };
    
    try {
      // First try direct JSON parsing
      const parsed = JSON.parse(aiResponse);
      console.log('Successfully parsed AI response:', parsed);
      tags = parsed.tags || tags;
      attributes = parsed.attributes || attributes;
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      console.error('Parse error:', e);
      
      // Try to extract JSON using regex
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted JSON with regex:', extractedJson);
          tags = extractedJson.tags || tags;
          attributes = extractedJson.attributes || attributes;
        } catch (regexError) {
          console.error('Regex JSON extraction failed:', regexError);
        }
      }
      
              // If still no success, do intelligent text analysis
        if (tags.length <= 2) { // Only fallback if we still have basic tags
          const lowerResponse = aiResponse.toLowerCase();
          console.log('Performing intelligent text analysis on:', lowerResponse);
          
          // Enhanced category detection
          if (lowerResponse.includes('shirt') || lowerResponse.includes('t-shirt') || lowerResponse.includes('blouse') || lowerResponse.includes('sweater')) {
            tags = ["top", "casual"];
            attributes = { color: "unknown", category: "tops", brand: "unknown" };
          } else if (lowerResponse.includes('pants') || lowerResponse.includes('jeans') || lowerResponse.includes('trousers') || lowerResponse.includes('leggings')) {
            tags = ["pants", "casual", "bottom"];
            attributes = { color: "unknown", category: "bottoms", brand: "unknown" };
          } else if (lowerResponse.includes('dress') || lowerResponse.includes('gown')) {
            tags = ["dress", "casual"];
            attributes = { color: "unknown", category: "dresses", brand: "unknown" };
          } else if (lowerResponse.includes('shoes') || lowerResponse.includes('sneakers') || lowerResponse.includes('boots') || lowerResponse.includes('heels')) {
            tags = ["shoes", "casual"];
            attributes = { color: "unknown", category: "shoes", brand: "unknown" };
          } else if (lowerResponse.includes('jacket') || lowerResponse.includes('coat') || lowerResponse.includes('hoodie')) {
            tags = ["outerwear", "casual"];
            attributes = { color: "unknown", category: "outerwear", brand: "unknown" };
          } else if (lowerResponse.includes('hat') || lowerResponse.includes('cap') || lowerResponse.includes('beanie')) {
            tags = ["accessory", "hat"];
            attributes = { color: "unknown", category: "accessories", brand: "unknown" };
          }
          
          // Brand detection from text analysis
          const brandKeywords = {
            'nike': ['nike', 'swoosh'],
            'adidas': ['adidas', 'three stripes'],
            'trapstar': ['trapstar', 'trap star'],
            'supreme': ['supreme'],
            'off-white': ['off-white', 'off white'],
            'balenciaga': ['balenciaga'],
            'gucci': ['gucci'],
            'louis vuitton': ['louis vuitton', 'lv'],
            'puma': ['puma'],
            'reebok': ['reebok'],
            'converse': ['converse', 'chuck'],
            'vans': ['vans'],
            'new balance': ['new balance', 'nb'],
            'jordan': ['jordan', 'air jordan'],
            'yeezy': ['yeezy'],
            'palace': ['palace'],
            'stussy': ['stussy'],
            'carhartt': ['carhartt'],
            'north face': ['north face', 'tnf'],
            'patagonia': ['patagonia']
          };
          
          for (const [brand, keywords] of Object.entries(brandKeywords)) {
            if (keywords.some(keyword => lowerResponse.includes(keyword))) {
              attributes.brand = brand;
              break;
            }
          }
        
        // Color detection
        const colorKeywords = {
          'blue': ['blue', 'navy', 'denim'],
          'black': ['black', 'dark'],
          'white': ['white', 'cream', 'ivory'],
          'red': ['red', 'burgundy', 'maroon'],
          'green': ['green', 'olive', 'emerald'],
          'yellow': ['yellow', 'gold'],
          'pink': ['pink', 'rose'],
          'purple': ['purple', 'violet', 'lavender'],
          'brown': ['brown', 'tan', 'beige'],
          'gray': ['gray', 'grey', 'silver']
        };
        
        for (const [color, keywords] of Object.entries(colorKeywords)) {
          if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            attributes.color = color;
            break;
          }
        }
        
        console.log('Using intelligent fallback analysis:', { tags, attributes });
      }
    }

    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.split(" ")[1];
      const { data: userData } = await supabase.auth.getUser(jwt);
      userId = userData.user?.id;
    }

    let insertedId: string | undefined;
    if (userId) {
      const { data, error } = await supabase
        .from("trendza_closet_items")
        .insert({ user_id: userId, source_image_url: null, title, brand, category: attributes.category, color: attributes.color, tags, attributes })
        .select("id")
        .single();
      if (!error) insertedId = data?.id;
    }

    return new Response(JSON.stringify({ tags, attributes, itemId: insertedId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('Closet tagger error:', e);
    return new Response(JSON.stringify({ error: "Tagging failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

console.log("Trendza closet-tagger function ready");

