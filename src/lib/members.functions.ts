import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
  const roles = ["super_admin", "admin_national", "admin_anzrbo", "agent_saisie"];
  try {
    const db = await getTrustedDbClient({ supabase });
    const { data, error } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", roles);
    if (!error && (data?.length ?? 0) > 0) return;
  } catch { /* fallback below */ }

  // Compatibilité avec anciennes bases où la fonction est encore exécutable.
  for (const r of roles) {
    try {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: r });
      if (!error && data) return;
    } catch { /* enum value may not exist yet — try next */ }
  }
  throw new Error("Forbidden");
}

const SUPABASE_URL_FALLBACK = "https://ogseybvemtoxqpgpxewg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nc2V5YnZlbXRveHFwZ3B4ZXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzYyNDcsImV4cCI6MjA5Nzk1MjI0N30.16aClFbUFKk-VH2_CHY7P6kX3rU3IZ6uGEzK_LsNe54";
const INLINE_UPLOAD_MAX_BYTES = 900_000;

let cachedAdminClient: any | null | undefined;
let loggedAdminClientWarning = false;

async function getTrustedDbClient(context: any) {
  if (cachedAdminClient !== undefined) return cachedAdminClient ?? (context.supabase as any);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Initialise the lazy proxy here; if SERVICE_ROLE_KEY is absent, the catch
    // below falls back to the authenticated Supabase client instead of failing
    // later during member creation/upload.
    void (supabaseAdmin as any).from;
    cachedAdminClient = supabaseAdmin as any;
    return cachedAdminClient;
  } catch (error) {
    cachedAdminClient = null;
    if (!loggedAdminClientWarning) {
      console.warn("[members.functions] admin client indisponible, bascule sur client authentifié RLS", error);
      loggedAdminClientWarning = true;
    }
    return context.supabase as any;
  }
}

function createPublicSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.PROJECT_SUPABASE_URL ?? SUPABASE_URL_FALLBACK;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? SUPABASE_PUBLISHABLE_KEY_FALLBACK;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  }) as any;
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
    const db = await getTrustedDbClient(context);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = db
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
    const db = await getTrustedDbClient(context);
    const [{ data: member, error: e1 }, { data: ayants }, { data: paiements }, { data: cards }] = await Promise.all([
      db.from("members").select("*").eq("id", data.id).maybeSingle(),
      db.from("ayants_droit").select("*").eq("member_id", data.id).order("created_at"),
      db.from("paiements").select("*").eq("member_id", data.id).order("created_at", { ascending: false }),
      db.from("member_cards").select("*").eq("member_id", data.id).order("version", { ascending: false }),
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
  const parts = [scope, error?.statusCode, error?.code, error?.message, error?.details, error?.hint].filter(Boolean);
  return new Error(parts.join(" — "));
}

function publicStorageUrl(bucket: string, path: string) {
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.PROJECT_SUPABASE_URL ?? SUPABASE_URL_FALLBACK).replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function inlineDataUrl(contentType: string, base64: string) {
  return `data:${contentType || "application/octet-stream"};base64,${base64}`;
}

function canUseInlineFallback(bucket: string, contentType: string, bytes: number) {
  return ["member-photos", "payment-proofs"].includes(bucket)
    && bytes <= INLINE_UPLOAD_MAX_BYTES
    && (contentType.startsWith("image/") || contentType === "application/pdf");
}

async function regenerateMemberCard(db: any, memberId: string, numeroMembre: string, userId: string) {
  const { data: latest } = await db
    .from("member_cards")
    .select("version")
    .eq("member_id", memberId)
    .order("version", { ascending: false })
    .limit(1);
  const version = ((latest?.[0]?.version as number | undefined) ?? 0) + 1;
  await db.from("member_cards").update({ active: false }).eq("member_id", memberId);
  const qrPayload = `${process.env.PUBLIC_SITE_URL ?? "https://anzrbo1.lovable.app"}/verifier/${encodeURIComponent(numeroMembre)}`;
  const { error } = await db.from("member_cards").insert({
    member_id: memberId,
    version,
    qr_payload: qrPayload,
    active: true,
    created_by: userId,
  });
  if (error) console.warn("[member_cards][regenerate]", error.message);
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
    const db = await getTrustedDbClient(context);

    const numero = genNumero();
    const { data: m, error } = await db
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

    const postCreateTasks: Promise<void>[] = [];

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
        postCreateTasks.push(db.from("ayants_droit").insert(rows).then(({ error: e2 }: any) => {
          if (e2) throw detailedSupabaseError("Ayants droit", e2);
        }));
      }
    }

    if (data.paiement_inscription) {
      const p = data.paiement_inscription;
      postCreateTasks.push(db.from("paiements").insert({
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
      }).then(({ error: e3 }: any) => {
      if (e3) throw detailedSupabaseError("Paiement inscription", e3);
      }));
    }

    // La base génère déjà la carte active via trigger. Si le trigger est absent,
    // on crée une carte de secours sans casser l'inscription.
    postCreateTasks.push(db
      .from("member_cards")
      .select("id", { count: "exact", head: true })
      .eq("member_id", m.id)
      .eq("active", true)
      .then(async ({ count: cardCount }: any) => {
        if ((cardCount ?? 0) === 0) {
          const qrPayload = `${process.env.PUBLIC_SITE_URL ?? "https://anzrbo1.lovable.app"}/verifier/${encodeURIComponent(numero)}`;
          const { error: cardError } = await db.from("member_cards").insert({
            member_id: m.id, version: 1, qr_payload: qrPayload, active: true, created_by: context.userId,
          });
          if (cardError) console.warn("[createMember][member_cards]", cardError.message);
        }
      }));

    await Promise.all(postCreateTasks);

    return { ok: true, member: m as MemberRow };
  });

