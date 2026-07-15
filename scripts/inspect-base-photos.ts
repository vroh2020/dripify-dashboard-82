/**
 * Inspect stored user base photos to verify they are valid images
 * (JPEG/PNG, reasonable dimensions, not corrupted).
 *
 * Usage: npx tsx scripts/inspect-base-photos.ts
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../src/lib/supabase-config';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getImageInfo(url: string): Promise<{
  format: string;
  sizeKB: number;
  dimensions?: { width: number; height: number };
  status: string;
}> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      return { format: 'unknown', sizeKB: 0, status: `HTTP ${resp.status}` };
    }

    const blob = await resp.blob();
    const sizeKB = Math.round(blob.size / 1024);
    const format = blob.type || 'unknown';

    // Try to sniff dimensions from the image headers
    // We can check Content-Type and Content-Length headers for basic info
    const contentLength = resp.headers.get('content-length');
    const contentType = resp.headers.get('content-type');

    return {
      format: contentType ?? format,
      sizeKB,
      status: 'ok',
    };
  } catch (e: any) {
    return { format: 'unknown', sizeKB: 0, status: e?.message ?? 'Error' };
  }
}

async function main() {
  console.log('🔍 Inspecting user base photos...\n');

  // Get all profiles with a selected_image
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, selected_image, updated_at')
    .not('selected_image', 'is', null)
    .limit(20);

  if (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles with selected_image found.');
    console.log('Checking onboarding_v2 for selfie photos instead...');

    const { data: onboarding } = await supabase
      .from('onboarding_v2')
      .select('user_id, step_data')
      .limit(20);

    if (onboarding) {
      for (const row of onboarding) {
        const sd = row.step_data as Record<string, any>;
        const selfieUrl = sd?.selfie_captured?.photo_url;
        if (selfieUrl) {
          const info = await getImageInfo(selfieUrl);
          console.log(`\n📸 Onboarding selfie (user: ${row.user_id})`);
          console.log(`   URL: ${selfieUrl.slice(0, 80)}...`);
          console.log(`   Format: ${info.format}`);
          console.log(`   Size: ${info.sizeKB} KB`);
          console.log(`   Status: ${info.status}`);
        }
      }
    }
    return;
  }

  for (const profile of profiles) {
    console.log(`👤 User: ${profile.id}`);
    console.log(`   Updated: ${profile.updated_at}`);

    if (profile.selected_image) {
      const info = await getImageInfo(profile.selected_image);
      console.log(`   URL: ${profile.selected_image.slice(0, 100)}...`);
      console.log(`   Format: ${info.format}`);
      console.log(`   Size: ${info.sizeKB} KB`);

      if (info.sizeKB === 0) {
        console.log(`   ⚠️  Status: ${info.status}`);
      } else if (info.sizeKB > 10240) {
        console.log(`   ⚠️  Very large image (>10MB) — might cause Space-side errors`);
      } else if (info.sizeKB < 10) {
        console.log(`   ⚠️  Very small image (<10KB) — might be a placeholder`);
      } else {
        console.log(`   ✅ Looks like a real photo`);
      }
    } else {
      console.log('   No base photo set');
    }
    console.log('');
  }
}

main().catch(console.error);
