# ANZRBO — Plan technique & Schéma Supabase complet

> Association des N'Zipris Résidents à Bonon (ANZRBO)
> Document de référence : architecture base de données, sécurité, storage, RPC.
> **Toute la section SQL ci-dessous est directement exécutable dans le SQL Editor de Supabase.**
> Projet ref Supabase : `ogseybvemtoxqpgpxewg`

---

## 1. Vue d'ensemble

| Domaine | Tables | RLS |
|---|---|---|
| Identité & rôles | `profiles`, `app_role` (enum), `user_roles` | ✅ |
| Membres | `members`, `member_status_history`, `ayants_droit` | ✅ |
| Paiements | `cotisations`, `assistances`, `nsia_souscriptions`, `paiements` | ✅ |
| Carte & QR | `member_cards`, `card_prints` | ✅ |
| Journalisation | `audit_logs` | ✅ |
| Buckets Storage | `member-photos` (privé), `payment-proofs` (privé), `member-cards` (privé), `public-assets` (public) | ✅ |

Tous les écrits passent par RLS + politiques scoppées via la fonction `public.has_role(uuid, app_role)` (SECURITY DEFINER).

---

## 2. Schéma SQL — à coller dans Supabase

```sql
-- ============================================================================
-- ANZRBO — Schéma complet (idempotent, exécutable d'un bloc)
-- ============================================================================

-- 2.1 Extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- 2.2 Enums
do $$ begin
  create type public.app_role as enum (
    'super_admin', 'admin_anzrbo', 'admin_nsia', 'agent_saisie',
    'imprimeur', 'tresorier', 'membre'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_statut as enum ('actif','suspendu','decede','archive','en_attente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.paiement_type as enum ('cotisation','assistance','nsia','autre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.paiement_statut as enum ('en_attente','paye','annule','rembourse');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.relation_familiale as enum (
    'conjoint','enfant','pere','mere','frere','soeur','autre'
  );
exception when duplicate_object then null; end $$;

-- 2.3 Utilitaires
create or replace function public.tg_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- 2.4 Profiles (1-1 avec auth.users — JAMAIS de rôles ici)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  telephone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.tg_updated_at();

-- 2.5 Rôles — table dédiée + has_role()
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('super_admin','admin_anzrbo','admin_nsia')
  );
$$;

-- 2.6 Membres
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  numero_membre text unique not null,
  nom text not null,
  prenoms text not null,
  sexe text check (sexe in ('M','F')),
  date_naissance date,
  lieu_naissance text,
  telephone text not null,
  contact2 text,
  email text,
  cni text,
  profession text,
  adresse text,
  quartier text,
  ville text default 'Bonon',
  photo_url text,
  date_inscription date not null default current_date,
  statut public.member_statut not null default 'en_attente',
  cotisation_mensuelle integer not null default 2000,
  nsia_souscrit boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists members_nom_trgm on public.members using gin (nom gin_trgm_ops);
create index if not exists members_prenoms_trgm on public.members using gin (prenoms gin_trgm_ops);
create index if not exists members_telephone_idx on public.members (telephone);
create index if not exists members_statut_idx on public.members (statut);
grant select, insert, update, delete on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;
drop trigger if exists members_updated on public.members;
create trigger members_updated before update on public.members
  for each row execute function public.tg_updated_at();

-- Génération automatique du matricule ANZRBO-YYYY-NNNNN
create sequence if not exists public.member_seq start 1;
create or replace function public.gen_numero_membre() returns trigger
language plpgsql as $$
begin
  if new.numero_membre is null or new.numero_membre = '' then
    new.numero_membre := 'ANZRBO-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('public.member_seq')::text, 5, '0');
  end if;
  return new;
end $$;
drop trigger if exists members_numero on public.members;
create trigger members_numero before insert on public.members
  for each row execute function public.gen_numero_membre();

-- 2.7 Historique de statut
create table if not exists public.member_status_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  ancien_statut public.member_statut,
  nouveau_statut public.member_statut not null,
  motif text,
  change_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists msh_member_idx on public.member_status_history(member_id);
grant select, insert on public.member_status_history to authenticated;
grant all on public.member_status_history to service_role;
alter table public.member_status_history enable row level security;

-- 2.8 Ayants droit (hiérarchie familiale)
create table if not exists public.ayants_droit (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  nom text not null,
  prenoms text not null,
  relation public.relation_familiale not null,
  date_naissance date,
  sexe text check (sexe in ('M','F')),
  telephone text,
  photo_url text,
  beneficiaire_assistance boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ayants_droit_member_idx on public.ayants_droit(member_id);
grant select, insert, update, delete on public.ayants_droit to authenticated;
grant all on public.ayants_droit to service_role;
alter table public.ayants_droit enable row level security;
drop trigger if exists ayants_droit_updated on public.ayants_droit;
create trigger ayants_droit_updated before update on public.ayants_droit
  for each row execute function public.tg_updated_at();

-- 2.9 Paiements (table unifiée)
create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  type public.paiement_type not null,
  montant integer not null check (montant >= 0),
  periode text,                    -- ex: '2026-06' pour cotisations
  statut public.paiement_statut not null default 'paye',
  methode text,                    -- especes / mobile_money / virement
  reference_externe text,          -- num transaction MoMo
  justificatif_url text,           -- chemin Storage
  paye_le timestamptz default now(),
  encaisse_par uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists paiements_member_idx on public.paiements(member_id);
create index if not exists paiements_type_idx on public.paiements(type);
create index if not exists paiements_periode_idx on public.paiements(periode);
create unique index if not exists paiements_cotisation_unique
  on public.paiements(member_id, periode) where type = 'cotisation';
grant select, insert, update, delete on public.paiements to authenticated;
grant all on public.paiements to service_role;
alter table public.paiements enable row level security;
drop trigger if exists paiements_updated on public.paiements;
create trigger paiements_updated before update on public.paiements
  for each row execute function public.tg_updated_at();

-- 2.10 NSIA — souscriptions individuelles
create table if not exists public.nsia_souscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  formule text not null,
  capital integer not null check (capital >= 0),
  prime_mensuelle integer not null check (prime_mensuelle >= 0),
  date_debut date not null default current_date,
  date_fin date,
  statut text not null default 'active' check (statut in ('active','suspendue','terminee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nsia_member_idx on public.nsia_souscriptions(member_id);
grant select, insert, update, delete on public.nsia_souscriptions to authenticated;
grant all on public.nsia_souscriptions to service_role;
alter table public.nsia_souscriptions enable row level security;
drop trigger if exists nsia_updated on public.nsia_souscriptions;
create trigger nsia_updated before update on public.nsia_souscriptions
  for each row execute function public.tg_updated_at();

-- 2.11 Cartes membres
create table if not exists public.member_cards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  version integer not null default 1,
  qr_payload text not null,           -- URL publique /verifier/...
  recto_pdf_url text,                 -- bucket member-cards
  verso_pdf_url text,
  active boolean not null default true,
  generated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create unique index if not exists cards_active_per_member
  on public.member_cards(member_id) where active;
grant select, insert, update on public.member_cards to authenticated;
grant all on public.member_cards to service_role;
alter table public.member_cards enable row level security;

-- 2.12 Impressions de carte
create table if not exists public.card_prints (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.member_cards(id) on delete cascade,
  imprimeur_id uuid references auth.users(id) on delete set null,
  printed_at timestamptz not null default now(),
  notes text
);
grant select, insert on public.card_prints to authenticated;
grant all on public.card_prints to service_role;
alter table public.card_prints enable row level security;

-- 2.13 Audit
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_entity_idx on public.audit_logs(entity, entity_id);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- profiles
drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "profile self upsert" on public.profiles;
create policy "profile self upsert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_roles : lecture par l'utilisateur, écriture par super_admin uniquement
drop policy if exists "roles self read" on public.user_roles;
create policy "roles self read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- members : lecture par tout admin, écriture par admin/agent
drop policy if exists "members admin read" on public.members;
create policy "members admin read" on public.members for select to authenticated
  using (public.is_admin(auth.uid())
         or public.has_role(auth.uid(),'agent_saisie')
         or public.has_role(auth.uid(),'imprimeur')
         or public.has_role(auth.uid(),'tresorier')
         or user_id = auth.uid());
drop policy if exists "members admin write" on public.members;
create policy "members admin write" on public.members for insert to authenticated
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'));
drop policy if exists "members admin update" on public.members;
create policy "members admin update" on public.members for update to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'))
  with check (true);
drop policy if exists "members admin delete" on public.members;
create policy "members admin delete" on public.members for delete to authenticated
  using (public.is_admin(auth.uid()));

-- ayants_droit
drop policy if exists "ad admin all" on public.ayants_droit;
create policy "ad admin all" on public.ayants_droit for all to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'));

-- paiements (trésorier + admin)
drop policy if exists "paiements read" on public.paiements;
create policy "paiements read" on public.paiements for select to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'tresorier')
         or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
drop policy if exists "paiements write" on public.paiements;
create policy "paiements write" on public.paiements for insert to authenticated
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'tresorier'));
drop policy if exists "paiements update" on public.paiements;
create policy "paiements update" on public.paiements for update to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'tresorier'));
drop policy if exists "paiements delete" on public.paiements;
create policy "paiements delete" on public.paiements for delete to authenticated
  using (public.is_admin(auth.uid()));

-- nsia
drop policy if exists "nsia all" on public.nsia_souscriptions;
create policy "nsia all" on public.nsia_souscriptions for all to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'admin_nsia'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'admin_nsia'));

-- cards
drop policy if exists "cards read" on public.member_cards;
create policy "cards read" on public.member_cards for select to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'imprimeur')
         or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
drop policy if exists "cards write" on public.member_cards;
create policy "cards write" on public.member_cards for insert to authenticated
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'));
drop policy if exists "cards update" on public.member_cards;
create policy "cards update" on public.member_cards for update to authenticated
  using (public.is_admin(auth.uid()));

-- card_prints
drop policy if exists "prints rw" on public.card_prints;
create policy "prints rw" on public.card_prints for all to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'imprimeur'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'imprimeur'));

-- status history
drop policy if exists "msh rw" on public.member_status_history;
create policy "msh rw" on public.member_status_history for all to authenticated
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie'));

-- audit (lecture admin uniquement, insert tout authentifié)
drop policy if exists "audit insert" on public.audit_logs;
create policy "audit insert" on public.audit_logs for insert to authenticated with check (true);
drop policy if exists "audit read" on public.audit_logs;
create policy "audit read" on public.audit_logs for select to authenticated
  using (public.is_admin(auth.uid()));

-- ============================================================================
-- 4. POLICY PUBLIQUE — vérification carte par QR (anon SELECT minimal)
-- ============================================================================

create or replace view public.member_public_profile as
  select id, numero_membre, nom, prenoms, photo_url, statut, date_inscription
  from public.members;
grant select on public.member_public_profile to anon, authenticated;

-- ============================================================================
-- 5. FONCTIONS MÉTIER
-- ============================================================================

-- 5.1 Bootstrap profil + rôle membre à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
    on conflict (id) do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'membre')
    on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5.2 Trigger historique statut membre
create or replace function public.tg_member_status_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.statut is distinct from old.statut then
    insert into public.member_status_history(member_id, ancien_statut, nouveau_statut, change_by)
      values (new.id, old.statut, new.statut, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists members_status_hist on public.members;
create trigger members_status_hist after update on public.members
  for each row execute function public.tg_member_status_history();

-- 5.3 Carte automatique après création de membre
create or replace function public.tg_member_autocard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.member_cards(member_id, qr_payload, created_by)
  values (new.id, 'https://anzrbo1.lovable.app/verifier/' || new.numero_membre, auth.uid());
  return new;
end $$;
drop trigger if exists members_autocard on public.members;
create trigger members_autocard after insert on public.members
  for each row execute function public.tg_member_autocard();

-- ============================================================================
-- 6. STORAGE BUCKETS (à créer via supabase--storage_create_bucket, pas en SQL)
-- ============================================================================
-- - member-photos    : privé,  RLS sur storage.objects
-- - payment-proofs   : privé
-- - member-cards     : privé (PDF recto/verso)
-- - public-assets    : public (logo, illustrations)
--
-- Policies storage.objects (exemple) :
--   create policy "photos read auth" on storage.objects for select to authenticated
--     using (bucket_id = 'member-photos');
--   create policy "photos write admin" on storage.objects for insert to authenticated
--     with check (bucket_id = 'member-photos' and
--       (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'agent_saisie')));
```

