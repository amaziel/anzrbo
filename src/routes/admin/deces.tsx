import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { listMembers } from "@/lib/members.functions";
import { listDeces, createDeces, updateDeces, deleteDeces } from "@/lib/deces.functions";
import { HeartCrack, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/deces")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({
    meta: [
      { title: "Registre des décès — Admin ANZRBO" },
      { name: "description", content: "Déclaration et suivi des décès ANZRBO : cotisations solidaires et dossiers d'assistance." },
      { property: "og:title", content: "Registre des décès — Admin ANZRBO" },
      { property: "og:description", content: "Déclaration et suivi des décès ANZRBO." },
    ],
  }),
});

const STATUTS = [
  { v: "declare", l: "Déclaré" },
  { v: "valide", l: "Validé" },
  { v: "clos", l: "Clos" },
  { v: "rejete", l: "Rejeté" },
];

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const listMembersFn = useServerFn(listMembers);
  const listDecesFn = useServerFn(listDeces);
  const createFn = useServerFn(createDeces);
  const updateFn = useServerFn(updateDeces);
  const deleteFn = useServerFn(deleteDeces);

  const { data: membersData } = useQuery({
    queryKey: ["members", "deces"],
    queryFn: () => listMembersFn({ data: { q: "", page: 1, pageSize: 100, statut: "" } }),
    enabled: !!user,
  });
  const { data, isLoading } = useQuery({ queryKey: ["deces"], queryFn: () => listDecesFn(), enabled: !!user });

  const [form, setForm] = useState({
    member_id: "", defunt_nom: "", defunt_type: "principal", lien: "",
    date_deces: "", lieu: "", nsia: "non", observations: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deces"] });
    qc.invalidateQueries({ queryKey: ["cotisations-deces"] });
    qc.invalidateQueries({ queryKey: ["assistances"] });
  };

  const create = useMutation({
    mutationFn: () => createFn({ data: {
      member_id: form.member_id,
      defunt_nom: form.defunt_nom,
      defunt_type: form.defunt_type,
      lien: form.lien || undefined,
      date_deces: form.date_deces,
      lieu: form.lieu || undefined,
      nsia: form.nsia === "oui",
      observations: form.observations || undefined,
    } }),
    onSuccess: () => {
      toast.success("Décès déclaré. Les lignes de cotisation sont ouvertes.");
      setForm({ member_id: "", defunt_nom: "", defunt_type: "principal", lien: "", date_deces: "", lieu: "", nsia: "non", observations: "" });
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la déclaration"),
  });

  const patch = useMutation({
    mutationFn: (v: { id: string; patch: Record<string, any> }) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Dossier mis à jour"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la mise à jour"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Décès supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la suppression"),
  });

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const rows = data?.rows ?? [];
  const membres = membersData?.rows ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Registre des décès — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Déclarer un décès</CardTitle>
            <CardDescription>Chaque décès déclaré ouvre automatiquement les lignes de cotisation (1 200 F par membre actif) et permet la création d'un dossier d'assistance unique.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-3"
              onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
            >
              <div className="space-y-1.5">
                <Label>Membre concerné *</Label>
                <Select value={form.member_id} onValueChange={(v) => set("member_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                  <SelectContent>
                    {membres.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.numero_membre} — {m.prenoms} {m.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nom du défunt *</Label>
                <Input value={form.defunt_nom} onChange={(e) => set("defunt_nom", e.target.value.toUpperCase())} required />
              </div>
              <div className="space-y-1.5">
                <Label>Type de défunt</Label>
                <Select value={form.defunt_type} onValueChange={(v) => set("defunt_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Membre principal</SelectItem>
                    <SelectItem value="ayant_droit">Ayant droit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lien de parenté</Label>
                <Input value={form.lien} onChange={(e) => set("lien", e.target.value)} placeholder="Fils, Épouse, Père…" />
              </div>
              <div className="space-y-1.5">
                <Label>Date du décès *</Label>
                <Input type="date" value={form.date_deces} onChange={(e) => set("date_deces", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Lieu</Label>
                <Input value={form.lieu} onChange={(e) => set("lieu", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1.5">
                <Label>Souscription NSIA ?</Label>
                <Select value={form.nsia} onValueChange={(v) => set("nsia", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non">Non</SelectItem>
                    <SelectItem value="oui">Oui</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Observations</Label>
                <Textarea value={form.observations} onChange={(e) => set("observations", e.target.value)} rows={2} />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={create.isPending || !form.member_id}>
                  {create.isPending ? "Enregistrement…" : "Déclarer le décès"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartCrack className="h-5 w-5 text-primary" /> Décès déclarés ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Défunt</TableHead><TableHead>Membre</TableHead>
                <TableHead>Type</TableHead><TableHead>Date décès</TableHead>
                <TableHead>Lieu</TableHead><TableHead>NSIA</TableHead>
                <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
                {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucun décès déclaré.</TableCell></TableRow>}
                {rows.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.defunt_nom}{d.lien ? <div className="text-xs text-muted-foreground">{d.lien}</div> : null}</TableCell>
                    <TableCell>{d.membre?.prenoms} {d.membre?.nom}<div className="font-mono text-xs text-muted-foreground">{d.membre?.numero_membre}</div></TableCell>
                    <TableCell>{d.defunt_type === "principal" ? "Membre principal" : "Ayant droit"}</TableCell>
                    <TableCell>{d.date_deces ? new Date(d.date_deces).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell>{d.lieu ?? "—"}</TableCell>
                    <TableCell>{d.nsia ? <Badge className="bg-blue-100 text-blue-700">NSIA</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Select value={d.statut} onValueChange={(v) => patch.mutate({ id: d.id, patch: { statut: v } })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="sm" className="text-red-600"
                        onClick={() => { if (confirm("Supprimer ce décès et ses cotisations liées ?")) remove.mutate(d.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
