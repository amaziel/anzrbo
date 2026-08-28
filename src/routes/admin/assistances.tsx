import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { ASSISTANCE_ANZRBO } from "@/lib/data";
import { listDeces, listAssistances, createAssistance, setAssistanceStatut, deleteAssistance } from "@/lib/deces.functions";
import { HandCoins, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/assistances")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({
    meta: [
      { title: "Assistances décès — Admin ANZRBO" },
      { name: "description", content: "Dossiers d'assistance ANZRBO de 500 000 FCFA : création, validation, versement et refus motivé." },
      { property: "og:title", content: "Assistances décès — Admin ANZRBO" },
      { property: "og:description", content: "Gestion des dossiers d'assistance ANZRBO." },
    ],
  }),
});

function StatutBadge({ s }: { s: string }) {
  if (s === "versee") return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Versée</Badge>;
  if (s === "refusee") return <Badge className="bg-red-100 text-red-700"><XCircle className="mr-1 h-3 w-3" />Refusée</Badge>;
  return <Badge className="bg-amber-100 text-amber-700"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
}

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const listDecesFn = useServerFn(listDeces);
  const listAssistFn = useServerFn(listAssistances);
  const createFn = useServerFn(createAssistance);
  const statutFn = useServerFn(setAssistanceStatut);
  const deleteFn = useServerFn(deleteAssistance);

  const { data: decesData } = useQuery({ queryKey: ["deces"], queryFn: () => listDecesFn(), enabled: !!user });
  const { data, isLoading } = useQuery({ queryKey: ["assistances"], queryFn: () => listAssistFn(), enabled: !!user });

  const [form, setForm] = useState({ deces_id: "", beneficiaire_nom: "", beneficiaire_contact: "", montant: String(ASSISTANCE_ANZRBO), nsia_brut: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["assistances"] }); qc.invalidateQueries({ queryKey: ["paiements"] }); };

  const rows = data?.rows ?? [];
  const decesRows = decesData?.rows ?? [];
  const selected = decesRows.find((d: any) => d.id === form.deces_id);

  const create = useMutation({
    mutationFn: () => createFn({ data: {
      deces_id: form.deces_id,
      member_id: selected?.member_id ?? "",
      montant: Number(form.montant),
      beneficiaire_nom: form.beneficiaire_nom,
      beneficiaire_contact: form.beneficiaire_contact,
      nsia: !!selected?.nsia,
      nsia_brut: Number(form.nsia_brut || 0),
    } }),
    onSuccess: () => {
      toast.success("Dossier d'assistance créé");
      setForm({ deces_id: "", beneficiaire_nom: "", beneficiaire_contact: "", montant: String(ASSISTANCE_ANZRBO), nsia_brut: "" });
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la création"),
  });

  const changeStatut = useMutation({
    mutationFn: (v: { id: string; statut: "versee" | "refusee" | "en_attente"; motif_refus?: string }) => statutFn({ data: v }),
    onSuccess: () => { toast.success("Statut mis à jour"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la mise à jour"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Dossier supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la suppression"),
  });

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const versees = rows.filter((a: any) => a.statut === "versee");
  const refusees = rows.filter((a: any) => a.statut === "refusee");
  const enAttente = rows.filter((a: any) => a.statut === "en_attente");
  const decesSansDossier = decesRows.filter((d: any) => !rows.some((a: any) => a.deces_id === d.id));

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Assistances décès — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Montant unitaire ANZRBO" value={`${ASSISTANCE_ANZRBO.toLocaleString("fr-FR")} F`} />
          <Stat label="Assistances versées" value={versees.length} />
          <Stat label="Refusées" value={refusees.length} warn />
          <Stat label="En attente" value={enAttente.length} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Ouvrir un dossier d'assistance</CardTitle>
            <CardDescription>
              Règles : membre principal actif, ancienneté ≥ 3 mois, cotisations à jour. Unicité 1 dossier par décès. Si NSIA : commission ANZRBO de 25 % sur le bénéfice brut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
              <div className="space-y-1.5">
                <Label>Décès concerné *</Label>
                <Select value={form.deces_id} onValueChange={(v) => set("deces_id", v)}>
                  <SelectTrigger><SelectValue placeholder={decesSansDossier.length ? "Sélectionner" : "Aucun décès sans dossier"} /></SelectTrigger>
                  <SelectContent>
                    {decesSansDossier.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.defunt_nom} — {d.membre?.numero_membre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bénéficiaire *</Label>
                <Input value={form.beneficiaire_nom} onChange={(e) => set("beneficiaire_nom", e.target.value.toUpperCase())} required />
              </div>
              <div className="space-y-1.5">
                <Label>Contact bénéficiaire</Label>
                <Input value={form.beneficiaire_contact} onChange={(e) => set("beneficiaire_contact", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Montant ANZRBO (F)</Label>
                <Input type="number" value={form.montant} onChange={(e) => set("montant", e.target.value)} />
              </div>
              {selected?.nsia && (
                <div className="space-y-1.5">
                  <Label>Bénéfice brut NSIA (F)</Label>
                  <Input type="number" value={form.nsia_brut} onChange={(e) => set("nsia_brut", e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Commission ANZRBO : {(Number(form.nsia_brut || 0) * 0.25).toLocaleString("fr-FR")} F — net famille : {(Number(form.nsia_brut || 0) * 0.75).toLocaleString("fr-FR")} F
                  </p>
                </div>
              )}
              <div className="md:col-span-3">
                <Button type="submit" disabled={create.isPending || !form.deces_id}>
                  {create.isPending ? "Création…" : "Créer le dossier"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dossiers d'assistance ({rows.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Membre</TableHead><TableHead>Bénéficiaire</TableHead>
                <TableHead>Contact</TableHead><TableHead>Montant ANZRBO</TableHead>
                <TableHead>Statut</TableHead><TableHead>NSIA</TableHead>
                <TableHead>Motif refus</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
                {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucun dossier d'assistance enregistré.</TableCell></TableRow>}
                {rows.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.membre?.prenoms} {a.membre?.nom}<div className="font-mono text-xs text-muted-foreground">{a.membre?.numero_membre}</div></TableCell>
                    <TableCell className="font-medium">{a.beneficiaire_nom}</TableCell>
                    <TableCell className="text-muted-foreground">{a.beneficiaire_contact || "—"}</TableCell>
                    <TableCell className="font-semibold">{Number(a.montant).toLocaleString("fr-FR")} F</TableCell>
                    <TableCell><StatutBadge s={a.statut} /></TableCell>
                    <TableCell>{a.nsia ? `${Number(a.nsia_brut).toLocaleString("fr-FR")} F` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.motif_refus ?? "—"}</TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      {a.statut !== "versee" && (
                        <Button size="sm" onClick={() => changeStatut.mutate({ id: a.id, statut: "versee" })}>Verser</Button>
                      )}
                      {a.statut !== "refusee" && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => {
                            const motif = prompt("Motif du refus :")?.trim();
                            if (motif) changeStatut.mutate({ id: a.id, statut: "refusee", motif_refus: motif });
                          }}
                        >Refuser</Button>
                      )}
                      <Button
                        size="sm" variant="ghost" className="text-red-600"
                        onClick={() => { if (confirm("Supprimer ce dossier ?")) remove.mutate(a.id); }}
                      ><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: any; warn?: boolean }) {
  return <Card><CardContent className="p-5"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className={`text-2xl font-bold ${warn ? "text-red-600" : ""}`}>{value}</div></CardContent></Card>;
}
