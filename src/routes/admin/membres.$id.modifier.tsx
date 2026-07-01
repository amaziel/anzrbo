import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { clientRoleGuard, useAuth } from "@/lib/auth";
import { getMember, updateMember, uploadFile } from "@/lib/members.functions";

export const Route = createFileRoute("/admin/membres/$id/modifier")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: ModifierMembre,
  head: () => ({ meta: [{ title: "Modifier membre — Admin ANZRBO" }] }),
});

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  return btoa(bin);
}

async function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const ratio = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * ratio);
  canvas.height = Math.round(bmp.height * ratio);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality));
}

function parseNotes(notes: string | null) {
  try { return notes ? JSON.parse(notes) : {}; } catch { return { commentaire: notes ?? "" }; }
}

function ModifierMembre() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || !user.roles.includes("admin_anzrbo"))) nav({ to: "/login" }); }, [user, loading, nav]);

  const getFn = useServerFn(getMember);
  const updateFn = useServerFn(updateMember);
  const uploadFn = useServerFn(uploadFile);
  const { data, isLoading, error } = useQuery({ queryKey: ["member-edit", id], queryFn: () => getFn({ data: { id } }), enabled: !!user });
  const member = data?.member;
  const notesObj = useMemo(() => parseNotes(member?.notes ?? null), [member?.notes]);

  const [form, setForm] = useState<any>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorDetail, setErrorDetail] = useState<{ step: string; message: string; raw?: any } | null>(null);

  useEffect(() => {
    if (!member) return;
    setForm({
      nom: member.nom ?? "",
      prenoms: member.prenoms ?? "",
      telephone: member.telephone ?? "",
      contact2: member.contact2 ?? "",
      sexe: member.sexe ?? "",
      statut: member.statut ?? "actif",
      ville: member.ville ?? "Bonon",
      quartier: member.quartier ?? "",
      adresse: member.adresse ?? "",
      date_naissance: member.date_naissance ?? "",
      lieu_naissance: member.lieu_naissance ?? "",
      cotisation_mensuelle: member.cotisation_mensuelle ?? 1000,
      urgenceNom: notesObj?.contact_urgence?.nom ?? "",
      urgenceContact1: notesObj?.contact_urgence?.contact1 ?? "",
      urgenceContact2: notesObj?.contact_urgence?.contact2 ?? "",
      urgenceAdresse: notesObj?.contact_urgence?.adresse ?? "",
      commentaire: notesObj?.commentaire ?? "",
      photo_url: member.photo_url ?? null,
    });
  }, [member, notesObj]);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !member) return;
    setBusy(true);
    setErrorDetail(null);
    let step = "init";
    try {
      let photoUrl = form.photo_url;
      if (photo) {
        step = "upload_photo";
        const blob = await compressImage(photo, 1024, 0.8);
        const f = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        const b64 = await fileToBase64(f);
        const path = `${member.id}/${Date.now()}-${form.telephone.replace(/\D/g, "")}.jpg`;
        const res = await uploadFn({ data: { bucket: "member-photos", path, base64: b64, contentType: "image/jpeg" } });
        photoUrl = res.url;
      }
      step = "update_member";
      await updateFn({ data: { id, patch: {
        nom: form.nom, prenoms: form.prenoms, telephone: form.telephone, contact2: form.contact2 || null,
        sexe: form.sexe || null, statut: form.statut, ville: form.ville || "Bonon", quartier: form.quartier || null,
        adresse: form.adresse || null, date_naissance: form.date_naissance, lieu_naissance: form.lieu_naissance,
        cotisation_mensuelle: Number(form.cotisation_mensuelle) || 0, photo_url: photoUrl,
        notes: JSON.stringify({
          commentaire: form.commentaire || null,
          contact_urgence: { nom: form.urgenceNom || null, contact1: form.urgenceContact1 || null, contact2: form.urgenceContact2 || null, adresse: form.urgenceAdresse || null },
        }),
      } } });
      step = "photo_health";
      if (photoUrl) await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => { console.info("[photo_health][modifier]", member.numero_membre, "ok"); resolve(); };
        img.onerror = () => { console.error("[photo_health][modifier] photo illisible", photoUrl); resolve(); };
        img.src = photoUrl;
        setTimeout(resolve, 4000);
      });
      toast.success("Membre modifié, carte régénérée");
      nav({ to: "/admin/membres" });
    } catch (err: any) {
      const message = err?.message ?? String(err) ?? "Erreur inconnue";
      console.error(`[membre/modifier][${step}]`, err);
      setErrorDetail({ step, message, raw: err });
      toast.error(`${step} — ${message}`);
    } finally { setBusy(false); }
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;
  if (isLoading || !form) return <div className="flex min-h-screen items-center justify-center">Chargement du membre…</div>;
  if (error) return <div className="p-8 text-destructive">{(error as any)?.message ?? "Chargement impossible"}</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Modifier membre — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Modifier {member.numero_membre}</h1>
            <p className="text-sm text-muted-foreground">La carte est automatiquement régénérée après enregistrement.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/verifier/${encodeURIComponent(member.numero_membre)}`, "_blank")}><QrCode className="mr-2 h-4 w-4" /> Aperçu</Button>
            <Button variant="outline" onClick={() => window.open(`/verifier/${encodeURIComponent(member.numero_membre)}?print=1`, "_blank")}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
            <Button asChild variant="ghost"><Link to="/admin/membres">← Retour</Link></Button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations membre</CardTitle><CardDescription>Création, modification, photo et statut.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex items-center gap-4">
                {form.photo_url ? <img src={form.photo_url} alt="" className="h-20 w-20 rounded-md object-cover" /> : <div className="h-20 w-20 rounded-md bg-muted" />}
                <Field label="Remplacer la photo"><Input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></Field>
              </div>
              <Field label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} required /></Field>
              <Field label="Prénoms *"><Input value={form.prenoms} onChange={(e) => set("prenoms", e.target.value)} required /></Field>
              <Field label="Téléphone *"><Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} required /></Field>
              <Field label="Second contact"><Input value={form.contact2} onChange={(e) => set("contact2", e.target.value)} /></Field>
              <Field label="Sexe"><Select value={form.sexe || "-"} onValueChange={(v) => set("sexe", v === "-" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="-">—</SelectItem><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent></Select></Field>
              <Field label="Statut"><Select value={form.statut} onValueChange={(v) => set("statut", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="actif">Actif</SelectItem><SelectItem value="suspendu">Suspendu</SelectItem><SelectItem value="decede">Décédé</SelectItem></SelectContent></Select></Field>
              <Field label="Sous-préfecture"><Input value={form.ville} onChange={(e) => set("ville", e.target.value)} /></Field>
              <Field label="Village"><Input value={form.quartier} onChange={(e) => set("quartier", e.target.value)} /></Field>
              <Field label="Quartier / campement"><Input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></Field>
              <Field label="Cotisation mensuelle"><Input type="number" value={form.cotisation_mensuelle} onChange={(e) => set("cotisation_mensuelle", Number(e.target.value))} /></Field>
              <Field label="Date de naissance"><Input type="date" value={form.date_naissance} onChange={(e) => set("date_naissance", e.target.value)} /></Field>
              <Field label="Lieu de naissance"><Input value={form.lieu_naissance} onChange={(e) => set("lieu_naissance", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact d'urgence</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom du contact"><Input value={form.urgenceNom} onChange={(e) => set("urgenceNom", e.target.value)} /></Field>
              <Field label="Contact 1"><Input value={form.urgenceContact1} onChange={(e) => set("urgenceContact1", e.target.value)} /></Field>
              <Field label="Contact 2"><Input value={form.urgenceContact2} onChange={(e) => set("urgenceContact2", e.target.value)} /></Field>
              <Field label="Adresse"><Input value={form.urgenceAdresse} onChange={(e) => set("urgenceAdresse", e.target.value)} /></Field>
              <Field label="Notes"><Input value={form.commentaire} onChange={(e) => set("commentaire", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2"><Button asChild variant="ghost"><Link to="/admin/membres">Annuler</Link></Button><Button type="submit" disabled={busy}><Save className="mr-2 h-4 w-4" /> {busy ? "Enregistrement…" : "Enregistrer"}</Button></div>
            {errorDetail && <div className="w-full rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"><div className="font-semibold text-destructive">Échec à l'étape : {errorDetail.step}</div><div className="mt-1 break-words text-destructive/90">{errorDetail.message}</div><div className="mt-1 text-xs text-muted-foreground">Détails complets disponibles dans la console.</div></div>}
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}