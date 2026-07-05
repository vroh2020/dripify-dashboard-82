// supabase/functions/search-clothes/index.ts
//
// Serper.dev Google Shopping proxy + image proxy.
// Endpoint: POST https://google.serper.dev/shopping
// Auth:     X-API-KEY: ${SERPER_API_KEY}
//
// Shopping returns structured retailer product feeds — no stock-photo,
// pinboard, or social-media noise. The domain blocklist remains as
// defense-in-depth, not as primary filtering.
//
// Accepts: { q, brand?, num? }            — shopping search
//          { action: "proxy-image", url }  — CORS-free image fetch
//
// OUT shape: { results: Array<{ id, thumb_url, high_res_url, source?, price? }> }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SERPER_ENDPOINT = 'https://google.serper.dev/shopping';

// ── Brand filter ────────────────────────────────────────────────────────
const VALID_BRANDS = new Set([
  'Bottega Veneta',
  'Burberry',
  'Celine',
  'Chanel',
  'Chloé',
  'Coach',
  'Dior',
  'Fendi',
  'Givenchy',
  'Gucci',
  'Hermès',
  'H&M',
  'Jacquemus',
  'Loewe',
  'Louis Vuitton',
  'Lululemon',
  'Miu Miu',
  'Prada',
  'Saint Laurent',
  'Sephora',
  'Valentino',
  "Victoria's Secret",
  'Zara',
]);

const DEFAULT_NUM_RESULTS = 30;
const UPSTREAM_FETCH_BUFFER = 10;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ── Image proxy config ──────────────────────────────────────────────────
// Browsers can't fetch from gstatic.com (no CORS headers). This route
// downloads the image server-side and returns it with CORS + caching.
const IMAGE_PROXY_ALLOWED = /^encrypted-tbn\d*\.gstatic\.com$/;
const IMAGE_PROXY_RATE_MAX = 60; // separate, higher limit for proxy calls

// Hard blocklist: known stock-photo, marketplace, and pinboard domains.
// Defense-in-depth — Shopping shouldn't surface these.
const BLOCKED_DOMAINS = [
  'shutterstock.com',
  'istockphoto.com',
  'gettyimages.com',
  'unsplash.com',
  'creativemarket.com',
  'photostockeditor.com',
  'alamy.com',
  '123rf.com',
  'depositphotos.com',
  'dreamstime.com',
  'freepik.com',
  'vecteezy.com',
  'stocksy.com',
  'pond5.com',
  'pexels.com',
  'pixabay.com',
  'pinterest.com',
  'pinimg.com',
  'pin.it',
  'youtube.com',
  'stock.adobe.com',
  'pixta.com',
  'pixtastock.com',
  'ebay.com',
  'poshmark.com',
  'depop.com',
  'amazon.com',
  'etsy.com',
  'grailed.com',
  'instagram.com',
  'tiktok.com',
  'facebook.com',
  'reddit.com',
];

// ── Rate limiting ────────────────────────────────────────────────────────

const clientRequests = new Map<string, { count: number; resetTime: number }>();
const proxyRequests = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  clientId: string,
  maxRequests = RATE_LIMIT_MAX,
  windowMs = RATE_LIMIT_WINDOW_MS
): boolean {
  const now = Date.now();
  const client = clientRequests.get(clientId) || {
    count: 0,
    resetTime: now + windowMs,
  };
  if (now > client.resetTime) {
    client.count = 1;
    client.resetTime = now + windowMs;
    clientRequests.set(clientId, client);
    return true;
  }
  if (client.count >= maxRequests) return false;
  client.count++;
  return true;
}

// ── Query builder ──────────────────────────────────────────────────────

function buildSearchQuery(userInput: string, brand: string | null): string {
  const cleanInput = userInput.replace(/[^\w\s-]/gi, '').trim();
  if (brand && brand !== 'All' && VALID_BRANDS.has(brand)) {
    return `${brand} ${cleanInput}`;
  }
  return cleanInput;
}

// ── URL helpers ──────────────────────────────────────────────────────────

function upgradeToHttps(url: string): string {
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://');
  return url;
}

function testUrlShape(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (trimmed.includes('$') || trimmed.includes('{{')) return null;
    return trimmed;
  } catch {
    return null;
  }
}

