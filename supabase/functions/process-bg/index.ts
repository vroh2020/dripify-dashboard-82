import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Free BiRefNet container on Hugging Face — matting pass is alpha-matted
// for high-precision transparent PNG output.
const FREE_HF_API = "https://ramvbdbdf-wardrobe-rembg-api.hf.space/api/remove"
// HF free serverless inference unloads idle models; cold-starts can take
// longer than 30 s.  Bumped to 60 s with retry logic below.
const HF_TIMEOUT_MS = 60_000
const HF_MAX_RETRIES = 2
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

// Helper: sleep(delayMs) — wraps Promise + setTimeout for cleaner retry loops.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    // 7. Fetch with retry loop for HF cold starts. HF free serverless
    //    inference unloads idle models; the first request after a period
    //    of inactivity can take 30-60 s or return a 503 with
    //    `{"error":"Model is currently loading","estimated_time":X}`.
    //    We retry up to 2 times with delays informed by that body.
    //    Both 503 responses AND AbortError (timeout) trigger a retry.
    // -----------------------------------------------------------------
    let response: Response | null = null

    for (let attempt = 0; attempt <= HF_MAX_RETRIES; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT_MS)

      try {
        response = await fetch(`${FREE_HF_API}?${queryParams}`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        // Timeout (AbortError) — retry with a delay, unless retries exhausted
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
          if (attempt < HF_MAX_RETRIES) {
            console.log(
              `[process-bg] cold start detected (timeout, attempt ${attempt + 1}/${HF_MAX_RETRIES}), retrying...`,
            )
            await sleep(3_000)
            continue
          }
          // All retries exhausted on timeout — let outer catch handle it
          throw fetchErr
        }
        // Non-timeout fetch error — rethrow to outer catch
        throw fetchErr
      }
      clearTimeout(timeoutId)

      // Success — break out of retry loop.
      if (response.ok) break

      // Non-ok response — check if it's a recoverable 503 (model loading).
      if (response.status === 503) {
        if (attempt < HF_MAX_RETRIES) {
          const errorBody = await response.text().catch(() => "{}")
          let delayMs = 3_000 // default 3 s
          try {
            const errorJson = JSON.parse(errorBody)
            if (typeof errorJson?.estimated_time === "number") {
              delayMs = Math.min(errorJson.estimated_time * 1000, 10_000)
            }
          } catch {
            // ignore parse errors
          }
          console.log(
            `[process-bg] cold start detected (attempt ${attempt + 1}/${HF_MAX_RETRIES}), retrying after ${delayMs}ms...`,
          )
          await sleep(delayMs)
          continue
        }
        // All 503 retries exhausted — surface the distinct cold-start error.
        console.error(
          "[process-bg] all retries exhausted (503), HF still loading",
        )
        return jsonResponse(
          {
            error: "cold_start_timeout",
            retrying: true,
            message:
              "Matting engine is warming up, please try again in a moment.",
          },
          504,
        )
      }

      // Non-503 failure — do not retry, return error immediately.
      const errorText = await response.text().catch(() => "unknown")
      console.error(
        "[process-bg] HF rejected",
        response.status,
        errorText.slice(0, 500),
      )
      return jsonResponse({ error: "Matting engine rejected image" }, 502)
    }

    // If all retries were exhausted without a successful response, surface
    // a distinct error so the frontend can show a "waking up" message.
    if (!response || !response.ok) {
      console.error(
        "[process-bg] all retries exhausted, HF still unavailable",
      )
      return jsonResponse(
        {
          error: "cold_start_timeout",
          retrying: true,
          message:
            "Matting engine is warming up, please try again in a moment.",
        },
        504,
      )
    }

    const transparentBuffer = await response.arrayBuffer()

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
      return jsonResponse(
        {
          error: "cold_start_timeout",
          retrying: true,
          message:
            "Matting engine timed out, please try again in a moment.",
        },
        504,
      )
    }
    // Everything else: log full error server-side, return sanitized 500.
    console.error("[process-bg] unhandled", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
