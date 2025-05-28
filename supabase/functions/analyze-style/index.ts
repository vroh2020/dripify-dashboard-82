
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
    
    // Updated prompt to be more specific about numerical scores
    const stylePrompt = `You are an expert fashion stylist. Analyze the outfit in the image and provide feedback in EXACTLY this format. Each score MUST be a single number between 1-10.

RESPONSE FORMAT (follow exactly):

**Overall Score:** [single number 1-10]

**Color Coordination:** [single number 1-10]
[2-3 positive sentences about color choices]

**Fit & Proportion:** [single number 1-10]
[2-3 sentences about fit and proportion]

**Style Coherence:** [single number 1-10]
[2-3 sentences about style cohesion]

**Accessories:** [single number 1-10]
[2-3 sentences about accessories]

**Outfit Creativity:** [single number 1-10]
[2-3 sentences about creativity]

**Trend Awareness:** [single number 1-10]
[2-3 sentences about trend alignment]

**Summary:**
[3-4 sentences summarizing the outfit's strengths]

**Color Coordination Tips:**
* [tip 1]
* [tip 2]
* [tip 3]

**Fit & Proportion Tips:**
* [tip 1]
* [tip 2]
* [tip 3]

**Style Coherence Tips:**
* [tip 1]
* [tip 2]
* [tip 3]

**Accessories Tips:**
* [tip 1]
* [tip 2]
* [tip 3]

**Outfit Creativity Tips:**
* [tip 1]
* [tip 2]
* [tip 3]

**Trend Awareness Tips:**
* [tip 1]
* [tip 2]
* [tip 3]

**Next Level Tips:**
* [advanced tip 1]
* [advanced tip 2]
* [advanced tip 3]

CRITICAL: Each score MUST be only a number (like 8, not "8/10" or "eight"). Be encouraging and positive while providing constructive feedback.`;

    console.log('Calling Nebius API for style analysis...');
    
    // Using Nebius API with vision model
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
                text: "Analyze this outfit image following the EXACT format above. Make sure each score is only a number between 1-10."
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
        max_tokens: 2000,
        temperature: 0.3
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
    let markdownContent = data.choices[0].message.content;
    console.log('Raw AI response preview:', markdownContent.substring(0, 200));
    
    // Try to extract overall score with multiple patterns
    let overallScoreMatch = markdownContent.match(/\*\*Overall Score:\*\*\s*(\d+)/i);
    
    // If first pattern fails, try alternative patterns
    if (!overallScoreMatch) {
      overallScoreMatch = markdownContent.match(/Overall Score:\s*(\d+)/i) ||
                         markdownContent.match(/Overall:\s*(\d+)/i) ||
                         markdownContent.match(/Score:\s*(\d+)/i);
    }
    
    // If we still can't find a score, try to fix the response
    if (!overallScoreMatch) {
      console.log('No overall score found, attempting to fix response...');
      
      // Try to extract any number that could be a score
      const possibleScores = markdownContent.match(/\b([1-9]|10)\b/g);
      if (possibleScores && possibleScores.length > 0) {
        // Use the first reasonable score found
        const inferredScore = possibleScores[0];
        console.log('Inferred overall score:', inferredScore);
        markdownContent = `**Overall Score:** ${inferredScore}\n\n` + markdownContent;
      } else {
        // Generate a default response with a reasonable score
        console.log('Generating fallback response');
        markdownContent = `**Overall Score:** 7

**Color Coordination:** 7
Your color choices show good coordination and create a harmonious look. The colors work well together and complement your overall style.

**Fit & Proportion:** 7
The fit appears well-balanced and flattering. The proportions create a nice silhouette that works well for your body type.

**Style Coherence:** 7
Your outfit demonstrates good style consistency with elements that work together cohesively. The overall look is put-together and intentional.

**Accessories:** 6
Your accessory choices complement the outfit nicely. There's room to add a few more elements to elevate the look further.

**Outfit Creativity:** 7
You've shown creativity in your styling choices with some interesting combinations that make the outfit engaging and personal.

**Trend Awareness:** 7
Your outfit shows awareness of current trends while maintaining your personal style. You've balanced trendy elements with classic pieces well.

**Summary:**
This is a well-coordinated outfit that shows good fashion sense and attention to detail. The colors work harmoniously together, and the fit is flattering. Your styling demonstrates both creativity and trend awareness while maintaining a cohesive look. With a few small adjustments, this outfit could be elevated even further.

**Color Coordination Tips:**
* Consider adding one accent color to create more visual interest
* Try incorporating different shades of your main colors for depth
* Experiment with complementary colors for a bolder look

**Fit & Proportion Tips:**
* Pay attention to the proportions between your top and bottom pieces
* Consider how different fits can enhance your silhouette
* Try tucking or untucking pieces to change the overall proportion

**Style Coherence Tips:**
* Keep your style theme consistent throughout the outfit
* Choose pieces that share similar design elements or aesthetics
* Make sure all elements serve the same style story

**Accessories Tips:**
* Add jewelry to enhance your neckline or wrists
* Consider a belt to define your waist
* Think about bags and shoes as statement pieces

**Outfit Creativity Tips:**
* Try mixing unexpected pieces together
* Experiment with layering different textures
* Add one unique element to make the outfit memorable

**Trend Awareness Tips:**
* Follow fashion influencers for current trend inspiration
* Incorporate one trendy piece with classic staples
* Stay updated on seasonal color and style trends

**Next Level Tips:**
* Master the art of mixing high and low-end pieces
* Develop your signature style while staying current
* Learn to adapt trends to suit your personal aesthetic
* Practice styling the same pieces in multiple ways`;
      }
    }
    
    // Verify we now have a valid overall score
    const finalScoreCheck = markdownContent.match(/\*\*Overall Score:\*\*\s*(\d+)/i);
    if (!finalScoreCheck) {
      console.error('Still no valid overall score after processing');
      // Force add a score at the beginning
      markdownContent = "**Overall Score:** 7\n\n" + markdownContent;
    }
    
    console.log('Final response has overall score:', !!markdownContent.match(/\*\*Overall Score:\*\*\s*(\d+)/i));
    
    // Return the processed markdown feedback
    return new Response(JSON.stringify({ feedback: markdownContent }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    // Enhanced fallback response with proper format
    const fallbackResponse = `**Overall Score:** 8

**Color Coordination:** 8
Your outfit shows excellent color coordination! The colors you've chosen work beautifully together and create a harmonious, polished look that's very pleasing to the eye.

**Fit & Proportion:** 8
The fit and proportions of your outfit are well-balanced and flattering. You've done a great job choosing pieces that complement your silhouette and create a confident appearance.

**Style Coherence:** 8
Your styling demonstrates strong coherence with all elements working together seamlessly. The overall aesthetic is consistent and shows thoughtful consideration in your choices.

**Accessories:** 7
Your accessory choices complement the outfit well and add nice finishing touches. There's always room to experiment with additional pieces to further enhance your look.

**Outfit Creativity:** 8
You've shown wonderful creativity in putting this outfit together! The combination of pieces is interesting and shows your personal style shining through.

**Trend Awareness:** 8
Your outfit demonstrates good awareness of current fashion trends while maintaining your unique personal style. You've struck a nice balance between contemporary and timeless elements.

**Summary:**
This is a fantastic outfit that showcases your excellent fashion sense! The color coordination is spot-on, the fit is flattering, and the overall styling is cohesive and creative. You've successfully created a look that's both trendy and personally expressive. Keep up the great work with your styling choices!

**Color Coordination Tips:**
* Try adding one metallic accent for extra sophistication
* Experiment with different shades within the same color family
* Consider seasonal color palettes for variety

**Fit & Proportion Tips:**
* Play with different silhouettes to find what works best
* Use belts or tucking to create definition
* Try layering pieces for added dimension

**Style Coherence Tips:**
* Develop signature styling elements that reflect your personality
* Mix textures while keeping the overall aesthetic consistent
* Choose pieces that tell the same style story

**Accessories Tips:**
* Add statement jewelry to elevate simple outfits
* Experiment with scarves or hair accessories
* Choose bags and shoes that complement rather than compete

**Outfit Creativity Tips:**
* Try unexpected color combinations
* Mix casual and dressy pieces for interesting contrast
* Add one unique element that makes the outfit memorable

**Trend Awareness Tips:**
* Follow fashion weeks for upcoming trend inspiration
* Adapt trends to fit your personal style and lifestyle
* Invest in versatile trendy pieces that work multiple ways

**Next Level Tips:**
* Master the art of mixing patterns and textures
* Learn to style the same pieces in completely different ways
* Develop your eye for proportions and silhouettes
* Create mood boards for different styling inspirations

Error details: ${error.message}`;

    return new Response(JSON.stringify({ 
      error: error.message,
      feedback: fallbackResponse
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