---

## 3. Buckets Storage (créés via outil dédié)

| Bucket | Public | Usage |
|---|---|---|
| `member-photos` | non | Photos d'identité (≤ 2 Mo, compressées côté client) |
| `payment-proofs` | non | Justificatifs (photo caméra + upload) |
| `member-cards` | non | PDF haute résolution recto/verso (impression PVC) |
| `public-assets` | oui | Logo, illustrations site public |

---

## 4. Comptes administrateurs (provisionnés via migration de seed)

| Rôle | Identifiant | Mot de passe initial |
|---|---|---|
| DigitOrg (super_admin) | `admin@digitorg.local` | `@DigitOrg` |
| ANZRBO (admin_anzrbo) | `sg@anzrbo.local` (alias `0759566087`) | `@Anzrabo2026` |
| NSIA (admin_nsia) | `nsia@anzrbo.local` | `@Nsia123` |

> Les identifiants courts (`admin`, `0759566087`, `nsia`) sont mappés à ces emails par la page de login.
> Les mots de passe seront hashés par Supabase Auth (bcrypt) lors du seed via Admin API.

---

## 5. Architecture front

- **Routes publiques** : `/`, `/verifier/$matricule`, `/scanner`, `/nsia`, `/contact`, `/faq`, `/carte` (portail imprimeur).
- **Routes protégées** (`_authenticated/admin/*`) : dashboard, membres CRUD, paiements, NSIA, audit.
- **Carte membre** : format CR80 (85,6 × 53,98 mm), rendu HTML→PDF via `jspdf` + `html2canvas`, QR code haute densité (ECC=H).
- **Realtime** : table `members` + `paiements` exposées via `supabase_realtime` pour rafraîchissement instantané du profil public scanné.

---

## 6. Sécurité

- RLS activée sur **toutes** les tables `public.*`.
- Aucun rôle stocké sur `profiles` — toujours via `user_roles` + `has_role()`.
- Validation Zod côté formulaire ET contraintes SQL.
- Service role uniquement côté server functions TanStack.
- Audit log automatique pour : création/suppression membre, paiement, changement de statut, impression carte.

---

## 7. Ordre d'exécution recommandé

1. Coller la section SQL §2 dans le SQL Editor Supabase.
2. Créer les 4 buckets storage via l'interface Supabase.
3. Lancer le seed des 3 comptes admin (script Node ou Dashboard Auth).
4. Activer `supabase_realtime` sur `members` et `paiements`.
5. Déployer le front (CRUD branché sur `@/integrations/supabase/client`).

---

_Document généré pour le projet ANZRBO — `a4613a34-7096-454e-8fbb-e8cfd0160e36`._
