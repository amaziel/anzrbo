import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, UserCheck, UserMinus, UserX, Wallet, HandCoins, AlertTriangle,
  FileCheck, ShieldCheck, Activity, ArrowUpRight, Sparkles, Building2,
} from "lucide-react";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import {
  MEMBRES, DECLARATIONS, ASSISTANCES, statsAnzrbo, aJour,
  COTISATIONS, ayantsDroitDe,
} from "@/lib/data";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: AdminDashboard,
  head: () => ({ meta: [
    { title: "Tableau de bord — Admin ANZRBO" },
    { name: "description", content: "Pilotage opérationnel ANZRBO : membres, cotisations, assistances, NSIA." },
  ]}),
});

function fmt(n: number) { return n.toLocaleString("fr-FR") + " F"; }

function AdminDashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const s = useMemo(() => statsAnzrbo(), []);
  const repartition = useMemo(() => [
    { name: "Actifs", value: s.actifs, color: "hsl(142 71% 45%)" },
    { name: "Suspendus", value: s.suspendus, color: "hsl(38 92% 50%)" },
    { name: "Décédés", value: s.decedes, color: "hsl(0 72% 51%)" },
  ], [s]);

  const trend = useMemo(() => {
    const buckets = new Map<string, { mois: string; cotisations: number; assistances: number }>();
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
    months.forEach((m) => buckets.set(m, { mois: m, cotisations: 0, assistances: 0 }));
    COTISATIONS.filter((c) => c.statut === "payee" && c.date).forEach((c) => {
      const d = new Date(c.date!);
      const k = months[d.getMonth()];
      const b = buckets.get(k); if (b) b.cotisations += c.montant;
    });
    ASSISTANCES.filter((a) => a.statut === "versee" && a.dateTraitement).forEach((a) => {
      const d = new Date(a.dateTraitement!);
      const k = months[d.getMonth()];
      const b = buckets.get(k); if (b) b.assistances += a.montant;
    });
    return Array.from(buckets.values());
  }, []);

  const alertesCarence = useMemo(() => {
    const now = new Date();
    return MEMBRES.filter((m) => {
      const di = new Date(m.dateInscription);
      const diffMonths = (now.getFullYear() - di.getFullYear()) * 12 + (now.getMonth() - di.getMonth());
      return diffMonths < 3;
    });
  }, []);

  const alertesNonAJour = useMemo(() => MEMBRES.filter((m) => m.statut === "actif" && !aJour(m.id)), []);
  const dossiersEnAttente = useMemo(() => ASSISTANCES.filter((a) => a.statut === "en_attente"), []);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <DashboardHeader title="Admin ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary via-primary to-primary/80 p-8 text-primary-foreground shadow-xl">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3 gap-1 border-white/20 bg-white/15 text-white">
                <Sparkles className="h-3 w-3" /> Tableau de bord ANZRBO
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pilotage de l'association</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                Indicateurs consolidés des membres, cotisations solidaires, assistances décès et partenariat NSIA.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Link to="/admin/membres/nouveau"><Users className="mr-2 h-4 w-4" /> Inscrire un membre</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 14 KPI cards (cf. CDC §6.1) */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI icon={Users} label="Membres inscrits" value={s.total} gradient="from-blue-500 to-indigo-600" />
          <KPI icon={UserCheck} label="Membres actifs" value={s.actifs} gradient="from-emerald-500 to-green-600" />
          <KPI icon={UserMinus} label="Suspendus" value={s.suspendus} gradient="from-amber-500 to-orange-600" />
          <KPI icon={UserX} label="Décès déclarés" value={s.decedes} gradient="from-rose-500 to-red-600" />

          <KPI icon={Wallet} label="Cotisations collectées" value={fmt(s.totalCotPayees)} gradient="from-purple-500 to-pink-600" trend={`${s.nbCotPayees} paiements`} />
          <KPI icon={HandCoins} label="Part association" value={fmt(s.partAssociation)} gradient="from-cyan-500 to-blue-600" />
          <KPI icon={AlertTriangle} label="Cotisations en attente" value={fmt(s.totalEnAttente)} gradient="from-red-500 to-rose-600" trend={`${s.nbEnAttente} en retard`} />

          <KPI icon={FileCheck} label="Assistances versées" value={fmt(s.totalAssistances)} gradient="from-teal-500 to-emerald-600" trend={`${s.nbAssistances} dossiers`} />
          <KPI icon={ShieldCheck} label="Souscriptions NSIA" value={fmt(s.totalSouscriptionsNsia)} gradient="from-indigo-500 to-purple-600" trend={`${s.nbSouscriptions} souscripteurs`} />
          <KPI icon={ShieldCheck} label="Assistances NSIA reçues" value={fmt(s.totalNsiaRecu)} gradient="from-fuchsia-500 to-pink-600" trend={`${s.nbPaiementsNsia} versements`} />
          <KPI icon={HandCoins} label="Commission NSIA (25%)" value={fmt(s.commissionsNsia)} gradient="from-amber-500 to-yellow-600" />

          <KPI icon={Activity} label="Décès déclarés (total)" value={s.nbDeclarations} gradient="from-gray-500 to-gray-700" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-0 shadow-md lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Flux financiers — 6 derniers mois</CardTitle>
                  <CardDescription>Cotisations encaissées vs assistances versées</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1"><ArrowUpRight className="h-3 w-3" /> Tendance</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mois" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                    <Area type="monotone" dataKey="cotisations" stroke="hsl(var(--primary))" fill="url(#gC)" strokeWidth={2} />
                    <Area type="monotone" dataKey="assistances" stroke="hsl(0 72% 51%)" fill="url(#gA)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Répartition des membres</CardTitle>
              <CardDescription>Par statut</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={repartition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {repartition.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-col gap-1.5 text-xs">
                {repartition.map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="text-muted-foreground">{r.name}</span>
                    </div>
                    <span className="font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alertes dynamiques (CDC §6.2) */}
        <section className="grid gap-4 md:grid-cols-3">
          <AlerteBox title="Membres en carence (< 3 mois)" count={alertesCarence.length} variant="warn"
            items={alertesCarence.map((m) => `${m.prenoms} ${m.nom} — éligible le ${new Date(new Date(m.dateInscription).setMonth(new Date(m.dateInscription).getMonth() + 3)).toLocaleDateString("fr-FR")}`)} />
          <AlerteBox title="Membres avec cotisations non payées" count={alertesNonAJour.length} variant="danger"
            items={alertesNonAJour.map((m) => `${m.prenoms} ${m.nom} (${m.telephone})`)} />
          <AlerteBox title="Dossiers d'assistance en attente" count={dossiersEnAttente.length} variant="info"
            items={dossiersEnAttente.map((a) => {
              const d = DECLARATIONS.find((x) => x.id === a.declarationId);
              return d ? `${d.nomDefunt} — déclaré le ${new Date(d.dateDeclaration).toLocaleDateString("fr-FR")}` : a.id;
            })} />
        </section>

        {/* Membres récents */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Membres récents</CardTitle>
            <CardDescription>Cliquez sur « Membres » dans la navigation pour la liste complète.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">N° Membre</th><th>Nom</th><th>Village</th><th>Statut</th><th>Ayants droit</th><th>À jour</th></tr>
                </thead>
                <tbody>
                  {MEMBRES.slice(0, 10).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="py-2 font-mono text-xs">{m.numeroMembre}</td>
                      <td>{m.prenoms} {m.nom}</td>
                      <td className="text-muted-foreground">{m.village}</td>
                      <td><StatutBadge statut={m.statut} /></td>
                      <td>{ayantsDroitDe(m.id).length}</td>
                      <td>{m.statut === "actif" ? (aJour(m.id) ? <Badge className="bg-emerald-100 text-emerald-700">Oui</Badge> : <Badge className="bg-red-100 text-red-700">Non</Badge>) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <Button asChild variant="outline"><Link to="/admin/membres">Voir tous les membres</Link></Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    actif: "bg-emerald-100 text-emerald-700",
    suspendu: "bg-amber-100 text-amber-700",
    decede: "bg-rose-100 text-rose-700",
  };
  return <Badge className={map[statut] ?? "bg-muted"}>{statut}</Badge>;
}

function KPI({ icon: Icon, label, value, gradient, trend }: { icon: any; label: string; value: any; gradient: string; trend?: string }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.08]`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</div>
            <div className="text-xl font-bold tracking-tight">{value}</div>
            {trend && <div className="text-xs text-muted-foreground">{trend}</div>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlerteBox({ title, count, items, variant }: { title: string; count: number; items: string[]; variant: "warn" | "danger" | "info" }) {
  const styles = {
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  }[variant];
  return (
    <Card className={`border ${styles}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline" className="ml-2">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-xs opacity-70">Aucun élément.</p> : (
          <ul className="space-y-1 text-xs">
            {items.slice(0, 5).map((i, k) => <li key={k}>• {i}</li>)}
            {items.length > 5 && <li className="opacity-70">… et {items.length - 5} de plus</li>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
