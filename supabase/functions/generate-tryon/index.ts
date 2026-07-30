import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Gemini 3.1 Flash Lite Image (PRIMARY) ───────────────────────────
// NOTE: Set GEMINI_API_KEY in Supabase Edge Function secrets.
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = 'gemini-3.1-flash-lite-image'
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// ── Cloudflare Flux fallback ────────────────────────────────────────
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_WORKERS_AI')
const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')

interface GenerationRequest {
  generation_id: string;
}

function isValidAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Download an image from a URL into a Uint8Array ─────────────────
async function downloadImageBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

// ── Guess MIME type from image bytes (magic bytes) ─────────────────
function guessMimeType(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

// ── Convert Uint8Array to base64 ───────────────────────────────────
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Deno / Edge runtime: use btoa on a binary string
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ── PRIMARY: Gemini 3.1 Flash Lite Image ───────────────────────────
//
// Sends person + garment images as inline_data to Gemini's generateContent
// endpoint with a virtual try-on prompt. Returns raw PNG bytes on success.
async function tryGemini(
  basePhotoUrl: string,
  garmentUrl: string,
): Promise<Uint8Array> {
  console.log('[generate-tryon] 🚀 Starting Gemini 3.1 Flash Lite Image...')

  // 1. Download both images from Supabase Storage
  const personBytes = await downloadImageBytes(basePhotoUrl)
  const garmentBytes = await downloadImageBytes(garmentUrl)

  const personMime = guessMimeType(personBytes)
  const garmentMime = guessMimeType(garmentBytes)

  const personBase64 = uint8ArrayToBase64(personBytes)
  const garmentBase64 = uint8ArrayToBase64(garmentBytes)

  // 2. Build Gemini payload — prompt + inline_data for both images
  const promptText =
    "You are an expert fashion photo editor. Your task is a high-fidelity " +
    "virtual try-on. Modify the first image (the person) so they are wearing " +
    "the exact garment from the second image, replacing their original clothing.\n\n" +
    "RULES:\n" +
    "1. IDENTITY LOCK: Face, hair, skin must remain pixel-for-pixel identical.\n" +
    "2. BACKGROUND LOCK: Background and environment must remain 100% intact.\n" +
    "3. ENVIRONMENT BLENDING: Match lighting, shadows, and reflections onto the new garment.\n" +
    "4. GARMENT FIDELITY: Preserve the exact color, pattern, texture, and shape of the garment.\n" +
    "5. OUTPUT: Return the edited image only."

  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          { inline_data: { mime_type: personMime, data: personBase64 } },
          { inline_data: { mime_type: garmentMime, data: garmentBase64 } },
        ],
      },
    ],
    generation_config: {
      temperature: 0.4,
    },
  }

  // 3. Send to Gemini API
  console.log('[generate-tryon] 📦 Sending to Gemini:', {
    personSizeKB: (personBytes.length / 1024).toFixed(0),
    garmentSizeKB: (garmentBytes.length / 1024).toFixed(0),
  })

  const startTime = Date.now()
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),  // 3 min for inference
  })
  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Gemini returned ${response.status}: ${errText.slice(0, 400)}`)
  }

  // 4. Parse response — extract image from candidates[0].content.parts[].inline_data
  const resultJson = await response.json()
  let resultBytes: Uint8Array | null = null

  try {
    const parts: Array<any> = resultJson.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      if (part.inline_data?.data) {
        const rawBase64 = part.inline_data.data
        const binaryStr = atob(rawBase64)
        resultBytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          resultBytes[i] = binaryStr.charCodeAt(i)
        }
        break
      }
    }
  } catch (e) {
    throw new Error(`Failed to parse Gemini response: ${e}`)
  }

  if (!resultBytes) {
    const text = resultJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no text)'
    throw new Error(`Gemini returned no image data. Response text: ${text.slice(0, 200)}`)
  }

  console.log(
    `[generate-tryon] ✅ Gemini responded in ${elapsed}ms (${(resultBytes.length / 1024).toFixed(0)} KB PNG)`,
  )

  return resultBytes
}

// ── FALLBACK: Cloudflare Flux 2 Klein 4B (multipart/form-data) ─────
//
// Only used if the primary Gemini endpoint fails or is unreachable.
async function tryCloudflareFlux(
  cfApiToken: string,
  cfAccountId: string,
  basePhotoUrl: string,
  garmentItems: Array<{ title: string; category: string; source_image_url: string }>,
): Promise<Uint8Array> {
  console.log('[generate-tryon] 🔄 Falling back to Cloudflare Flux 2 Klein 4B...')

  // 1. Download person image
  const personBytes = await downloadImageBytes(basePhotoUrl)
  const personMime = guessMimeType(personBytes)
  const personExt = personMime === 'image/png' ? 'png' : 'jpg'

  // 2. Download garment images (up to 3)
  const garmentBlobs: Array<{ blob: Blob; filename: string }> = []
  for (let i = 0; i < Math.min(garmentItems.length, 3); i++) {
    const item = garmentItems[i]
    try {
      const gBytes = await downloadImageBytes(item.source_image_url)
      const mime = guessMimeType(gBytes)
      const ext = mime === 'image/png' ? 'png' : 'jpg'
      garmentBlobs.push({
        blob: new Blob([gBytes], { type: mime }),
        filename: `garment_${i}.${ext}`,
      })
    } catch (e) {
      console.warn(`[generate-tryon] ⚠️ Failed to download garment ${i} (${item.title}):`, e)
    }
  }

  // 3. Build prompt with identity-preservation structure
  let promptText = "This is the same person shown in image 0. "
  promptText += "Keep the exact same face, facial features, skin tone, expression, and hairstyle as image 0, unchanged. "
  promptText += "Keep the same body shape, pose, and background as image 0, unchanged. "

  if (garmentBlobs.length === 1) {
    promptText += "The only change: replace their clothing with the garment shown in image 1."
  } else if (garmentBlobs.length >= 2) {
    promptText += "The only change: replace their top with the garment in image 1, and their bottom with the garment in image 2."
  } else {
    promptText += "The only change: replace their clothing with the garments in the reference images."
  }

  // 4. Build multipart form data
  const formData = new FormData()
  formData.append('prompt', promptText)
  formData.append('input_image_0', new Blob([personBytes], { type: personMime }), `person.${personExt}`)

  for (let i = 0; i < garmentBlobs.length; i++) {
    formData.append(`input_image_${i + 1}`, garmentBlobs[i].blob, garmentBlobs[i].filename)
  }

  formData.append('width', '1024')
  formData.append('height', '1024')
  formData.append('guidance', '2.2')

  const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`

  console.log('[generate-tryon] 📦 Sending Flux payload:', {
    personSizeKB: (personBytes.length / 1024).toFixed(0),
    garmentCount: garmentBlobs.length,
  })

  const startTime = Date.now()
  const response = await fetch(cfEndpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfApiToken}` },
    body: formData,
    signal: AbortSignal.timeout(120_000),
  })
  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Cloudflare Flux returned ${response.status}: ${errText.slice(0, 400)}`)
  }

  // 5. Flux wraps result in JSON: { "result": { "image": "/9j/4AAQ..." } }
  const responseText = await response.text()
  let json: any
  try {
    json = JSON.parse(responseText)
  } catch {
    throw new Error(`Cloudflare Flux returned unparsable response: ${responseText.slice(0, 200)}`)
  }

  const imageData: unknown = json?.result?.image
  if (!imageData) {
    throw new Error(`Cloudflare Flux returned no image data: ${JSON.stringify(json).slice(0, 200)}`)
  }
  if (typeof imageData !== 'string') {
    throw new Error(`Cloudflare Flux returned unexpected image type: ${typeof imageData}`)
  }

  // Decode base64
  const rawBase64 = imageData.replace(/^data:image\/\w+;base64,/, '')
  const binaryStr = atob(rawBase64)
  const resultBytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    resultBytes[i] = binaryStr.charCodeAt(i)
  }

  console.log(`[generate-tryon] ✅ Cloudflare Flux responded in ${elapsed}ms (${(resultBytes.length / 1024).toFixed(0)} KB)`)

  return resultBytes
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { generation_id }: GenerationRequest = await req.json()
    if (!generation_id) throw new Error('Missing generation_id')

    console.log('[generate-tryon] invoked', generation_id)

    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const jwt = authHeader.replace(/^bearer\s+/i, '').trim()
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) throw new Error('Authentication failed')

    const userId = user.id

    // ── Fetch generation row ────────────────────────────────
    const { data: genRow, error: genError } = await supabase
      .from('planner_generated_images')
      .select('*')
      .eq('id', generation_id)
      .single()

    if (genError || !genRow) throw new Error('Generation row not found')

    // ── Extract outfit items from metadata ──────────────────
    const metadata = (genRow as any).metadata as Record<string, any>
    const items: Array<{ title: string; category: string; color: string; source_image_url: string }> =
      metadata?.items ?? []

    // ── Fetch user base photo ───────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_image')
      .eq('id', userId)
      .maybeSingle()

    const basePhotoUrl: string | null = profile?.selected_image ?? null

    if (!basePhotoUrl) {
      return new Response(
        JSON.stringify({
          error: 'no_base_photo',
          message: 'Upload a base photo first so the AI can generate realistic try-on images.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Validate all items have absolute URLs ───────────────
    const validItems = items.filter((i) => {
      if (!i.source_image_url) {
        console.warn('[generate-tryon] Skipping item with no source_image_url:', i.title)
        return false
      }
      if (!isValidAbsoluteUrl(i.source_image_url)) {
        console.warn('[generate-tryon] Skipping item with relative URL:', i.title)
        return false
      }
      return true
    })

    if (validItems.length === 0) {
      throw new Error('No garment items with valid source_image_url')
    }

    console.log('[generate-tryon] Starting try-on:', {
      genId: generation_id,
      userId,
      itemCount: validItems.length,
      categories: validItems.map((i) => i.category),
    })

    // ── Try-on: Gemini (PRIMARY) → Cloudflare Flux (fallback) ──
    let finalImageBytes: Uint8Array
    let usedEngine: string

    try {
      // Use the first valid garment item for the try-on
      finalImageBytes = await tryGemini(basePhotoUrl, validItems[0].source_image_url)
      usedEngine = 'gemini'
    } catch (geminiError: any) {
      console.warn('[generate-tryon] ⚠️ Gemini failed, trying Cloudflare Flux fallback:', geminiError.message)

      if (CF_API_TOKEN && CF_ACCOUNT_ID) {
        try {
          finalImageBytes = await tryCloudflareFlux(CF_API_TOKEN, CF_ACCOUNT_ID, basePhotoUrl, validItems)
          usedEngine = 'cloudflare-flux'
        } catch (cfError: any) {
          console.error('[generate-tryon] Both Gemini and Cloudflare Flux failed:', cfError.message)
          throw new Error(`Try-on failed: Gemini (${geminiError.message}), Flux (${cfError.message})`)
        }
      } else {
        // No Cloudflare credentials — can't fall back
        throw new Error(`Gemini failed and no Cloudflare fallback configured: ${geminiError.message}`)
      }
    }

    // ── Upload final result to storage ──────────────────────
    const fileName = `tryon_${generation_id}_${Date.now()}.png`
    const storagePath = `uploads/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('clipped-closet-items')
      .upload(storagePath, finalImageBytes, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: pubData } = supabase.storage
      .from('clipped-closet-items')
      .getPublicUrl(storagePath)

    console.log(`[generate-tryon] ✅ ${usedEngine} completed:`, pubData.publicUrl)

    return new Response(
      JSON.stringify({ image_url: pubData.publicUrl, engine: usedEngine }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error: any) {
    console.error('[generate-tryon] Error:', error)

    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
