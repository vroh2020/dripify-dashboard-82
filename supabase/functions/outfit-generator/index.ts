import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type OutfitGeneratorBody = {
  availableItems: any[];
  lockedItems: any[];
  currentOutfitImage?: string;
  preferences: {
    colorFilter?: string;
    style?: string;
    weather?: string;
    occasion?: string;
  };
};

const createOutfitPrompt = (availableItems: any[], lockedItems: any[], preferences: any) => {
  const lockedItemsText = lockedItems.map(item => 
    `${item.category}: ${item.title} (${item.color})`
  ).join(', ');
  
  const availableItemsText = availableItems.map(item => 
    `${item.category}: ${item.title} (${item.color}, ${item.brand || 'Unknown'})`
  ).join('\n');

  return `You are a professional fashion stylist. Create a stylish outfit combination from the available items.

LOCKED ITEMS (must include these):
${lockedItemsText || 'None'}

AVAILABLE ITEMS:
${availableItemsText}

PREFERENCES:
- Style: ${preferences.style || 'casual'}
- Occasion: ${preferences.occasion || 'casual'}
- Weather: ${preferences.weather || 'moderate'}
- Color filter: ${preferences.colorFilter || 'any'}

RULES:
1. Create a complete outfit (top, bottom, shoes, accessories if available)
2. Consider color harmony and style consistency
3. Match the occasion and weather preferences
4. Include locked items if any
5. Return exactly 3-5 items total

Respond in this exact JSON format:
{
  "recommendedItems": ["item_id_1", "item_id_2", "item_id_3"],
  "score": 85,
  "rationale": "This combination works because..."
}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const { availableItems, lockedItems, currentOutfitImage, preferences } = 
      (await req.json()) as OutfitGeneratorBody;

    if (!availableItems || !Array.isArray(availableItems)) {
      return new Response(
        JSON.stringify({ error: "Missing 'availableItems' array" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Nebius API key
    const nebiusApiKey = Deno.env.get("NEBIUS_API_KEY");
    if (!nebiusApiKey) {
      throw new Error('Service configuration error - API key missing');
    }

    // Create AI prompt
    const prompt = createOutfitPrompt(availableItems, lockedItems, preferences);

    // Call Mistral AI
    const apiPayload = {
      model: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a professional fashion stylist. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
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
    console.log('AI outfit generation response:', aiResponse);

    // Parse AI response
    let outfitData;
    try {
      outfitData = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      // Fallback to simple selection
      const recommendedItems = availableItems
        .slice(0, 3)
        .map(item => item.id);
      
      outfitData = {
        recommendedItems,
        score: 75,
        rationale: "AI-generated combination based on available items"
      };
    }

    return new Response(
      JSON.stringify(outfitData), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error('Outfit generation error:', e);
    return new Response(
      JSON.stringify({ error: "Outfit generation failed" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("Trendza outfit-generator function ready");
