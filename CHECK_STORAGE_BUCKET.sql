-- Check if analysis-images bucket exists and create if needed
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'analysis-images';

-- If no results, run this to create the bucket:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'analysis-images',
--     'analysis-images',
--     true,
--     10485760,
--     '{"image/jpeg","image/png","image/gif","image/webp"}'
-- );