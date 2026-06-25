import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Contact — ANZRBO" },
      { name: "description", content: "Contactez l'ANZRBO à Bonon, Côte d'Ivoire : téléphone, e-mail et formulaire de contact." },
      { property: "og:title", content: "Contact — ANZRBO" },
      { property: "og:description", content: "Coordonnées et formulaire de contact de l'Association des N'Zipris Résidents à Bonon." },
      { property: "og:url", content: "https://anzrbo1.lovable.app/contact" },
      { name: "twitter:title", content: "Contact — ANZRBO" },
      { name: "twitter:description", content: "Coordonnées et formulaire de contact de l'ANZRBO." },
    ],
    links: [{ rel: "canonical", href: "https://anzrbo1.lovable.app/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ANZRBO — Association des N'Zipris Résidents à Bonon",
          url: "https://anzrbo1.lovable.app",
          email: "contact@anzrbo.org",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Bonon",
            addressCountry: "CI",
          },
          contactPoint: [
            { "@type": "ContactPoint", telephone: "+225 07 58 89 43 63", contactType: "customer service", areaServed: "CI" },
            { "@type": "ContactPoint", telephone: "+225 07 08 27 67 51", contactType: "customer service", areaServed: "CI" },
          ],
        }),
      },
    ],
  }),
});

function Page() {
  const [form, setForm] = useState({ nom: "", email: "", telephone: "", sujet: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (form.nom.trim().length < 2) { setErr("Veuillez indiquer votre nom."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setErr("E-mail invalide."); return; }
    if (form.message.trim().length < 5) { setErr("Votre message est trop court."); return; }
    setBusy(true);
    // Envoi local (UI uniquement, sans base de données)
    setTimeout(() => {
      setSent(true);
      toast.success("Message envoyé. L'association vous recontactera par SMS / WhatsApp.");
      setForm({ nom: "", email: "", telephone: "", sujet: "", message: "" });
      setBusy(false);
    }, 400);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Contactez l'association ANZRBO</h1>
        <p className="mt-3 text-muted-foreground">
          Joignez l'ANZRBO ou écrivez-nous via le formulaire. Pour un décès, suivez d'abord le{" "}
          <Link to="/guide/procedure-deces" className="font-medium text-primary underline-offset-4 hover:underline">
            guide procédure décès
          </Link>.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-6 text-center"><MapPin className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm">Siège — Bonon, Côte d'Ivoire</p></CardContent></Card>
          <Card><CardContent className="p-6 text-center"><Phone className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm">07 58 89 43 63 / 07 08 27 67 51</p></CardContent></Card>
          <Card><CardContent className="p-6 text-center"><Mail className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm">contact@anzrbo.org</p></CardContent></Card>
        </div>

        <Card className="mt-10">
          <CardContent className="p-6 md:p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <h2 className="text-xl font-semibold">Message bien reçu</h2>
                <p className="text-sm text-muted-foreground">Nous accusons réception de votre message. Notre équipe vous répondra dans les meilleurs délais.</p>
                <Button variant="outline" onClick={() => setSent(false)}>Envoyer un autre message</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="nom">Nom complet *</Label>
                  <Input id="nom" required value={form.nom} onChange={(e) => update("nom", e.target.value)} maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input id="tel" value={form.telephone} onChange={(e) => update("telephone", e.target.value)} maxLength={32} />
                </div>
                <div>
                  <Label htmlFor="sujet">Sujet</Label>
                  <Input id="sujet" value={form.sujet} onChange={(e) => update("sujet", e.target.value)} maxLength={200} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" required rows={6} value={form.message} onChange={(e) => update("message", e.target.value)} maxLength={4000} />
                </div>
                {err && <p className="md:col-span-2 text-sm text-destructive">{err}</p>}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {busy ? "Envoi…" : "Envoyer le message"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
