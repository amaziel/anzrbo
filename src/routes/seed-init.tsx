import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { seedInitialAccounts, resetPasswordByIdentifier } from "@/lib/accounts.functions";

export const Route = createFileRoute("/seed-init")({
  component: Page,
  head: () => ({ meta: [{ title: "Seed initial — ANZRBO" }] }),
});

function Page() {
  const seedFn = useServerFn(seedInitialAccounts);
  const resetFn = useServerFn(resetPasswordByIdentifier);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string>(() => typeof window === "undefined" ? "non_executé" : (localStorage.getItem("anzrbo_seed_status") || "non_executé"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset password form
  const [rIdent, setRIdent] = useState("");
  const [rPwd, setRPwd] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [rMsg, setRMsg] = useState<string | null>(null);
  const [rErr, setRErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && status === "seed_executé") localStorage.setItem("anzrbo_seed_status", status);
  }, [status]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (status === "seed_executé") return;
    setBusy(true); setError(null);
    try {
      const r = await seedFn({ data: { seedToken: token } });
      console.info("[seed-init]", r);
      setStatus("seed_executé");
    } catch (e: any) {
      console.error("[seed-init]", e);
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  }

  async function runReset(e: React.FormEvent) {
    e.preventDefault();
    setRBusy(true); setRMsg(null); setRErr(null);
    try {
      const r = await resetFn({ data: { seedToken: token, identifiant: rIdent, password: rPwd } });
      setRMsg(`Mot de passe mis à jour pour « ${r.identifiant} ». Vous pouvez vous connecter.`);
      setRPwd("");
    } catch (e: any) {
      setRErr(e?.message ?? String(e));
    } finally { setRBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seed initial sécurisé</CardTitle>
            <CardDescription>Après succès, le seed est marqué comme exécuté.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={run} className="space-y-3">
              <div className="rounded-md border bg-background p-3 text-sm">
                Statut : <strong>{status === "seed_executé" ? "seed exécuté" : "seed non exécuté"}</strong>
              </div>
              <Input type="password" placeholder="SEED_TOKEN" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
              {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{error}</div>}
              <Button className="w-full" disabled={busy || status === "seed_executé"}>{busy ? "Exécution…" : status === "seed_executé" ? "Seed exécuté" : "Lancer le seed"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Réinitialiser un mot de passe</CardTitle>
            <CardDescription>Utilisez le même <code>SEED_TOKEN</code> ci-dessus. Identifiants supportés : <code>admin</code> (ou <code>digitorg</code>), <code>nsia</code>, <code>0759566087</code>.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={runReset} className="space-y-3">
              <Input placeholder="Identifiant (ex: nsia, digitorg, admin)" value={rIdent} onChange={(e) => setRIdent(e.target.value)} autoComplete="off" />
              <Input type="text" placeholder="Nouveau mot de passe (min 6)" value={rPwd} onChange={(e) => setRPwd(e.target.value)} autoComplete="off" />
              {rErr && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{rErr}</div>}
              {rMsg && <div className="rounded-md border border-primary/40 bg-primary/5 p-2 text-sm text-primary">{rMsg}</div>}
              <Button className="w-full" disabled={rBusy || !token || !rIdent || !rPwd}>{rBusy ? "Mise à jour…" : "Réinitialiser le mot de passe"}</Button>
              <p className="text-xs text-muted-foreground">Le <code>SEED_TOKEN</code> est votre secret serveur — jamais partagé au navigateur en dehors de cette page.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
