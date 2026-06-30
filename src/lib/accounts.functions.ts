import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Rôles autorisables depuis l'UI super_admin (DigitOrg).
// Mappés à des valeurs de l'enum public.app_role.
export type AccountRole =
  | "super_admin"
  | "admin_anzrbo"
  | "agent_saisie"
  | "nsia";

export type AccountRow = {
  user_id: string;
  identifiant: string;
  display_name: string | null;
  created_at: string;
  roles: string[];
  active: boolean;
  banned_until: string | null;
  email: string | null;
};

const ALLOWED_ROLES: AccountRole[] = [
  "super_admin",
  "admin_anzrbo",
  "agent_saisie",
  "nsia",
];

function emailForIdentifier(identifiant: string, role: AccountRole): string {
  const id = identifiant.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const domain =
    role === "super_admin" ? "digitorg.local"
    : role === "nsia" ? "nsia.local"
    : "anzrbo.local";
  return `${id}@${domain}`;
}

/** Map a logical AccountRole to a value that exists in public.app_role today.
 *  Falls back to admin_national for values not yet added to the enum. */
function dbRoleFor(role: AccountRole): string {
  if (role === "super_admin") return "super_admin";
  if (role === "agent_saisie") return "agent_saisie";
  // admin_anzrbo & nsia: enum may not contain them yet — use admin_national
  return "admin_national";
}


async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/**
 * Seed des 3 comptes obligatoires. Idempotent.
 * Autorisé uniquement si AUCUN super_admin n'existe encore (premier lancement),
 * sinon réservé à un super_admin connecté.
 */
export const seedInitialAccounts = createServerFn({ method: "POST" })
  .inputValidator((data: { seedToken?: string } = {}) => ({
    seedToken: typeof data?.seedToken === "string" ? data.seedToken : "",
  }))
  .handler(async ({ data }) => {
    // Gate 1: must provide a server-side shared secret.
    const expected = process.env.SEED_TOKEN ?? "";
    if (!expected) throw new Error("Seed désactivé (SEED_TOKEN non configuré côté serveur)");
    if (!data.seedToken || data.seedToken.length < 8 || data.seedToken !== expected) {
      throw new Error("Jeton de seed invalide");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Gate 2: idempotence — refuse si un super_admin existe déjà.
    const { count } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) {
      return { ok: false as const, reason: "already_seeded" };
    }

    // Gate 3: lit les mots de passe depuis l'environnement serveur (jamais dans le code).
    const pwSuper = process.env.SEED_PWD_SUPER_ADMIN ?? "";
    const pwAnzrbo = process.env.SEED_PWD_ANZRBO ?? "";
    const pwNsia = process.env.SEED_PWD_NSIA ?? "";
    if (!pwSuper || !pwAnzrbo || !pwNsia) {
      throw new Error("Mots de passe seed manquants (SEED_PWD_SUPER_ADMIN / SEED_PWD_ANZRBO / SEED_PWD_NSIA)");
    }
    if ([pwSuper, pwAnzrbo, pwNsia].some((p) => p.length < 12)) {
      throw new Error("Mots de passe seed trop courts (min 12 caractères)");
    }

    const seeds: Array<{ identifiant: string; password: string; role: AccountRole; display: string }> = [
      { identifiant: "admin",       password: pwSuper,  role: "super_admin",    display: "DigitOrg" },
      { identifiant: "0759566087",  password: pwAnzrbo, role: "admin_anzrbo",   display: "Admin ANZRBO" },
      { identifiant: "nsia",        password: pwNsia,   role: "nsia",           display: "NSIA" },
    ];


    const results: Array<{ identifiant: string; ok: boolean; error?: string }> = [];

    for (const s of seeds) {
      const email = emailForIdentifier(s.identifiant, s.role);

      // 1) Crée l'utilisateur auth (ou récupère l'existant)
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: s.password,
        email_confirm: true,
        user_metadata: { display_name: s.display, identifiant: s.identifiant },
      });

      let userId = created.data.user?.id;
      if (!userId) {
        // existe déjà — on le retrouve via app_identifiants ou listUsers
        const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        userId = list.data.users.find((u) => u.email === email)?.id;
      }
      if (!userId) { results.push({ identifiant: s.identifiant, ok: false, error: "no user id" }); continue; }

      // 2) upsert app_identifiants
      const { error: e1 } = await (supabaseAdmin as any)
        .from("app_identifiants")
        .upsert({ user_id: userId, identifiant: s.identifiant, display_name: s.display }, { onConflict: "user_id" });
      if (e1) { results.push({ identifiant: s.identifiant, ok: false, error: e1.message }); continue; }

      // 3) upsert user_roles
      const { error: e2 } = await (supabaseAdmin as any)
        .from("user_roles")
        .upsert({ user_id: userId, role: dbRoleFor(s.role) }, { onConflict: "user_id,role" });
      if (e2) { results.push({ identifiant: s.identifiant, ok: false, error: e2.message }); continue; }

      results.push({ identifiant: s.identifiant, ok: true });
    }

    return { ok: true as const, results };
  },
);

