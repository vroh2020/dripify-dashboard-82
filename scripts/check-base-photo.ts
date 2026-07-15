import { createClient } from '@supabase/supabase-js';

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient('https://jjqwhxamjxsiotnhhqco.supabase.co', KEY);
const UID = 'b6ccbf15-bdb0-4aa1-a2f5-c5412e508b79';

const { data: profile } = await supabase
  .from('profiles')
  .select('selected_image, updated_at')
  .eq('id', UID)
  .maybeSingle();

if (!profile) { console.log('No profile found'); process.exit(1); }
console.log('selected_image:', profile.selected_image);
console.log('updated_at:', profile.updated_at);

const resp = await fetch(profile.selected_image, { signal: AbortSignal.timeout(15000) });
if (!resp.ok) { console.log('Fetch failed:', resp.status, resp.statusText); process.exit(1); }

const blob = await resp.blob();
console.log('Content-Type:', blob.type);
console.log('Size bytes:', blob.size);
console.log('Size KB:', Math.round(blob.size / 1024));
console.log('Content-Length header:', resp.headers.get('content-length'));
console.log('');

// Read first 12 bytes to check magic bytes / image type
const buf = await blob.slice(0, 12).arrayBuffer();
const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join(' ');
console.log('Magic bytes (first 12):', hex);
if (hex.startsWith('ff d8 ff')) console.log('=> Valid JPEG (JFIF/EXIF)');
else if (hex.startsWith('89 50 4e 47')) console.log('=> Valid PNG');
else console.log('=> Unknown file type');

console.log('');
console.log('The 14KB size is suspicious for a full-body photo.');
console.log('A typical full-body phone photo is 200-1000+ KB.');
console.log('14KB suggests either:');
console.log('  a) A heavily compressed/thumbnail image');
console.log('  b) A small icon or placeholder');
console.log('  c) A cropped close-up (not full body)');
