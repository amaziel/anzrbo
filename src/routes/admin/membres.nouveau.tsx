import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth, clientRoleGuard } from "@/lib/auth";

export const Route = createFileRoute("/admin/membres/nouveau")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: NouveauMembre,
  head: () => ({ meta: [{ title: "Nouvelle inscription — Admin ANZRBO" }] }),
});

type Ayant = { lien: string; nom: string; dateNaissance: string; lieuNaissance: string };

function NouveauMembre() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const [form, setForm] = useState({
    nom: "", prenoms: "", telephone: "", contact2: "",
    sousPrefecture: "Bonon", village: "", quartier: "",
    dateNaissance: "", lieuNaissance: "",
    urgenceNom: "", urgenceC1: "", urgenceC2: "", urgenceAdresse: "",
    mode: "especes" as "especes" | "mobile_money",
    typePreuve: "id_transaction" as "id_transaction" | "photo_document",
    idTransaction: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preuve, setPreuve] = useState<File | null>(null);
  const [ayants, setAyants] = useState<Ayant[]>([{ lien: "", nom: "", dateNaissance: "", lieuNaissance: "" }]);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  function addAyant() {
    if (ayants.length >= 5) return;
    setAyants((a) => [...a, { lien: "", nom: "", dateNaissance: "", lieuNaissance: "" }]);
  }
  function rmAyant(i: number) { setAyants((a) => a.filter((_, k) => k !== i)); }
  function updAyant(i: number, p: Partial<Ayant>) { setAyants((a) => a.map((x, k) => k === i ? { ...x, ...p } : x)); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return toast.error("Photo du membre obligatoire.");
    if (!form.nom || !form.prenoms || !form.telephone || !form.village || !form.dateNaissance || !form.lieuNaissance) {
      return toast.error("Champs obligatoires manquants.");
    }
    if (!form.urgenceNom || !form.urgenceC1 || !form.urgenceAdresse) return toast.error("Personne d'urgence incomplète.");
    if (form.typePreuve === "id_transaction" && !form.idTransaction) return toast.error("ID de transaction obligatoire.");
    if (form.typePreuve === "photo_document" && !preuve) return toast.error("Justificatif (photo/document) obligatoire.");
    const valides = ayants.filter((a) => a.lien && a.nom && a.dateNaissance && a.lieuNaissance);
    if (valides.length < 1) return toast.error("Au moins 1 ayant droit complet est requis.");

    toast.success(`Membre ${form.prenoms} ${form.nom} enregistré (mode local). Numéro généré : ANZRBO-2026-XXXXX.`);
    setTimeout(() => nav({ to: "/admin/membres" }), 800);
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Inscription membre — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nouveau membre</h1>
            <p className="text-sm text-muted-foreground">Formulaire conforme au CDC ANZRBO — accès admin uniquement.</p>
          </div>
          <Button asChild variant="ghost"><Link to="/admin/membres">← Annuler</Link></Button>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Section 1 — Informations personnelles</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Photo du membre *</Label>
                <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </div>
              <Field label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} required /></Field>
              <Field label="Prénoms *"><Input value={form.prenoms} onChange={(e) => set("prenoms", e.target.value)} required /></Field>
              <Field label="Numéro de téléphone * (unique)"><Input type="tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} required /></Field>
              <Field label="Second contact"><Input type="tel" value={form.contact2} onChange={(e) => set("contact2", e.target.value)} /></Field>
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
            <CardHeader><CardTitle>Section 2 — Personne d'urgence</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom et prénoms *"><Input value={form.urgenceNom} onChange={(e) => set("urgenceNom", e.target.value)} required /></Field>
              <Field label="Contact 1 *"><Input type="tel" value={form.urgenceC1} onChange={(e) => set("urgenceC1", e.target.value)} required /></Field>
              <Field label="Contact 2"><Input type="tel" value={form.urgenceC2} onChange={(e) => set("urgenceC2", e.target.value)} /></Field>
              <Field label="Résidence / Adresse *"><Input value={form.urgenceAdresse} onChange={(e) => set("urgenceAdresse", e.target.value)} required /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Section 3 — Ayants droit (1 à 5)
                <Button type="button" size="sm" variant="outline" onClick={addAyant} disabled={ayants.length >= 5}>
                  <Plus className="mr-1 h-3 w-3" /> Ajouter ({ayants.length}/5)
                </Button>
              </CardTitle>
              <CardDescription>Père, mère, beau-père, belle-mère, conjoint(e) — max 1 par type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ayants.map((a, i) => (
                <div key={i} className="grid gap-3 rounded-md border p-3 md:grid-cols-[160px_1fr_160px_1fr_auto]">
                  <div>
                    <Label className="text-xs">Lien de parenté</Label>
                    <Select value={a.lien} onValueChange={(v) => updAyant(i, { lien: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pere">Père</SelectItem>
                        <SelectItem value="mere">Mère</SelectItem>
                        <SelectItem value="beau-pere">Beau-père</SelectItem>
                        <SelectItem value="belle-mere">Belle-mère</SelectItem>
                        <SelectItem value="conjoint">Conjoint(e)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Nom et prénoms</Label><Input value={a.nom} onChange={(e) => updAyant(i, { nom: e.target.value })} /></div>
                  <div><Label className="text-xs">Date de naissance</Label><Input type="date" value={a.dateNaissance} onChange={(e) => updAyant(i, { dateNaissance: e.target.value })} /></div>
                  <div><Label className="text-xs">Lieu de naissance</Label><Input value={a.lieuNaissance} onChange={(e) => updAyant(i, { lieuNaissance: e.target.value })} /></div>
                  <div className="flex items-end"><Button type="button" size="icon" variant="ghost" onClick={() => rmAyant(i)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 4 — Preuve de paiement des frais d'inscription (1 500 FCFA)</CardTitle>
              <CardDescription>Frais perçus par DigitOrg pour la mise en service du compte membre.</CardDescription>
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
                    <SelectItem value="photo_document">Photo-document</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.typePreuve === "id_transaction" ? (
                <Field label="ID de transaction *"><Input value={form.idTransaction} onChange={(e) => set("idTransaction", e.target.value)} /></Field>
              ) : (
                <Field label="Fichier justificatif * (PDF/image)"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setPreuve(e.target.files?.[0] ?? null)} /></Field>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost"><Link to="/admin/membres">Annuler</Link></Button>
            <Button type="submit"><Save className="mr-2 h-4 w-4" /> Enregistrer le membre</Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
