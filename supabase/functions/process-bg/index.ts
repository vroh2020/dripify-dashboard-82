import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Cloudflare Transformations (zone-level) ──────────────────────────
// Background removal is done via Cloudflare's built-in
// `segment=foreground` Image Transformation on the `trendza.xyz` zone.
// Cloudflare fetches the source image from Supabase directly (allowed
// origin), so no upload or API token is needed.
const CF_ZONE = "trendza.xyz"
const CF_MAX_RETRIES = 1
const CF_TIMEOUT_MS = 30_000

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

serve(async (req) => {
  // ── Unique request ID for tracing ──────────────────────────────────
  const requestId = crypto.randomUUID()
  console.log(`[process-bg] START ${requestId} imagePath=?`)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    // -----------------------------------------------------------------
    // 1. Require a Bearer JWT on every call.
    // -----------------------------------------------------------------
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401)
    }
    const jwt = authHeader.replace(/^bearer\s+/i, "").trim()
    if (!jwt) {
      return jsonResponse({ error: "Empty Authorization token" }, 401)
    }

    // -----------------------------------------------------------------
    // 2. Service-role client for storage ops.
    // -----------------------------------------------------------------
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // -----------------------------------------------------------------
    // 3. Verify the JWT against GoTrue.
    // -----------------------------------------------------------------
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData?.user) {
      console.error("[process-bg] auth failed", userError?.message)
      return jsonResponse({ error: "Invalid or expired token" }, 401)
    }
    const userId = userData.user.id

    // -----------------------------------------------------------------
    // 4. Validate the requested `imagePath`.
    // -----------------------------------------------------------------
    const body = (await req.json().catch(() => null)) as
      | { imagePath?: unknown }
      | null
    const imagePath = body?.imagePath
    console.log(`[process-bg] START ${requestId} imagePath=${imagePath ?? '(missing)'}`)
    if (
      typeof imagePath !== "string" ||
      imagePath.length === 0 ||
      imagePath.length > 256
    ) {
      return jsonResponse({ error: "Missing or invalid imagePath" }, 400)
    }
    if (
      imagePath.includes("..") ||
      imagePath.includes("\\") ||
      imagePath.includes("\0") ||
      imagePath.startsWith("/")
    ) {
      return jsonResponse({ error: "Invalid imagePath" }, 400)
    }
    if (!imagePath.startsWith(`uploads/${userId}/`)) {
      return jsonResponse({ error: "imagePath outside user namespace" }, 403)
    }

    // -----------------------------------------------------------------
    // 5. Generate a signed URL so Cloudflare can fetch the source image.
    //    (Supabase is configured as an allowed origin in Cloudflare.)
    // -----------------------------------------------------------------
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("raw-closet-items")
      .createSignedUrl(imagePath, 60 * 5) // 5 minute expiry
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(
        "[process-bg] signed URL failed",
        imagePath,
        signedUrlError?.message,
      )
      return jsonResponse({ error: "Source unavailable" }, 404)
    }
    const imageUrl = signedUrlData.signedUrl

    // -----------------------------------------------------------------
    // 6. Fetch the bg-removed result via Cloudflare's zone-level
    //    Transformation. Cloudflare pulls the source image itself since
    //    the Supabase origin is allowed — no local download needed.
    // -----------------------------------------------------------------
    const cfTransformUrl = `https://${CF_ZONE}/cdn-cgi/image/segment=foreground,format=png/${imageUrl}`

    let transparentBuffer: ArrayBuffer | null = null

    for (let attempt = 0; attempt <= CF_MAX_RETRIES; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CF_TIMEOUT_MS)

      try {
        const response = await fetch(cfTransformUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text().catch(() => "unknown")
          console.error(`[process-bg] ${requestId} CF rejected`, response.status, errorText.slice(0, 300))
          if (attempt < CF_MAX_RETRIES) {
            await sleep(1_000)
            continue
          }
          return jsonResponse({ error: "Matting engine rejected image" }, 502)
        }

        transparentBuffer = await response.arrayBuffer()
        console.log(`[process-bg] ${requestId} CF transform OK, ${transparentBuffer.byteLength} bytes`)
        break
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
          if (attempt < CF_MAX_RETRIES) {
            console.log(`[process-bg] ${requestId} CF timeout (attempt ${attempt + 1}/${CF_MAX_RETRIES}), retrying...`)
            await sleep(1_000)
            continue
          }
          return jsonResponse({ error: "Image processing timed out", code: "timeout" }, 504)
        }
        throw fetchErr
      }
    }

    if (!transparentBuffer || transparentBuffer.byteLength === 0) {
      return jsonResponse({ error: "Image processing returned empty result" }, 502)
    }

    // -----------------------------------------------------------------
    // 7. Upload the cleaned PNG back to `clipped-closet-items`.
    // -----------------------------------------------------------------
    const cleanPath = imagePath.replace(/\.[^/.]+$/, "") + "_clean.png"
    const { error: uploadError } = await supabase.storage
      .from("clipped-closet-items")
      .upload(cleanPath, transparentBuffer, {
        contentType: "image/png",
        upsert: true,
      })
    if (uploadError) {
      console.error(
        "[process-bg] upload failed",
        cleanPath,
        uploadError?.message,
      )
      return jsonResponse({ error: "Failed to save cleaned image" }, 500)
    }

    console.log(`[process-bg] SUCCESS ${requestId} cleanPath=${cleanPath}`)
    return jsonResponse({ cleanPath })
  } catch (err) {
    console.error(`[process-bg] FAILED ${requestId}`, err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
