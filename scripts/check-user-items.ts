/**
 * Quick check: actual state of user's closet items + gen row metadata
 * Usage: npx tsx scripts/check-user-items.ts
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../src/lib/supabase-config';

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('Missing key'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, KEY);
const USER_ID = 'b6ccbf15-bdb0-4aa1-a2f5-c5412e508b79';

async function main() {
  console.log('=== CLOSET ITEMS for user b6ccbf15 ===');
  const { data: items, error } = await supabase
    .from('trendza_closet_items')
    .select('id, title, source_image_url')
    .eq('user_id', USER_ID)
    .order('title');

  if (error) { console.error('Query error:', error.message); return; }
  if (!items || items.length === 0) { console.log('No items found'); return; }

  let relCount = 0;
  let absCount = 0;
  for (const item of items) {
    const isRelative = item.source_image_url?.startsWith('/clothes/') ? true : false;
    if (isRelative) relCount++; else absCount++;
    const tag = isRelative ? 'RELATIVE' : 'ABSOLUTE';
    const url = item.source_image_url ?? '(null)';
    // Remove duplicate status lines
    console.log(`[${tag}] ${item.title} -> ${url.slice(0, 130)}`);
  }
  console.log(`\nTotal: ${items.length}, Relative: ${relCount}, Absolute: ${absCount}`);

  console.log('\n=== NEW GEN ROW METADATA (67ebf972) ===');
  const { data: gen } = await supabase
    .from('planner_generated_images')
    .select('id, status, metadata, created_at')
    .eq('id', '67ebf972-ae0f-4171-90a4-acaa8e0e3ed7')
    .maybeSingle();

  if (!gen) { console.log('Not found'); return; }
  console.log(`Status: ${gen.status}, Created: ${gen.created_at}`);

  const meta = gen.metadata;
  if (meta?.items) {
    for (const item of meta.items) {
      const tag = item.source_image_url?.startsWith('/clothes/') ? 'RELATIVE' : 'ABSOLUTE';
      console.log(`[${tag}] ${item.title} -> ${item.source_image_url?.slice(0, 130)}`);
    }
  }

  // Also check: when was the backfill query run? Check if any items still have relative paths
  console.log('\n=== DIRECT CHECK: items WHERE source_image_url LIKE /clothes/% ===');
  const { data: relItems, count } = await supabase
    .from('trendza_closet_items')
    .select('id, title, source_image_url', { count: 'exact' })
    .eq('user_id', USER_ID)
    .like('source_image_url', '/clothes/%');

  console.log(`Count: ${count}`);
  if (relItems && relItems.length > 0) {
    for (const item of relItems) {
      console.log(`  ${item.title} -> ${item.source_image_url}`);
    }
  }
}

main().catch(console.error);
