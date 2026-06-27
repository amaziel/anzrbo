# SQL à exécuter dans Supabase — PHASE FINALISATION

À copier/coller intégralement dans l'éditeur SQL de Supabase. Idempotent.

```sql
-- 1) Étendre l'enum app_role pour les rôles métier ANZRBO / NSIA
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_anzrbo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nsia';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delegue_section';

-- 2) Vider les membres de démonstration (et données liées en cascade)
DELETE FROM public.paiements;
DELETE FROM public.ayants_droit;
DELETE FROM public.member_cards;
DELETE FROM public.members;

-- 3) Réinitialiser le mot de passe DigitOrg / ANZRBO / NSIA
--    (exécutés via le seeder côté serveur — ces lignes assurent quand même
--     que les identifiants connus sont actifs)
UPDATE auth.users SET banned_until = NULL
 WHERE email IN ('admin@digitorg.local','0759566087@anzrbo.local','nsia@nsia.local');

-- 4) Storage : politiques pour les buckets utilisés par l'app
--    (les buckets sont créés via la console / l'outil dédié : member-photos,
--     payment-proofs, member-cards)
DROP POLICY IF EXISTS "anzrbo_storage_read"  ON storage.objects;
DROP POLICY IF EXISTS "anzrbo_storage_write" ON storage.objects;
DROP POLICY IF EXISTS "anzrbo_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "anzrbo_storage_delete" ON storage.objects;

CREATE POLICY "anzrbo_storage_read"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id IN ('member-photos','payment-proofs','member-cards'));

CREATE POLICY "anzrbo_storage_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('member-photos','payment-proofs','member-cards')
    AND (
      public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'admin_national')
      OR public.has_role(auth.uid(),'admin_anzrbo')
    )
  );

CREATE POLICY "anzrbo_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('member-photos','payment-proofs','member-cards')
    AND (
      public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'admin_national')
      OR public.has_role(auth.uid(),'admin_anzrbo')
    )
  );

CREATE POLICY "anzrbo_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('member-photos','payment-proofs','member-cards')
    AND (
      public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'admin_national')
    )
  );
```

## Après exécution
1. Aller sur `/seed-init` une fois pour (re)créer les 3 comptes administrateurs.
2. Se connecter avec `0759566087 / @Anzrbo2026` et tester la création d'un membre.
