import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Enhanced validation function
function validateImageData(image: any): boolean {
  if (!image || typeof image !== 'string') return false;
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;
  const urlPattern = /^https?:\/\/.+\..+$/i;
  return base64Pattern.test(image) || urlPattern.test(image);
}

// Prepare image for Gemini: accepts either a base64 data URI or a plain URL.
// Returns { data: rawBase64, mimeType } ready for inline_data.
async function prepareImageForGemini(image: string): Promise<{ data: string; mimeType: string }> {
  const base64DataUri = /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i;
  const dataUriMatch = image.match(base64DataUri);
  if (dataUriMatch) {
    const ext = dataUriMatch[1].toLowerCase() === 'jpg' ? 'jpeg' : dataUriMatch[1].toLowerCase();
    return { data: dataUriMatch[2], mimeType: `image/${ext}` };
  }
  // Plain URL — fetch, read as ArrayBuffer, convert to base64.
  const imgResponse = await fetch(image);
  if (!imgResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imgResponse.status}`);
  }
  const buffer = await imgResponse.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const rawBase64 = btoa(binary);
  const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
  return { data: rawBase64, mimeType };
}

// ── Raw image data (for server-side cropping) ───────────────────────────

async function getRawImageData(image: string): Promise<{
  rawBytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}> {
  const base64DataUri = /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i;
  const dataUriMatch = image.match(base64DataUri);
  if (dataUriMatch) {
    const base64Data = dataUriMatch[2];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const ext = dataUriMatch[1].toLowerCase() === 'jpg' ? 'jpeg' : dataUriMatch[1].toLowerCase();
    const mimeType = `image/${ext}`;
    const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
    const { width, height } = bitmap;
    bitmap.close();
    return { rawBytes: bytes, mimeType, width, height };
  }
  // Plain URL — fetch.
  const response = await fetch(image);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
  const { width, height } = bitmap;
  bitmap.close();
  return { rawBytes: bytes, mimeType, width, height };
}

// ── Server-side crop ────────────────────────────────────────────────────
// Uses Deno's built-in createImageBitmap + OffscreenCanvas.
// Falls back to null on any failure (caller uses original image).

async function cropImage(
  rawBytes: Uint8Array,
  mimeType: string,
  bbox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): Promise<Uint8Array | null> {
  try {
    // Clamp normalized values to [0, 1] and ensure positive dimensions
    const x = Math.max(0, Math.min(1, bbox.x));
    const y = Math.max(0, Math.min(1, bbox.y));
    const w = Math.max(0.01, Math.min(1, bbox.width));
    const h = Math.max(0.01, Math.min(1, bbox.height));

    // Skip crop if bounding box is essentially the full image (no-op crop)
    if (w > 0.98 && h > 0.98 && x < 0.02 && y < 0.02) return null;

    // Convert normalized coords to pixel coords
    const sx = Math.round(x * imageWidth);
    const sy = Math.round(y * imageHeight);
    const sw = Math.round(w * imageWidth);
    const sh = Math.round(h * imageHeight);

    // Decode full image
    const bitmap = await createImageBitmap(new Blob([rawBytes], { type: mimeType }));
    // Crop the region
    const cropped = await createImageBitmap(bitmap, sx, sy, sw, sh);
    bitmap.close();

    // Re-encode as PNG on an OffscreenCanvas
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) { cropped.close(); return null; }
    ctx.drawImage(cropped, 0, 0);
    cropped.close();

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (e) {
    console.error('❌ Server-side crop failed:', e);
    return null;
  }
}

// ── Upload cropped image to Supabase Storage ────────────────────────────

async function uploadCroppedImage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  croppedBytes: Uint8Array,
): Promise<string | null> {
  try {
    const fileName = `${crypto.randomUUID()}_cropped.png`
    const storagePath = `uploads/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('clipped-closet-items')
      .upload(storagePath, croppedBytes, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Crop upload failed:', uploadError.message)
      return null
    }

    const { data: pubData } = supabase.storage
      .from('clipped-closet-items')
      .getPublicUrl(storagePath)

    return pubData.publicUrl
  } catch (e) {
    console.error('❌ Crop upload error:', e)
    return null
  }
}

// ── Validate + clamp bbox from Gemini ──────────────────────────────────

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseBoundingBox(raw: unknown): BoundingBox | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (
    typeof b.x !== 'number' ||
    typeof b.y !== 'number' ||
    typeof b.width !== 'number' ||
    typeof b.height !== 'number'
  ) return null

  return {
    x: Math.max(0, Math.min(1, b.x)),
    y: Math.max(0, Math.min(1, b.y)),
    width: Math.max(0.01, Math.min(1, b.width)),
    height: Math.max(0.01, Math.min(1, b.height)),
  }
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
5. **Bounding Box**: If the image contains a person, multiple garments, or extra context beyond a single garment, return normalized coordinates (0-1) for a tight crop around ONLY the target garment. If the image is already a clean flat-lay with just the garment, return {x: 0, y: 0, width: 1, height: 1}.

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
  "bounding_box": {
    "x": 0.0,
    "y": 0.0,
    "width": 1.0,
    "height": 1.0
  },
  "confidence": 0.95
}

