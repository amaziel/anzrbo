import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, FileCheck2, HandCoins, PhoneCall, ShieldCheck, Users } from "lucide-react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GUIDE_URL = "https://anzrbo1.lovable.app/guide/procedure-deces";

const steps = [
  {
    title: "Prévenir l'administration ANZRBO",
    text: "La famille ou un membre proche signale le décès au bureau ANZRBO avec l'identité du défunt, le lien avec le membre principal et les contacts du déclarant.",
    icon: Users,
  },
  {
    title: "Vérifier le membre et ses ayants droit",
    text: "Le bureau confirme le numéro de membre, le statut actif, les coordonnées et l'inscription éventuelle du défunt comme ayant droit.",
    icon: ShieldCheck,
  },
  {
    title: "Constituer le dossier de décès",
    text: "Les pièces justificatives sont rassemblées : déclaration officielle, pièce d'identité, coordonnées de la famille et informations nécessaires au traitement.",
    icon: FileCheck2,
  },
  {
    title: "Lancer la cotisation solidaire",
    text: "Après validation, les membres concernés sont informés de la cotisation décès de 1 200 FCFA et les paiements sont suivis par l'administration.",
    icon: HandCoins,
  },
  {
    title: "Traiter l'assistance ANZRBO et NSIA",
    text: "ANZRBO prépare l'assistance de 500 000 FCFA. Si une souscription NSIA Décès existe, le dossier partenaire est transmis et suivi jusqu'au règlement.",
    icon: CheckCircle2,
  },
];

const pieces = [
  "Numéro de membre ANZRBO ou contact téléphonique du membre principal",
  "Nom complet du défunt et lien avec le membre principal",
  "Date et lieu du décès",
  "Pièce ou déclaration officielle disponible",
  "Contact familial joignable pour le suivi du dossier",
  "Preuves de paiement des cotisations appelées, si disponibles",
];

const checkpoints = [
  { label: "Signalement", value: "Immédiat", icon: PhoneCall },
  { label: "Vérification", value: "Même jour", icon: ShieldCheck },
  { label: "Cotisation", value: "Après validation", icon: HandCoins },
  { label: "Assistance", value: "Dossier complet", icon: CheckCircle2 },
];

export const Route = createFileRoute("/guide/procedure-deces")({
  component: ProcedureDecesPage,
  head: () => ({
    meta: [
      { title: "Procédure décès ANZRBO — Guide étape par étape" },
      {
        name: "description",
        content:
          "Guide ANZRBO de déclaration d'un décès : démarches, pièces, cotisation solidaire, assistance de 500 000 FCFA et suivi NSIA Décès.",
      },
      { property: "og:title", content: "Procédure décès ANZRBO — Guide étape par étape" },
      {
        property: "og:description",
        content:
          "Déclarer un décès à l'ANZRBO : étapes, dossier, cotisations, assistance décès et souscription NSIA.",
      },
      { property: "og:url", content: GUIDE_URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Procédure décès ANZRBO" },
      {
        name: "twitter:description",
        content: "Le guide pratique pour déclarer un décès et suivre l'assistance ANZRBO / NSIA.",
      },
    ],
    links: [{ rel: "canonical", href: GUIDE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Procédure de déclaration de décès ANZRBO",
          description:
            "Étapes à suivre pour déclarer un décès auprès de l'ANZRBO, déclencher la cotisation solidaire et suivre l'assistance décès.",
          totalTime: "P3D",
          supply: [
            { "@type": "HowToSupply", name: "Informations du défunt" },
            { "@type": "HowToSupply", name: "Pièces justificatives du décès" },
            { "@type": "HowToSupply", name: "Numéro de membre ANZRBO" },
          ],
          step: steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.title,
            text: step.text,
            url: `${GUIDE_URL}#etape-${index + 1}`,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: "https://anzrbo1.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Guide procédure décès", item: GUIDE_URL },
          ],
        }),
      },
    ],
  }),
});

function ProcedureDecesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b bg-secondary/30">
          <div className="container mx-auto max-w-5xl px-4 py-14 md:py-18">
            <Button asChild variant="ghost" className="mb-6 px-0">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'accueil
              </Link>
            </Button>
            <p className="text-sm font-semibold uppercase text-primary">Guide pratique ANZRBO</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              Procédure décès ANZRBO : déclaration, cotisation et assistance
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              Ce guide explique les étapes à suivre pour déclarer un décès auprès de l'ANZRBO,
              constituer le dossier, déclencher la cotisation solidaire et suivre l'assistance décès
              ANZRBO ou le règlement NSIA lorsque le défunt est couvert.
            </p>
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-4 py-12">
          <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {checkpoints.map((item) => (
              <div key={item.label} className="rounded-lg border bg-card p-4">
                <item.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 text-xs uppercase text-muted-foreground">{item.label}</div>
                <div className="font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-primary">1 200 FCFA</div>
                <p className="mt-2 text-sm text-muted-foreground">Cotisation solidaire appelée par décès déclaré.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-primary">500 000 FCFA</div>
                <p className="mt-2 text-sm text-muted-foreground">Assistance ANZRBO prévue pour accompagner la famille.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-primary">NSIA Décès</div>
                <p className="mt-2 text-sm text-muted-foreground">Traitement partenaire si une souscription active couvre le défunt.</p>
              </CardContent>
            </Card>
          </div>

          <section className="mt-12 grid gap-6 md:grid-cols-[1fr_0.8fr] md:items-start">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><FileCheck2 className="h-6 w-6 text-primary" /> Pièces et informations à préparer</h2>
              <ul className="mt-5 grid gap-3 text-sm text-muted-foreground">
                {pieces.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{p}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-destructive"><AlertTriangle className="h-5 w-5" /> Points de vigilance</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Ne pas lancer une collecte avant validation du bureau.</li>
                <li>Éviter les doublons : un décès correspond à un seul dossier officiel.</li>
                <li>Contrôler le statut actif et l'ancienneté du membre avant assistance.</li>
              </ul>
            </div>
          </section>

          <div className="mt-12 space-y-6">
            {steps.map((step, index) => (
              <article key={step.title} id={`etape-${index + 1}`} className="grid gap-4 border-b pb-6 md:grid-cols-[80px_1fr]">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Étape {index + 1}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{step.title}</h2>
                  <p className="mt-3 text-muted-foreground">{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-12 rounded-lg border bg-secondary/40 p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Bonnes pratiques pour accélérer le traitement</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Prévenir rapidement un responsable ANZRBO et fournir un contact familial joignable.</li>
              <li>Vérifier le statut du membre ou de l'ayant droit avant la constitution définitive du dossier.</li>
              <li>Conserver les reçus de paiement et les preuves des cotisations appelées après la déclaration.</li>
              <li>Signaler toute souscription NSIA active afin que le dossier partenaire soit suivi sans retard.</li>
            </ul>
          </section>

          <section className="mt-8 rounded-lg border bg-card p-6">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Clock className="h-6 w-6 text-primary" /> Suivi après validation</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Après ouverture du dossier, le bureau suit les cotisations, les preuves de paiement, l'éligibilité assistance ANZRBO et, si nécessaire, la transmission du dossier NSIA. Les familles doivent conserver un contact disponible jusqu'à clôture.
            </p>
          </section>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/contact">Contacter l'ANZRBO</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/faq">Lire la FAQ</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}