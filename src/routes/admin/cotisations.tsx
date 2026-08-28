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
import { COTISATION_PAR_DECES } from "@/lib/data";
import { listDeces, listCotisationsDeces, payCotisation, deleteCotisation } from "@/lib/deces.functions";
import { Wallet, AlertTriangle, CheckCircle2, Undo2 } from "lucide-react";

export const Route = createFileRoute("/admin/cotisations")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({
    meta: [
      { title: "Cotisations décès — Admin ANZRBO" },
      { name: "description", content: "Suivi et encaissement des cotisations solidaires de 1 200 FCFA par décès déclaré." },
      { property: "og:title", content: "Cotisations décès — Admin ANZRBO" },
      { property: "og:description", content: "Suivi et encaissement des cotisations solidaires ANZRBO." },
    ],
  }),
});

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const listDecesFn = useServerFn(listDeces);
  const listLignesFn = useServerFn(listCotisationsDeces);
  const payFn = useServerFn(payCotisation);
  const cancelFn = useServerFn(deleteCotisation);

  const [decesId, setDecesId] = useState("");
  const [q, setQ] = useState("");
  const [methode, setMethode] = useState("especes");

  const { data: decesData } = useQuery({ queryKey: ["deces"], queryFn: () => listDecesFn(), enabled: !!user });
  const { data, isLoading } = useQuery({
    queryKey: ["cotisations-deces", decesId],
    queryFn: () => listLignesFn({ data: { deces_id: decesId } }),
    enabled: !!user,
  });

  const pay = useMutation({
    mutationFn: (member_id: string) => payFn({ data: { deces_id: decesId, member_id, montant: COTISATION_PAR_DECES, methode } }),
    onSuccess: (r: any) => {
      toast[r?.duplicate ? "info" : "success"](r?.duplicate ? "Cotisation déjà enregistrée" : "Cotisation encaissée");
      qc.invalidateQueries({ queryKey: ["cotisations-deces"] });
      qc.invalidateQueries({ queryKey: ["paiements"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'encaissement"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => { toast.success("Cotisation annulée"); qc.invalidateQueries({ queryKey: ["cotisations-deces"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'annulation"),
  });

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const decesRows = decesData?.rows ?? [];
  const lignes = (data?.lignes ?? []).filter((l: any) => {
    if (!q.trim()) return true;
    const s = `${l.membre.numero_membre} ${l.membre.prenoms} ${l.membre.nom} ${l.membre.telephone ?? ""}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });
  const enRetard = (data?.lignes ?? []).filter((l: any) => l.statut === "en_retard");

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Cotisations — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={Wallet} label="Cotisation par décès" value={`${COTISATION_PAR_DECES.toLocaleString("fr-FR")} F`} />
          <Stat icon={CheckCircle2} label="Cotisations payées" value={data?.payees ?? 0} />
          <Stat icon={AlertTriangle} label="En retard" value={enRetard.length} warn />
          <Stat icon={Wallet} label="Total collecté" value={`${(data?.collecte ?? 0).toLocaleString("fr-FR")} F`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des cotisations par décès déclaré</CardTitle>
            <CardDescription>Règle métier : 1 cotisation de 1 200 FCFA par membre actif et par décès déclaré.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Décès concerné</Label>
              <Select value={decesId || "all"} onValueChange={(v) => setDecesId(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les décès</SelectItem>
                  {decesRows.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.defunt_nom} — {d.date_deces ? new Date(d.date_deces).toLocaleDateString("fr-FR") : "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recherche membre</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, matricule, téléphone" />
            </div>
            <div className="space-y-1.5">
              <Label>Méthode d'encaissement</Label>
              <Select value={methode} onValueChange={setMethode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lignes de cotisation ({lignes.length})</CardTitle>
            <CardDescription>
              {decesId ? "Encaissement rattaché au décès sélectionné." : "Sélectionnez un décès pour encaisser une cotisation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Membre</TableHead><TableHead>Téléphone</TableHead>
                <TableHead>Ville</TableHead><TableHead>Montant dû</TableHead>
                <TableHead>Statut</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
                {!isLoading && lignes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun membre actif trouvé.</TableCell></TableRow>}
                {lignes.map((l: any) => (
                  <TableRow key={l.membre.id}>
                    <TableCell>{l.membre.prenoms} {l.membre.nom}<div className="font-mono text-xs text-muted-foreground">{l.membre.numero_membre}</div></TableCell>
                    <TableCell className="text-muted-foreground">{l.membre.telephone}</TableCell>
                    <TableCell>{l.membre.ville ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{COTISATION_PAR_DECES.toLocaleString("fr-FR")} F</TableCell>
                    <TableCell>
                      {l.statut === "paye"
                        ? <Badge className="bg-emerald-100 text-emerald-700">Payée</Badge>
                        : <Badge className="bg-red-100 text-red-700">En retard</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.statut === "paye" ? (
                        <Button variant="ghost" size="sm" onClick={() => cancel.mutate(l.paiement.id)} disabled={cancel.isPending}>
                          <Undo2 className="mr-1 h-4 w-4" /> Annuler
                        </Button>
                      ) : (
                        <Button size="sm" disabled={!decesId || pay.isPending} onClick={() => pay.mutate(l.membre.id)}>
                          Encaisser
                        </Button>
                      )}
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

function Stat({ icon: I, label, value, warn }: { icon: any; label: string; value: any; warn?: boolean }) {
  return (
    <Card><CardContent className="flex items-center justify-between p-5">
      <div><div className="text-xs uppercase text-muted-foreground">{label}</div><div className={`text-2xl font-bold ${warn ? "text-red-600" : ""}`}>{value}</div></div>
      <I className={`h-8 w-8 ${warn ? "text-red-500" : "text-primary"}`} />
    </CardContent></Card>
  );
}
