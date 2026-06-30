import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { seedInitialAccounts } from "@/lib/accounts.functions";

export const Route = createFileRoute("/seed-init")({
  component: Page,
  head: () => ({ meta: [{ title: "Seed initial — ANZRBO" }] }),
});

function Page() {
  const seedFn = useServerFn(seedInitialAccounts);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string>(() => localStorage.getItem("anzrbo_seed_status") || "non_executé");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "seed_executé") localStorage.setItem("anzrbo_seed_status", status);
  }, [status]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (status === "seed_executé") return;
    setBusy(true); setError(null);
    try {
      const r = await seedFn({ data: { seedToken: token } });
      console.info("[seed-init]", r);
      setStatus(r.ok === false && r.reason === "already_seeded" ? "seed_executé" : "seed_executé");
    } catch (e: any) {
      console.error("[seed-init]", e);
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  }

  return <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
    <Card className="w-full max-w-md"><CardHeader><CardTitle>Seed initial sécurisé</CardTitle><CardDescription>Garde-fou actif : après succès, le seed est marqué comme exécuté et ne se relance plus depuis cette page.</CardDescription></CardHeader>
      <CardContent><form onSubmit={run} className="space-y-3">
        <div className="rounded-md border bg-background p-3 text-sm">Statut : <strong>{status === "seed_executé" ? "seed exécuté" : "seed non exécuté"}</strong></div>
        {status !== "seed_executé" && <Input type="password" placeholder="SEED_TOKEN" value={token} onChange={(e) => setToken(e.target.value)} />}
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{error}</div>}
        <Button className="w-full" disabled={busy || status === "seed_executé"}>{busy ? "Exécution…" : status === "seed_executé" ? "Seed exécuté" : "Lancer le seed"}</Button>
      </form></CardContent></Card>
  </div>;
}