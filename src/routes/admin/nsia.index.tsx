import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { FORMULES_NSIA } from "@/lib/data";
import { listNsiaSubscriptions } from "@/lib/members.functions";
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
  const listNsiaFn = useServerFn(listNsiaSubscriptions);
  const { data, isLoading } = useQuery({
    queryKey: ["nsia-subscriptions"],
    queryFn: () => listNsiaFn(),
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const rows = data?.rows ?? [];
  const parsedRows = rows.map((r: any) => ({ ...r, meta: safeJson(r.notes)?.nsia ? safeJson(r.notes) : null }));
  const totalCotisations = rows.reduce((s: number, x: any) => s + (Number(x.montant) || 0), 0);
  const totalVerses = 0;
  const totalCommissions = 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Partenariat NSIA — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Souscriptions actives" value={rows.length} />
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
                {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
                {!isLoading && parsedRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucune souscription enregistrée.</TableCell></TableRow>}
                {parsedRows.map((s: any) => {
                  const m = s.members;
                  const meta = s.meta ?? {};
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{m?.prenoms} {m?.nom}<div className="font-mono text-xs text-muted-foreground">{m?.numero_membre}</div></TableCell>
                      <TableCell>Formule {meta.formule ?? "—"}</TableCell>
                      <TableCell>{Number(meta.benefice ?? 0).toLocaleString("fr-FR")} F</TableCell>
                      <TableCell>{meta.nbPersonnes ?? "—"}</TableCell>
                      <TableCell className="font-semibold">{Number(s.montant ?? 0).toLocaleString("fr-FR")} F</TableCell>
                      <TableCell>{new Date(s.paye_le ?? s.created_at).toLocaleDateString("fr-FR")}</TableCell>
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
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucun versement sinistre NSIA enregistré dans la base.</TableCell></TableRow>
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

function safeJson(v: any) {
  try { return typeof v === "string" ? JSON.parse(v) : v ?? {}; } catch { return {}; }
}
