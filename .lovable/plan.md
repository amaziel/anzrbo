## Objectif

- Aucune connexion par email. Login uniquement avec **identifiant + mot de passe** (comme tu l'imposes).
- Créer les 3 comptes obligatoires : `admin` / `0759566087` / `nsia`.
- Le super admin **DigitOrg** peut créer des comptes **admin** et **délégués** pour ANZRBO depuis une interface dédiée.

## Comment ça marche techniquement (Supabase exige un email)

Supabase Auth impose un email côté moteur. On le **cache totalement à l'utilisateur** :
- À la création d'un compte, l'identifiant `X` est converti en email interne `X@anzrbo.local` (jamais affiché).
- Le formulaire de login ne demande **que** : `Identifiant` + `Mot de passe`.
- Une fonction serveur `resolveIdentifier(identifier)` mappe identifiant → email interne, puis `signInWithPassword` est appelé en arrière-plan.
- Aucune confirmation email, aucun reset par email, aucun magic link.

Côté UI : un seul champ "Identifiant" — l'utilisateur ne voit jamais d'email.

## Lots

### Lot 1 — Schéma DB
- Table `app_identifiants` : `user_id uuid PK → auth.users`, `identifiant text unique`, `display_name text`, `created_by uuid`, `created_at`.
- Enum `app_role` (déjà existant) — vérifier valeurs : `super_admin` (DigitOrg), `admin_anzrbo`, `delegue_anzrbo`, `admin_nsia`.
- `user_roles` (existe déjà) — réutilisée.
- RLS + GRANTs + fonction `has_role` (déjà présente).
- Fonction RPC `resolve_identifier_to_email(p_identifier text) returns text` — SECURITY DEFINER, accessible `anon`, retourne l'email interne **sans révéler si l'identifiant existe** (renvoie une valeur factice si introuvable pour empêcher l'énumération).

### Lot 2 — Création des 3 comptes
Migration de seed via un appel admin (server function exécutée une fois) :
- `admin` → email interne `admin@digitorg.local`, mdp `@DigitOrg`, rôle `super_admin`
- `0759566087` → `0759566087@anzrbo.local`, mdp `@Anzrabo2026`, rôle `admin_anzrbo`
- `nsia` → `nsia@nsia.local`, mdp `@Nsia123`, rôle `admin_nsia`

### Lot 3 — Refonte du login
- `src/routes/login.tsx` : un seul champ "Identifiant" + mot de passe. Plus aucune mention d'email.
- `src/lib/auth.tsx` : `signIn(identifiant, password)` appelle `resolve_identifier_to_email` puis `supabase.auth.signInWithPassword`.

### Lot 4 — Interface DigitOrg : gestion comptes
Nouvelle route `/admin/comptes` (visible uniquement si `super_admin`) :
- Liste des comptes (identifiant, rôle, créé le)
- Bouton **« Créer un compte »** : formulaire (identifiant, mot de passe, rôle = admin_anzrbo | delegue_anzrbo)
- Server function `createAccount({ identifiant, password, role })` protégée par `requireSupabaseAuth` + check `has_role(super_admin)` → utilise `supabaseAdmin.auth.admin.createUser`, insère `app_identifiants` + `user_roles`.
- Bouton **« Désactiver »** / **« Réinitialiser mot de passe »** (le super admin fixe le nouveau mdp manuellement, pas d'email).

### Lot 5 — Sécurité
- `resolve_identifier_to_email` : retourne `concat(md5(p_identifier), '@invalid.local')` si introuvable (réponse constante, anti-énumération).
- RLS sur `app_identifiants` : SELECT autorisé seulement à `super_admin` + lecture propre ligne.
- `createAccount` rejette si appelant ≠ super_admin.

## Détails techniques

- Fichiers créés/modifiés :
  - migration SQL (table `app_identifiants`, RPC `resolve_identifier_to_email`)
  - `src/lib/auth.tsx` (signIn par identifiant)
  - `src/routes/login.tsx` (champ unique identifiant)
  - `src/lib/accounts.functions.ts` (createAccount, listAccounts, resetPassword)
  - `src/routes/_authenticated/admin/comptes.tsx` (UI super admin)
  - `src/lib/seed-accounts.functions.ts` (seed des 3 comptes, idempotent)
- L'email interne reste un détail d'implémentation invisible côté UX.

## Ce que je te demanderai après validation

1. Exécuter la migration SQL fournie dans le SQL Editor Supabase (je ne peux pas la pousser moi-même).
2. Cliquer une fois sur un bouton « Initialiser les comptes » que j'ajoute (one-shot, désactivé après).

Confirme et je code l'ensemble.