function hostname(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isBlockedDomain(urlStr: string): boolean {
  const h = hostname(urlStr);
  if (!h) return false;
  return BLOCKED_DOMAINS.some((d) => h === d || h.endsWith('.' + d));
}

// ── Image proxy ────────────────────────────────────────────────────────

async function handleImageProxy(imageUrl: string): Promise<Response> {
  try {
    const parsed = new URL(imageUrl);
    if (!IMAGE_PROXY_ALLOWED.test(parsed.hostname)) {
      return new Response(JSON.stringify({ error: 'Host not allowed for proxy' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: 'Upstream image fetch failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('Image proxy failed:', err);
    return new Response(JSON.stringify({ error: 'Proxy failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ── Upstream schema adapter ─────────────────────────────────────────────

interface SerperShoppingItem {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
  imageUrl?: string;
  position?: number;
}

export interface CleanResult {
  id: string;
  thumb_url: string;
  high_res_url: string;
  source?: string;
  price?: string;
}

function mapSerperResult(raw: unknown): CleanResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as SerperShoppingItem;

  const imageUrl = testUrlShape(r.imageUrl);
  if (!imageUrl) return null;

  if (typeof r.link === 'string' && isBlockedDomain(r.link)) return null;

  const linkUrl = testUrlShape(r.link);
  const id =
    linkUrl !== null && r.position != null
      ? `${linkUrl}#${r.position}`
      : linkUrl ?? imageUrl;

  return {
    id,
    thumb_url: upgradeToHttps(imageUrl),
    high_res_url: upgradeToHttps(imageUrl),
    source: r.source,
    price: r.price,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Image proxy route (before rate limiting) ──────────────────────
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (body?.action === 'proxy-image' && typeof body?.url === 'string') {
        const proxyClientId = req.headers.get('x-forwarded-for') || 'anonymous';
        const now = Date.now();
        const proxyClient = proxyRequests.get(proxyClientId) || {
          count: 0,
          resetTime: now + RATE_LIMIT_WINDOW_MS,
        };
        if (now > proxyClient.resetTime) {
          proxyClient.count = 1;
          proxyClient.resetTime = now + RATE_LIMIT_WINDOW_MS;
        } else if (proxyClient.count >= IMAGE_PROXY_RATE_MAX) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          proxyClient.count++;
        }
        proxyRequests.set(proxyClientId, proxyClient);
        return handleImageProxy(body.url);
      }

      // ── Normal search flow ─────────────────────────────────────────
      const clientId = req.headers.get('x-forwarded-for') || 'anonymous';
      if (!checkRateLimit(clientId)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let q = typeof body?.q === 'string' ? body.q : '';
      let brand = typeof body?.brand === 'string' ? body.brand : null;
      let num = typeof body?.num === 'number' ? body.num : DEFAULT_NUM_RESULTS;

      q = q.trim();
      if (!q) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameter: q' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      num = Math.max(1, Math.min(50, num));

      const apiKey = Deno.env.get('SERPER_API_KEY');
      if (!apiKey) {
        console.error('SERPER_API_KEY not configured');
        throw new Error('Service configuration error');
      }

      const searchQuery = buildSearchQuery(q, brand);
      const upstreamNum = Math.min(50, num + UPSTREAM_FETCH_BUFFER);

      console.log('search-clothes forwarding:', { q, brand, num, upstreamNum, searchQuery, ip: clientId });

      const upstreamRes = await fetch(SERPER_ENDPOINT, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ q: searchQuery, num: upstreamNum, gl: 'us', hl: 'en' }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!upstreamRes.ok) {
        const errText = await upstreamRes.text().catch(() => '');
        console.error('Serper upstream error:', upstreamRes.status, errText.slice(0, 500));
        return new Response(
          JSON.stringify({ error: 'Upstream search service error', upstream_status: upstreamRes.status }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const upstreamJson = await upstreamRes.json().catch(() => ({}));
      const rawImages: unknown[] = Array.isArray(
        (upstreamJson as { shopping?: unknown[] })?.shopping
      )
        ? ((upstreamJson as { shopping: unknown[] }).shopping as unknown[])
        : [];

      const results = rawImages
        .map(mapSerperResult)
        .filter((r): r is CleanResult => r !== null)
        .slice(0, num);

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET requests — same parsing from query params
    const url = new URL(req.url);
    let q = url.searchParams.get('q') || '';
    let brand = url.searchParams.get('brand') || null;
    let num = parseInt(url.searchParams.get('num') || '', 10) || DEFAULT_NUM_RESULTS;

    q = q.trim();
    if (!q) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: q' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    num = Math.max(1, Math.min(50, num));

    const clientId = req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('SERPER_API_KEY');
    if (!apiKey) {
      console.error('SERPER_API_KEY not configured');
      throw new Error('Service configuration error');
    }

    const searchQuery = buildSearchQuery(q, brand);
    const upstreamNum = Math.min(50, num + UPSTREAM_FETCH_BUFFER);

    const upstreamRes = await fetch(SERPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ q: searchQuery, num: upstreamNum, gl: 'us', hl: 'en' }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => '');
      console.error('Serper upstream error:', upstreamRes.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'Upstream search service error', upstream_status: upstreamRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const upstreamJson = await upstreamRes.json().catch(() => ({}));
    const rawImages: unknown[] = Array.isArray(
      (upstreamJson as { shopping?: unknown[] })?.shopping
    )
      ? ((upstreamJson as { shopping: unknown[] }).shopping as unknown[])
      : [];

    const results = rawImages
      .map(mapSerperResult)
      .filter((r): r is CleanResult => r !== null)
      .slice(0, num);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('search-clothes failed:', err);
    return new Response(
      JSON.stringify({ error: 'Search service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('search-clothes ready');
