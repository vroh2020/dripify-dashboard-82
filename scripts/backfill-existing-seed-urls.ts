/**
 * backfill-existing-seed-urls.ts
 *
 * Updates existing users' trendza_closet_items rows that were seeded
 * with relative image paths (/clothes/...) to use the new absolute
 * Supabase Storage URLs.
 *
 * Usage: npx tsx scripts/backfill-existing-seed-urls.ts
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../src/lib/supabase-config';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const STORAGE_BASE_URL =
  'https://jjqwhxamjxsiotnhhqco.supabase.co/storage/v1/object/public/clipped-closet-items/seed-wardrobe/';

interface ClosetItemRow {
  id: string;
  user_id: string;
  title: string;
  source_image_url: string;
}

async function main() {
  console.log('🔍 Searching for existing users with broken relative image URLs...\n');

  // ── Step 1: Find all rows with broken relative paths ──────
  const { data: rows, error: queryError, count } = await supabase
    .from('trendza_closet_items')
    .select('id, user_id, title, source_image_url', { count: 'exact' })
    .like('source_image_url', '/clothes/%');

  if (queryError) {
    console.error('❌ Query failed:', queryError.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('✅ No existing rows with relative paths found — nothing to backfill.');
    return;
  }

  console.log(`Found ${rows.length} rows with relative paths across multiple users.\n`);

  // Show unique users affected
  const userIds = new Set(rows.map((r: any) => r.user_id));
  console.log(`Users affected: ${userIds.size}`);
  console.log('');

  // ── Step 2: Build updates (replace /clothes/{file} → storage URL) ──
  const updates: { id: string; source_image_url: string }[] = [];
  let skipped = 0;

  for (const row of rows as ClosetItemRow[]) {
    const filename = row.source_image_url.replace('/clothes/', '');
    if (!filename) {
      console.warn(`  ⚠️  Skipping row ${row.id} — couldn't extract filename from: ${row.source_image_url}`);
      skipped++;
      continue;
    }
    const newUrl = `${STORAGE_BASE_URL}${filename}`;
    updates.push({ id: row.id, source_image_url: newUrl });
  }

  if (updates.length === 0) {
    console.log('No valid rows to update.');
    return;
  }

  console.log(`Ready to update ${updates.length} rows (${skipped} skipped)...\n`);

  // Show a sample
  console.log('Sample updates:');
  for (let i = 0; i < Math.min(3, updates.length); i++) {
    const row = (rows as ClosetItemRow[]).find((r) => r.id === updates[i].id)!;
    console.log(`  ${row.title}:`);
    console.log(`    Old: ${row.source_image_url}`);
    console.log(`    New: ${updates[i].source_image_url}`);
    console.log('');
  }

  // ── Step 3: Apply updates in batches ──────────────────────
  const BATCH_SIZE = 50;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    console.log(`Updating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)}...`);

    for (const item of batch) {
      const { error: updateError } = await supabase
        .from('trendza_closet_items')
        .update({ source_image_url: item.source_image_url })
        .eq('id', item.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${item.id}: ${updateError.message}`);
        errors++;
      } else {
        updated++;
      }
    }
  }

  // ── Step 4: Summary ──────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('📋 BACKFILL SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`  Total rows found:  ${rows.length}`);
  console.log(`  Users affected:    ${userIds.size}`);
  console.log(`  Successfully updated: ${updated}`);
  console.log(`  Errors:            ${errors}`);
  console.log(`  Skipped:           ${skipped}`);

  if (errors === 0) {
    console.log('\n✅ Backfill complete! All existing seed items now have absolute URLs.');
  } else {
    console.log(`\n⚠️  ${errors} errors occurred — check logs above.`);
  }
}

main().catch(console.error);
