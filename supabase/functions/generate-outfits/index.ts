import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Category normalization function (handles case-insensitive and variations)
function normalizeCategory(cat: string | undefined): string {
  if (!cat) return 'other';
  const normalized = cat.toLowerCase().trim();
  // Handle common variations
  if (normalized.includes('top') || normalized === 'shirt' || normalized === 'blouse') return 'tops';
  if (normalized.includes('bottom') || normalized === 'pants' || normalized === 'jeans' || normalized === 'shorts' || normalized === 'skirt') return 'bottoms';
  if (normalized.includes('shoe') || normalized === 'sneaker' || normalized === 'boot') return 'shoes';
  return normalized;
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

// STRICT Fashion AI with category enforcement
const OUTFIT_GENERATION_PROMPT = `You are a professional fashion stylist AI. Your job is to create COMPLETE, WEARABLE outfits that match the user's request.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:

1. EVERY SINGLE OUTFIT MUST INCLUDE THESE 3 REQUIRED ITEMS (NO EXCEPTIONS):
   - EXACTLY ONE item from category "tops" (shirt, t-shirt, blouse, sweater, jacket, hoodie, etc.)
   - EXACTLY ONE item from category "bottoms" (pants, jeans, shorts, skirt, etc.)
   - EXACTLY ONE item from category "shoes" (sneakers, boots, dress shoes, sandals, etc.)

2. STEP-BY-STEP PROCESS FOR EACH OUTFIT:
   Step 1: Look at the TOPS section and pick ONE top that matches the occasion
   Step 2: Look at the BOTTOMS section and pick ONE bottom that matches the occasion
   Step 3: Look at the SHOES section and pick ONE pair of shoes that matches the occasion
   Step 4: Verify you have exactly 1 top + 1 bottom + 1 shoes
   Step 5: Only then add optional accessories if they enhance the outfit

3. OPTIONAL categories (ONLY add if they enhance):
   - Accessories (hats, bags, jewelry) - ONLY if they make sense
   - Outerwear (coats, jackets) - ONLY if weather/occasion requires it

4. NEVER DO THIS:
   - Create an outfit without a top (THIS IS FORBIDDEN)
   - Create an outfit without a bottom (THIS IS FORBIDDEN)
   - Create an outfit without shoes (THIS IS FORBIDDEN)
   - Include multiple items from the same category
   - Include items that don't match the occasion

5. OCCASION MATCHING:
   - "formal" = dress shirt/blazer + dress pants + dress shoes (NO casual items like t-shirts or sneakers)
   - "casual" = t-shirt/jeans/sneakers (relaxed, comfortable)
   - "date night" = stylish, put-together, slightly elevated
   - "work" = professional, appropriate for office
   - "party" = bold, fun, statement pieces
   - "workout" = athletic wear only

6. VALIDATION CHECKLIST (check each outfit before including it):
   ✓ Has exactly 1 item from "tops" category? (REQUIRED - CHECK THIS FIRST)
   ✓ Has exactly 1 item from "bottoms" category? (REQUIRED)
   ✓ Has exactly 1 item from "shoes" category? (REQUIRED)
   ✓ Matches the occasion? (REQUIRED)
   ✓ Colors/style work together? (REQUIRED)
   ✓ No duplicate categories? (REQUIRED)

Output ONLY this JSON format (NO other text, NO explanations):
{
  "outfits": [
    {
      "id": "outfit_1",
      "item_ids": ["top_id_from_tops_section", "bottom_id_from_bottoms_section", "shoes_id_from_shoes_section"],
      "score": 85,
      "rationale": "Brief explanation",
      "style_notes": ["formal", "professional"]
    }
  ]
}

REMEMBER: Every outfit MUST have 1 top + 1 bottom + 1 shoes. If you cannot find items in all 3 categories, DO NOT create that outfit. Generate 2-3 complete outfits only.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  const startTime = Date.now();

  try {
    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(clientId)) {
      console.warn('Rate limit hit:', clientId);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { occasion, closet_items } = await req.json();
    
    if (!occasion || !closet_items || !Array.isArray(closet_items)) {
      console.error('Missing params');
      return new Response(
        JSON.stringify({ error: 'Missing required: occasion and closet_items' }),
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

    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    if (!nebiusApiKey) {
      console.error('API key missing');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Organize items by category (using normalized categories)
    const itemsByCategory = closet_items.reduce((acc: any, item: any) => {
      const cat = normalizeCategory(item.category);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    // Log category distribution for debugging
    console.log('Category distribution:', {
      tops: itemsByCategory.tops?.length || 0,
      bottoms: itemsByCategory.bottoms?.length || 0,
      shoes: itemsByCategory.shoes?.length || 0,
      other: Object.keys(itemsByCategory).filter(k => !['tops', 'bottoms', 'shoes'].includes(k)).length
    });

    // Context with user's ACTUAL REQUEST and organized item details
    const contextPrompt = `USER'S REQUEST: "${occasion}"

AVAILABLE CLOSET ITEMS (organized by category):

TOPS (${itemsByCategory.tops?.length || 0} available):
${(itemsByCategory.tops || []).map((item: any) => {
  const tags = Array.isArray(item.tags) ? item.tags.join(', ') : 'none';
  const brand = item.brand || 'no brand';
  return `  - [ID: ${item.id}] "${item.title}" | Color: ${item.color || 'unknown'} | Brand: ${brand} | Tags: ${tags}`;
}).join('\n')}

BOTTOMS (${itemsByCategory.bottoms?.length || 0} available):
${(itemsByCategory.bottoms || []).map((item: any) => {
  const tags = Array.isArray(item.tags) ? item.tags.join(', ') : 'none';
  const brand = item.brand || 'no brand';
  return `  - [ID: ${item.id}] "${item.title}" | Color: ${item.color || 'unknown'} | Brand: ${brand} | Tags: ${tags}`;
}).join('\n')}

SHOES (${itemsByCategory.shoes?.length || 0} available):
${(itemsByCategory.shoes || []).map((item: any) => {
  const tags = Array.isArray(item.tags) ? item.tags.join(', ') : 'none';
  const brand = item.brand || 'no brand';
  return `  - [ID: ${item.id}] "${item.title}" | Color: ${item.color || 'unknown'} | Brand: ${brand} | Tags: ${tags}`;
}).join('\n')}

${Object.keys(itemsByCategory).filter(cat => !['tops', 'bottoms', 'shoes'].includes(cat)).length > 0 ? `OTHER ITEMS:
${Object.entries(itemsByCategory)
  .filter(([cat]) => !['tops', 'bottoms', 'shoes'].includes(cat))
  .map((entry) => {
    const [cat, items] = entry as [string, any[]];
    return `${cat.toUpperCase()} (${items.length}):
${items.map((item: any) => {
  const tags = Array.isArray(item.tags) ? item.tags.join(', ') : 'none';
  const brand = item.brand || 'no brand';
  return `  - [ID: ${item.id}] "${item.title}" | Color: ${item.color || 'unknown'} | Brand: ${brand}`;
}).join('\n')}`;
  }).join('\n\n')}` : ''}

INSTRUCTIONS:
1. Generate 2-3 COMPLETE outfits for: "${occasion}"
2. Each outfit MUST include: 1 top + 1 bottom + 1 shoes (REQUIRED)
3. Match the occasion exactly (e.g., if "formal", use formal pieces only)
4. Only add accessories/outerwear if they enhance the outfit
5. Ensure colors and styles work together harmoniously
6. Use the item IDs exactly as shown above`;

    const apiPayload = {
      model: "Qwen/Qwen3-235B-A22B-Instruct-2507", // Proven to work - Quality 92
      temperature: 0.5, // Lower temperature for more consistent, structured output
      max_tokens: 1500, // Increased for better quality and completeness
      messages: [
        { role: "system", content: OUTFIT_GENERATION_PROMPT },
        { role: "user", content: contextPrompt }
      ]
    };

    console.log(`Calling Nebius API (${closet_items.length} items)...`);
    const apiStart = Date.now();
    
    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload),
      signal: AbortSignal.timeout(25000) // 25s timeout
    });

    const apiTime = Date.now() - apiStart;
    console.log(`Nebius responded in ${apiTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nebius error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'AI service error', 
          details: `Status ${response.status}` 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const generationContent = data.choices[0].message.content;

    // Parse JSON with thinking tag handling
    let generationResult;
    try {
      console.log('Raw AI response length:', generationContent.length);
      
      let jsonString = generationContent;
      
      // Kimi-K2 may include <think> tags - remove them
      if (jsonString.includes('<think>') || jsonString.includes('</think>')) {
        console.log('Removing thinking tags...');
        // Extract everything AFTER the closing </think> tag
        const thinkEndIndex = jsonString.lastIndexOf('</think>');
        if (thinkEndIndex !== -1) {
          jsonString = jsonString.substring(thinkEndIndex + 8).trim();
        }
      }
      
      // Remove markdown code blocks
      if (jsonString.includes('```json')) {
        jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      } else if (jsonString.includes('```')) {
        jsonString = jsonString.replace(/```\s*/g, '');
      }
      
      // Extract JSON object
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      
      jsonString = jsonString.trim();
      
      generationResult = JSON.parse(jsonString);
      console.log('✓ JSON parsed successfully, outfits:', generationResult.outfits?.length || 0);
      
    } catch (parseError: any) {
      console.error('JSON parse failed:', parseError.message);
      console.error('Content preview:', generationContent.substring(0, 300));
      
      const fallbackOutfit = createFallbackOutfit(closet_items, occasion);
      generationResult = {
        outfits: [fallbackOutfit],
        fallback: true
      };
    }

    if (!generationResult.outfits || !Array.isArray(generationResult.outfits)) {
      throw new Error('Invalid outfit format');
    }

    // Validate and enhance outfits with strict category checking
    const enhancedOutfits = generationResult.outfits
      .map((outfit: any) => {
        const outfitItems = outfit.item_ids
          .map((id: string) => closet_items.find((item: any) => item.id === id))
          .filter(Boolean);

        // Categorize items (with normalized category matching)
        const categories = {
          tops: outfitItems.filter((item: any) => normalizeCategory(item.category) === 'tops'),
          bottoms: outfitItems.filter((item: any) => normalizeCategory(item.category) === 'bottoms'),
          shoes: outfitItems.filter((item: any) => normalizeCategory(item.category) === 'shoes'),
          other: outfitItems.filter((item: any) => {
            const cat = normalizeCategory(item.category);
            return cat && !['tops', 'bottoms', 'shoes'].includes(cat);
          })
        };

        // Log what categories were found for debugging
        if (!categories.tops.length || !categories.bottoms.length || !categories.shoes.length) {
          console.log('Outfit category breakdown:', {
            itemIds: outfit.item_ids,
            itemCategories: outfitItems.map((i: any) => ({ id: i.id, category: i.category, normalized: normalizeCategory(i.category) })),
            foundTops: categories.tops.length,
            foundBottoms: categories.bottoms.length,
            foundShoes: categories.shoes.length
          });
        }

        // Check if outfit is complete (has required categories)
        const hasTop = categories.tops.length > 0;
        const hasBottom = categories.bottoms.length > 0;
        const hasShoes = categories.shoes.length > 0;
        const isComplete = hasTop && hasBottom && hasShoes;

        // Check for duplicates (multiple items from same category)
        const hasDuplicates = categories.tops.length > 1 || 
                             categories.bottoms.length > 1 || 
                             categories.shoes.length > 1;

        return {
          ...outfit,
          items: outfitItems,
          categories,
          is_complete: isComplete,
          has_duplicates: hasDuplicates,
          missing_categories: [
            !hasTop && 'tops',
            !hasBottom && 'bottoms',
            !hasShoes && 'shoes'
          ].filter(Boolean),
          validation_score: isComplete && !hasDuplicates ? outfit.score : Math.max(0, outfit.score - 30)
        };
      })
      // Filter out incomplete outfits or those with duplicates
      .filter((outfit: any) => {
        const isValid = outfit.is_complete && !outfit.has_duplicates && outfit.items.length >= 3;
        if (!isValid) {
          console.warn(`Filtered invalid outfit:`, {
            hasTop: outfit.categories.tops.length > 0,
            hasBottom: outfit.categories.bottoms.length > 0,
            hasShoes: outfit.categories.shoes.length > 0,
            hasDuplicates: outfit.has_duplicates,
            itemCount: outfit.items.length
          });
        }
        return isValid;
      })
      // Sort by validation score (best outfits first)
      .sort((a: any, b: any) => b.validation_score - a.validation_score);

    const totalTime = Date.now() - startTime;
    
    // If no valid outfits after filtering, create fallback
    if (enhancedOutfits.length === 0) {
      console.warn('No valid outfits generated, creating fallback...');
      const fallbackOutfit = createFallbackOutfit(closet_items, occasion);
      const fallbackEnhanced = {
        ...fallbackOutfit,
        items: fallbackOutfit.item_ids
          .map((id: string) => closet_items.find((item: any) => item.id === id))
          .filter(Boolean),
        is_complete: true,
        has_duplicates: false,
        validation_score: 75
      };
      
      return new Response(JSON.stringify({
        outfits: [fallbackEnhanced],
        total_generated: 1,
        fallback_used: true,
        generation_metadata: {
          occasion,
          timestamp: new Date().toISOString(),
          generation_time_ms: totalTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✓ Generated ${enhancedOutfits.length} valid outfits in ${totalTime}ms`);

    return new Response(JSON.stringify({
      outfits: enhancedOutfits,
      total_generated: enhancedOutfits.length,
      generation_metadata: {
        occasion,
        timestamp: new Date().toISOString(),
        generation_time_ms: totalTime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('Error after', totalTime, 'ms:', error.message);
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function createFallbackOutfit(closetItems: any[], occasion: string) {
  // Filter by category (using normalized categories)
  const tops = closetItems.filter(item => normalizeCategory(item.category) === 'tops');
  const bottoms = closetItems.filter(item => normalizeCategory(item.category) === 'bottoms');
  const shoes = closetItems.filter(item => normalizeCategory(item.category) === 'shoes');
  
  const outfitItems: string[] = [];
  
  // For formal occasions, try to pick more formal pieces
  const isFormal = occasion.toLowerCase().includes('formal') || 
                   occasion.toLowerCase().includes('work') ||
                   occasion.toLowerCase().includes('business');
  
  if (tops.length > 0) {
    // For formal, prefer items with formal tags
    if (isFormal) {
      const formalTop = tops.find((t: any) => 
        t.tags?.some((tag: string) => 
          ['formal', 'dress', 'business', 'professional', 'blazer', 'shirt'].includes(tag.toLowerCase())
        )
      ) || tops[0];
      outfitItems.push(formalTop.id);
    } else {
      outfitItems.push(tops[0].id);
    }
  }
  
  if (bottoms.length > 0) {
    if (isFormal) {
      const formalBottom = bottoms.find((b: any) =>
        b.tags?.some((tag: string) =>
          ['formal', 'dress', 'business', 'professional', 'pants', 'slacks'].includes(tag.toLowerCase())
        )
      ) || bottoms[0];
      outfitItems.push(formalBottom.id);
    } else {
      outfitItems.push(bottoms[0].id);
    }
  }
  
  if (shoes.length > 0) {
    if (isFormal) {
      const formalShoes = shoes.find((s: any) =>
        s.tags?.some((tag: string) =>
          ['formal', 'dress', 'business', 'professional', 'dress shoes', 'oxford'].includes(tag.toLowerCase())
        )
      ) || shoes[0];
      outfitItems.push(formalShoes.id);
    } else {
      outfitItems.push(shoes[0].id);
    }
  }

  return {
    id: "fallback_1",
    item_ids: outfitItems,
    score: 75,
    rationale: `A ${occasion} outfit using your available pieces.`,
    style_notes: isFormal ? ["formal", "professional"] : ["classic", "versatile"],
    missing_items: []
  };
}

console.log('Edge Function ready ✓');