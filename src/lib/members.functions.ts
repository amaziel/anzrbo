import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberRow = {
  id: string;
  numero_membre: string;
  nom: string;
  prenoms: string;
  telephone: string;
  contact2: string | null;
  sexe: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  ville: string | null;
  quartier: string | null;
  adresse: string | null;
  photo_url: string | null;
  date_inscription: string | null;
  statut: string;
  cotisation_mensuelle: number | null;
  nsia_souscrit: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

async function assertAnzrboAdmin(supabase: any, userId: string) {
  const roles = ["super_admin", "admin_national", "admin_anzrbo"];
  for (const r of roles) {
    try {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: r });
      if (!error && data) return;
    } catch { /* enum value may not exist yet — try next */ }
  }
  throw new Error("Forbidden");
}


function genNumero() {
  const y = new Date().getFullYear();
  const n = Math.floor(10000 + Math.random() * 89999);
  return `ANZRBO-${y}-${n}`;
}

/** Liste paginée + recherche. */
export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { q?: string; page?: number; pageSize?: number; statut?: string } = {}) => ({
    q: (data.q ?? "").trim(),
    page: Math.max(1, data.page ?? 1),
    pageSize: Math.min(100, Math.max(5, data.pageSize ?? 25)),
    statut: data.statut ?? "",
  }))
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = (supabaseAdmin as any)
      .from("members")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.q) {
      const s = `%${data.q}%`;
      q = q.or(
        `nom.ilike.${s},prenoms.ilike.${s},telephone.ilike.${s},numero_membre.ilike.${s},ville.ilike.${s},quartier.ilike.${s}`,
      );
    }
    if (data.statut) q = q.eq("statut", data.statut);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as MemberRow[], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const getMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: member, error: e1 }, { data: ayants }, { data: paiements }, { data: cards }] = await Promise.all([
      (supabaseAdmin as any).from("members").select("*").eq("id", data.id).maybeSingle(),
      (supabaseAdmin as any).from("ayants_droit").select("*").eq("member_id", data.id).order("created_at"),
      (supabaseAdmin as any).from("paiements").select("*").eq("member_id", data.id).order("created_at", { ascending: false }),
      (supabaseAdmin as any).from("member_cards").select("*").eq("member_id", data.id).order("version", { ascending: false }),
    ]);
    if (e1) throw new Error(e1.message);
    if (!member) throw new Error("Membre introuvable");
    return { member, ayants: ayants ?? [], paiements: paiements ?? [], cards: cards ?? [] };
  });

export type AyantInput = {
  nom: string;
  prenoms?: string;
  relation: string; // valeur enum SQL
  relation_label?: string; // libellé UI (fils/fille/petit_fils/petite_fille)
  date_naissance?: string | null;
  sexe?: string | null;
  telephone?: string | null;
};

export type PaiementInput = {
  type: string; // UI values are normalized to the current SQL enum.
  montant: number;
  methode?: string | null;
  reference_externe?: string | null;
  justificatif_url?: string | null;
  periode?: string | null;
};

function normalizePaiementType(type?: string | null): "cotisation" | "nsia" | "assistance" | "autre" {
  if (type === "cotisation" || type === "nsia" || type === "assistance" || type === "autre") return type;
  // The current production enum does not contain inscription/adhesion/deces.
  // Registration fees are therefore stored as `autre` with explicit notes/reference.
  return "autre";
}

function detailedSupabaseError(scope: string, error: any) {
  const parts = [scope, error?.code, error?.message, error?.details, error?.hint].filter(Boolean);
  return new Error(parts.join(" — "));
}

