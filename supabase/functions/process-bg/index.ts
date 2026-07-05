import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Free BiRefNet container on Hugging Face — matting pass is alpha-matted
// for high-precision transparent PNG output.
const FREE_HF_API = "https://ramvbdbdf-wardrobe-rembg-api.hf.space/api/remove"
const HF_TIMEOUT_MS = 30_000
const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"])

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // `authorization` for caller JWT (now enforced); the rest are forwarded
  // by supabase-js on `functions.invoke()` so we just allow them through
  // preflight.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

// Derive the file extension the upstream matting engine should see. Falls
// back to `jpg` rather than guessing — rembg uses magic bytes too, so the
// filename is mostly cosmetic but we don't want to send misleading hints.
function deriveExtension(path: string): string {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/)
  if (m && ALLOWED_EXTS.has(m[1])) return m[1] === "jpeg" ? "jpg" : m[1]
  return "jpg"
}

serve(async (req) => {
  // CORS preflight — short-circuit before any auth.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    // -----------------------------------------------------------------
    // 1. Require a Bearer JWT on every call. Without this the function
    //    is an unauthenticated proxy over `raw-closet-items` + free
    //    write access into `clipped-closet-items`. This is the single
    //    most important change in this rewrite.
    // -----------------------------------------------------------------
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401)
    }
    // Tolerate any casing and any spacing after `Bearer` — defense in
    // depth against odd clients / proxies that mangle headers.
    const jwt = authHeader.replace(/^bearer\s+/i, "").trim()
    if (!jwt) {
      return jsonResponse({ error: "Empty Authorization token" }, 401)
    }

    // -----------------------------------------------------------------
    // 2. Service-role client for storage ops. Service role bypasses RLS,
    //    so we MUST enforce ownership manually — see step 4 below.
    // -----------------------------------------------------------------
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // -----------------------------------------------------------------
    // 3. Verify the JWT against GoTrue. `getUser(jwt)` is a live
    //    round-trip even when the client was initialized with the
    //    service role — it does NOT trust the JWT just because the
    //    caller has service permissions. Rejects signed-but-expired,
    //    forged, and server-side-revoked tokens.
    // -----------------------------------------------------------------
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData?.user) {
      console.error("[process-bg] auth failed", userError?.message)
      return jsonResponse({ error: "Invalid or expired token" }, 401)
    }
    const userId = userData.user.id

    // -----------------------------------------------------------------
    // 4. Validate the requested `imagePath`. This is the only thing
    //    preventing cross-user reads because we've bypassed RLS via
    //    service role. Reject:
    //    - empty / oversized / non-string bodies
    //    - obvious traversal patterns (`..`, `\`, NUL, leading `/`)
    //    - anything not inside `uploads/{userId}/...`
    //    - suffix attacks (e.g. `uploads/{userId}_evil/...`) because
    //      the `userId/` portion closes the prefix.
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
    // 5. Download the raw image from `raw-closet-items`.
    // -----------------------------------------------------------------
    const { data: rawBlob, error: downloadError } = await supabase.storage
      .from("raw-closet-items")
      .download(imagePath)
    if (downloadError || !rawBlob) {
      console.error(
        "[process-bg] download failed",
        imagePath,
        downloadError?.message,
      )
      return jsonResponse({ error: "Source unavailable" }, 404)
    }

    // -----------------------------------------------------------------
    // 6. Forward to BiRefNet. Use the REAL extension (the previous
    //    deployment hardcoded `.jpg` which BiRefNet sometimes uses to
    //    infer input mode — degrading matting for PNG/WEBP blobs).
    // -----------------------------------------------------------------
    const ext = deriveExtension(imagePath)
    const formData = new FormData()
    formData.append("file", rawBlob, `user_item.${ext}`)
    const queryParams = new URLSearchParams({
      model: "birefnet-general",
      alpha_matting: "true",
      // Hyper-conservative foreground mask: forces BiRefNet's alpha
      // matting wrapper to KEEP any pixel that isn't absolutely sure is
      // background. Protects white/bright clothing on white studio
      // backdrops from being "fried" by the brightness threshold.
      alpha_matting_foreground_threshold: "240",
      // Conversely: only delete pixels the model is 99% confident are
      // background canvas. Same root cause as the foreground threshold.
      alpha_matting_background_threshold: "10",
      // Edge eroding kernel size. White-on-white color-bleed at the
      // boundary usually produces jagged "staircase" holes along thin
      // straps and sleeves — a 4px erode widens the recomputation
      // radius around borders so the alpha blends smoothly instead of
      // chopping out fabric pixels.
      alpha_matting_erode_size: "4",
    })

    // -----------------------------------------------------------------
    // 7. Fetch with a hard timeout. A hung HF container MUST NOT lock
    //    the function — Supabase functions have a global concurrency
    //    cap and a stuck fetch could leak slots until deploy restart.
    // -----------------------------------------------------------------
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT_MS)
    let rembgResponse: Response
    try {
      rembgResponse = await fetch(`${FREE_HF_API}?${queryParams}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!rembgResponse.ok) {
      const errorText = await rembgResponse.text()
      // Log full upstream error server-side, return sanitized 502.
      console.error(
        "[process-bg] HF rejected",
        rembgResponse.status,
        errorText.slice(0, 500),
      )
      return jsonResponse({ error: "Matting engine rejected image" }, 502)
    }

    const transparentBuffer = await rembgResponse.arrayBuffer()

    // -----------------------------------------------------------------
    // 8. Upload the cleaned PNG back to `clipped-closet-items`. The
    //    bucket is public-read so the URL produced by `getPublicUrl()`
    //    works in `<img src=...>` anonymously — `upsert: true` makes
    //    re-clips idempotent.
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
    // AbortController timeout → Deno surfaces this as a DOMException
    // named `AbortError`. Map it to 504 Gateway Timeout so callers
    // (and the React hook's retry logic) can distinguish "engine is
    // slow" from "we crashed".
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("[process-bg] HF fetch timed out after", HF_TIMEOUT_MS, "ms")
      return jsonResponse({ error: "Matting engine timed out" }, 504)
    }
    // Everything else: log full error server-side, return sanitized 500.
    console.error("[process-bg] unhandled", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
