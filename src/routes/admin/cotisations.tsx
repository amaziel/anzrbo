import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { COTISATION_PAR_DECES } from "@/lib/data";
import { listMembers, listPaiements } from "@/lib/members.functions";
import { Wallet, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/cotisations")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({ meta: [{ title: "Cotisations — Admin ANZRBO" }] }),
});

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);
  const listMembersFn = useServerFn(listMembers);
  const listPaiementsFn = useServerFn(listPaiements);
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ["members", "cotisations"],
    queryFn: () => listMembersFn({ data: { q: "", page: 1, pageSize: 100, statut: "" } }),
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
  const { data: payData, isLoading: loadingPayments } = useQuery({
    queryKey: ["paiements", "cotisation"],
    queryFn: () => listPaiementsFn({ data: { type: "cotisation", limit: 1000 } }),
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  const rows = payData?.rows ?? [];
  const members = membersData?.rows ?? [];
  const payees = rows.length;
  const collecte = rows.reduce((s: number, p: any) => s + (Number(p.montant) || 0), 0);
  const enRetard = useMemo(() => members.filter((m: any) => m.statut === "actif" && !rows.some((p: any) => p.member_id === m.id)), [members, rows]);

  const parDecl = useMemo(() => [{
    id: "global",
    nom: "Cotisations décès — registre DB",
    date: new Date().toISOString(),
    total: members.filter((m: any) => m.statut === "actif").length,
    payees,
    retard: enRetard.length,
    collecte,
  }], [members, payees, enRetard.length, collecte]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Cotisations — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat icon={Wallet} label="Cotisation par décès" value={`${COTISATION_PAR_DECES.toLocaleString("fr-FR")} F`} />
          <Stat icon={Wallet} label="Cotisations payées" value={payees} />
          <Stat icon={AlertTriangle} label="Cotisations en retard" value={enRetard.length} warn />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des cotisations par décès déclaré</CardTitle>
            <CardDescription>Règle métier : 1 cotisation de 1 200 FCFA par membre actif et par décès déclaré.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Décès</TableHead><TableHead>Date</TableHead>
                <TableHead>Type</TableHead><TableHead>Cotisations dues</TableHead>
                <TableHead>Payées</TableHead><TableHead>En retard</TableHead>
                <TableHead>Collecté</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(loadingMembers || loadingPayments) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Chargement DB…</TableCell></TableRow>}
                {parDecl.map(({ id, nom, date, total, payees, retard, collecte }) => (
                  <TableRow key={id}>
                    <TableCell>{nom}</TableCell>
                    <TableCell>{new Date(date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>Cotisations membres actifs</TableCell>
                    <TableCell>{total}</TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-700">{payees}</Badge></TableCell>
                    <TableCell>{retard > 0 ? <Badge className="bg-red-100 text-red-700">{retard}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="font-semibold">{collecte.toLocaleString("fr-FR")} F</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /> Cotisations en retard</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Membre</TableHead><TableHead>Téléphone</TableHead>
                <TableHead>Décès concerné</TableHead><TableHead>Montant dû</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {enRetard.map((m: any) => {
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.prenoms} {m.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{m.telephone}</TableCell>
                      <TableCell>Cotisation décès non encore enregistrée</TableCell>
                      <TableCell className="font-semibold text-red-600">{COTISATION_PAR_DECES.toLocaleString("fr-FR")} F</TableCell>
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

function Stat({ icon: I, label, value, warn }: { icon: any; label: string; value: any; warn?: boolean }) {
  return (
    <Card><CardContent className="flex items-center justify-between p-5">
      <div><div className="text-xs uppercase text-muted-foreground">{label}</div><div className={`text-2xl font-bold ${warn ? "text-red-600" : ""}`}>{value}</div></div>
      <I className={`h-8 w-8 ${warn ? "text-red-500" : "text-primary"}`} />
    </CardContent></Card>
  );
}