export type MemberInput = {
  nom: string;
  prenoms: string;
  telephone: string;
  contact2?: string | null;
  sexe?: string | null;
  date_naissance: string;
  lieu_naissance: string;
  ville?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  photo_url?: string | null;
  cotisation_mensuelle?: number | null;
  notes?: string | null;
  ayants?: AyantInput[];
  paiement_inscription?: PaiementInput | null;
};

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: MemberInput) => {
    if (!d?.nom || !d?.prenoms) throw new Error("Nom et prénoms obligatoires");
    if (!d?.telephone || d.telephone.trim().length < 8) throw new Error("Téléphone invalide");
    if (!d?.date_naissance) throw new Error("Date de naissance obligatoire");
    if (!d?.lieu_naissance) throw new Error("Lieu de naissance obligatoire");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const numero = genNumero();
    const { data: m, error } = await (supabaseAdmin as any)
      .from("members")
      .insert({
        numero_membre: numero,
        nom: data.nom.trim(),
        prenoms: data.prenoms.trim(),
        telephone: data.telephone.trim(),
        contact2: data.contact2 || null,
        sexe: data.sexe || null,
        date_naissance: data.date_naissance,
        lieu_naissance: data.lieu_naissance,
        ville: data.ville || "Bonon",
        quartier: data.quartier || null,
        adresse: data.adresse || null,
        photo_url: data.photo_url || null,
        date_inscription: new Date().toISOString().slice(0, 10),
        statut: "actif",
        cotisation_mensuelle: data.cotisation_mensuelle ?? 1000,
        notes: data.notes || null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw detailedSupabaseError("Membre", error);

    if (data.ayants?.length) {
      const rows = data.ayants
        .filter((a) => a.nom && a.relation)
        .map((a) => ({
          member_id: m.id,
          nom: a.nom,
          prenoms: a.prenoms || "—",
          relation: a.relation,
          date_naissance: a.date_naissance || null,
          sexe: a.sexe || null,
          telephone: a.telephone || null,
          beneficiaire_assistance: false,
        }));
      if (rows.length) {
        const { error: e2 } = await (supabaseAdmin as any).from("ayants_droit").insert(rows);
          if (e2) throw detailedSupabaseError("Ayants droit", e2);
      }
    }

    if (data.paiement_inscription) {
      const p = data.paiement_inscription;
      const { error: e3 } = await (supabaseAdmin as any).from("paiements").insert({
        member_id: m.id,
        type: normalizePaiementType(p.type),
        montant: p.montant ?? 1500,
        statut: "paye",
        methode: p.methode || null,
        reference_externe: p.reference_externe || null,
        justificatif_url: p.justificatif_url || null,
        paye_le: new Date().toISOString(),
        encaisse_par: context.userId,
        notes: p.type && normalizePaiementType(p.type) !== p.type ? `Type UI: ${p.type}` : null,
      });
      if (e3) throw detailedSupabaseError("Paiement inscription", e3);
    }

    // La base génère déjà la carte active via trigger. Si le trigger est absent,
    // on crée une carte de secours sans casser l'inscription.
    const { count: cardCount } = await (supabaseAdmin as any)
      .from("member_cards")
      .select("id", { count: "exact", head: true })
      .eq("member_id", m.id)
      .eq("active", true);
    if ((cardCount ?? 0) === 0) {
      const qrPayload = `${process.env.PUBLIC_SITE_URL ?? "https://anzrbo1.lovable.app"}/verifier/${encodeURIComponent(numero)}`;
      const { error: cardError } = await (supabaseAdmin as any).from("member_cards").insert({
        member_id: m.id, version: 1, qr_payload: qrPayload, active: true, created_by: context.userId,
      });
      if (cardError) console.warn("[createMember][member_cards]", cardError.message);
    }

    return { ok: true, member: m as MemberRow };
  });

const MEMBER_PATCH_FIELDS = [
  "nom", "prenoms", "telephone", "contact2", "sexe",
  "date_naissance", "lieu_naissance", "ville", "quartier", "adresse",
  "photo_url", "cotisation_mensuelle", "notes",
] as const;

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: Partial<MemberInput> }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("id requis");
    if (!data?.patch || typeof data.patch !== "object") throw new Error("patch requis");
    const safe: Record<string, unknown> = {};
    for (const k of MEMBER_PATCH_FIELDS) {
      if (!(k in data.patch)) continue;
      const v = (data.patch as any)[k];
      if (v === undefined) continue;
      if (k === "cotisation_mensuelle") {
        if (v !== null && typeof v !== "number") throw new Error("cotisation_mensuelle invalide");
      } else if (v !== null && typeof v !== "string") {
        throw new Error(`${k} invalide`);
      }
      safe[k] = v;
    }
    return { id: data.id, patch: safe };
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("members").update({
      ...data.patch,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw detailedSupabaseError("Modification membre", error);
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("members").delete().eq("id", data.id);
    if (error) throw detailedSupabaseError("Suppression membre", error);
    return { ok: true };
  });

