import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_ROLES, READ_ROLES, MEMBER_JOIN, assertRole, trustedDb, decesTag, mapDeces, mapAssistance, safeJson,
} from "@/lib/deces.server";

export const listDeces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, READ_ROLES);
    const db = await trustedDb(context);
    const { data, error } = await db
      .from("paiements")
      .select(`*, ${MEMBER_JOIN}`)
      .eq("type", "autre")
      .like("reference_externe", "DECES:%")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(`Registre décès : ${error.message}`);
    return { rows: (data ?? []).map(mapDeces) };
  });

export const createDeces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    member_id: string; defunt_nom: string; defunt_type?: string; lien?: string;
    date_deces: string; lieu?: string; nsia?: boolean; observations?: string;
  }) => {
    if (!data?.member_id) throw new Error("Membre lié requis");
    if (!data?.defunt_nom?.trim()) throw new Error("Nom du défunt requis");
    if (!data?.date_deces) throw new Error("Date du décès requise");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const id = crypto.randomUUID();
    const meta = {
      kind: "deces",
      defunt_nom: data.defunt_nom.trim().toUpperCase(),
      defunt_type: data.defunt_type ?? "principal",
      lien: data.lien ?? null,
      date_deces: data.date_deces,
      date_declaration: new Date().toISOString(),
      lieu: data.lieu ?? null,
      statut: "declare",
      nsia: !!data.nsia,
      observations: data.observations ?? null,
    };
    const { data: row, error } = await db.from("paiements").insert({
      id,
      member_id: data.member_id,
      type: "autre",
      montant: 0,
      statut: "en_attente",
      reference_externe: `DECES:${id}`,
      notes: JSON.stringify(meta),
      paye_le: new Date().toISOString(),
      encaisse_par: context.userId,
    }).select(`*, ${MEMBER_JOIN}`).single();
    if (error) throw new Error(`Déclaration décès : ${error.message}`);
    if (meta.defunt_type === "principal") {
      await db.from("members").update({ statut: "decede" }).eq("id", data.member_id);
    }
    return { ok: true, deces: mapDeces(row) };
  });

export const updateDeces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: Record<string, any> }) => {
    if (!data?.id) throw new Error("id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const { data: current, error: e1 } = await db.from("paiements").select("notes").eq("id", data.id).single();
    if (e1) throw new Error(`Décès introuvable : ${e1.message}`);
    const allowed = ["defunt_nom", "defunt_type", "lien", "date_deces", "lieu", "statut", "nsia", "observations"];
    const meta = { ...safeJson(current.notes) };
    for (const k of allowed) if (k in data.patch) meta[k] = data.patch[k];
    const { error } = await db.from("paiements").update({ notes: JSON.stringify(meta) }).eq("id", data.id);
    if (error) throw new Error(`Mise à jour décès : ${error.message}`);
    return { ok: true };
  });

export const deleteDeces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    await db.from("paiements").delete().eq("periode", `DECES:${data.id}`);
    const { error } = await db.from("paiements").delete().eq("id", data.id);
    if (error) throw new Error(`Suppression décès : ${error.message}`);
    return { ok: true };
  });

/** Lignes de cotisation ouvertes par un décès : membres actifs + statut de paiement. */
export const listCotisationsDeces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { deces_id?: string } = {}) => ({ deces_id: data.deces_id ?? "" }))
  .handler(async ({ data, context }) => {
    await assertRole(context, READ_ROLES);
    const db = await trustedDb(context);
    const [{ data: members, error: e1 }, { data: paid, error: e2 }] = await Promise.all([
      db.from("members").select("id,numero_membre,nom,prenoms,telephone,contact2,statut,ville").eq("statut", "actif").order("nom"),
      data.deces_id
        ? db.from("paiements").select("*").eq("type", "cotisation").eq("periode", decesTag(data.deces_id)).limit(5000)
        : db.from("paiements").select("*").eq("type", "cotisation").limit(5000),
    ]);
    if (e1) throw new Error(`Membres : ${e1.message}`);
    if (e2) throw new Error(`Cotisations : ${e2.message}`);
    const byMember = new Map((paid ?? []).map((p: any) => [p.member_id, p]));
    const lignes = (members ?? []).map((m: any) => ({
      membre: m,
      paiement: byMember.get(m.id) ?? null,
      statut: byMember.get(m.id) ? "paye" : "en_retard",
    }));
    return {
      lignes,
      collecte: (paid ?? []).reduce((s: number, p: any) => s + (Number(p.montant) || 0), 0),
      payees: (paid ?? []).length,
      total: lignes.length,
    };
  });

