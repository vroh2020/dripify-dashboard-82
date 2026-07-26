/**
 * process-onboarding-wardrobe.ts
 *
 * Takes the 20 wardrobe onboarding images (10 female + 10 male) from
 * public/onboarding-images/wardrobe/, uploads them to Supabase Storage,
 * runs Cloudflare's segment=foreground background removal on each,
 * downloads the transparent result, and overwrites the local file.
 *
 * Usage: npx tsx scripts/process-onboarding-wardrobe.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { SUPABASE_URL } from '../src/lib/supabase-config';

// ── Paths ───────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const PROJECT_ROOT = join(__dirname, '..');
const WARDROBE_DIR = join(PROJECT_ROOT, 'public', 'onboarding-images', 'wardrobe');

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'clipped-closet-items';
const STORAGE_PREFIX = 'onboarding-wardrobe';
const CF_ZONE = 'trendza.xyz';

// ── Helpers ─────────────────────────────────────────────────────────────

async function uploadToSupabase(
  gender: string,
  filename: string,
  filePath: string,
): Promise<string> {
  const content = readFileSync(filePath);
  const storagePath = `${STORAGE_PREFIX}/${gender}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, content, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: pubData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  console.log(`  📤 Uploaded → ${pubData.publicUrl}`);
  return pubData.publicUrl;
}

const CF_MAX_RETRIES = 2;
const CF_TIMEOUT_MS = 45_000;

async function removeBackground(publicUrl: string): Promise<ArrayBuffer> {
  const cfUrl = `https://${CF_ZONE}/cdn-cgi/image/segment=foreground,format=png/${publicUrl}`;

  for (let attempt = 0; attempt <= CF_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

      const response = await fetch(cfUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        if (attempt < CF_MAX_RETRIES) {
          console.log(`  ⏳ CF retry ${attempt + 1}/${CF_MAX_RETRIES} (${response.status})...`);
          await new Promise((r) => setTimeout(r, 2_000));
          continue;
        }
        throw new Error(`CF transform rejected (${response.status}): ${text.slice(0, 200)}`);
      }

      const buffer = await response.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('CF returned empty result');
      }
      return buffer;
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError' && attempt < CF_MAX_RETRIES) {
        console.log(`  ⏳ CF timeout (attempt ${attempt + 1}/${CF_MAX_RETRIES}), retrying...`);
        await new Promise((r) => setTimeout(r, 2_000));
        continue;
      }
      throw fetchErr;
    }
  }

  throw new Error('CF background removal failed after retries');
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎨 Processing onboarding wardrobe images through Cloudflare bg removal\n');
  console.log(`Source: ${WARDROBE_DIR}\n`);

  const genders = ['female', 'male'];
  let totalSuccess = 0;
  let totalErrors = 0;

  for (const gender of genders) {
    const genderDir = join(WARDROBE_DIR, gender);
    console.log(`\n━━━ ${gender.toUpperCase()} ━━━`);

    const files = readdirSync(genderDir)
      .filter((f) => extname(f).toLowerCase() === '.png')
      .sort();

    console.log(`  Found ${files.length} files`);

    for (const filename of files) {
      const filePath = join(genderDir, filename);
      const stats = statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);

      console.log(`\n  📄 ${filename} (${sizeKB} KB)`);

      try {
        // Step 1: Upload raw image to Supabase
        const publicUrl = await uploadToSupabase(gender, filename, filePath);

        // Step 2: Process through Cloudflare background removal
        console.log(`  🖌️  Removing background via Cloudflare...`);
        const transparentBuffer = await removeBackground(publicUrl);
        const resultKB = Math.round(transparentBuffer.byteLength / 1024);
        console.log(`  ✅ Background removed (${resultKB} KB)`);

        // Step 3: Overwrite local file with transparent version
        writeFileSync(filePath, Buffer.from(transparentBuffer));
        console.log(`  💾 Saved → ${filePath}`);
        totalSuccess++;
      } catch (err: any) {
        console.error(`  ❌ Failed: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\n━━━ FINAL RESULTS ━━━`);
  console.log(`  ✅ Success: ${totalSuccess}`);
  console.log(`  ❌ Errors:  ${totalErrors}`);

  if (totalErrors === 0) {
    console.log('\n🎉 All 20 wardrobe images now have transparent backgrounds!');
  } else {
    console.log('\n⚠️  Some files failed — check logs above');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
