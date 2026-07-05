import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, NSIA_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { FORMULES_NSIA, TAUX_COMMISSION_NSIA } from "@/lib/data";
import { listNsiaSubscriptions } from "@/lib/members.functions";
import { ShieldCheck, Sparkles, Users, Wallet, HandCoins, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/nsia")({
  beforeLoad: () => { const r = clientRoleGuard(["nsia"]); if (r) throw r; },
  component: NsiaDashboard,
  head: () => ({ meta: [
    { title: "NSIA — Espace partenaire" },
    { name: "description", content: "Tableau de bord du partenaire NSIA pour le suivi des souscriptions décès ANZRBO." },
  ]}),
});

function NsiaDashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || !user.roles.includes("nsia"))) nav({ to: "/login" }); }, [user, loading, nav]);
  const listNsiaFn = useServerFn(listNsiaSubscriptions);
  const { data, isLoading } = useQuery({ queryKey: ["nsia-subscriptions"], queryFn: () => listNsiaFn(), enabled: !!user, refetchOnWindowFocus: true });
  const subscriptions = (data?.rows ?? []).map((r: any) => ({ ...r, meta: safeJson(r.notes)?.nsia ? safeJson(r.notes) : {} }));

  const totalCot = subscriptions.reduce((s: number, x: any) => s + (Number(x.montant) || 0), 0);
  const totalVerses = 0;
  const commissionAssoc = 0;
  const netFamilles = 0;

  const repFormules = useMemo(() => {
    const map = new Map<number, number>();
    subscriptions.forEach((s: any) => map.set(Number(s.meta.formule ?? 0), (map.get(Number(s.meta.formule ?? 0)) ?? 0) + 1));
    const colors = ["var(--nsia-chart-1)", "var(--nsia-chart-2)", "var(--nsia-chart-3)", "var(--nsia-chart-4)", "var(--nsia-chart-5)"];
    return Array.from(map.entries()).map(([formule, count]) => ({
      name: `Formule ${formule}`, value: count,
      color: colors[(formule - 1) % colors.length],
    }));
  }, [subscriptions]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="nsia-theme min-h-screen bg-[image:var(--nsia-page-bg)]">
      <DashboardHeader title="NSIA — Espace partenaire" nav={NSIA_NAV} />
      <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border bg-[image:var(--nsia-gradient-strong)] p-8 text-primary-foreground shadow-xl">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="relative">
            <Badge variant="secondary" className="mb-3 gap-1 border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground">
              <Sparkles className="h-3 w-3" /> Partenariat NSIA Décès
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tableau de bord partenaire NSIA</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/85">
              Suivi des souscriptions, des cotisations annuelles et des bénéfices versés au titre du contrat décès
              conclu avec l'Association des N'Zipris Résidents à Bonon (ANZRBO).
            </p>
          </div>
        </section>


        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI icon={Users} label="Souscriptions actives" value={subscriptions.length} />
          <KPI icon={Wallet} label="Cotisations annuelles" value={`${totalCot.toLocaleString("fr-FR")} F`} />
          <KPI icon={HandCoins} label="Bénéfices versés" value={`${totalVerses.toLocaleString("fr-FR")} F`} trend="0 sinistre réglé" />
          <KPI icon={ShieldCheck} label="Commission ANZRBO 25%" value={`${commissionAssoc.toLocaleString("fr-FR")} F`} trend={`Net familles : ${netFamilles.toLocaleString("fr-FR")} F`} />
        </section>


        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-0 shadow-md lg:col-span-2">
            <CardHeader>
              <CardTitle>Souscriptions ANZRBO</CardTitle>
              <CardDescription>Liste complète des polices décès souscrites par les membres ANZRBO.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Souscripteur</TableHead><TableHead>Téléphone</TableHead>
                  <TableHead>Formule</TableHead><TableHead>Bénéfice</TableHead>
                  <TableHead>Pers.</TableHead><TableHead>Cotisation annuelle</TableHead>
                  <TableHead>Depuis</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
                  {!isLoading && subscriptions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucune souscription DB.</TableCell></TableRow>}
                  {subscriptions.map((s: any) => {
                    const m = s.members;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{m?.prenoms} {m?.nom}</TableCell>
                        <TableCell className="text-muted-foreground">{m?.telephone}</TableCell>
                        <TableCell>Formule {s.meta.formule ?? "—"}</TableCell>
                        <TableCell>{Number(s.meta.benefice ?? 0).toLocaleString("fr-FR")} F</TableCell>
                        <TableCell>{s.meta.nbPersonnes ?? "—"}</TableCell>
                        <TableCell className="font-semibold">{Number(s.montant ?? 0).toLocaleString("fr-FR")} F</TableCell>
                        <TableCell>{new Date(s.paye_le ?? s.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieIcon className="h-5 w-5 text-primary" /> Répartition par formule</CardTitle>
              <CardDescription>Volume de souscriptions actives.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={repFormules} dataKey="value" nameKey="name" outerRadius={90} innerRadius={40}>
                      {repFormules.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Sinistres réglés</CardTitle>
            <CardDescription>
              NSIA verse 100% du bénéfice. ANZRBO prélève {(TAUX_COMMISSION_NSIA * 100).toFixed(0)}% au titre de la convention partenaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Défunt</TableHead><TableHead>Souscripteur</TableHead>
                <TableHead>Date règlement</TableHead><TableHead>Bénéfice brut</TableHead>
                <TableHead>Commission ANZRBO</TableHead><TableHead>Net famille</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun sinistre réglé enregistré.</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Barème NSIA Décès (référentiel partenaire)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>N°</TableHead><TableHead>Bénéfice en cas de décès</TableHead>
                <TableHead>Cotisation annuelle / personne</TableHead><TableHead>Ratio</TableHead>
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

function KPI({ icon: Icon, label, value, trend }: { icon: any; label: string; value: any; trend?: string }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md">
      <div className="absolute inset-0 bg-[image:var(--nsia-gradient-soft)]" />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-xl font-bold tracking-tight">{value}</div>
            {trend && <div className="text-xs text-muted-foreground">{trend}</div>}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--nsia-gradient-strong)] text-primary-foreground shadow-lg">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function safeJson(v: any) {
  try { return typeof v === "string" ? JSON.parse(v) : v ?? {}; } catch { return {}; }
}
