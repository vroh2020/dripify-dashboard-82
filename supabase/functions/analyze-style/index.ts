
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, style } = await req.json();
    console.log('Analyzing style for:', style);
    
    // Simple, fast prompt
    const stylePrompt = `Analyze this outfit and give me a style score from 1-10 and brief feedback. Be encouraging and positive.

Format your response exactly like this:
Score: [number from 1-10]
Feedback: [2-3 sentences of positive, helpful feedback about the outfit]

Keep it simple and fast.`;

    console.log('Calling Nebius API for style analysis...');
    
    const response = await fetch('https://api.studio.nebius.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('NEBIUS_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2-VL-72B-Instruct',
        messages: [
          {
            role: 'system',
            content: stylePrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "Analyze this outfit and give me a score and feedback."
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nebius API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Style analysis completed');
      
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format');
    }

    const content = data.choices[0].message.content;
    console.log('AI response:', content);
    
    // Simple score extraction
    const scoreMatch = content.match(/Score:\s*(\d+)/i) || content.match(/(\d+)\/10/i) || content.match(/\b([1-9]|10)\b/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
    
    // Return simple feedback format
    return new Response(JSON.stringify({ 
      feedback: content,
      score: score 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    // Simple fallback
    const fallbackResponse = `Score: 7
Feedback: Your outfit shows good style sense! The colors work well together and the fit looks great. You've created a nice, cohesive look that's both stylish and appropriate.`;

    return new Response(JSON.stringify({ 
      feedback: fallbackResponse,
      score: 7
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
