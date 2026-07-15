/**
 * migrate-seed-images-to-storage.ts
 *
 * One-time migration: uploads all ~95 seed wardrobe images from
 * public/clothes/ to Supabase Storage (clipped-closet-items bucket,
 * seed-wardrobe/ prefix), then updates demo-wardrobe.ts to reference
 * the new absolute URLs instead of relative paths.
 *
 * Usage: npx tsx scripts/migrate-seed-images-to-storage.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { SUPABASE_URL } from '../src/lib/supabase-config';

// Resolve paths relative to the script file (works with ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'clipped-closet-items';
const STORAGE_PREFIX = 'seed-wardrobe';

const CLOTHES_DIR = join(__dirname, '..', 'public', 'clothes');
const DEMO_WARDROBE_PATH = join(__dirname, '..', 'src', 'lib', 'demo-wardrobe.ts');

/** Map of old relative path → new absolute URL */
const urlMap = new Map<string, string>();

async function uploadFile(
  filename: string,
  filePath: string,
): Promise<string> {
  const content = readFileSync(filePath);
  const storagePath = `${STORAGE_PREFIX}/${filename}`;

  // Check if already uploaded
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(STORAGE_PREFIX, { search: filename });

  if (existing && existing.length > 0) {
    // Already exists — just return the public URL
    const { data: pubData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);
    return pubData.publicUrl;
  }

  // Upload
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, content, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload ${filename}: ${uploadError.message}`);
  }

  const { data: pubData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  console.log(`  ✅ Uploaded ${filename} → ${pubData.publicUrl}`);
  return pubData.publicUrl;
}

async function main() {
  console.log('📦 Migrating seed wardrobe images to Supabase Storage\n');
  console.log(`Source: ${CLOTHES_DIR}\n`);

  // ── Step 1: Read all PNG files ─────────────────────────────
  const files = readdirSync(CLOTHES_DIR)
    .filter((f) => extname(f).toLowerCase() === '.png')
    .sort();

  console.log(`Found ${files.length} PNG files\n`);

  // Verify counts
  const femaleFiles = files.filter((f) => f.startsWith('f-'));
  const maleFiles = files.filter((f) => f.startsWith('m-'));
  console.log(`  Female items (f-*): ${femaleFiles.length}`);
  console.log(`  Male items (m-*):   ${maleFiles.length}`);
  console.log(`  Total:              ${files.length}\n`);

  // ── Step 2: Upload each file ───────────────────────────────
  console.log('Uploading...');
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = join(CLOTHES_DIR, file);
    const stats = statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);

    try {
      const publicUrl = await uploadFile(file, filePath);
      // Map: old relative path `/clothes/${file}` → new absolute URL
      urlMap.set(`/clothes/${file}`, publicUrl);
      successCount++;
    } catch (e: any) {
      console.error(`  ❌ Failed ${file}: ${e.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} uploaded, ${errorCount} errors\n`);

  if (errorCount > 0) {
    console.error('⚠️  Some uploads failed — check logs above');
  }

  // ── Step 3: Update demo-wardrobe.ts ───────────────────────
  console.log('Updating demo-wardrobe.ts with absolute URLs...\n');

  let content = readFileSync(DEMO_WARDROBE_PATH, 'utf-8');
  let replaceCount = 0;

  // Sort keys by length descending to avoid partial replacements
  // (e.g. f-top-1.png should match before top-1.png if present)
  const sortedEntries = [...urlMap.entries()].sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [oldPath, newUrl] of sortedEntries) {
    // Escape special regex characters in the path
    const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the full assignment: source_image_url: "/clothes/f-top-1.png"
    // We match the relative path as a string value in the object literal
    const regex = new RegExp(`source_image_url: ['"]${escaped}['"]`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `source_image_url: '${newUrl}'`);
      replaceCount++;
    }
  }

  if (replaceCount > 0) {
    writeFileSync(DEMO_WARDROBE_PATH, content, 'utf-8');
    console.log(`✅ Updated ${replaceCount} source_image_url references in demo-wardrobe.ts`);
  } else {
    console.log('⚠️  No references replaced — check the URL mapping');
  }

  // ── Step 4: Summary ────────────────────────────────────────
  const unreplacedCount = files.length - replaceCount;
  console.log(`\n📋 Final summary:`);
  console.log(`  Files on disk:           ${files.length}`);
  console.log(`  URL mappings generated:  ${urlMap.size}`);
  console.log(`  demo-wardrobe.ts updates: ${replaceCount}`);
  console.log(`  Unreplaced (mismatch):   ${unreplacedCount > 0 ? `⚠️  ${unreplacedCount} — check manually` : '✅ none'}`);

  if (unreplacedCount === 0) {
    console.log('\n🎉 Migration complete! All seed images are now served from Supabase Storage.');
  } else {
    console.log('\n⚠️  Some files were uploaded but not matched in demo-wardrobe.ts.');
    console.log('   This is expected if there are extra image files not referenced in the code.');
  }
}

main().catch(console.error);
