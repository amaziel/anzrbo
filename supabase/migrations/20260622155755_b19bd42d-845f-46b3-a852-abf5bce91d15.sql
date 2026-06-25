-- Avatars: explicit SELECT policy (owner-folder or admin)
DROP POLICY IF EXISTS "avatars select owner or admin" ON storage.objects;
CREATE POLICY "avatars select owner or admin"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (
    public.is_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- Subscriptions: allow financial admins (tresorier_national, admin_national, super_admin) to read
DROP POLICY IF EXISTS "subscriptions select payment managers" ON public.subscriptions;
CREATE POLICY "subscriptions select payment managers"
ON public.subscriptions FOR SELECT
TO authenticated
USING (public.can_manage_payments(auth.uid()));
