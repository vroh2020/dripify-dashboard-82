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

    // Check if Nebius API key is available
    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    
    if (!nebiusApiKey) {
      console.error('Nebius API key not configured');
      throw new Error('API key not configured');
    }
    
    // Updated prompt to be more positive and encouraging
    const stylePrompt = `You're an upbeat, encouraging fashion stylist who loves helping people feel confident about their outfits. Focus on the positives and provide constructive suggestions with warmth and enthusiasm. Give honest but optimistic scores between 1-10, with most great outfits deserving 8-10.

YOUR RESPONSE MUST FOLLOW THIS EXACT FORMAT WITH NUMBERS FOR SCORES:

**Overall Score:** [number 1-10]

**Color Coordination:** [number 1-10]
[2-3 positive sentences about color choices, highlighting what works well]

**Fit & Proportion:** [number 1-10]
[2-3 encouraging sentences about fit and proportion, focusing on strengths]

**Style Coherence:** [number 1-10]
[2-3 supportive sentences about style cohesion, emphasizing successful elements]

**Accessories:** [number 1-10]
[2-3 enthusiastic sentences about accessories, noting creative choices]

**Outfit Creativity:** [number 1-10]
[2-3 appreciative sentences about creativity, highlighting unique aspects]

**Trend Awareness:** [number 1-10]
[2-3 positive sentences about trend alignment, noting modern touches]

**Summary:**
[3-4 uplifting sentences celebrating the outfit's strengths with gentle suggestions]

**Color Coordination Tips:**
* [Friendly suggestion]
* [Encouraging tip]
* [Positive recommendation]

**Fit & Proportion Tips:**
* [Supportive suggestion]
* [Constructive tip]
* [Helpful recommendation]

**Style Coherence Tips:**
* [Enthusiastic suggestion]
* [Positive tip]
* [Encouraging recommendation]

**Accessories Tips:**
* [Creative suggestion]
* [Fun tip]
* [Inspiring recommendation]

**Outfit Creativity Tips:**
* [Exciting suggestion]
* [Encouraging tip]
* [Supportive recommendation]

**Trend Awareness Tips:**
* [Modern suggestion]
* [Fresh tip]
* [Contemporary recommendation]

**Next Level Tips:**
* [Exciting advanced tip]
* [Inspiring suggestion]
* [Creative recommendation]
* [Fun enhancement idea]

IMPORTANT:
- Score MUST be a NUMBER between 1-10 (not text)
- Be generous with scores for well-put-together outfits (8-10)
- Reserve lower scores (1-5) only for outfits with significant room for improvement
- Focus on positives first, then gentle suggestions
- Be warm and encouraging in all feedback
- Use upbeat, positive language
- Start directly with "**Overall Score:**"`;

    console.log('Calling Nebius API with Gemma for style analysis...');
    
    // Call the Nebius API with Gemma model instead of Qwen
    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it",
        temperature: 0.7,
        top_p: 0.9,
        top_k: 50,
        max_tokens: 1000,
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
                text: "Analyze this outfit precisely according to the format. Provide a numerical score (not text) for each category and make sure feedback is specific and actionable."
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nebius API error:', errorText);
      throw new Error(`Nebius API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Style analysis completed');
      
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response format from Nebius API');
      throw new Error('Invalid response format from Nebius API');
    }

    // Extract the content
    const markdownContent = data.choices[0].message.content;
    
    // Verify the response has numerical scores before returning
    const overallScoreMatch = markdownContent.match(/\*\*Overall Score:\*\*\s*(\d+)/);
    if (!overallScoreMatch) {
      console.error('Response does not contain a valid Overall Score');
      throw new Error('Invalid response format: Missing numerical Overall Score');
    }
    
    // Verify all required categories have numerical scores
    const requiredCategories = [
      "Color Coordination", 
      "Fit & Proportion", 
      "Style Coherence", 
      "Accessories", 
      "Outfit Creativity", 
      "Trend Awareness"
    ];
    
    let missingCategories = [];
    for (const category of requiredCategories) {
      const regex = new RegExp(`\\*\\*${category}:\\*\\*\\s*(\\d+)`, 'i');
      if (!regex.test(markdownContent)) {
        missingCategories.push(category);
      }
    }
    
    if (missingCategories.length > 0) {
      console.error(`Response missing scores for categories: ${missingCategories.join(', ')}`);
      throw new Error(`Invalid response format: Missing numerical scores for ${missingCategories.join(', ')}`);
    }
    
    console.log('Analysis content sample:', markdownContent.substring(0, 100) + '...');
    
    // Return the raw markdown feedback
    return new Response(JSON.stringify({ feedback: markdownContent }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    // Create a more encouraging fallback response
    const fallbackResponse = `**Overall Score:** 8

**Color Coordination:** 8
We'd love to give you more specific feedback about your wonderful color choices! Unfortunately, we encountered a small technical hiccup. Try uploading another photo in natural lighting to get our full enthusiasm about your style!

**Fit & Proportion:** 8
We can tell you've put thought into your outfit proportions! For even better feedback, try a full-body photo in good lighting.

**Style Coherence:** 8
Your style sense shines through! For even more detailed appreciation of your outfit, try a photo with natural lighting.

**Accessories:** 8
We caught glimpses of your great accessory choices! A clear photo will help us celebrate your styling even more.

**Outfit Creativity:** 8
Your creative spirit is evident! We'd love to see more details in better lighting to fully appreciate your unique style.

**Trend Awareness:** 8
You're definitely fashion-forward! Share another photo so we can highlight all the trendy elements we know you've incorporated.

**Summary:**
We can tell you have amazing style! While we had some technical difficulties fully processing your image, we can see your fashion sense shining through. For even better feedback next time, try taking photos in natural lighting - we'd love to celebrate all the details of your awesome outfit! Error: ${error.message}

**Color Coordination Tips:**
* Natural lighting is your best friend for showing off your color combinations
* Try photographing against a neutral background to let your choices pop
* We'd love to see your full outfit in clear lighting!

**Fit & Proportion Tips:**
* A full-body mirror selfie helps us see your great proportions
* Natural light brings out the best in outfit photos
* Clear shots help us celebrate your styling choices

**Style Coherence Tips:**
* Try different angles to showcase your cohesive look
* Good lighting helps us see your style vision
* We'd love to see every detail of your outfit

**Accessories Tips:**
* Clear photos help us appreciate your accessory game
* Natural light makes your accessories sparkle
* We want to see all your creative choices!

**Outfit Creativity Tips:**
* Better lighting will let your creativity shine
* We'd love to see all your unique styling choices
* Your personal style deserves to be seen clearly

**Trend Awareness Tips:**
* Clear photos help us spot your trendy elements
* Natural light shows off your fashion-forward choices
* We want to celebrate your style knowledge!

**Next Level Tips:**
* Use a timer for perfect outfit photos
* Natural daylight is the best for fashion photos
* Clean your camera lens for crystal clear shots
* Find a spot with consistent lighting`;

    return new Response(JSON.stringify({ 
      error: error.message,
      feedback: fallbackResponse
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