export const payCotisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    deces_id: string; member_id: string; montant: number;
    methode?: string; reference_externe?: string; justificatif_url?: string;
  }) => {
    if (!data?.deces_id) throw new Error("Décès requis");
    if (!data?.member_id) throw new Error("Membre requis");
    if (!Number.isFinite(data?.montant) || data.montant <= 0) throw new Error("Montant invalide");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const tag = decesTag(data.deces_id);
    const { data: existing } = await db.from("paiements").select("id")
      .eq("type", "cotisation").eq("periode", tag).eq("member_id", data.member_id).limit(1).maybeSingle();
    if (existing) return { ok: true, duplicate: true, id: existing.id };
    const { data: row, error } = await db.from("paiements").insert({
      member_id: data.member_id,
      type: "cotisation",
      montant: data.montant,
      statut: "paye",
      periode: tag,
      methode: data.methode || "especes",
      reference_externe: data.reference_externe || null,
      justificatif_url: data.justificatif_url || null,
      paye_le: new Date().toISOString(),
      encaisse_par: context.userId,
    }).select("*").single();
    if (error) throw new Error(`Encaissement cotisation : ${error.message}`);
    return { ok: true, paiement: row };
  });

export const deleteCotisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const { error } = await db.from("paiements").delete().eq("id", data.id);
    if (error) throw new Error(`Annulation cotisation : ${error.message}`);
    return { ok: true };
  });

export const listAssistances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, READ_ROLES);
    const db = await trustedDb(context);
    const { data, error } = await db
      .from("paiements")
      .select(`*, ${MEMBER_JOIN}`)
      .eq("type", "assistance")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(`Assistances : ${error.message}`);
    return { rows: (data ?? []).map(mapAssistance) };
  });

export const createAssistance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    deces_id: string; member_id: string; montant: number;
    beneficiaire_nom: string; beneficiaire_contact?: string; nsia?: boolean; nsia_brut?: number;
  }) => {
    if (!data?.deces_id) throw new Error("Décès requis");
    if (!data?.member_id) throw new Error("Membre requis");
    if (!data?.beneficiaire_nom?.trim()) throw new Error("Bénéficiaire requis");
    if (!Number.isFinite(data?.montant) || data.montant <= 0) throw new Error("Montant invalide");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const tag = decesTag(data.deces_id);
    const { data: existing } = await db.from("paiements").select("id")
      .eq("type", "assistance").eq("periode", tag).limit(1).maybeSingle();
    if (existing) throw new Error("Un dossier d'assistance existe déjà pour ce décès (unicité 1 par décès).");
    const { data: row, error } = await db.from("paiements").insert({
      member_id: data.member_id,
      type: "assistance",
      montant: data.montant,
      statut: "en_attente",
      periode: tag,
      methode: "especes",
      encaisse_par: context.userId,
      notes: JSON.stringify({
        kind: "assistance",
        beneficiaire_nom: data.beneficiaire_nom.trim().toUpperCase(),
        beneficiaire_contact: data.beneficiaire_contact ?? "",
        nsia: !!data.nsia,
        nsia_brut: Number(data.nsia_brut ?? 0),
      }),
    }).select(`*, ${MEMBER_JOIN}`).single();
    if (error) throw new Error(`Dossier assistance : ${error.message}`);
    return { ok: true, assistance: mapAssistance(row) };
  });

export const setAssistanceStatut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; statut: "versee" | "refusee" | "en_attente"; motif_refus?: string }) => {
    if (!data?.id) throw new Error("id requis");
    if (!["versee", "refusee", "en_attente"].includes(data?.statut)) throw new Error("Statut invalide");
    if (data.statut === "refusee" && !data.motif_refus?.trim()) throw new Error("Motif de refus requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const { data: current, error: e1 } = await db.from("paiements").select("notes").eq("id", data.id).single();
    if (e1) throw new Error(`Dossier introuvable : ${e1.message}`);
    const meta = { ...safeJson(current.notes), motif_refus: data.statut === "refusee" ? data.motif_refus : null };
    const statut = data.statut === "versee" ? "paye" : data.statut === "refusee" ? "annule" : "en_attente";
    const { error } = await db.from("paiements").update({
      statut,
      notes: JSON.stringify(meta),
      paye_le: data.statut === "versee" ? new Date().toISOString() : null,
    }).eq("id", data.id);
    if (error) throw new Error(`Mise à jour assistance : ${error.message}`);
    return { ok: true };
  });

export const deleteAssistance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertRole(context, ADMIN_ROLES);
    const db = await trustedDb(context);
    const { error } = await db.from("paiements").delete().eq("id", data.id);
    if (error) throw new Error(`Suppression assistance : ${error.message}`);
    return { ok: true };
  });
