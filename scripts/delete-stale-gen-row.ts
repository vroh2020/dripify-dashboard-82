/**
 * Delete the stale gen row that has relative paths in its metadata.
 * Usage: npx tsx scripts/delete-stale-gen-row.ts
 */
import { createClient } from '@supabase/supabase-js';

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(
  'https://jjqwhxamjxsiotnhhqco.supabase.co',
  KEY,
);

const id = '67ebf972-ae0f-4171-90a4-acaa8e0e3ed7';
console.log('Deleting gen row:', id);

const { error } = await supabase
  .from('planner_generated_images')
  .delete()
  .eq('id', id);

if (error) {
  console.error('Delete failed:', error.message);
  process.exit(1);
}

console.log('✅ Deleted successfully');

// Verify it's gone
const { data: check } = await supabase
  .from('planner_generated_images')
  .select('id')
  .eq('id', id)
  .maybeSingle();

console.log('Verify:', check ? 'STILL EXISTS - something wrong' : 'Confirmed deleted');
