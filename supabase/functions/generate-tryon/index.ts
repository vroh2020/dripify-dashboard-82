import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── CatVTON endpoint (fallback) ────────────────────────────────────
const MODAL_TRYON_URL =
  Deno.env.get('MODAL_TRYON_URL') ??
  "https://ramcharanvelpuri--trendza-tryon-tryonengine-web.modal.run/tryon"



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

// ── Download an image from a URL into a Uint8Array ────────────────
async function downloadImageBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

// ── Guess MIME type from image bytes (magic bytes) ────────────────
function guessMimeType(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

// ── Try Cloudflare Flux 2 Klein 4B (multipart/form-data) ───────────
// Flux accepts multipart with input_image_0 (person) + input_image_1..3 (garments).
// Native res (1024) — upscale after if UI needs bigger; asking Klein to render 1536 causes blur.
async function tryCloudflareFlux(
  cfApiToken: string,
  cfAccountId: string,
  basePhotoUrl: string,
  garmentItems: Array<{ title: string; category: string; source_image_url: string }>,
): Promise<Uint8Array> {
  console.log('[generate-tryon] 🚀 Starting Cloudflare Flux 2 Klein 4B...')

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

  // 3. Build prompt with BFL-recommended identity-preservation structure:
  //   establish reference → state the change → explicitly restate what to preserve
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

  // 4. Build multipart/form-data — Flux REQUIRES this format
  const formData = new FormData()
  formData.append('prompt', promptText)
  formData.append('input_image_0', new Blob([personBytes], { type: personMime }), `person.${personExt}`)

  for (let i = 0; i < garmentBlobs.length; i++) {
    formData.append(`input_image_${i + 1}`, garmentBlobs[i].blob, garmentBlobs[i].filename)
  }

  formData.append('width', '1024')    // native res — don't force 1536 out of a 4-step model
  formData.append('height', '1024')
  formData.append('guidance', '2.2')  // down from 3.5 — lower guidance = less "reinterpretation" pressure on the face

  const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`

  console.log('[generate-tryon] 📦 Sending Flux payload:', {
    personSizeKB: (personBytes.length / 1024).toFixed(0),
    garmentCount: garmentBlobs.length,
  })

  const startTime = Date.now()
  const response = await fetch(cfEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfApiToken}`,
      // Do NOT set Content-Type — fetch sets it automatically with boundary
    },
    body: formData,
    signal: AbortSignal.timeout(120_000),
  })
  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Cloudflare Flux returned ${response.status}: ${errText.slice(0, 400)}`)
  }

  // 5. Flux wraps the result in JSON: { "result": { "image": "/9j/4AAQ..." } }
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

  // Decode base64 (may have data URI prefix)
  const rawBase64 = imageData.replace(/^data:image\/\w+;base64,/, '')
  const binaryStr = atob(rawBase64)
  const resultBytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    resultBytes[i] = binaryStr.charCodeAt(i)
  }

  console.log(`[generate-tryon] ✅ Cloudflare Flux responded in ${elapsed}ms (${(resultBytes.length / 1024).toFixed(0)} KB)`)

  return resultBytes
}

// ── Fallback: Modal CatVTON ───────────────────────────────────────
async function tryModalCatVton(
  basePhotoUrl: string,
  garmentUrl: string,
): Promise<Uint8Array> {
  console.log('[generate-tryon] 🔄 Falling back to Modal CatVTON...')

  const modalResponse = await fetch(MODAL_TRYON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      person_image_url: basePhotoUrl,
      garment_image_urls: [garmentUrl],
      garment_type: 'upper',
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!modalResponse.ok) {
    const errText = await modalResponse.text().catch(() => '')
    throw new Error(`CatVTON endpoint returned ${modalResponse.status}: ${errText.slice(0, 400)}`)
  }

  const finalImageBytes = new Uint8Array(await modalResponse.arrayBuffer())
  console.log(
    `[generate-tryon] ✅ Modal result received (${(finalImageBytes.length / 1024).toFixed(0)} KB PNG)`,
  )

  return finalImageBytes
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

    // ── Try-on: Cloudflare Flux → fallback Modal ────────────
    let finalImageBytes: Uint8Array
    let usedEngine: string

    const cfApiToken = Deno.env.get('CLOUDFLARE_WORKERS_AI')
    const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')

    if (cfApiToken && cfAccountId) {
      try {
        finalImageBytes = await tryCloudflareFlux(cfApiToken, cfAccountId, basePhotoUrl, validItems)
        usedEngine = 'cloudflare-flux'
      } catch (cfError: any) {
        console.warn('[generate-tryon] ⚠️ Cloudflare Flux failed, falling back to Modal:', cfError.message)
        const fallbackItem = validItems[0]
        finalImageBytes = await tryModalCatVton(basePhotoUrl, fallbackItem.source_image_url)
        usedEngine = 'modal-catvton'
      }
    } else {
      console.log('[generate-tryon] Cloudflare credentials not set — using Modal directly')
      const fallbackItem = validItems[0]
      finalImageBytes = await tryModalCatVton(basePhotoUrl, fallbackItem.source_image_url)
      usedEngine = 'modal-catvton'
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

    // Note: status update to 'completed' is handled by the client after
    // optional face compositing, so there's no race condition with polling.
    console.log(`[generate-tryon] ✅ ${usedEngine} completed:`, pubData.publicUrl)

    return new Response(
      JSON.stringify({ image_url: pubData.publicUrl,    engine: usedEngine }),
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
