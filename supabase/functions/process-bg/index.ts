import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Dedicated rembg + isnet-general-use deployment on Modal (MIT-licensed,
// CPU-only inference, sub-second warm response).
const MODAL_BG_URL =
  Deno.env.get("MODAL_BG_URL") ??
  "https://ramcharanvelpuri--trendza-bg-removal-bgremover-web.modal.run"
// Modal container: 120s idle timeout, 120s function timeout.
// One retry for transient network blips (Modal doesn't have HF's idle-unload).
const MODAL_TIMEOUT_MS = 60_000
const MODAL_MAX_RETRIES = 1

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
    // 5. Generate a signed URL so Modal can fetch the raw image directly.
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
    // 6. Forward to Modal rembg endpoint (JSON, not FormData).
    //    Alpha matting params match the previous BiRefNet tuning.
    // -----------------------------------------------------------------
    let response: Response | null = null

    for (let attempt = 0; attempt <= MODAL_MAX_RETRIES; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), MODAL_TIMEOUT_MS)

      try {
        response = await fetch(`${MODAL_BG_URL}/remove-bg`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            fg_threshold: 240,
            bg_threshold: 10,
            erode_size: 4,
          }),
          signal: controller.signal,
        })
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
          if (attempt < MODAL_MAX_RETRIES) {
            console.log(
              `[process-bg] Modal timeout (attempt ${attempt + 1}/${MODAL_MAX_RETRIES}), retrying...`,
            )
            await sleep(2_000)
            continue
          }
          throw fetchErr
        }
        throw fetchErr
      }
      clearTimeout(timeoutId)

      if (response.ok) break

      // Non-ok — surface error immediately (Modal doesn't have HF's cold-start 503s)
      const errorText = await response.text().catch(() => "unknown")
      console.error(
        "[process-bg] Modal rejected",
        response.status,
        errorText.slice(0, 500),
      )
      return jsonResponse({ error: "Matting engine rejected image" }, 502)
    }

    if (!response || !response.ok) {
      return jsonResponse({ error: "Matting engine unavailable" }, 504)
    }

    const transparentBuffer = await response.arrayBuffer()

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

    return jsonResponse({ cleanPath })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("[process-bg] Modal fetch timed out")
      return jsonResponse(
        {
          error: "matting_timeout",
          message: "Matting engine timed out, please try again.",
        },
        504,
      )
    }
    console.error("[process-bg] unhandled", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