const MEMBER_PATCH_FIELDS = [
  "nom", "prenoms", "telephone", "contact2", "sexe",
  "date_naissance", "lieu_naissance", "ville", "quartier", "adresse",
  "photo_url", "cotisation_mensuelle", "notes", "statut",
] as const;

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: Record<string, unknown> }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("id requis");
    if (!data?.patch || typeof data.patch !== "object") throw new Error("patch requis");
    const safe: Record<string, unknown> = {};
    for (const k of MEMBER_PATCH_FIELDS) {
      if (!(k in data.patch)) continue;
      const v = (data.patch as any)[k];
      if (v === undefined) continue;
      if (k === "cotisation_mensuelle") {
        if (v !== null && typeof v !== "number") throw new Error("cotisation_mensuelle invalide");
      } else if (k === "statut") {
        if (typeof v !== "string" || !["actif", "suspendu", "decede"].includes(v)) throw new Error("statut invalide");
      } else if (v !== null && typeof v !== "string") {
        throw new Error(`${k} invalide`);
      }
      safe[k] = v;
    }
    return { id: data.id, patch: safe };
  })
  .handler(async ({ data, context }) => {
    await assertAnzrboAdmin(context.supabase, context.userId);
    const db = await getTrustedDbClient(context);
    const { error } = await db.from("members").update({
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
    const db = await getTrustedDbClient(context);
    const { error } = await db.from("members").delete().eq("id", data.id);
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
    const db = await getTrustedDbClient(context);
    const { data: row, error } = await db.from("paiements").insert({
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
    let db: any;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Force lazy proxy initialization here so missing env vars are caught.
      void (supabaseAdmin as any).from;
      db = supabaseAdmin as any;
    } catch (error) {
      console.warn("[verifyMemberPublic] admin client indisponible, bascule lecture publique", error);
      db = createPublicSupabaseClient();
    }
    let raw = data.q;
    try {
      const parsed = JSON.parse(raw);
      raw = String(parsed?.n ?? parsed?.numero_membre ?? parsed?.telephone ?? raw);
    } catch { /* QR texte classique */ }
    const match = raw.match(/(?:\/m\/|\/verifier\/)([^/?#]+)/i);
    if (match) raw = decodeURIComponent(match[1]);
    const digits = raw.replace(/\D/g, "");
    let query = db
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
    const buf = Buffer.from(data.base64, "base64");

    const storageClients: Array<{ name: string; storage: any }> = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      storageClients.push({ name: "service_role", storage: (supabaseAdmin as any).storage.from(data.bucket) });
    } catch (error) {
      console.warn(`[uploadFile][${data.bucket}] service_role indisponible`, error);
    }
    storageClients.push({ name: "authenticated_rls", storage: (context.supabase as any).storage.from(data.bucket) });

    let uploadError: any = null;
    let usedStorage: any = null;
    for (const candidate of storageClients) {
      const { error } = await candidate.storage.upload(data.path, buf, {
        contentType: data.contentType,
        upsert: true,
        cacheControl: "31536000",
      });
      if (!error) {
        usedStorage = candidate.storage;
        uploadError = null;
        break;
      }
      uploadError = { ...error, client: candidate.name };
      console.error(`[uploadFile][${candidate.name}][${data.bucket}]`, error);
    }
    if (uploadError || !usedStorage) {
      if (canUseInlineFallback(data.bucket, data.contentType, buf.byteLength)) {
        console.warn(`[uploadFile][${data.bucket}] fallback inline après refus Storage`, uploadError);
        return { ok: true, path: data.path, url: inlineDataUrl(data.contentType, data.base64), inline: true, storageError: uploadError?.message ?? "Storage refusé" };
      }
      throw detailedSupabaseError(`Upload ${data.bucket}`, uploadError);
    }

    // Buckets are private — return a signed URL. Short-lived for sensitive
    // documents (justificatifs de paiement), long-lived for affichage carte.
    const expiresIn = data.bucket === "payment-proofs" ? 60 * 10 : 60 * 60 * 24 * 365;
    const { data: signed, error: signErr } = await usedStorage.createSignedUrl(data.path, expiresIn);
    if (signErr) {
      console.warn(`[uploadFile][signed_url][${data.bucket}]`, signErr);
      if (canUseInlineFallback(data.bucket, data.contentType, buf.byteLength)) {
        return { ok: true, path: data.path, url: inlineDataUrl(data.contentType, data.base64), inline: true, signedUrlError: signErr.message };
      }
      return { ok: true, path: data.path, url: publicStorageUrl(data.bucket, data.path), signedUrlError: signErr.message };
    }
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
    const storageClients: any[] = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      storageClients.push((supabaseAdmin as any).storage.from(data.bucket));
    } catch (error) {
      console.warn(`[getSignedMediaUrl][${data.bucket}] service_role indisponible`, error);
    }
    storageClients.push((context.supabase as any).storage.from(data.bucket));

    let lastError: any = null;
    for (const storage of storageClients) {
      const { data: signed, error } = await storage.createSignedUrl(data.path, data.expiresIn);
      if (!error) return { url: signed?.signedUrl ?? null };
      lastError = error;
    }
    if (lastError) throw detailedSupabaseError(`URL média ${data.bucket}`, lastError);
    return { url: publicStorageUrl(data.bucket, data.path) };
  });
