import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Rôles autorisables depuis l'UI super_admin (DigitOrg).
// Mappés à des valeurs de l'enum public.app_role.
export type AccountRole =
  | "super_admin"
  | "admin_national"
  | "delegue_section"
  | "nsia";

const ALLOWED_ROLES: AccountRole[] = [
  "super_admin",
  "admin_national",
  "delegue_section",
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
export const seedInitialAccounts = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Si un super_admin existe déjà, refuse le seed public.
    const { count } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) {
      return { ok: false as const, reason: "already_seeded" };
    }

    const seeds: Array<{ identifiant: string; password: string; role: AccountRole; display: string }> = [
      { identifiant: "admin",       password: "@DigitOrg",     role: "super_admin",    display: "DigitOrg" },
      { identifiant: "0759566087",  password: "@Anzrabo2026",  role: "admin_national", display: "Admin ANZRBO" },
      { identifiant: "nsia",        password: "@Nsia123",      role: "nsia",           display: "NSIA" },
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
        .upsert({ user_id: userId, role: s.role }, { onConflict: "user_id,role" });
      if (e2) { results.push({ identifiant: s.identifiant, ok: false, error: e2.message }); continue; }

      results.push({ identifiant: s.identifiant, ok: true });
    }

    return { ok: true as const, results };
  },
);

/** Liste des comptes (super_admin uniquement). */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);

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
    return (idents ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      identifiant: r.identifiant as string,
      display_name: r.display_name as string | null,
      created_at: r.created_at as string,
      roles: rolesByUser[r.user_id] ?? [],
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
      .insert({ user_id: userId, role: data.role });
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
