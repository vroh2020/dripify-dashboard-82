import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Modal CatVTON endpoints ───────────────────────────────────────────
const MODAL_SUBMIT_URL = "https://ramvelpuri90--trendza-tryon-submit-tryon.modal.run"
const MODAL_POLL_URL  = "https://ramvelpuri90--trendza-tryon-get-tryon-result.modal.run"

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

/**
 * Map legacy Leffa garment type strings to CatVTON's expected values.
 *
 *   Leffa           →  CatVTON
 *   ───────────────     ───────────
 *   "upper_body"        "upper"
 *   "lower_body"        "lower"
 *   "dresses"           "overall"
 */
function mapGarmentType(leffaType: "upper_body" | "lower_body" | "dresses"): string {
  const map: Record<string, string> = {
    upper_body: "upper",
    lower_body: "lower",
    dresses: "overall",
  };
  return map[leffaType] ?? leffaType;
}

// ── Modal submit / poll helpers ──────────────────────────────────────

/**
 * Submit a try-on job to Modal and poll until completion.
 *
 * @returns base64-encoded PNG string of the generated try-on image.
 */
async function callModalTryon(
  personImageUrl: string,
  garmentImageUrl: string,
  garmentType: string,
): Promise<string> {
  // ── Step 1: Submit ─────────────────────────────────────────
  const submitPayload = {
    person_image_url: personImageUrl,
    garment_image_url: garmentImageUrl,
    garment_type: garmentType,
  };

  console.log("[generate-tryon] Submitting to Modal:", {
    garment_type: garmentType,
    person_url_len: personImageUrl.length,
    garment_url_len: garmentImageUrl.length,
  });

  const submitRes = await fetch(MODAL_SUBMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submitPayload),
    signal: AbortSignal.timeout(30_000),  // submit should be fast
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "");
    throw new Error(`Modal submit failed ${submitRes.status}: ${errText.slice(0, 300)}`);
  }

  const submitData = await submitRes.json();
  const callId = submitData.call_id;

  if (!callId) {
    throw new Error(`Modal submit returned no call_id: ${JSON.stringify(submitData).slice(0, 200)}`);
  }

  console.log("[generate-tryon] Modal call_id:", callId);

  // ── Step 2: Poll until complete ────────────────────────────
  const pollUrl = `${MODAL_POLL_URL}?call_id=${encodeURIComponent(callId)}`;
  const maxAttempts = 120;  // 120 × 3s = 6 minutes max
  const pollIntervalMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const pollRes = await fetch(pollUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (pollRes.status === 202) {
      // Still processing
      if (attempt % 10 === 0) {
        console.log(`[generate-tryon] Polling... attempt ${attempt}/${maxAttempts}`);
      }
      continue;
    }

    if (pollRes.status !== 200) {
      const errText = await pollRes.text().catch(() => "");
      throw new Error(`Modal poll returned unexpected status ${pollRes.status}: ${errText.slice(0, 300)}`);
    }

    const pollData = await pollRes.json();

    if (pollData.status === "complete" && pollData.image_base64) {
      console.log(`[generate-tryon] Modal result received (${(pollData.image_base64.length / 1024).toFixed(0)} KB base64)`);
      return pollData.image_base64;
    }

    if (pollData.error) {
      throw new Error(`Modal processing error: ${pollData.error}`);
    }

    // Unknown format — keep polling
    console.log(`[generate-tryon] Poll attempt ${attempt}: status=${pollData.status || pollRes.status}`);
  }

  throw new Error(`Modal polling timed out after ${maxAttempts} attempts`);
}

/**
 * Scan outfit items and find the best candidate for top/upper garment,
 * bottom/lower garment, or a dress (single-piece outfit).
 *
 * Returns [topItem | null, bottomItem | null, dressItem | null].
 */
