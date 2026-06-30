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

---

# Correctifs sécurité (à exécuter dans Supabase SQL Editor)

```sql
-- A) Bloquer l'énumération via resolve_login_email (finding enum_resolve_login_email)
REVOKE EXECUTE ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_login_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_login_email(text) FROM authenticated;
-- (l'app n'utilise plus cette RPC ; le code passe par resolve_identifier_to_email)

-- B) Rotation immédiate du mot de passe admin@mugec-ci.ci (finding hardcoded_mugec_pwd)
--    Remplace 'NOUVEAU_MOT_DE_PASSE_FORT' par une valeur aléatoire >= 16 car. avant exécution.
UPDATE auth.users
   SET encrypted_password = crypt('NOUVEAU_MOT_DE_PASSE_FORT', gen_salt('bf')),
       updated_at = now()
 WHERE email = 'admin@mugec-ci.ci';

-- C) Rendre privés les buckets PII / financiers (finding public_member_buckets)
UPDATE storage.buckets SET public = false
 WHERE id IN ('member-photos', 'payment-proofs', 'member-cards');

-- Politiques Storage : lecture/écriture réservées aux admins ANZRBO / super_admin / NSIA.
-- Suppose l'existence d'une fonction publique has_role(uuid, app_role).
DROP POLICY IF EXISTS "anzrbo_buckets_admin_select" ON storage.objects;
CREATE POLICY "anzrbo_buckets_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('member-photos', 'payment-proofs', 'member-cards')
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin_national')
      OR public.has_role(auth.uid(), 'admin_anzrbo')
      OR public.has_role(auth.uid(), 'nsia')
    )
  );

DROP POLICY IF EXISTS "anzrbo_buckets_admin_write" ON storage.objects;
CREATE POLICY "anzrbo_buckets_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id IN ('member-photos', 'payment-proofs', 'member-cards')
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin_national')
      OR public.has_role(auth.uid(), 'admin_anzrbo')
    )
  )
  WITH CHECK (
    bucket_id IN ('member-photos', 'payment-proofs', 'member-cards')
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin_national')
      OR public.has_role(auth.uid(), 'admin_anzrbo')
    )
  );
```

# Variables d'environnement serveur à configurer (finding hardcoded_seed_creds / unauthenticated_seed_fns)

À ajouter via Lovable Secrets (jamais commit) :

- `SEED_TOKEN` — jeton aléatoire (>= 24 car.) requis pour appeler `/seed-init`.
- `SEED_PWD_SUPER_ADMIN` — mot de passe initial du compte `admin` (>= 12 car.).
- `SEED_PWD_ANZRBO` — mot de passe initial du compte `0759566087` (>= 12 car.).
- `SEED_PWD_NSIA` — mot de passe initial du compte `nsia` (>= 12 car.).

Rotation immédiate (recommandée) des comptes déjà créés avec les anciens mots
de passe codés en dur : passer par l'interface `/admin/comptes` (super_admin)
ou le dashboard Supabase Auth.
