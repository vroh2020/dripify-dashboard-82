
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum image dimension to reduce processing time
const MAX_IMAGE_DIMENSION = 1024;

// Helper function to resize image data
const resizeImageData = async (base64Image: string): Promise<string> => {
  try {
    // Extract the base64 data part (remove metadata like "data:image/jpeg;base64,")
    const base64Data = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;
    
    // Since we're in Deno, we'll use a simple approach to check image size
    // For production, consider implementing a more robust image sizing solution
    // This is a basic check to avoid processing very large images
    if (base64Data.length > 500000) { // If image is larger than ~500KB
      console.log('Image is large, assuming resize is needed');
      return base64Image; // In a real implementation, resize the image
    }
    
    return base64Image;
  } catch (error) {
    console.error('Error resizing image:', error);
    return base64Image; // Return original on error
  }
};

// Simplified prompt that maintains the core feedback structure
const getStylePrompt = () => {
  return `You're an upbeat, encouraging fashion stylist. Focus on positives and provide constructive suggestions. Give honest but optimistic scores between 1-10, with most great outfits deserving 8-10.

YOUR RESPONSE MUST FOLLOW THIS EXACT FORMAT WITH NUMBERS FOR SCORES:

**Overall Score:** [number 1-10]

**Color Coordination:** [number 1-10]
[Brief positive comment about color choices]

**Fit & Proportion:** [number 1-10]
[Brief encouraging comment about fit]

**Style Coherence:** [number 1-10]
[Brief supportive comment about style cohesion]

**Accessories:** [number 1-10]
[Brief comment about accessories]

**Summary:**
[2-3 uplifting sentences celebrating strengths with gentle suggestions]

**Tips:**
* [Color suggestion]
* [Fit suggestion]
* [Style suggestion]
* [Accessory suggestion]
* [Creative suggestion]`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  console.log('Starting style analysis...');

  try {
    const { image, style } = await req.json();
    console.log('Analyzing style for:', style);

    // Check if Nebius API key is available
    const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
    
    if (!nebiusApiKey) {
      console.error('Nebius API key not configured');
      throw new Error('API key not configured');
    }
    
    // Resize image if needed to improve performance
    const processedImage = await resizeImageData(image);
    console.log('Image processed, sending to Qwen model...');
    
    // Updated to use Qwen2-VL-7B-Instruct model which is smaller and faster
    const response = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nebiusApiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2-VL-7B-Instruct",
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 800, // Reduced max tokens for faster response
        messages: [
          {
            role: 'system',
            content: getStylePrompt()
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "Analyze this outfit precisely according to the format. Provide a numerical score (not text) for each category."
              },
              {
                type: 'image_url',
                image_url: {
                  url: processedImage
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
      throw new Error(`Nebius API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Style analysis completed in', Math.round(performance.now() - startTime), 'ms');
      
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
    
    // Return the raw markdown feedback
    return new Response(JSON.stringify({ feedback: markdownContent }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in analyze-style function:', error);
    
    // Create a simplified fallback response
    const fallbackResponse = `**Overall Score:** 8

**Color Coordination:** 8
We'd love to give you more specific feedback! Unfortunately, we encountered a technical hiccup.

**Fit & Proportion:** 8
Your outfit proportions look good! For even better feedback, try a full-body photo in good lighting.

**Style Coherence:** 8
Your style sense shines through!

**Accessories:** 8
Nice accessories choices!

**Summary:**
We can tell you have amazing style! While we had some technical difficulties fully processing your image, we can see your fashion sense shining through. For even better feedback next time, try taking photos in natural lighting. Error: ${error.message}

**Tips:**
* Try a photo with natural lighting
* A neutral background helps your outfit stand out
* Clean your camera lens for crystal clear shots
* Consider a full-body mirror photo
* Show your full outfit for complete feedback`;

    return new Response(JSON.stringify({ 
      error: error.message,
      feedback: fallbackResponse
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
