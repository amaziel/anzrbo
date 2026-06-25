import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, HardDrive, RefreshCcw, Trash2, Wifi } from "lucide-react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BUILD_INFO } from "@/lib/build-info";
import {
  clearClientDiagnostics,
  readClientDiagnostics,
  type ClientDiagnosticEvent,
} from "@/lib/client-diagnostics";
import { useAuth, clientRoleGuard } from "@/lib/auth";

type BuildManifest = {
  checkedAt?: string;
  vercelOutputDirectory?: string;
  publicOutputDirectory?: string;
  serverEntry?: string;
  publicFiles?: number;
  deployment?: { environment?: string; url?: string | null; gitCommit?: string | null };
};

type RuntimeState = {
  href: string;
  origin: string;
  serviceWorkers: string[];
  caches: string[];
};

export const Route = createFileRoute("/admin/diagnostics")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: AdminDiagnostics,
  head: () => ({ meta: [
    { title: "Diagnostics build — Admin ANZRBO" },
    { name: "description", content: "Contrôle local du build Vercel, du cache navigateur et des erreurs de preview ANZRBO." },
  ]}),
});

function AdminDiagnostics() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [events, setEvents] = useState<ClientDiagnosticEvent[]>([]);
  const [manifest, setManifest] = useState<BuildManifest | null>(null);
  const [manifestError, setManifestError] = useState("");
  const [runtime, setRuntime] = useState<RuntimeState>({ href: "", origin: "", serviceWorkers: [], caches: [] });

  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const refresh = async () => {
    setEvents(readClientDiagnostics());
    if (typeof window !== "undefined") {
      const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      const cacheNames = "caches" in window ? await window.caches.keys() : [];
      setRuntime({
        href: window.location.href,
        origin: window.location.origin,
        serviceWorkers: registrations.map((registration) => registration.scope),
        caches: cacheNames,
      });
      try {
        const response = await fetch(`/build-diagnostics.json?v=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        setManifest(await response.json());
        setManifestError("");
      } catch (error) {
        setManifest(null);
        setManifestError(error instanceof Error ? error.message : "Manifest build indisponible");
      }
    }
  };

  useEffect(() => { void refresh(); }, []);

  const diskSignals = useMemo(() => events.filter((event) => /disk|quota|storage|black|noir|dist-check|dist/i.test(`${event.message} ${event.detail ?? ""}`)), [events]);
  const outputOk = (manifest?.vercelOutputDirectory ?? BUILD_INFO.expectedVercelOutputDirectory) === BUILD_INFO.expectedVercelOutputDirectory;
  const cacheOk = runtime.serviceWorkers.length === 0 && runtime.caches.length === 0;

  const purgeBrowserState = async () => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.allSettled(cacheNames.map((name) => window.caches.delete(name)));
    }
    await refresh();
  };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <DashboardHeader title="Diagnostics — Admin ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 gap-1"><Activity className="h-3 w-3" /> Contrôle déploiement</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Diagnostics build & preview</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Vérification immédiate de la sortie Vercel, de l'URL en cours, des caches, du service worker et des erreurs visibles côté navigateur.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()}><RefreshCcw className="mr-2 h-4 w-4" /> Actualiser</Button>
            <Button variant="destructive" onClick={() => { clearClientDiagnostics(); setEvents([]); }}><Trash2 className="mr-2 h-4 w-4" /> Effacer erreurs</Button>
            <Button onClick={() => void purgeBrowserState()}><HardDrive className="mr-2 h-4 w-4" /> Purger cache</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard title="Sortie Vercel" ok={outputOk} value={BUILD_INFO.expectedVercelOutputDirectory} detail={manifest ? `${manifest.publicFiles ?? 0} fichiers publics détectés` : `Manifest absent ici : ${manifestError || "preview locale"}`} />
          <StatusCard title="Service worker / cache" ok={cacheOk} value={cacheOk ? "Purgé" : "À purger"} detail={`${runtime.serviceWorkers.length} service worker, ${runtime.caches.length} cache navigateur`} />
          <StatusCard title="Signaux disk / écran noir" ok={diskSignals.length === 0} value={diskSignals.length === 0 ? "Aucun" : `${diskSignals.length} alerte(s)`} detail="Recherche automatique dans les erreurs console/réseau" />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Build Vercel</CardTitle>
              <CardDescription>La configuration cible explicitement la racine .output attendue par Vercel, avec les fichiers publics dans .output/public.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Dossier public attendu" value={BUILD_INFO.expectedVercelOutputDirectory} />
              <InfoRow label="Assets publics" value={manifest?.publicOutputDirectory ?? BUILD_INFO.publicOutputDirectory} />
              <InfoRow label="Dossier serveur" value={BUILD_INFO.serverOutputDirectory} />
              <InfoRow label="Mode build" value={BUILD_INFO.buildMode} />
              <InfoRow label="Environnement Vercel" value={manifest?.deployment?.environment ?? BUILD_INFO.vercelEnv} />
              <InfoRow label="Commit" value={manifest?.deployment?.gitCommit ?? BUILD_INFO.commitSha} />
              <InfoRow label="Manifest vérifié" value={manifest?.checkedAt ?? manifestError ?? "Non disponible"} />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>URL & runtime</CardTitle>
              <CardDescription>Repères rapides pour comparer preview Lovable, preview Vercel et production.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="URL actuelle" value={runtime.href} />
              <InfoRow label="Origine preview" value={runtime.origin} />
              <InfoRow label="URL Vercel build" value={manifest?.deployment?.url ?? BUILD_INFO.vercelUrl} />
              <InfoRow label="Service workers" value={runtime.serviceWorkers.length ? runtime.serviceWorkers.join(" | ") : "Aucun"} />
              <InfoRow label="Caches navigateur" value={runtime.caches.length ? runtime.caches.join(" | ") : "Aucun"} />
            </CardContent>
          </Card>
        </section>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wifi className="h-5 w-5 text-primary" /> Erreurs réseau / console</CardTitle>
            <CardDescription>Les erreurs sont capturées localement dans le navigateur pour repérer immédiatement disk, dist-check failed ou écran noir.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Niveau</TableHead><TableHead>Message</TableHead><TableHead>Détail</TableHead></TableRow></TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aucune erreur capturée.</TableCell></TableRow>
                ) : events.map((event, index) => (
                  <TableRow key={`${event.at}-${index}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(event.at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell><Badge variant="outline">{event.type}</Badge></TableCell>
                    <TableCell><Badge variant={event.level === "error" ? "destructive" : "secondary"}>{event.level}</Badge></TableCell>
                    <TableCell className="min-w-64 font-medium">{event.message}</TableCell>
                    <TableCell className="min-w-72 text-xs text-muted-foreground">{event.detail ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatusCard({ title, ok, value, detail }: { title: string; ok: boolean; value: string; detail: string }) {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="truncate text-xl font-bold tracking-tight text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          {ok ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 border-b border-border/70 pb-2 last:border-0 sm:grid-cols-[12rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}