Be accurate and specific. If uncertain about any field, use null or provide your best estimate with lower confidence. The bounding_box coordinates are normalized fractions of the image's total width/height.`;

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

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment');
      throw new Error('Service configuration error - API key missing');
    }

    // Prepare image for Gemini (fetch URL → base64 if needed, strip data URI prefix)
    console.log('🖼️ Preparing image for Gemini...');
    const { data: imageBase64, mimeType } = await prepareImageForGemini(image);

    // Build Gemini native payload — no separate system role, prepend prompt into text part
    const apiPayload = {
      contents: [
        {
          parts: [
            {
              text: `${CLOSET_ANALYSIS_PROMPT}\n\nPlease analyze this clothing item and provide the structured information.`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3
      }
    };

    console.log('🚀 Calling Gemini API for closet item analysis...');
    console.log('📝 Request details:', {
      model: 'gemini-flash-latest',
      mimeType,
      imageBase64Length: imageBase64.length
    });

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'X-goog-api-key': geminiApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload),
        signal: AbortSignal.timeout(30000)
      }
    );

    // ── Handle Gemini 429 (daily quota / rate limit) gracefully ───────────
    if (response.status === 429) {
      const errorText = await response.text();
      console.error('❌ Gemini 429 (quota exceeded):', errorText);
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          message: 'Classification is temporarily at capacity, please try again in a few minutes.',
          retryable: true,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      let errorMessage = `AI service error (${response.status}): ${errorText.substring(0, 200)}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error?.message) {
          errorMessage = `AI service error (${response.status}): ${errorJson.error.message}`;
        }
      } catch {
        // ignore parse errors on error body
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid response from AI service');
    }

    const analysisContent = data.candidates[0].content.parts[0].text;
    console.log('Raw analysis response:', analysisContent);

    // Parse JSON response
    let analysisResult: Record<string, unknown>;
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
        bounding_box: null,
        confidence: 0.5
      };
    }

    // Validate and clean the result - enforce 4 main categories only
    const validCategories = ['tops', 'bottoms', 'shoes', 'accessories'];
    if (!validCategories.includes(analysisResult.category as string)) {
      // Smart fallback based on common clothing types
      const categoryLower = ((analysisResult.category as string) || '').toLowerCase();
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
    analysisResult.suggestedTags = (analysisResult.suggestedTags as string[]).slice(0, 8);

    // ── Server-side crop using Gemini's bounding_box ─────────────────────
    // Runs AFTER category validation so the classification result is solid
    // before we spend compute on pixel manipulation.
    let croppedImageUrl: string | null = null;
    const rawBbox = analysisResult.bounding_box;
    const bbox = parseBoundingBox(rawBbox);

    if (bbox) {
      try {
        console.log('📐 Gemini bounding box:', bbox);
        const rawData = await getRawImageData(image);
        const croppedBytes = await cropImage(
          rawData.rawBytes,
          rawData.mimeType,
          bbox,
          rawData.width,
          rawData.height,
        );

        if (croppedBytes) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          if (supabaseUrl && supabaseKey) {
            const authHeader = req.headers.get('authorization');
            let userId = 'anonymous';
            if (authHeader) {
              const jwt = authHeader.replace(/^bearer\s+/i, '').trim();
              if (jwt) {
                const sb = createClient(supabaseUrl, supabaseKey);
                const { data: userData } = await sb.auth.getUser(jwt);
                if (userData?.user) userId = userData.user.id;
              }
            }
            const sb = createClient(supabaseUrl, supabaseKey);
            croppedImageUrl = await uploadCroppedImage(sb, userId, croppedBytes);
            if (croppedImageUrl) {
              console.log('✅ Cropped image uploaded:', croppedImageUrl);
            }
          } else {
            console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping crop upload');
          }
        }
      } catch (e) {
        console.error('❌ Crop pipeline failed:', e);
        // Fall through — uncropped image is still used
      }
    }

    // Build response payload
    const responsePayload: Record<string, unknown> = { ...analysisResult };
    if (croppedImageUrl) {
      responsePayload.croppedImageUrl = croppedImageUrl;
    }

    console.log('Closet item analysis completed successfully');
    if (croppedImageUrl) console.log('📦 Cropped image URL included in response');

    return new Response(JSON.stringify(responsePayload), {
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
      stack: Deno.env.get('DENO_ENV') === 'development' ? error?.stack : undefined
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
