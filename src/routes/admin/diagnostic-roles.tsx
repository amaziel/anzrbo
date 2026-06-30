import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { roleDiagnostics } from "@/lib/maintenance.functions";

export const Route = createFileRoute("/admin/diagnostic-roles")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo", "digitorg", "nsia"]); if (r) throw r; },
  component: Page,
  head: () => ({ meta: [{ title: "Diagnostic rôles — ANZRBO" }] }),
});

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const run = useServerFn(roleDiagnostics);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  async function refresh() {
    setBusy(true); setError(null);
    try { const r = await run({ data: {} }); setData(r); console.info("[diagnostic-roles]", r); }
    catch (e: any) { console.error("[diagnostic-roles]", e); setError(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (user) void refresh(); /* eslint-disable-next-line */ }, [!!user]);
  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;
  return <div className="min-h-screen bg-muted/30"><DashboardHeader title="Diagnostic rôles" nav={ADMIN_NAV} />
    <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Card><CardHeader><CardTitle>Diagnostic en temps réel</CardTitle><CardDescription>Vérifie has_role, tables Supabase et buckets Storage pour l'utilisateur connecté.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={refresh} disabled={busy}>{busy ? "Vérification…" : "Relancer le diagnostic"}</Button>
          {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          {data && <>
            <Block title="Rôles directs" rows={(data.directRoles ?? []).map((r: string) => ({ name: r, ok: true }))} />
            <Block title="has_role()" rows={(data.rolesViaRpc ?? []).map((r: any) => ({ name: r.role, ok: r.has, error: r.error }))} />
            <Block title="Tables" rows={(data.tables ?? []).map((r: any) => ({ name: r.table, ok: r.read, error: r.error }))} />
            <Block title="Storage buckets" rows={(data.buckets ?? []).map((r: any) => ({ name: r.bucket, ok: r.list, error: r.error }))} />
          </>}
        </CardContent></Card>
    </main></div>;
}

function Block({ title, rows }: { title: string; rows: Array<{ name: string; ok: boolean; error?: string }> }) {
  return <section><h2 className="mb-2 font-semibold">{title}</h2><div className="grid gap-2 md:grid-cols-2">{rows.map((r) => <div key={r.name} className="rounded-md border bg-background p-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium">{r.name}</span><Badge variant={r.ok ? "default" : "destructive"}>{r.ok ? "OK" : "Bloqué"}</Badge></div>{r.error && <p className="mt-1 break-words text-xs text-destructive">{r.error}</p>}</div>)}</div></section>;
}