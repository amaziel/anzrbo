import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Play } from "lucide-react";
import { seedInitialAccounts } from "@/lib/accounts.functions";

export const Route = createFileRoute("/seed-init")({
  component: SeedInit,
  head: () => ({ meta: [{ title: "Seed initial — ANZRBO" }] }),
});

function SeedInit() {
  const seedFn = useServerFn(seedInitialAccounts);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSeed() {
    if (!token || token.length < 8) { setError("Jeton requis (min 8 caractères)"); return; }
    setBusy(true); setError(null);
    try {
      const r = await seedFn({ data: { seedToken: token } });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Seed échoué");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Initialisation des comptes
            </CardTitle>
            <CardDescription>
              Crée une seule fois les comptes initiaux. Requiert un jeton serveur
              (<code>SEED_TOKEN</code>) et des mots de passe configurés via variables
              d'environnement (<code>SEED_PWD_SUPER_ADMIN</code>, <code>SEED_PWD_ANZRBO</code>,
              <code>SEED_PWD_NSIA</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seedToken">Jeton de seed</Label>
              <Input
                id="seedToken"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Saisir le SEED_TOKEN serveur"
              />
            </div>

            <Button onClick={runSeed} disabled={busy}>
              <Play className="mr-2 h-4 w-4" /> {busy ? "Exécution…" : "Lancer le seed"}
            </Button>

            {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

            {result && (
              <>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
                <div className="text-sm">
                  Va sur <Link to="/login" className="underline font-medium">/login</Link> pour te connecter.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
