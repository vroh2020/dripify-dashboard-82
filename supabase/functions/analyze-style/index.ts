
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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
    const { image, style } = await req.json();

    if (!image) {
      throw new Error('No image provided');
    }

    console.log('Processing style analysis request...');

    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    if (!nebiusApiKey) {
      throw new Error('API key not configured');
    }

    const prompt = `You are an expert fashion stylist. Analyze this outfit and provide detailed feedback in markdown format.

Rate the outfit in these categories (1-100):

**Overall Score:** [score]
**Color Coordination:** [score]
**Fit & Proportion:** [score] 
**Style Coherence:** [score]
**Accessories:** [score]
**Creativity:** [score]
**Trend Awareness:** [score]

Then provide specific improvement suggestions for each category.

Focus on: ${style || 'general'} style`;

    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it",
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const markdownContent = data.choices[0].message.content;

    // Extract overall score
    const scoreMatch = markdownContent.match(/\*\*Overall Score:\*\*\s*(\d+)/);
    const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    return new Response(JSON.stringify({ 
      feedback: markdownContent,
      overallScore
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

console.log('Style Analysis Edge Function is running...');
