-- ============================================================================
-- Create storage buckets for the BiRefNet (server-side) bg-removal pipeline
-- ============================================================================
-- COPY OF: supabase/migrations/20260705000000_create_bg_buckets.sql
--
-- Paste this entire file into the Supabase SQL editor for the project
-- `jjqwhxamjxsiotnhhqco` if you don't want to use `supabase db push`.
-- Idempotent — safe to run multiple times.
--
-- Bucket sizes:
--   * raw-closet-items     → 25 MiB (iOS HEIC→JPEG peaks at ~8 MiB)
--   * clipped-closet-items → 50 MiB (BiRefNet lossless transparent PNG
--                                  output can balloon to 30–60 MiB on a
--                                  4K input, so we leave headroom)
--
-- KNOWN DEBT — STORAGE CLEANUP:
--   When a closet item is deleted via useClosetData.deleteItem, the row
--   goes away but the corresponding objects in BOTH buckets linger
--   indefinitely. Same leak exists on style_images. Tracked separately.
--   Janitor strategy: extend useClosetData.deleteItem to also call
--   `storage.remove([...])` for both buckets before the row delete.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) raw-closet-items — PRIVATE bucket. Owner-only R/W via path prefix.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
) VALUES (
    'raw-closet-items',
    'raw-closet-items',
    false,                            -- private (only owner can read)
    26214400,                         -- 25 MiB
    '{"image/jpeg","image/png","image/webp","image/gif"}'
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "raw_closet_items_select_own" ON storage.objects;
DROP POLICY IF EXISTS "raw_closet_items_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "raw_closet_items_update_own" ON storage.objects;
DROP POLICY IF EXISTS "raw_closet_items_delete_own" ON storage.objects;

CREATE POLICY "raw_closet_items_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'raw-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "raw_closet_items_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'raw-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "raw_closet_items_update_own" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'raw-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "raw_closet_items_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'raw-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );


-- ---------------------------------------------------------------------------
-- 2) clipped-closet-items — PUBLIC-READ bucket. Owner-only writes.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
) VALUES (
    'clipped-closet-items',
    'clipped-closet-items',
    true,                             -- public read (required for <img src=...>)
    52428800,                         -- 50 MiB (transparent PNGs can balloon)
    '{"image/png","image/jpeg","image/webp"}'
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "clipped_closet_items_select_public" ON storage.objects;
DROP POLICY IF EXISTS "clipped_closet_items_insert_own"    ON storage.objects;
DROP POLICY IF EXISTS "clipped_closet_items_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "clipped_closet_items_delete_own"    ON storage.objects;

CREATE POLICY "clipped_closet_items_select_public" ON storage.objects
    FOR SELECT USING (bucket_id = 'clipped-closet-items');

CREATE POLICY "clipped_closet_items_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'clipped-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "clipped_closet_items_update_own" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'clipped-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "clipped_closet_items_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'clipped-closet-items'
        AND (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

COMMIT;