/** Liste des comptes (super_admin uniquement). */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountRow[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: idents, error } = await (context.supabase as any)
      .from("app_identifiants")
      .select("user_id, identifiant, display_name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids: string[] = (idents ?? []).map((r: any) => r.user_id);
    let rolesByUser: Record<string, string[]> = {};
    if (ids.length) {
      const { data: roles } = await (context.supabase as any)
        .from("user_roles").select("user_id, role").in("user_id", ids);
      for (const r of (roles ?? []) as Array<{ user_id: string; role: string }>) {
        (rolesByUser[r.user_id] ??= []).push(r.role);
      }
    }
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const usersById = new Map((usersData.users ?? []).map((u) => [u.id, u]));
    return (idents ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      identifiant: r.identifiant as string,
      display_name: r.display_name as string | null,
      created_at: r.created_at as string,
      roles: rolesByUser[r.user_id] ?? [],
      active: !usersById.get(r.user_id)?.banned_until,
      banned_until: usersById.get(r.user_id)?.banned_until ?? null,
      email: usersById.get(r.user_id)?.email ?? null,
    }));
  });

/** Crée un compte (super_admin uniquement). */
export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { identifiant: string; password: string; role: AccountRole; display_name?: string }) => {
    if (!data?.identifiant || data.identifiant.trim().length < 3) throw new Error("Identifiant trop court");
    if (!data?.password || data.password.length < 6) throw new Error("Mot de passe trop court");
    if (!ALLOWED_ROLES.includes(data.role)) throw new Error("Rôle invalide");
    return {
      identifiant: data.identifiant.trim(),
      password: data.password,
      role: data.role,
      display_name: (data.display_name ?? "").trim() || data.identifiant.trim(),
    };
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Conflit identifiant ?
    const { data: existing } = await (supabaseAdmin as any)
      .from("app_identifiants").select("user_id").eq("identifiant", data.identifiant).maybeSingle();
    if (existing) throw new Error("Identifiant déjà utilisé");

    const email = emailForIdentifier(data.identifiant, data.role);
    const { data: created, error: ce } = await supabaseAdmin.auth.admin.createUser({
      email, password: data.password, email_confirm: true,
      user_metadata: { display_name: data.display_name, identifiant: data.identifiant },
    });
    if (ce || !created.user) throw new Error(ce?.message ?? "Création échouée");

    const userId = created.user.id;
    const { error: e1 } = await (supabaseAdmin as any).from("app_identifiants")
      .insert({ user_id: userId, identifiant: data.identifiant, display_name: data.display_name, created_by: context.userId });
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await (supabaseAdmin as any).from("user_roles")
      .insert({ user_id: userId, role: dbRoleFor(data.role) });
    if (e2) throw new Error(e2.message);

    return { ok: true, user_id: userId };
  });

/** Réinitialise le mot de passe d'un compte (super_admin uniquement). */
export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string; password: string }) => {
    if (!data?.user_id) throw new Error("user_id requis");
    if (!data?.password || data.password.length < 6) throw new Error("Mot de passe trop court");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Active ou désactive un compte par identifiant (super_admin uniquement). */
export const setAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { identifiant: string; active: boolean }) => {
    if (!data?.identifiant || data.identifiant.trim().length < 3) throw new Error("Identifiant requis");
    if (typeof data.active !== "boolean") throw new Error("Statut requis");
    return { identifiant: data.identifiant.trim(), active: data.active };
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: lookupError } = await (supabaseAdmin as any)
      .from("app_identifiants")
      .select("user_id")
      .eq("identifiant", data.identifiant)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!row?.user_id) throw new Error("Compte introuvable");
    if (!data.active && row.user_id === context.userId) throw new Error("Vous ne pouvez pas désactiver votre propre compte");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Supprime un compte (super_admin uniquement). */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string }) => {
    if (!data?.user_id) throw new Error("user_id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
