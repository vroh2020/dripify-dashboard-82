-- ============================================================================
-- Create storage buckets for the BiRefNet (server-side) bg-removal pipeline
-- ============================================================================
-- This migration creates the two storage buckets referenced by the deployed
-- `process-bg` Supabase Edge Function:
--
--   * `raw-closet-items`     (PRIVATE)  — the auth user uploads raw blobs
--                                          here via `useUnifiedBackgroundRemoval`.
--                                          The Edge Function (using
--                                          SERVICE_ROLE_KEY) downloads from
--                                          here, calls Hugging Face BiRefNet,
--                                          then writes the transparent PNG.
--
--   * `clipped-closet-items` (PUBLIC)   — the resulting transparent PNG
--                                          lands here. The frontend resolves
--                                          a `getPublicUrl()` and embeds it in
--                                          `<img src=...>` anonymously, so
--                                          public-read is REQUIRED.
--
-- Storage RLS for both buckets enforces that the first two path segments
-- are `uploads` and `{auth.uid()::text}` respectively, mirroring the
-- `analysis-images` policy pattern in `FIX_RLS_POLICIES.sql`. This blocks
-- the "anyone with a token can write anywhere in the bucket" hole that a
-- permissive style_images-style policy would create.
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

-- Idempotent policy replacement (transactional DDL; safe to re-run)
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
-- The hook only ever *reads* from this bucket via `getPublicUrl()`; the
-- Edge Function (SERVICE_ROLE_KEY, which bypasses RLS) writes the
-- transparent PNG. The owner-write policies below are defense-in-depth
-- in case we later add client-side re-clip or delete flows.

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

-- Public SELECT is what makes `getPublicUrl()` produce a fetchable URL.
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
