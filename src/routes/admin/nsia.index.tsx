import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { SOUSCRIPTIONS_NSIA, PAIEMENTS_NSIA, DECLARATIONS, FORMULES_NSIA, membre } from "@/lib/data";
import { ShieldCheck, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/nsia/")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({ meta: [{ title: "NSIA — Souscriptions et versements" }] }),
});

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);
  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const totalCotisations = SOUSCRIPTIONS_NSIA.reduce((s, x) => s + x.cotisationAnnuelle, 0);
  const totalVerses = PAIEMENTS_NSIA.reduce((s, x) => s + x.beneficeBrut, 0);
  const totalCommissions = PAIEMENTS_NSIA.reduce((s, x) => s + x.commissionAssoc, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Partenariat NSIA — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Souscriptions actives" value={SOUSCRIPTIONS_NSIA.length} />
          <Stat label="Cotisations annuelles totales" value={`${totalCotisations.toLocaleString("fr-FR")} F`} />
          <Stat label="Bénéfices NSIA reçus" value={`${totalVerses.toLocaleString("fr-FR")} F`} />
          <Stat label="Commission ANZRBO (25%)" value={`${totalCommissions.toLocaleString("fr-FR")} F`} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> Souscriptions NSIA Décès</CardTitle>
              <CardDescription>1 seule formule active à la fois par membre. Renouvellement chaque décembre.</CardDescription>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/admin/nsia/nouveau"><Plus className="mr-1 h-4 w-4" /> Souscrire un membre</Link>
            </Button>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Membre</TableHead><TableHead>Formule</TableHead>
                <TableHead>Bénéfice / personne</TableHead><TableHead>Nb pers.</TableHead>
                <TableHead>Cotisation annuelle</TableHead><TableHead>Depuis</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {SOUSCRIPTIONS_NSIA.map((s) => {
                  const m = membre(s.membreId)!;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{m.prenoms} {m.nom}</TableCell>
                      <TableCell>Formule {s.formule}</TableCell>
                      <TableCell>{s.benefice.toLocaleString("fr-FR")} F</TableCell>
                      <TableCell>{s.nbPersonnes}</TableCell>
                      <TableCell className="font-semibold">{s.cotisationAnnuelle.toLocaleString("fr-FR")} F</TableCell>
                      <TableCell>{new Date(s.dateSouscription).toLocaleDateString("fr-FR")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versements NSIA Décès</CardTitle>
            <CardDescription>Commission 25% prélevée par ANZRBO sur chaque bénéfice. DigitOrg n'en perçoit aucune part.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Défunt</TableHead><TableHead>Date</TableHead>
                <TableHead>Bénéfice brut</TableHead><TableHead>Commission ANZRBO</TableHead>
                <TableHead>Net famille</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {PAIEMENTS_NSIA.map((p) => {
                  const d = DECLARATIONS.find((x) => x.id === p.declarationId)!;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{d.nomDefunt}</TableCell>
                      <TableCell>{new Date(p.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{p.beneficeBrut.toLocaleString("fr-FR")} F</TableCell>
                      <TableCell className="font-semibold text-blue-700">{p.commissionAssoc.toLocaleString("fr-FR")} F</TableCell>
                      <TableCell>{p.netFamille.toLocaleString("fr-FR")} F</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Barème NSIA Décès (10 formules)</CardTitle><CardDescription>Taux constant de 2,5% du bénéfice.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>N°</TableHead><TableHead>Bénéfice</TableHead><TableHead>Cotisation annuelle / personne</TableHead><TableHead>Ratio</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {FORMULES_NSIA.map((f) => (
                  <TableRow key={f.n}>
                    <TableCell>{f.n}</TableCell>
                    <TableCell>{f.benefice.toLocaleString("fr-FR")} F</TableCell>
                    <TableCell>{f.cotisation.toLocaleString("fr-FR")} F</TableCell>
                    <TableCell>2,5%</TableCell>
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

function Stat({ label, value }: { label: string; value: any }) {
  return <Card><CardContent className="p-5"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="text-2xl font-bold">{value}</div></CardContent></Card>;
}
