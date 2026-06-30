import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { AyantsDroitFields, EMPTY_AYANT, relationToEnum, type AyantDroit } from "@/components/AyantsDroitFields";
import { createMember, uploadFile } from "@/lib/members.functions";

export const Route = createFileRoute("/admin/membres/nouveau")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: NouveauMembre,
  head: () => ({ meta: [{ title: "Nouvelle inscription — Admin ANZRBO" }] }),
});

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

async function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const ratio = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * ratio), h = Math.round(bmp.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", quality));
}

function NouveauMembre() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const createMemberFn = useServerFn(createMember);
  const uploadFileFn = useServerFn(uploadFile);
  useEffect(() => { if (!loading && (!user || !user.roles.includes("admin_anzrbo"))) nav({ to: "/login" }); }, [user, loading, nav]);

  const [form, setForm] = useState({
    nom: "", prenoms: "", telephone: "", contact2: "",
    sexe: "" as "" | "M" | "F",
    sousPrefecture: "Bonon", village: "", quartier: "",
    dateNaissance: "", lieuNaissance: "",
    mode: "especes" as "especes" | "mobile_money",
    typePreuve: "id_transaction" as "id_transaction" | "photo_document",
    idTransaction: "",
    urgenceNom: "", urgenceContact1: "", urgenceContact2: "", urgenceAdresse: "",
    notes: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preuve, setPreuve] = useState<File | null>(null);
  const [ayants, setAyants] = useState<AyantDroit[]>([{ ...EMPTY_AYANT }]);
  const [busy, setBusy] = useState(false);
  const [errorDetail, setErrorDetail] = useState<{ step: string; message: string; raw?: any } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorDetail(null);
    if (!photo) return toast.error("Photo du membre obligatoire.");
    if (!form.nom || !form.prenoms || !form.telephone || !form.village || !form.dateNaissance || !form.lieuNaissance) {
      return toast.error("Champs obligatoires manquants.");
    }
    if (form.typePreuve === "id_transaction" && !form.idTransaction) return toast.error("ID de transaction obligatoire.");
    if (form.typePreuve === "photo_document" && !preuve) return toast.error("Justificatif (photo/document) obligatoire.");

    setBusy(true);
    let step = "init";
    try {
      step = "upload_photo";
      const blob = await compressImage(photo, 1024, 0.8);
      const f = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const b64 = await fileToBase64(f);
      const path = `${Date.now()}-${form.telephone.replace(/\D/g, "")}.jpg`;
      const photoRes = await uploadFileFn({ data: { bucket: "member-photos", path, base64: b64, contentType: "image/jpeg" } });

      let justificatifUrl: string | null = null;
      if (form.typePreuve === "photo_document" && preuve) {
        step = "upload_justificatif";
        const pb = preuve.type.startsWith("image/") ? await compressImage(preuve, 1600, 0.85) : preuve;
        const pf = new File([pb], preuve.name, { type: pb.type || preuve.type });
        const pbb64 = await fileToBase64(pf);
        const ppath = `inscription-${Date.now()}-${form.telephone.replace(/\D/g, "")}-${preuve.name}`;
        const r = await uploadFileFn({ data: { bucket: "payment-proofs", path: ppath, base64: pbb64, contentType: pf.type } });
        justificatifUrl = r.url;
      }

      step = "create_member";
      const res = await createMemberFn({
        data: {
          nom: form.nom, prenoms: form.prenoms,
          telephone: form.telephone, contact2: form.contact2 || null,
          sexe: form.sexe || null,
          date_naissance: form.dateNaissance, lieu_naissance: form.lieuNaissance,
          ville: form.sousPrefecture, quartier: form.village, adresse: form.quartier || null,
          photo_url: photoRes.url,
          notes: JSON.stringify({
            commentaire: form.notes || null,
            contact_urgence: {
              nom: form.urgenceNom || null,
              contact1: form.urgenceContact1 || null,
              contact2: form.urgenceContact2 || null,
              adresse: form.urgenceAdresse || null,
            },
          }),
          ayants: ayants.filter(a => a.type && a.nom).map(a => ({
            nom: a.nom,
            relation: relationToEnum(a.type),
            relation_label: a.type,
            date_naissance: a.dateNaissance || null,
          })),
          paiement_inscription: {
            type: "inscription",
            montant: 1500,
            methode: form.mode,
            reference_externe: form.typePreuve === "id_transaction" ? form.idTransaction : null,
            justificatif_url: justificatifUrl,
          },
        }
      });

      step = "photo_health";
      if (photoRes.url) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => { console.warn("[photo_health] photo non lisible:", photoRes.url); resolve(); };
          img.src = photoRes.url!;
          setTimeout(resolve, 4000);
        });
      }

      toast.success(`Membre enregistré : ${res.member.numero_membre}`);
      setTimeout(() => nav({ to: "/admin/membres" }), 600);
    } catch (err: any) {
      const message = err?.message ?? String(err) ?? "Erreur inconnue";
      console.error(`[membre/nouveau][${step}]`, err);
      setErrorDetail({ step, message, raw: err });
      toast.error(`${step} — ${message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Inscription membre — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nouveau membre</h1>
            <p className="text-sm text-muted-foreground">Formulaire conforme à la charte ANZRBO — accès admin uniquement.</p>
          </div>
          <Button asChild variant="ghost"><Link to="/admin/membres">← Annuler</Link></Button>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Section 1 — Informations personnelles</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Photo du membre *</Label>
                <Input type="file" accept="image/png,image/jpeg,image/webp" capture="environment"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                <p className="mt-1 text-xs text-muted-foreground">Compression automatique avant envoi.</p>
              </div>
              <Field label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} required /></Field>
              <Field label="Prénoms *"><Input value={form.prenoms} onChange={(e) => set("prenoms", e.target.value)} required /></Field>
              <Field label="Téléphone * (unique)"><Input type="tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} required /></Field>
              <Field label="Second contact"><Input type="tel" value={form.contact2} onChange={(e) => set("contact2", e.target.value)} /></Field>
              <Field label="Sexe">
                <Select value={form.sexe} onValueChange={(v) => set("sexe", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sous-préfecture *">
                <Select value={form.sousPrefecture} onValueChange={(v) => set("sousPrefecture", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Bonon">Bonon</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Village *"><Input value={form.village} onChange={(e) => set("village", e.target.value)} required /></Field>
              <Field label="Quartier / Campement"><Input value={form.quartier} onChange={(e) => set("quartier", e.target.value)} /></Field>
              <Field label="Date de naissance *"><Input type="date" value={form.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} required /></Field>
              <Field label="Lieu de naissance *"><Input value={form.lieuNaissance} onChange={(e) => set("lieuNaissance", e.target.value)} required /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 2 — Ayants droit</CardTitle>
              <CardDescription>
                Personnes de référence en cas d'absence du membre principal. Ils ne cotisent pas et ne donnent pas lieu à une déclaration de décès.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AyantsDroitFields value={ayants} onChange={setAyants} max={8} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact d'urgence</CardTitle>
              <CardDescription>Personne à joindre rapidement en cas de besoin concernant le membre principal.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom du contact"><Input value={form.urgenceNom} onChange={(e) => set("urgenceNom", e.target.value)} /></Field>
              <Field label="Contact 1"><Input type="tel" value={form.urgenceContact1} onChange={(e) => set("urgenceContact1", e.target.value)} /></Field>
              <Field label="Contact 2"><Input type="tel" value={form.urgenceContact2} onChange={(e) => set("urgenceContact2", e.target.value)} /></Field>
              <Field label="Adresse"><Input value={form.urgenceAdresse} onChange={(e) => set("urgenceAdresse", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 3 — Frais d'inscription (1 500 FCFA)</CardTitle>
              <CardDescription>Perçus pour la mise en service du compte membre.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Mode de paiement">
                <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Type de preuve">
                <Select value={form.typePreuve} onValueChange={(v) => set("typePreuve", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id_transaction">ID de transaction</SelectItem>
                    <SelectItem value="photo_document">Photo/document</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.typePreuve === "id_transaction" ? (
                <Field label="ID de transaction *"><Input value={form.idTransaction} onChange={(e) => set("idTransaction", e.target.value)} /></Field>
              ) : (
                <Field label="Justificatif * (PDF/image, caméra OK)">
                  <Input type="file" accept="image/*,application/pdf" capture="environment"
                    onChange={(e) => setPreuve(e.target.files?.[0] ?? null)} />
                </Field>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col items-end gap-2">
            <div className="flex justify-end gap-2">
              <Button asChild variant="ghost"><Link to="/admin/membres">Annuler</Link></Button>
              <Button type="submit" disabled={busy}>
                <Save className="mr-2 h-4 w-4" /> {busy ? "Enregistrement…" : "Enregistrer le membre"}
              </Button>
            </div>
            {errorDetail && (
              <div className="w-full rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="font-semibold text-destructive">Échec à l'étape : {errorDetail.step}</div>
                <div className="mt-1 break-words text-destructive/90">{errorDetail.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">Détails complets disponibles dans la console (F12).</div>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
