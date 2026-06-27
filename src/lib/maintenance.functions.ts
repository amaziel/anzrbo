import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Diagnostic des rôles & accès Storage de l'utilisateur connecté. */
export const roleDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const rolesToTest = ["super_admin", "admin_national", "admin_anzrbo", "agent_saisie", "nsia"];
    const roleResults: Array<{ role: string; has: boolean; error?: string }> = [];
    for (const r of rolesToTest) {
      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: r });
        roleResults.push({ role: r, has: !!data, error: error?.message });
      } catch (e: any) {
        roleResults.push({ role: r, has: false, error: e?.message ?? "rpc error" });
      }
    }

    // Lignes user_roles directement
    const { data: directRoles, error: drError } = await (supabase as any)
      .from("user_roles").select("role").eq("user_id", userId);

    // Tests tables
    const tableTests: Array<{ table: string; read: boolean; error?: string }> = [];
    for (const t of ["members", "paiements", "ayants_droit", "user_roles", "app_identifiants"]) {
      const { error } = await (supabase as any).from(t).select("*", { count: "exact", head: true });
      tableTests.push({ table: t, read: !error, error: error?.message });
    }

    // Tests Storage buckets
    const bucketTests: Array<{ bucket: string; list: boolean; error?: string }> = [];
    for (const b of ["member-photos", "payment-proofs", "member-cards"]) {
      const { error } = await (supabase as any).storage.from(b).list("", { limit: 1 });
      bucketTests.push({ bucket: b, list: !error, error: error?.message });
    }

    return {
      userId,
      email: claims?.email ?? null,
      directRoles: (directRoles ?? []).map((r: any) => r.role),
      directRolesError: drError?.message,
      rolesViaRpc: roleResults,
      tables: tableTests,
      buckets: bucketTests,
    };
  });

/** Supprime tous les membres "démo" + leurs fichiers Storage. Super_admin uniquement. */
export const purgeDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!isSuper) throw new Error("Forbidden — super_admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Identifie membres démo: par notes/marqueur OU prefix numero_membre DEMO-
    const { data: demo } = await (supabaseAdmin as any)
      .from("members")
      .select("id, photo_url, numero_membre")
      .or("numero_membre.ilike.DEMO-%,notes.ilike.%demo%");

    const ids = (demo ?? []).map((m: any) => m.id);
    let removedPhotos = 0;
    if (ids.length) {
      // Supprime photos Storage
      const paths: string[] = [];
      for (const m of demo) {
        if (m.photo_url) {
          const match = m.photo_url.match(/member-photos\/(.+)$/);
          if (match) paths.push(match[1]);
        }
      }
      if (paths.length) {
        const { data: removed } = await (supabaseAdmin as any).storage.from("member-photos").remove(paths);
        removedPhotos = removed?.length ?? 0;
      }
      // Supprime données liées (cascade attendu via FK, sinon explicite)
      await (supabaseAdmin as any).from("paiements").delete().in("member_id", ids);
      await (supabaseAdmin as any).from("ayants_droit").delete().in("member_id", ids);
      await (supabaseAdmin as any).from("member_cards").delete().in("member_id", ids);
      await (supabaseAdmin as any).from("members").delete().in("id", ids);
    }

    return { ok: true, membersRemoved: ids.length, photosRemoved: removedPhotos };
  });

/** Statut du seed (idempotence). */
export const seedStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await (supabaseAdmin as any)
    .from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "super_admin");
  return { seeded: (count ?? 0) > 0, superAdminCount: count ?? 0 };
});
