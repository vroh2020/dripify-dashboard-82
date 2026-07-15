/**
 * Verify what images are actually stored as the base photo and garment
 * source images — no code changes, just reporting.
 *
 * Usage: npx tsx scripts/inspect-tryon-inputs.ts
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../src/lib/supabase-config';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchImageInfo(url: string): Promise<{
  status: string;
  contentType: string;
  sizeKB: number;
  contentDisposition?: string;
  firstBytes?: string;
}> {
  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return {
        status: `HTTP ${resp.status} ${resp.statusText}`,
        contentType: 'N/A',
        sizeKB: 0,
      };
    }

    const blob = await resp.blob();
    const sizeKB = Math.round(blob.size / 1024);
    const contentType = blob.type || resp.headers.get('content-type') || 'unknown';

    // Read first 8 bytes to detect magic bytes (file signature)
    const buffer = await blob.slice(0, 8).arrayBuffer();
    const firstBytesHex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');

    return {
      status: 'ok',
      contentType,
      sizeKB,
      contentDisposition: resp.headers.get('content-disposition') ?? undefined,
      firstBytes: firstBytesHex,
    };
  } catch (e: any) {
    return {
      status: `Error: ${e?.message ?? 'Unknown'}`,
      contentType: 'N/A',
      sizeKB: 0,
    };
  }
}

function guessImageType(hex: string): string {
  const signatures: Record<string, string> = {
    'ff d8 ff': 'JPEG',
    '89 50 4e 47': 'PNG',
    '47 49 46 38': 'GIF',
    '52 49 46 46': 'WEBP (RIFF)',
    '42 4d': 'BMP',
    '00 00 00 0c': 'HEIC (likely)',
    '00 00 00 18': 'HEIC (likely)',
  };
  for (const [sig, name] of Object.entries(signatures)) {
    if (hex.startsWith(sig)) return name;
  }
  return `Unknown (hex: ${hex.slice(0, 23)}...)`;
}

async function main() {
  console.log('🔍 Inspecting try-on inputs for IDM-VTON\n');

  // ── STEP 1: Find base photos ───────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('STEP 1 — Base Photos (profiles.selected_image)');
  console.log('═══════════════════════════════════════════════════\n');

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, selected_image, updated_at')
    .not('selected_image', 'is', null)
    .limit(10);

  if (profileError) {
    console.error('❌ Profile query failed:', profileError.message);
  } else if (!profiles || profiles.length === 0) {
    console.log('No profiles with selected_image found.');
    console.log('Checking onboarding_v2 for selfie photos...\n');

    const { data: onboarding } = await supabase
      .from('onboarding_v2')
      .select('user_id, step_data')
      .limit(10);

    if (onboarding) {
      for (const row of onboarding) {
        const sd = row.step_data as Record<string, any>;
        const selfieUrl = sd?.selfie_captured?.photo_url;
        if (selfieUrl) {
          console.log(`📸 Onboarding selfie — user: ${row.user_id}`);
          console.log(`   URL: ${selfieUrl}`);
          const info = await fetchImageInfo(selfieUrl);
          console.log(`   HTTP status: ${info.status}`);
          console.log(`   Content-Type: ${info.contentType}`);
          console.log(`   Size: ${info.sizeKB} KB`);
          console.log(`   Magic bytes: ${info.firstBytes || 'N/A'} => ${guessImageType(info.firstBytes || '')}`);
          console.log('');
        }
      }
    }
  } else {
    for (const p of profiles) {
      console.log(`👤 User: ${p.id}`);
      console.log(`   Updated: ${p.updated_at}`);
      if (p.selected_image) {
        console.log(`   selected_image URL: ${p.selected_image}`);
        const info = await fetchImageInfo(p.selected_image);
        console.log(`   HTTP status: ${info.status}`);
        console.log(`   Content-Type: ${info.contentType}`);
        console.log(`   Size: ${info.sizeKB} KB`);
        console.log(`   Magic bytes: ${info.firstBytes || 'N/A'} => ${guessImageType(info.firstBytes || '')}`);

        if (info.sizeKB > 0) {
          // Try to guess based on size
          if (info.sizeKB > 300) {
            console.log(`   ⚠️  Large image (>300KB) — could be a full photo`);
          } else if (info.sizeKB > 50) {
            console.log(`   ✅ Reasonable image size — likely a real photo`);
          } else if (info.sizeKB > 10) {
            console.log(`   ⚠️  Small image (${info.sizeKB}KB) — could be a thumbnail or placeholder`);
          } else {
            console.log(`   ⚠️  Very small image (<10KB) — likely NOT a real photo`);
          }
        }
      } else {
        console.log('   No selected_image set');
      }
      console.log('');
    }
  }

  // ── STEP 2: Check garment source images ────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('STEP 2 — Garment Images (planner_generated_images metadata)');
  console.log('═══════════════════════════════════════════════════\n');

  const GEN_ID = 'a21c97ea-e385-4883-9edd-0dada8f80772';

  const { data: genRow, error: genError } = await supabase
    .from('planner_generated_images')
    .select('metadata, status, error_message')
    .eq('id', GEN_ID)
    .maybeSingle();

  if (genError) {
    console.error(`❌ Query failed for gen row ${GEN_ID}:`, genError.message);
  } else if (!genRow) {
    console.log(`No generation row found for id: ${GEN_ID}`);
  } else {
    console.log(`Gen row status: ${(genRow as any).status}`);
    console.log(`Error message: ${(genRow as any).error_message ?? 'none'}`);
    console.log('');

    const metadata = (genRow as any).metadata as Record<string, any>;
    const items: Array<{
      title?: string;
      category?: string;
      color?: string;
      source_image_url?: string;
    }> = metadata?.items ?? [];

    if (items.length === 0) {
      console.log('❌ metadata.items is empty or missing');
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`--- Item ${i + 1}: ${item.title ?? '(unnamed)'} ---`);
        console.log(`   Category: ${item.category ?? '?'}`);
        console.log(`   Color: ${item.color ?? '?'}`);
        console.log(`   source_image_url: ${item.source_image_url ?? '❌ MISSING'}`);

        if (item.source_image_url) {
          const info = await fetchImageInfo(item.source_image_url);
          console.log(`   HTTP status: ${info.status}`);
          console.log(`   Content-Type: ${info.contentType}`);
          console.log(`   Size: ${info.sizeKB} KB`);
          console.log(`   Magic bytes: ${info.firstBytes || 'N/A'} => ${guessImageType(info.firstBytes || '')}`);

          if (info.sizeKB > 0) {
            if (info.sizeKB > 300) {
              console.log(`   ⚠️  Large image (>300KB)`);
            } else if (info.sizeKB > 20) {
              console.log(`   ✅ Reasonable isolated-item size`);
            } else {
              console.log(`   ⚠️  Small image (${info.sizeKB}KB) — possibly a thumbnail`);
            }
          }
        }
        console.log('');
      }
    }

    // Also check if there are any RECENT gen rows with source_image_urls populated
    console.log('--- Also checking most recent 3 gen rows for comparison ---');
    const { data: recentRows } = await supabase
      .from('planner_generated_images')
      .select('id, status, metadata, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentRows) {
      for (const row of recentRows) {
        const meta = (row as any).metadata as Record<string, any>;
        const rowItems = meta?.items ?? [];
        console.log(`\n🆔 ${(row as any).id}`);
        console.log(`   Status: ${(row as any).status}`);
        console.log(`   Created: ${(row as any).created_at}`);
        console.log(`   Items with source_image_url: ${rowItems.filter((i: any) => i.source_image_url).length}/${rowItems.length}`);
        for (const item of rowItems) {
          const hasUrl = item.source_image_url ? '✅' : '❌';
          console.log(`   ${hasUrl} ${item.title ?? '?'} (${item.category ?? '?'}) — ${item.source_image_url ?? 'no url'}`);
        }
      }
    }
  }
}

main().catch(console.error);
