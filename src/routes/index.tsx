import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { ArrowRight, ScanLine, Users, HandCoins, Heart, ShieldCheck, Bell, BadgeCheck, FileCheck2, Smartphone, MapPin, CalendarDays, Quote } from "lucide-react";
import logo from "@/assets/anzrbo-logo.png";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";
import hero6 from "@/assets/hero-6.jpg";


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

const workflow = [
  { icon: Users, title: "Inscription fiable", text: "Informations, photo, contacts et ayants droit sont centralisés dans le registre." },
  { icon: BadgeCheck, title: "Carte vérifiable", text: "QR code public relié au numéro de membre et aux contacts à jour." },
  { icon: HandCoins, title: "Paiements suivis", text: "Cotisations, frais et justificatifs consultables par les responsables autorisés." },
  { icon: FileCheck2, title: "Dossier décès", text: "Guide officiel pour préparer rapidement les pièces nécessaires." },
];

const heroImages: { src: string; caption: string }[] = [
  { src: hero1, caption: "Assemblée sous les manguiers — Bonon" },
  { src: hero2, caption: "Remise de l'assistance à une famille endeuillée" },
  { src: hero3, caption: "Grande rencontre communautaire N'Zipris" },
  { src: hero4, caption: "Équipe dirigeante de l'ANZRBO" },
  { src: hero5, caption: "Réunion de coordination du bureau" },
  { src: hero6, caption: "Solidarité entre aînés — poignée de main" },
];

const temoignages = [
  { auteur: "Aya K.", role: "Membre à Bonon", texte: "Grâce à l'ANZRBO, notre famille a reçu l'assistance en moins de 48h. Une organisation exemplaire." },
  { auteur: "Kouassi B.", role: "Délégué de section", texte: "La plateforme rend le suivi des cotisations transparent et rapide. Un vrai gain pour le bureau." },
  { auteur: "Mariam D.", role: "Ayant droit", texte: "Le QR sur la carte de mon père a permis de tout vérifier immédiatement. Impressionnant." },
];

function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    const id = setInterval(() => { api.scrollNext(); }, 4500);
    return () => { clearInterval(id); api.off("select", onSelect); };
  }, [api]);

  return (
    <div className="relative">
      <Carousel setApi={setApi} opts={{ loop: true, align: "start" }} className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <CarouselContent>
          {heroImages.map((img, i) => (
            <CarouselItem key={img.src}>
              <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
                <img
                  src={img.src}
                  alt={img.caption}
                  width={1600}
                  height={900}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 text-white">
                  <p className="text-sm font-medium md:text-base">{img.caption}</p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3 hidden sm:flex" />
        <CarouselNext className="right-3 hidden sm:flex" />
      </Carousel>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {heroImages.map((_, i) => (
          <button
            key={i}
            aria-label={`Aller à l'image ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b bg-gradient-to-b from-secondary/45 via-background to-background">
        <div className="container mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <MapPin className="h-3.5 w-3.5" /> Sous-préfecture de Bonon · Côte d'Ivoire
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              <span className="text-primary">ANZRBO</span> — l'entraide{" "}
              <span className="text-accent">N'Zipris</span> de Bonon.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Association des N'Zipris Résidents à Bonon. Solidarité, transparence et accompagnement
              des familles dans les moments difficiles, sous-préfecture de Bonon, Côte d'Ivoire.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              <MiniProof icon={ShieldCheck} label="Registre protégé" />
              <MiniProof icon={Smartphone} label="Scan public rapide" />
              <MiniProof icon={Heart} label="Solidarité décès" />
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              L'inscription d'un membre est effectuée uniquement par un administrateur ANZRBO.
            </p>
          </div>

          <div>
            <HeroCarousel />
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 pb-10">
          <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card/70 p-4 shadow-sm md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg bg-secondary/60 p-4 text-center">
                <div className="text-xl font-bold text-primary md:text-2xl">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="container mx-auto max-w-7xl px-4 py-14">
          <div className="mb-8 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Témoignages</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Une communauté qui se serre les coudes</h2>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" /> Depuis plusieurs années au service des familles
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {temoignages.map((t) => (
              <div key={t.auteur} className="relative rounded-xl border bg-card p-6 shadow-sm">
                <Quote className="absolute right-4 top-4 h-6 w-6 text-primary/20" />
                <p className="text-sm italic text-foreground">« {t.texte} »</p>
                <div className="mt-4 text-sm">
                  <div className="font-semibold text-foreground">{t.auteur}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="border-b bg-secondary/25">
        <div className="container mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Fonctionnement</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Un parcours clair, du membre à l'assistance</h2>
            <p className="mt-3 text-sm text-muted-foreground">Recherche rapide des membres, données fiables et traçabilité des actions du bureau.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {workflow.map((item) => (
              <div key={item.title} className="rounded-lg border bg-background p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><item.icon className="h-5 w-5" /></div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
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

function MiniProof({ icon: Icon, label }: { icon: any; label: string }) {
  return <div className="flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2 text-xs font-medium"><Icon className="h-4 w-4 text-primary" />{label}</div>;
}