export const addPaiement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { member_id: string; paiement: PaiementInput }) => {
    if (!data?.member_id) throw new Error("member_id requis");
    if (!data?.paiement?.type) throw new Error("type paiement requis");
    if (typeof data?.paiement?.montant !== "number") throw new Error("montant requis");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any).from("paiements").insert({
      member_id: data.member_id,
      type: normalizePaiementType(data.paiement.type),
      montant: data.paiement.montant,
      methode: data.paiement.methode || null,
      reference_externe: data.paiement.reference_externe || null,
      justificatif_url: data.paiement.justificatif_url || null,
      periode: data.paiement.periode || null,
      statut: "paye",
      paye_le: new Date().toISOString(),
      encaisse_par: context.userId,
    }).select("*").single();
    if (error) throw detailedSupabaseError("Paiement", error);
    return { ok: true, paiement: row };
  });

/** Vérification publique QR / téléphone / numéro membre. */
export const verifyMemberPublic = createServerFn({ method: "POST" })
  .inputValidator((data: { q: string }) => {
    if (!data?.q?.trim()) throw new Error("Identifiant requis");
    return { q: data.q.trim() };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let raw = data.q;
    try {
      const parsed = JSON.parse(raw);
      raw = String(parsed?.n ?? parsed?.numero_membre ?? parsed?.telephone ?? raw);
    } catch { /* QR texte classique */ }
    const match = raw.match(/(?:\/m\/|\/verifier\/)([^/?#]+)/i);
    if (match) raw = decodeURIComponent(match[1]);
    const digits = raw.replace(/\D/g, "");
    let query = (supabaseAdmin as any)
      .from("members")
      .select("id,numero_membre,photo_url,nom,prenoms,telephone,contact2,ville,quartier,adresse,date_naissance,lieu_naissance,date_inscription,statut")
      .limit(1);
    if (digits) {
      query = query.or(`telephone.eq.${digits},contact2.eq.${digits},telephone.eq.${raw},contact2.eq.${raw},numero_membre.eq.${raw}`);
    } else {
      query = query.eq("numero_membre", raw);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { member: rows?.[0] ?? null };
  });

/** Upload binaire base64 dans un bucket storage (admin). */
export const uploadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bucket: string; path: string; base64: string; contentType: string }) => {
    if (!data?.bucket || !data?.path || !data?.base64) throw new Error("bucket/path/base64 requis");
    const allowed = ["member-photos", "payment-proofs", "member-cards"];
    if (!allowed.includes(data.bucket)) throw new Error("bucket non autorisé");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buf = Buffer.from(data.base64, "base64");
    const { error } = await (supabaseAdmin as any).storage
      .from(data.bucket)
      .upload(data.path, buf, { contentType: data.contentType, upsert: true });
    if (error) throw new Error(error.message);
    // Buckets are private — return a signed URL. Short-lived for sensitive
    // documents (justificatifs de paiement), long-lived for affichage carte.
    const expiresIn = data.bucket === "payment-proofs" ? 60 * 10 : 60 * 60 * 24 * 365;
    const { data: signed, error: signErr } = await (supabaseAdmin as any)
      .storage.from(data.bucket).createSignedUrl(data.path, expiresIn);
    if (signErr) throw new Error(signErr.message);
    return { ok: true, path: data.path, url: signed?.signedUrl ?? null };
  });

/** Renvoie une URL signée pour un fichier stocké dans un bucket privé. */
export const getSignedMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bucket: string; path: string; expiresIn?: number }) => {
    const allowed = ["member-photos", "payment-proofs", "member-cards"];
    if (!allowed.includes(data?.bucket)) throw new Error("bucket non autorisé");
    if (!data?.path || typeof data.path !== "string") throw new Error("path requis");
    return { bucket: data.bucket, path: data.path, expiresIn: Math.min(60 * 60 * 24, Math.max(30, data.expiresIn ?? 600)) };
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await (supabaseAdmin as any)
      .storage.from(data.bucket).createSignedUrl(data.path, data.expiresIn);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });
