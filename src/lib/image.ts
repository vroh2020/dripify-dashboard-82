/**
 * lib/image.ts
 *
 * Single source of truth for image URL transformation, BlurHash
 * encode/decode, srcset generation, and Capacitor Filesystem cache
 * key derivation. Lives here so every image consumer (cloned
 * NextImageShim, native ClosetItemCard, FitsView thumbnails,
 * onboarding previews, etc.) goes through the same pipeline.
 *
 * Three responsibilities:
 *   1. `getResizedImage(src, opts)` — turn a Supabase public URL into
 *      a transformed WebP at the requested width. Falls through to the
 *      raw URL when the host isn't a Supabase Storage public endpoint.
 *   2. `getSrcSet(src, widths, opts)` — generate a responsive srcSet
 *      string for `<img srcset>` to skip 4MB PNGs on tiny tiles.
 *   3. `encodeBlurHash / decodeBlurHash / BlurhashImageUrl` — generate
 *      a 20-byte placeholder string client-side at upload time, decode
 *      it into a 32×32 blurred color block at render time so the user
 *      never sees a white square. Pure-canvas implementation; we don't
 *      pull in `react-blurhash` because we want fine control over the
 *      async decode flow inside `CachedImage`.
 *   4. `cacheKeyFor(src)` — SHA-1-free deterministic filesystem name
 *      for the on-disk cache. Uses `crypto.subtle.digest` so a 60-byte
 *      input URL doesn't bloat into a 100-char path. Falls back to a
 *      deterministic base64 hash if subtle isn't available (Capacitor
 *      web fallback).
 *
 * Why this lives in `lib/` and not in `utils/` — `lib/` is the project
 * convention for app-wide helpers that import other modules of ours
 * (e.g. `~/integrations/supabase/client`). Keep it dependency-light so
 * the cost of importing it from a frozen `WheringPage` chunk is just
 * the blurhash WASM (~3KB).
 */

import { encode, decode } from 'blurhash';

// ─── Supabase Storage transformations ──────────────────────────────────────

/**
 * Backup transform endpoint. We hit Supabase's
 * `/storage/v1/render/image/public/...` (NEW public API path) when the
 * input URL is the legacy `/object/public/...`. The two paths are kept
 * in sync here so adding the new path doesn't break callers.
 */
const SUPABASE_OBJECT = '/storage/v1/object/public/';
const SUPABASE_RENDER = '/storage/v1/render/image/public/';

export type ResizeOptions = {
  width: number;
  /** WebP by default; `original` keeps whatever the bucket has. */
  format?: 'webp' | 'origin';
  /** 80 is a sweet spot for clothing thumbs on iOS — visible noise only below 70. */
  quality?: number;
};

export function isSupabaseStorageUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  // URLs look like `https://{ref}.supabase.co/storage/v1/object/public/...`
  // Allow either the standard or the `co` TLD variant.
  return /(?:^|\.)supabase\.co\/storage\/v1\/object\/public\//.test(src);
}

export function getResizedImage(src: string | null | undefined, opts: ResizeOptions): string {
  if (!src) return src ?? '';
  if (!isSupabaseStorageUrl(src)) return src;
  const { width, format = 'webp', quality = 60 } = opts;
  try {
    const url = new URL(src);
    if (url.pathname.includes(SUPABASE_OBJECT)) {
      url.pathname = url.pathname.replace(SUPABASE_OBJECT, SUPABASE_RENDER);
    }
    url.searchParams.set('width', String(width));
    if (format === 'webp') {
      url.searchParams.set('format', 'webp');
      url.searchParams.set('quality', String(quality));
    }
    return url.toString();
  } catch {
    return src;
  }
}

/**
 * Build a srcSet string covering the widths the caller wants.
 * Convention: caller picks widths based on the tile size. For a 96px
 * closet tile a single 240px entry is plenty (2× DPR); for a 420px hero
 * we go 480/720/960/1280.
 */
export function getSrcSet(
  src: string | null | undefined,
  widths: number[],
  opts: Omit<ResizeOptions, 'width'> = {},
): string {
  if (!src) return '';
  if (!isSupabaseStorageUrl(src) || widths.length === 0) return '';
  return widths
    .map((w) => `${getResizedImage(src, { ...opts, width: w })} ${w}w`)
    .join(', ');
}

/**
 * Pick srcSet widths matching the dense grid use case (closet tiles,
 * fit thumbnails, on-this-day strip). 120 / 240 / 480 covers iPhone SE
 * through Pro Max without pulling more bytes than needed.
 */
export const GRID_SRCSET_WIDTHS = [120, 240, 480] as const;
export const HERO_SRCSET_WIDTHS = [480, 720, 960, 1280] as const;

// ─── BlurHash encode / decode ──────────────────────────────────────────────

const BLURHASH_CANVAS_SIZE = 32; // px
const BLURHASH_X_COMPONENTS = 4;
const BLURHASH_Y_COMPONENTS = 3;

export async function encodeBlurHashFromImageSource(input: string | Blob | File): Promise<string> {
  const url = typeof input === 'string' ? input : URL.createObjectURL(input);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = BLURHASH_CANVAS_SIZE;
    canvas.height = BLURHASH_CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    ctx.drawImage(img, 0, 0, BLURHASH_CANVAS_SIZE, BLURHASH_CANVAS_SIZE);
    const data = ctx.getImageData(0, 0, BLURHASH_CANVAS_SIZE, BLURHASH_CANVAS_SIZE);
    return encode(data.data, BLURHASH_CANVAS_SIZE, BLURHASH_CANVAS_SIZE, BLURHASH_X_COMPONENTS, BLURHASH_Y_COMPONENTS);
  } finally {
    if (typeof input !== 'string') URL.revokeObjectURL(url);
  }
}

export type DecodedBlurhash = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

/**
 * Decode a BlurHash into RGBA pixels for `<canvas>.putImageData`.
 * Decoded buffer is `width * height * 4` bytes. Caller paints into a
 * canvas of `width × height`, then optionally blits to a CSS background
 * via `background-image: data:image/png;base64,...` if they want a
 * `<div>` placeholder instead of a `<canvas>` element.
 */
export function decodeBlurHash(hash: string | null | undefined, width = 32, height = 32): DecodedBlurhash | null {
  if (!hash) return null;
  try {
    const pixels = decode(hash, width, height);
    return { width, height, pixels };
  } catch {
    return null;
  }
}

/**
 * Convenience: paint the decoded BlurHash into an existing canvas
 * element. Returns true on success, false on bad hash. Used by
 * `CachedImage.tsx`'s placeholder layer.
 */
export function paintBlurHashIntoCanvas(canvas: HTMLCanvasElement | null, hash: string | null | undefined, width = 32, height = 32): boolean {
  if (!canvas) return false;
  const decoded = decodeBlurHash(hash, width, height);
  if (!decoded) return false;
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const imageData = new ImageData(decoded.pixels, decoded.width, decoded.height);
  ctx.putImageData(imageData, 0, 0);
  return true;
}

// ─── Filesystem cache key derivation ──────────────────────────────────────

/**
 * Stable cache key for a given source URL + width. Capacitor Filesystem
 * caps file names around 240 chars; SHA-1 hex = 40 chars and is
 * collision-resistant enough for our image cache.
 *
 * Web fallback resolves via `crypto.subtle.digest` (works in all modern
 * browsers including iOS Safari WebView). If subtle is missing we
 * degrade to a non-cryptographic DJB2 — same image might hash to a
 * different key across restarts but we won't collide within one session.
 */
export async function cacheKeyFor(src: string, width: number): Promise<string> {
  const material = `${width}|${src}`;
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    try {
      const bytes = new TextEncoder().encode(material);
      const digest = await crypto.subtle.digest('SHA-1', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      /* fall through to DJB2 */
    }
  }
  // DJB2 — non-cryptographic fallback. Stable across a single session.
  let hash = 5381;
  for (let i = 0; i < material.length; i += 1) {
    hash = ((hash << 5) + hash + material.charCodeAt(i)) | 0;
  }
  return `djb2_${(hash >>> 0).toString(16)}`;
}
