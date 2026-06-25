-- Prevent listing of public buckets by removing broad SELECT policies on storage.objects.
-- Public buckets remain directly accessible via their public URLs (no policy required for public bucket reads),
-- but clients can no longer enumerate (list) all files in the bucket.
DROP POLICY IF EXISTS "public-media read" ON storage.objects;
DROP POLICY IF EXISTS "content public read" ON storage.objects;