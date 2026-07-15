import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jjqwhxamjxsiotnhhqco.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('planner_generated_images')
    .select('id, status, image_url, error_message, metadata, created_at, updated_at')
    .eq('id', 'a21c97ea-e385-4883-9edd-0dada8f80772')
    .single();

  if (error) {
    console.error('Query error:', error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
