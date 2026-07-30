import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Qwen Image 2.0 (PRIMARY) ───────────────────────────────────────
// NOTE: Set DASHSCOPE_API_KEY in Supabase Edge Function secrets.
const DASHSCOPE_API_KEY = Deno.env.get('DASHSCOPE_API_KEY') ?? ''
const DASHSCOPE_WORKSPACE_ID = 'ws-0vz766zknc3p2yr2'
const DASHSCOPE_ENDPOINT =
  `https://${DASHSCOPE_WORKSPACE_ID}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
const QWEN_MODEL = 'qwen-image-2.0'

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

// ── PRIMARY: Qwen Image 2.0 (DashScope) ───────────────────────────
//
// Sends person + up to 2 garment image URLs to Qwen Image 2.0 via DashScope.
// Supports single garment (Image 1 = person, Image 2 = garment) or
// full outfit (Image 1 = person, Image 2 = top, Image 3 = bottoms).
// Downloads the first result and returns raw PNG bytes.
async function tryQwenImageEdit(
  basePhotoUrl: string,
  garmentItems: Array<{ title: string; category: string; source_image_url: string }>,
): Promise<Uint8Array> {
  console.log('[generate-tryon] 🚀 Starting Qwen Image 2.0 (DashScope)...')

  // Sort: tops first, bottoms second, then limit to 2 garments (Qwen max = 3 images total)
  const sorted = [...garmentItems]
    .sort((a, b) => {
      const aIsTop = /top|shirt|jacket|coat|hoodie|sweater|blouse|dress|jumpsuit/i.test(a.category)
      const bIsTop = /top|shirt|jacket|coat|hoodie|sweater|blouse|dress|jumpsuit/i.test(b.category)
      return aIsTop === bIsTop ? 0 : aIsTop ? -1 : 1
    })
    .slice(0, 2)

  // Build content array: person first, then each garment
  const content: Array<any> = [
    { image: basePhotoUrl },
    ...sorted.map((item) => ({ image: item.source_image_url })),
  ]

  // Build strict prompt — explicitly tell Qwen what NOT to touch
  let promptText: string
  if (sorted.length >= 2) {
    promptText =
      "Make the person from Image 1 wear the top from Image 2 and the bottoms from Image 3. " +
      "STRICT RULES — DO NOT VIOLATE: " +
      "(1) DO NOT change the person's face, facial features, skin tone, expression, or hairstyle from Image 1. " +
      "(2) DO NOT change the background, environment, lighting, or shadows from Image 1. " +
      "(3) DO NOT change the person's body shape, pose, or position from Image 1. " +
      "(4) ONLY replace their current clothing with the top from Image 2 and the bottoms from Image 3. " +
      "(5) Preserve the exact color, pattern, texture, shape, and details of both garments. " +
      "Return the exact same photo from Image 1 with ONLY the clothing replaced."
  } else {
    promptText =
      "Make the person from Image 1 wear the clothing item from Image 2. " +
      "STRICT RULES — DO NOT VIOLATE: " +
      "(1) DO NOT change the person's face, facial features, skin tone, expression, or hairstyle from Image 1. " +
      "(2) DO NOT change the background, environment, lighting, or shadows from Image 1. " +
      "(3) DO NOT change the person's body shape, pose, or position from Image 1. " +
      "(4) ONLY replace their current clothing with the garment from Image 2. " +
      "(5) Preserve the exact color, pattern, texture, shape, and details of the garment. " +
      "Return the exact same photo from Image 1 with ONLY the clothing replaced."
  }

  content.push({ text: promptText })

  const payload = {
    model: QWEN_MODEL,
    input: {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    },
    parameters: {
      n: 2,  // Generate 2 variants, we'll use the first
      size: '1536*2048',  // High-res portrait — keeps phone camera quality
      watermark: false,
    },
  }

  // 2. Send to DashScope API
  console.log(`[generate-tryon] 📦 Sending to Qwen Image 2.0 (${sorted.length} garment(s))...`)

  const startTime = Date.now()
  const response = await fetch(DASHSCOPE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),  // 3 min for inference
  })
  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Qwen returned ${response.status}: ${errText.slice(0, 400)}`)
  }

  // 3. Parse response — extract first image URL from output.choices[0].message.content[].image
  const resultJson = await response.json()
  let resultImageUrl: string | null = null

  try {
    const choices: Array<any> = resultJson.output?.choices ?? []
    for (const choice of choices) {
      const contents: Array<any> = choice.message?.content ?? []
      for (const part of contents) {
        if (part.image) {
          resultImageUrl = part.image
          break
        }
      }
      if (resultImageUrl) break
    }
  } catch (e) {
    throw new Error(`Failed to parse Qwen response: ${e}`)
  }

  if (!resultImageUrl) {
    const text = JSON.stringify(resultJson).slice(0, 300)
    throw new Error(`Qwen returned no image data. Response: ${text}`)
  }

  console.log(
    `[generate-tryon] ✅ Qwen responded in ${elapsed}ms — result URL: ${resultImageUrl.slice(0, 80)}...`,
  )

  // 4. Download the result image (Qwen URLs expire after 24h)
  console.log('[generate-tryon] ⬇️ Downloading result image from Qwen...')
  const resultBytes = await downloadImageBytes(resultImageUrl)

  console.log(
    `[generate-tryon] ✅ Downloaded result: ${(resultBytes.length / 1024).toFixed(0)} KB`,
  )

  return resultBytes
}

// ── FALLBACK: Cloudflare Flux 2 Klein 4B (multipart/form-data) ─────
//
// Only used if the primary Qwen Image Edit endpoint fails or is unreachable.
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

    // ── Try-on: Qwen Image Edit (PRIMARY) → Cloudflare Flux (fallback) ──
    let finalImageBytes: Uint8Array
    let usedEngine: string

    try {
      // Pass all valid items (up to 2) — Qwen will do multi-garment try-on
      finalImageBytes = await tryQwenImageEdit(basePhotoUrl, validItems)
      usedEngine = 'qwen-image-2.0'
    } catch (qwenError: any) {
      console.warn('[generate-tryon] ⚠️ Qwen failed, trying Cloudflare Flux fallback:', qwenError.message)

      if (CF_API_TOKEN && CF_ACCOUNT_ID) {
        try {
          finalImageBytes = await tryCloudflareFlux(CF_API_TOKEN, CF_ACCOUNT_ID, basePhotoUrl, validItems)
          usedEngine = 'cloudflare-flux'
        } catch (cfError: any) {
          console.error('[generate-tryon] Both Qwen and Cloudflare Flux failed:', cfError.message)
          throw new Error(`Try-on failed: Qwen (${qwenError.message}), Flux (${cfError.message})`)
        }
      } else {
        // No Cloudflare credentials — can't fall back
        throw new Error(`Qwen failed and no Cloudflare fallback configured: ${qwenError.message}`)
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
