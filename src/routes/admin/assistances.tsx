import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { ASSISTANCES, DECLARATIONS, ASSISTANCE_ANZRBO, PAIEMENTS_NSIA } from "@/lib/data";
import { HandCoins, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/assistances")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({ meta: [{ title: "Assistances décès — Admin ANZRBO" }] }),
});

function StatutBadge({ s }: { s: string }) {
  if (s === "versee") return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Versée</Badge>;
  if (s === "refusee") return <Badge className="bg-red-100 text-red-700"><XCircle className="mr-1 h-3 w-3" />Refusée</Badge>;
  return <Badge className="bg-amber-100 text-amber-700"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
}

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const versees = ASSISTANCES.filter((a) => a.statut === "versee");
  const refusees = ASSISTANCES.filter((a) => a.statut === "refusee");
  const enAttente = ASSISTANCES.filter((a) => a.statut === "en_attente");

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
            <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Dossiers d'assistance</CardTitle>
            <CardDescription>
              Règles : membre principal actif, ancienneté ≥ 3 mois, cotisations à jour. Unicité 1 par décès. Si NSIA : commission 25%.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Défunt</TableHead><TableHead>Type</TableHead>
                <TableHead>Date décès</TableHead><TableHead>Bénéficiaire</TableHead>
                <TableHead>Montant ANZRBO</TableHead><TableHead>Statut</TableHead>
                <TableHead>NSIA</TableHead><TableHead>Motif refus</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ASSISTANCES.map((a) => {
                  const d = DECLARATIONS.find((x) => x.id === a.declarationId)!;
                  const nsia = PAIEMENTS_NSIA.find((p) => p.declarationId === a.declarationId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{d.nomDefunt}</TableCell>
                      <TableCell>{d.defuntType === "principal" ? "Membre" : "Ayant droit"}</TableCell>
                      <TableCell>{new Date(d.dateDeces).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{a.beneficiaire}</TableCell>
                      <TableCell className="font-semibold">{a.montant.toLocaleString("fr-FR")} F</TableCell>
                      <TableCell><StatutBadge s={a.statut} /></TableCell>
                      <TableCell>
                        {nsia ? <span className="text-xs">+{nsia.netFamille.toLocaleString("fr-FR")} F (NSIA)<br/>Commission assoc : {nsia.commissionAssoc.toLocaleString("fr-FR")} F</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.motifRefus || "—"}</TableCell>
                    </TableRow>
                  );
                })}
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
