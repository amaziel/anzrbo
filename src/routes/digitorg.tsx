import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { DashboardHeader, DIGITORG_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { MEMBRES, FRAIS_INSCRIPTION_DIGITORG, statsAnzrbo } from "@/lib/data";
import { Building2, Sparkles, Wallet, Users, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/digitorg")({
  beforeLoad: () => { const r = clientRoleGuard(["digitorg"]); if (r) throw r; },
  component: DigitOrgDashboard,
  head: () => ({ meta: [
    { title: "DigitOrg — Pilotage maître d'œuvre" },
    { name: "description", content: "Tableau de bord DigitOrg : suivi des frais d'inscription perçus pour la plateforme ANZRBO." },
  ]}),
});

function DigitOrgDashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "digitorg")) nav({ to: "/login" }); }, [user, loading, nav]);
  const s = useMemo(() => statsAnzrbo(), []);

  const trend = useMemo(() => {
    const months = ["Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai"];
    const buckets = new Map<string, { mois: string; inscriptions: number; frais: number }>();
    months.forEach((m) => buckets.set(m, { mois: m, inscriptions: 0, frais: 0 }));
    MEMBRES.forEach((m) => {
      const d = new Date(m.dateInscription);
      const k = months[d.getMonth()] ?? "Jan";
      const b = buckets.get(k); if (b) { b.inscriptions += 1; b.frais += FRAIS_INSCRIPTION_DIGITORG; }
    });
    return Array.from(buckets.values());
  }, []);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <DashboardHeader title="DigitOrg — Maître d'œuvre" nav={DIGITORG_NAV} />
      <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-8 text-white shadow-xl">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <Badge variant="secondary" className="mb-3 gap-1 border-white/20 bg-white/15 text-white">
              <Sparkles className="h-3 w-3" /> Pilotage DigitOrg
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tableau de bord DigitOrg</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              DigitOrg est le maître d'œuvre de la plateforme ANZRBO. Sa rémunération provient exclusivement
              des frais d'inscription (1 500 FCFA par membre). DigitOrg ne perçoit aucune part sur les cotisations,
              les assistances ANZRBO ni sur les versements NSIA.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI icon={Users} label="Membres inscrits" value={s.total} gradient="from-blue-500 to-indigo-600" />
          <KPI icon={Wallet} label="Frais d'inscription perçus" value={`${s.fraisInscription.toLocaleString("fr-FR")} F`} gradient="from-emerald-500 to-green-600" trend={`${FRAIS_INSCRIPTION_DIGITORG.toLocaleString("fr-FR")} F / membre`} />
          <KPI icon={Building2} label="Tarif unitaire" value={`${FRAIS_INSCRIPTION_DIGITORG.toLocaleString("fr-FR")} F`} gradient="from-purple-500 to-pink-600" />
          <KPI icon={Wallet} label="Part cotisations / NSIA" value="0 F" gradient="from-slate-500 to-slate-700" trend="Aucune commission" />
        </section>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inscriptions et frais perçus — 12 derniers mois</CardTitle>
                <CardDescription>Volume d'adhésions et chiffre d'affaires DigitOrg consolidé.</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1"><ArrowUpRight className="h-3 w-3" /> Tendance</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="gFrais" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(252 70% 55%)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(252 70% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mois" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR")} contentStyle={{ borderRadius: 12 }} />
                  <Area type="monotone" dataKey="inscriptions" stroke="hsl(252 70% 55%)" fill="url(#gFrais)" strokeWidth={2} name="Inscriptions" />
                  <Area type="monotone" dataKey="frais" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45% / 0.1)" strokeWidth={2} name="Frais (F)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>À propos de DigitOrg</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            DigitOrg ({" "}<a href="https://digitorg.net" target="_blank" rel="noreferrer" className="text-primary underline">digitorg.net</a>{" "})
            édite et maintient la plateforme numérique de gestion d'ANZRBO :
            inscriptions par administrateur, cotisations solidaires (1 200 FCFA par décès),
            assistances décès (500 000 FCFA), souscriptions NSIA et notifications SMS / WhatsApp.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function KPI({ icon: Icon, label, value, gradient, trend }: { icon: any; label: string; value: any; gradient: string; trend?: string }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.08]`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-xl font-bold tracking-tight">{value}</div>
            {trend && <div className="text-xs text-muted-foreground">{trend}</div>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
