import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ScanLine, Users, HandCoins, Heart, ShieldCheck, Bell, BadgeCheck } from "lucide-react";
import logo from "@/assets/anzrbo-logo.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ANZRBO — Association des N'Zipris Résidents à Bonon" },
      { name: "description", content: "Accueil de l'ANZRBO : association d'entraide N'Zipris à Bonon. Cotisations solidaires, assistance au décès et vérification publique des membres." },
      { property: "og:title", content: "ANZRBO — Association des N'Zipris Résidents à Bonon" },
      { property: "og:description", content: "Solidarité, entraide et assistance au décès — Bonon, Côte d'Ivoire." },
      { property: "og:url", content: "https://anzrbo1.lovable.app/" },
      { name: "twitter:title", content: "ANZRBO — Association des N'Zipris Résidents à Bonon" },
      { name: "twitter:description", content: "Solidarité, entraide et assistance au décès — Bonon, Côte d'Ivoire." },
    ],
    links: [{ rel: "canonical", href: "https://anzrbo1.lovable.app/" }],
  }),
});

const stats = [
  { label: "Cotisation par décès", value: "1 200 F" },
  { label: "Assistance versée", value: "500 000 F" },
  { label: "Sous-préfecture", value: "Bonon" },
  { label: "Pays", value: "Côte d'Ivoire" },
];

const features = [
  { icon: Users, title: "Gestion des membres", desc: "Enregistrement et suivi assurés exclusivement par les administrateurs désignés de l'association." },
  { icon: HandCoins, title: "Cotisations solidaires", desc: "1 200 FCFA collectés à chaque décès déclaré, avec traçabilité complète des versements." },
  { icon: Heart, title: "Assistance décès", desc: "500 000 FCFA versés sans délai à la famille du défunt, membre principal ou ayant droit." },
  { icon: ShieldCheck, title: "Assurance NSIA", desc: "Souscription et suivi du partenariat NSIA Décès intégrés à la plateforme." },
  { icon: Bell, title: "Alertes SMS & WhatsApp", desc: "Notifications instantanées des décès déclarés, cotisations à payer et assistances versées." },
  { icon: BadgeCheck, title: "Carte membre & QR Code", desc: "Carte membre générée automatiquement avec QR Code pour consultation publique simplifiée." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden border-b">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Association d'entraide
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              <span className="text-primary">ANZRBO</span> — l'entraide{" "}
              <span className="text-accent">N'Zipris</span> de Bonon.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Association des N'Zipris Résidents à Bonon. Solidarité, transparence et accompagnement
              des familles dans les moments difficiles, sous-préfecture de Bonon, Côte d'Ivoire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/scanner">
                  <ScanLine className="mr-2 h-4 w-4" /> Scanner un QR Code
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">
                  Nous contacter <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/guide/procedure-deces">Guide procédure décès</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              L'inscription d'un membre est effectuée uniquement par un administrateur ANZRBO.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-card p-8 shadow-xl">
              <img src={logo} alt="Association ANZRBO — Entraide et Solidarité" className="mx-auto h-32 w-auto md:h-40" />
              <p className="mt-6 text-center text-sm italic text-muted-foreground">
                « Unis dans la solidarité, forts dans l'entraide »
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-lg bg-secondary/60 p-4 text-center">
                    <div className="text-xl font-bold text-primary md:text-2xl">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Une plateforme pensée pour l'association
          </h2>
          <p className="mt-3 text-muted-foreground">
            Gestion administrative complète, alertes en temps réel, traçabilité totale.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-6 border-y py-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Déclarer un décès à l'ANZRBO</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Consultez la procédure officielle pour préparer le dossier, comprendre la cotisation
              solidaire et suivre l'assistance ANZRBO / NSIA.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/guide/procedure-deces">
              Lire le guide <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-20">
        <div
          className="rounded-2xl p-10 text-center text-white md:p-16"
          style={{ background: "var(--gradient-primary)" }}
        >
          <h2 className="text-3xl font-bold md:text-4xl">Vous êtes administrateur ANZRBO ?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/90">
            Accédez à votre tableau de bord pour gérer les membres, les cotisations et les
            assistances décès.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/login">Accès administrateur</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
