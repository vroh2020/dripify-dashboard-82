import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── CatVTON endpoint ────────────────────────────────────────────────
// Deployed via modal_app/tryon_pipeline.py on an A10G GPU.
// Accepts person + garment and returns raw PNG bytes (image/png).
const MODAL_TRYON_URL =
  Deno.env.get('MODAL_TRYON_URL') ??
  "https://ramcharanvelpuri--trendza-tryon-tryonengine-web.modal.run/tryon"

interface GenerationRequest {
  generation_id: string;
}

/**
 * Validate that a URL is absolute (has a protocol). Deno's fetch() throws
 * "Invalid URL" on relative paths, so check before using.
 */
function isValidAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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

    // ── Require a base photo ────────────────────────────────
    if (!basePhotoUrl) {
      return new Response(
        JSON.stringify({
          error: 'no_base_photo',
          message: 'Upload a base photo first so the AI can generate realistic try-on images.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log('[generate-tryon] Starting CatVTON try-on:', {
      genId: generation_id,
      userId,
      itemCount: items.length,
    })

    // ── Find first valid item ────────────────────────────────
    const validItem = items.find((i) => {
      if (!i.source_image_url) {
        console.warn('[generate-tryon] Skipping item with no source_image_url:', i.title)
        return false
      }
      if (!isValidAbsoluteUrl(i.source_image_url)) {
        console.warn(
          '[generate-tryon] Skipping item with relative/invalid source_image_url:',
          i.title,
          `(${i.source_image_url})`,
        )
        return false
      }
      return true
    })
    if (!validItem) {
      throw new Error('No garment items with valid source_image_url')
    }

    const garmentUrl = validItem.source_image_url

    console.log('[generate-tryon] Sending to CatVTON endpoint:', {
      person_url_len: basePhotoUrl.length,
      garment_url: garmentUrl.slice(0, 60) + '...',
    })

    // ── Single synchronous call to Modal CatVTON endpoint ────
    // Using garment_image_urls (list with 1 item) for backward compatibility
    const modalResponse = await fetch(MODAL_TRYON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_image_url: basePhotoUrl,
        garment_image_urls: [garmentUrl],
        garment_type: 'upper',
      }),
      // CatVTON is fast — 120s for cold start + warm inference
      signal: AbortSignal.timeout(120_000),
    })

    if (!modalResponse.ok) {
      const errText = await modalResponse.text().catch(() => '')
      throw new Error(
        `CatVTON endpoint returned ${modalResponse.status}: ${errText.slice(0, 400)}`,
      )
    }

    //    // ── Read raw PNG bytes from response ────────────────────
    const contentType = modalResponse.headers.get('content-type') ?? ''
    if (!contentType.includes('image/png')) {
      console.warn('[generate-tryon] Unexpected content-type, expected image/png:', contentType)
    }

    const finalImageBytes = new Uint8Array(await modalResponse.arrayBuffer())
    console.log(
      `[generate-tryon] Modal result received (${(finalImageBytes.length / 1024).toFixed(0)} KB PNG)`,
    )

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

    // ── Update the generation row status ────────────────────
    await supabase
      .from('planner_generated_images')
      .update({
        status: 'completed',
        image_url: pubData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', generation_id)

    console.log('[generate-tryon] ✅ Completed:', pubData.publicUrl)

    return new Response(
      JSON.stringify({ image_url: pubData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error: any) {
    console.error('[generate-tryon] Error:', error)

    // The caller (plannerService.generateTryOnImage) catches errors from
    // the edge function invocation and sets status to 'failed' on its own.

    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
