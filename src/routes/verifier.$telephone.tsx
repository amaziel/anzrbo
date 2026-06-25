import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, ShieldCheck, MapPin, BadgeCheck, XCircle, CalendarDays } from "lucide-react";
import { MEMBRES } from "@/lib/data";
import { MemberCardRecto, MemberCardVerso } from "@/components/MemberCard";

export const Route = createFileRoute("/verifier/$telephone")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Vérification membre ANZRBO" },
      { name: "description", content: "Fiche publique d'un membre de l'Association des N'Zipris Résidents à Bonon (ANZRBO) : identité, statut d'adhésion et carte officielle." },
    ],
  }),
});

function clean(v: string) { return v.replace(/\D/g, ""); }

function Page() {
  const { telephone } = Route.useParams();
  const raw = decodeURIComponent(telephone);
  const tel = clean(raw);
  const m = MEMBRES.find(
    (x) => clean(x.telephone) === tel || clean(x.contact2 ?? "") === tel || x.numeroMembre.toLowerCase() === raw.toLowerCase(),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f3e9] via-white to-[#eaf2ec]">
      <SiteHeader />
      <section className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#0c5b2e]">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Fiche publique vérifiée</span>
          </div>
          <Link to="/scanner" className="text-sm font-medium text-[#0c5b2e] underline underline-offset-4">
            ← Nouvelle vérification
          </Link>
        </div>

        {!m ? (
          <Card className="border-red-200">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-bold">Aucun membre trouvé</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                Le numéro <span className="font-mono">{raw}</span> ne correspond à aucun membre enregistré
                dans le registre ANZRBO. Si vous pensez qu'il s'agit d'une erreur, contactez le secrétariat.
              </p>
              <Button asChild className="mt-2 bg-[#0c5b2e] hover:bg-[#0a4a26]">
                <Link to="/scanner">Réessayer</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
            {/* Bloc identité */}
            <Card className="overflow-hidden border-[#0c5b2e]/15">
              <div className="bg-gradient-to-r from-[#0c5b2e] to-[#0a4a26] px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9a24c]">
                      Association des N'Zipris Résidents à Bonon
                    </div>
                    <h1 className="mt-1 text-2xl font-extrabold leading-tight">
                      {m.prenoms} {m.nom}
                    </h1>
                    <div className="font-mono text-xs opacity-80">{m.numeroMembre}</div>
                  </div>
                  <StatutBadge s={m.statut} />
                </div>
              </div>
              <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                <Info icon={<MapPin className="h-4 w-4" />} label="Localisation">
                  {m.village}{m.quartier ? ` — ${m.quartier}` : ""}<br />
                  <span className="text-xs text-muted-foreground">Sous-préfecture de {m.sousPrefecture}</span>
                </Info>
                <Info icon={<Phone className="h-4 w-4" />} label="Contact public">
                  <span className="font-mono">{m.telephone}</span>
                </Info>
                <Info icon={<CalendarDays className="h-4 w-4" />} label="Date d'adhésion">
                  {new Date(m.dateInscription).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </Info>
                <Info icon={<BadgeCheck className="h-4 w-4" />} label="Statut administratif">
                  {m.statut === "actif" && "Membre actif, à jour de ses obligations."}
                  {m.statut === "suspendu" && "Membre temporairement suspendu."}
                  {m.statut === "decede" && "Membre décédé — fiche conservée à titre archivistique."}
                </Info>
                <div className="sm:col-span-2 rounded-md border border-dashed border-[#c9a24c]/60 bg-[#fdfaf1] p-3 text-xs text-[#5b4a1c]">
                  Les informations confidentielles (ayants droit, cotisations, NSIA, personne d'urgence) restent
                  consultables uniquement par les administrateurs ANZRBO autorisés.
                </div>
              </CardContent>
            </Card>

            {/* Carte officielle */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#0c5b2e]">
                Carte officielle du membre
              </div>
              <MemberCardRecto m={m} />
              <MemberCardVerso m={m} />
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-white/60 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#0c5b2e]">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function StatutBadge({ s }: { s: "actif" | "suspendu" | "decede" }) {
  if (s === "actif") return <Badge className="bg-[#c9a24c] text-[#1a1a1a] hover:bg-[#c9a24c]">Membre actif</Badge>;
  if (s === "suspendu") return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Suspendu</Badge>;
  return <Badge className="bg-rose-100 text-rose-900 hover:bg-rose-100">Décédé</Badge>;
}