function findGarmentItems(
  items: Array<{ title: string; category: string; color: string; source_image_url: string }>,
): [typeof items[0] | null, typeof items[0] | null, typeof items[0] | null] {
  const TOP_CATEGORIES = new Set(['tops', 'outerwear', 'top', 'jacket', 'coat', 'shirt', 'blouse', 'sweater', 'hoodie', 'bodysuit']);
  const BOTTOM_CATEGORIES = new Set(['bottoms', 'bottom', 'pants', 'jeans', 'shorts', 'skirt', 'trousers', 'leggings', 'mini', 'maxi']);
  const DRESS_CATEGORIES = new Set(['dress', 'dresses', 'jumpsuit', 'romper', 'overall']);

  let top: typeof items[0] | null = null;
  let bottom: typeof items[0] | null = null;
  let dress: typeof items[0] | null = null;

  for (const item of items) {
    const cat = item.category?.toLowerCase() ?? '';
    if (DRESS_CATEGORIES.has(cat) && !dress) {
      dress = item;
    } else if (TOP_CATEGORIES.has(cat) && !top) {
      top = item;
    } else if (BOTTOM_CATEGORIES.has(cat) && !bottom) {
      bottom = item;
    }
  }

  return [top, bottom, dress];
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

    console.log('[generate-tryon] Starting Modal CatVTON try-on:', {
      genId: generation_id,
      userId,
      itemCount: items.length,
    })

    // ── Filter to items with valid absolute source image URLs ──
    const validItems = items.filter((i) => {
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
    if (validItems.length === 0) {
      throw new Error('No garment items with valid source_image_url — nothing to composite')
    }

    // ── Categorize garments ─────────────────────────────────
    const [topItem, bottomItem, dressItem] = findGarmentItems(validItems)

    console.log('[generate-tryon] Categorized garments:', {
      top: topItem ? `${topItem.title} (${topItem.category}, ${topItem.color})` : '(none)',
      bottom: bottomItem ? `${bottomItem.title} (${bottomItem.category}, ${bottomItem.color})` : '(none)',
      dress: dressItem ? `${dressItem.title} (${dressItem.category}, ${dressItem.color})` : '(none)',
    })

    // ── Determine which Modal strategy to use ───────────────
    let finalImageBase64: string

    if (dressItem) {
      // Single-piece outfit — one Modal call with garment_type="overall"
      console.log('[generate-tryon] Using dress strategy — single call to Modal')
      finalImageBase64 = await callModalTryon(
        basePhotoUrl,
        dressItem.source_image_url,
        mapGarmentType("dresses"),
      )
    } else if (topItem && bottomItem) {
      // ── Two-piece outfit — SPLIT into TWO independent invocations ──
      // Each invocation handles ONE Modal round-trip to stay within
      // Supabase's 150s hard limit.
      //
      // The discriminator is metadata.step1_intermediate_url:
      //   - If ABSENT  → this is the Step 1 invocation (run top, save, fire step 2)
      //   - If PRESENT → this is the Step 2 invocation (use intermediate as person, run bottom)

      const step1IntermediateUrl = metadata?.step1_intermediate_url;

      if (step1IntermediateUrl) {
        // ── Step 2 invocation: apply bottom to intermediate result ──
        console.log('[generate-tryon] Step 2 invocation — applying bottom to intermediate:', step1IntermediateUrl);
        finalImageBase64 = await callModalTryon(
          step1IntermediateUrl,
          bottomItem.source_image_url,
          mapGarmentType("lower_body"),
        );
        // Falls through to finalize (decode → upload → set completed → return image_url)
      } else {
        // ── Step 1 invocation: run top, save intermediate, trigger step 2 ──
        console.log('[generate-tryon] Step 1 invocation — applying top:', topItem.title);

        const step1Base64 = await callModalTryon(
          basePhotoUrl,
          topItem.source_image_url,
          mapGarmentType("upper_body"),
        );

        // Save step 1 intermediate to storage
        const step1Bytes = Uint8Array.from(atob(step1Base64), (c) => c.charCodeAt(0));
        const step1FileName = `tryon_step1_${generation_id}.png`;
        const step1StoragePath = `uploads/${userId}/${step1FileName}`;

        await supabase.storage
          .from('clipped-closet-items')
          .upload(step1StoragePath, step1Bytes, {
            contentType: 'image/png',
            upsert: true,
          });

        const { data: step1Pub } = supabase.storage
          .from('clipped-closet-items')
          .getPublicUrl(step1StoragePath);

        // Store intermediate URL in metadata, set status back to 'generating'
        const updatedMetadata = { ...(metadata || {}), step1_intermediate_url: step1Pub.publicUrl };
        await supabase
          .from('planner_generated_images')
          .update({
            status: 'generating',
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', generation_id);

        // Fire-and-forget step 2 invocation — use EdgeRuntime.waitUntil()
        // so Deno doesn't kill the background request when we return the response.
        const edgeFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-tryon`;
        // @ts-ignore - Deno global
        EdgeRuntime.waitUntil(
          fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ generation_id }),
          }).catch((e) =>
            console.error('[generate-tryon] Failed to trigger step 2:', e)
          )
        );

        console.log('[generate-tryon] Step 2 triggered, returning step1_done');

        return new Response(
          JSON.stringify({ status: 'step1_done' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } else if (topItem) {
      // Only a top garment — single upper call
      console.log('[generate-tryon] Using single-garment strategy — top only')
      finalImageBase64 = await callModalTryon(
        basePhotoUrl,
        topItem.source_image_url,
        mapGarmentType("upper_body"),
      )
    } else if (bottomItem) {
      // Only a bottom garment — single lower call
      console.log('[generate-tryon] Using single-garment strategy — bottom only')
      finalImageBase64 = await callModalTryon(
        basePhotoUrl,
        bottomItem.source_image_url,
        mapGarmentType("lower_body"),
      )
    } else {
      throw new Error('No recognizable garment categories — nothing to generate')
    }

    // ── Decode base64 result ────────────────────────────────
    const finalImageBytes = Uint8Array.from(atob(finalImageBase64), (c) => c.charCodeAt(0));

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
    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
