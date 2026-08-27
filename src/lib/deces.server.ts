// Helpers serveur pour le registre des décès, cotisations liées et assistances.
// Modèle : tout est stocké dans `public.paiements` (aucune nouvelle table requise).
//  - Décès      : type='autre',      reference_externe='DECES:<uuid>', notes=JSON
//  - Cotisation : type='cotisation', periode='DECES:<uuid>'
//  - Assistance : type='assistance', periode='DECES:<uuid>', notes=JSON

export const DECES_PREFIX = "DECES:";
export const ADMIN_ROLES = ["super_admin", "admin_national", "admin_anzrbo", "agent_saisie"];
export const READ_ROLES = [...ADMIN_ROLES, "nsia", "admin_regional"];

export async function trustedDb(context: any) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    void (supabaseAdmin as any).from;
    return supabaseAdmin as any;
  } catch {
    return context.supabase as any;
  }
}

export async function assertRole(context: any, roles: string[]) {
  const db = await trustedDb(context);
  try {
    const { data, error } = await db.from("user_roles").select("role").eq("user_id", context.userId).in("role", roles);
    if (!error && (data?.length ?? 0) > 0) return;
  } catch { /* fallback */ }
  for (const r of roles) {
    try {
      const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: r });
      if (!error && data) return;
    } catch { /* enum inconnu */ }
  }
  throw new Error("Accès refusé : rôle administrateur ANZRBO requis.");
}

export function safeJson(v: any): any {
  try { return typeof v === "string" ? JSON.parse(v) : (v ?? {}); } catch { return {}; }
}

export function decesTag(id: string) {
  return `${DECES_PREFIX}${id}`;
}

export function decesIdFromTag(tag?: string | null) {
  const t = String(tag ?? "");
  return t.startsWith(DECES_PREFIX) ? t.slice(DECES_PREFIX.length) : null;
}

export function mapDeces(row: any) {
  const meta = safeJson(row.notes);
  return {
    id: row.id,
    member_id: row.member_id,
    defunt_nom: meta.defunt_nom ?? "",
    defunt_type: meta.defunt_type ?? "principal",
    lien: meta.lien ?? null,
    date_deces: meta.date_deces ?? null,
    date_declaration: meta.date_declaration ?? row.created_at,
    lieu: meta.lieu ?? null,
    statut: meta.statut ?? "declare",
    nsia: !!meta.nsia,
    observations: meta.observations ?? null,
    created_at: row.created_at,
    membre: row.members ?? null,
  };
}

export function mapAssistance(row: any) {
  const meta = safeJson(row.notes);
  return {
    id: row.id,
    deces_id: decesIdFromTag(row.periode),
    member_id: row.member_id,
    montant: Number(row.montant ?? 0),
    statut: row.statut === "paye" ? "versee" : row.statut === "annule" ? "refusee" : "en_attente",
    beneficiaire_nom: meta.beneficiaire_nom ?? "",
    beneficiaire_contact: meta.beneficiaire_contact ?? "",
    motif_refus: meta.motif_refus ?? null,
    nsia: !!meta.nsia,
    nsia_brut: Number(meta.nsia_brut ?? 0),
    verse_le: row.paye_le,
    created_at: row.created_at,
    membre: row.members ?? null,
  };
}

export const MEMBER_JOIN = "members(id,numero_membre,nom,prenoms,telephone,contact2,statut,ville,quartier,photo_url,date_inscription)";
