import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Loader2 } from "lucide-react";

export const Route = createFileRoute("/scanner")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Scanner un QR Code — ANZRBO" },
      { name: "description", content: "Vérifiez une carte membre ANZRBO par QR code ou numéro de téléphone." },
    ],
  }),
});

function parseTelephone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // Accepte une URL .../verifier/0700000000 ou un numéro brut
  const m = v.match(/(?:\/m\/|\/verifier\/)([^/?#]+)/i);
  if (m) return decodeURIComponent(m[1]);
  return v.replace(/[^+\d]/g, "");
}

function Page() {
  const nav = useNavigate();
  const [manual, setManual] = useState("");
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {}).finally(() => scannerRef.current?.clear?.());
    };
  }, []);

  async function startCamera() {
    setError(null);
    setStarting(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const html5 = new Html5Qrcode("qr-reader");
      scannerRef.current = html5 as unknown as { stop: () => Promise<void>; clear: () => void };
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const id = parseTelephone(decoded);
          if (id) {
            html5.stop().then(() => nav({ to: "/verifier/$telephone", params: { telephone: id } }));
          }
        },
        () => {},
      );
      setActive(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Impossible d'accéder à la caméra.";
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  function onManual(e: React.FormEvent) {
    e.preventDefault();
    const id = parseTelephone(manual);
    if (id) nav({ to: "/verifier/$telephone", params: { telephone: id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ScanLine className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Scanner un QR Code</h1>
          <p className="mt-2 text-muted-foreground">
            Vérifiez une carte membre ANZRBO par QR code ou saisie du numéro de téléphone.
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="space-y-6 p-6">
            <div>
              <div id="qr-reader" className="overflow-hidden rounded-xl border bg-muted/30" />
              {!active && (
                <Button onClick={startCamera} disabled={starting} className="mt-4 w-full">
                  {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                  {starting ? "Démarrage…" : "Activer la caméra"}
                </Button>
              )}
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou saisir manuellement</span>
              </div>
            </div>

            <form onSubmit={onManual} className="space-y-3">
              <Label htmlFor="m">Numéro de téléphone du membre</Label>
              <Input id="m" inputMode="tel" placeholder="Ex: 07 58 89 43 63" value={manual} onChange={(e) => setManual(e.target.value)} />
              <Button type="submit" variant="outline" className="w-full" disabled={!manual.trim()}>
                Vérifier
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
