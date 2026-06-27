import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, RefreshCw, Trash2 } from "lucide-react";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { roleDiagnostics, purgeDemoData } from "@/lib/maintenance.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/diagnostic-roles")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo", "super_admin"]); if (r) throw r; },
  component: DiagnosticRoles,
  head: () => ({ meta: [{ title: "Diagnostic rôles — Admin ANZRBO" }] }),
});

function Yn({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
    : <XCircle className="h-4 w-4 text-destructive inline" />;
}

function DiagnosticRoles() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const diagFn = useServerFn(roleDiagnostics);
  const purgeFn = useServerFn(purgeDemoData);
  const [diag, setDiag] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  async function refresh() {
    setBusy(true); setError(null);
    try { setDiag(await diagFn()); }
    catch (e: any) { setError(e?.message ?? "Erreur"); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (user) void refresh(); }, [user]);

  async function purge() {
    if (!confirm("Supprimer tous les membres démo et leurs photos ?")) return;
    try {
      const r = await purgeFn();
      toast.success(`Purge OK — ${r.membersRemoved} membres / ${r.photosRemoved} photos`);
    } catch (e: any) { toast.error(e?.message ?? "Purge échouée"); }
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Diagnostic rôles — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Diagnostic rôles & permissions</h1>
            <p className="text-sm text-muted-foreground">Vérifie en temps réel <code>has_role</code>, l'accès aux tables et aux buckets Storage.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button>
            <Button variant="destructive" onClick={purge}><Trash2 className="mr-2 h-4 w-4" /> Purger démo</Button>
          </div>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

        {diag && (
          <>
            <Card>
              <CardHeader><CardTitle>Identité</CardTitle></CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <div><span className="text-muted-foreground">User ID :</span> <code>{diag.userId}</code></div>
                <div><span className="text-muted-foreground">Email :</span> {diag.email ?? "—"}</div>
                <div><span className="text-muted-foreground">Rôles directs (user_roles) :</span>{" "}
                  {(diag.directRoles ?? []).length
                    ? diag.directRoles.map((r: string) => <Badge key={r} className="mr-1">{r}</Badge>)
                    : <span className="text-destructive">aucun</span>}
                </div>
                {diag.directRolesError && <div className="text-destructive">user_roles error: {diag.directRolesError}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>has_role (RPC)</CardTitle>
                <CardDescription>Test de chaque valeur de l'enum app_role.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Rôle</TableHead><TableHead>Résultat</TableHead><TableHead>Erreur</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {diag.rolesViaRpc.map((r: any) => (
                      <TableRow key={r.role}>
                        <TableCell><code>{r.role}</code></TableCell>
                        <TableCell><Yn ok={r.has} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.error ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tables (lecture)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Table</TableHead><TableHead>Lecture</TableHead><TableHead>Erreur</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {diag.tables.map((t: any) => (
                      <TableRow key={t.table}>
                        <TableCell><code>{t.table}</code></TableCell>
                        <TableCell><Yn ok={t.read} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.error ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Storage buckets (list)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Bucket</TableHead><TableHead>Accès</TableHead><TableHead>Erreur</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {diag.buckets.map((b: any) => (
                      <TableRow key={b.bucket}>
                        <TableCell><code>{b.bucket}</code></TableCell>
                        <TableCell><Yn ok={b.list} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.error ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
