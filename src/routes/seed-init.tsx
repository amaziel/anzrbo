import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Play } from "lucide-react";
import { seedInitialAccounts } from "@/lib/accounts.functions";
import { seedStatus } from "@/lib/maintenance.functions";

export const Route = createFileRoute("/seed-init")({
  component: SeedInit,
  head: () => ({ meta: [{ title: "Seed initial — ANZRBO" }] }),
});

function SeedInit() {
  const statusFn = useServerFn(seedStatus);
  const seedFn = useServerFn(seedInitialAccounts);
  const [status, setStatus] = useState<{ seeded: boolean; superAdminCount: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try { setStatus(await statusFn()); } catch (e: any) { setError(e?.message ?? "Erreur status"); }
  }
  useEffect(() => { void refresh(); }, []);

  async function runSeed() {
    setBusy(true); setError(null);
    try {
      const r = await seedFn();
      setResult(r);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Seed échoué");
    } finally { setBusy(false); }
  }

  const alreadySeeded = status?.seeded === true;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {alreadySeeded ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
              Initialisation des comptes
            </CardTitle>
            <CardDescription>
              Crée une seule fois les comptes <strong>admin / 0759566087 / nsia</strong>. Bloqué automatiquement après succès.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Statut :</span>
              {alreadySeeded
                ? <Badge className="bg-emerald-100 text-emerald-700">Seed exécuté ({status?.superAdminCount} super_admin)</Badge>
                : <Badge variant="outline">En attente</Badge>}
            </div>

            {!alreadySeeded && (
              <Button onClick={runSeed} disabled={busy}>
                <Play className="mr-2 h-4 w-4" /> {busy ? "Exécution…" : "Lancer le seed"}
              </Button>
            )}

            {alreadySeeded && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Le seed a déjà été exécuté. Re-exécution bloquée pour éviter les doublons.
                Va sur <Link to="/login" className="underline font-medium">/login</Link> pour te connecter.
              </div>
            )}

            {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

            {result && (
              <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
