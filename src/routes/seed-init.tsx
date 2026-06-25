import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { seedInitialAccounts } from "@/lib/accounts.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/seed-init")({
  component: SeedInitPage,
});

function SeedInitPage() {
  const router = useRouter();
  const seed = useServerFn(seedInitialAccounts);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<any>(null);

  async function run() {
    setState("loading");
    try {
      const r = await seed();
      setResult(r);
      setState("done");
    } catch (e: any) {
      setResult({ error: e?.message ?? String(e) });
      setState("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-xl w-full space-y-6 p-8 rounded-2xl border bg-card shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-primary">Initialisation des comptes</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Crée les 3 comptes obligatoires : <b>admin</b> (DigitOrg),{" "}
            <b>0759566087</b> (Anzrabo), <b>nsia</b> (NSIA). Action unique &mdash;
            désactivée si un super_admin existe déjà.
          </p>
        </div>

        <Button onClick={run} disabled={state === "loading"} className="w-full">
          {state === "loading" ? "Création en cours…" : "Lancer le seed"}
        </Button>

        {result && (
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-80">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        {state === "done" && (
          <div className="text-sm text-muted-foreground">
            Vous pouvez maintenant vous connecter via{" "}
            <a className="text-primary underline" href="/login">/login</a>.
            Supprimez ensuite ce fichier <code>src/routes/seed-init.tsx</code>.
          </div>
        )}
      </div>
    </div>
  );
}
