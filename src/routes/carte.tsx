import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, Download, Search, ShieldCheck, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MEMBRES, type Membre } from "@/lib/data";
import { MemberCardRecto, MemberCardVerso } from "@/components/MemberCard";
import logo from "@/assets/anzrbo-logo.png";

export const Route = createFileRoute("/carte")({
  component: Page,
  head: () => ({ meta: [
    { title: "Portail imprimeur — Cartes ANZRBO" },
    { name: "description", content: "Portail réservé à l'imprimeur partenaire ANZRBO : recherche, aperçu et impression des cartes officielles de membre." },
    { name: "robots", content: "noindex,nofollow" },
  ]}),
});

function digits(v: string) { return v.replace(/\D/g, ""); }

function Page() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const member: Membre | null = useMemo(() => {
    if (!submitted) return null;
    const q = submitted.trim();
    const d = digits(q);
    return (
      MEMBRES.find((m) => digits(m.telephone) === d || digits(m.contact2 ?? "") === d) ||
      MEMBRES.find((m) => m.numeroMembre.toLowerCase() === q.toLowerCase()) ||
      null
    );
  }, [submitted]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f3e9] via-white to-[#eaf2ec] print:bg-white">
      <style>{`
        @media print {
          @page { size: 85.6mm 53.98mm; margin: 0; }
          html, body { background: #fff !important; }
          .print-hidden { display: none !important; }
          .print-page { page-break-after: always; display: flex; align-items: center; justify-content: center; width: 85.6mm; height: 53.98mm; overflow: hidden; }
          .print-page:last-child { page-break-after: auto; }
          .card-anzrbo { box-shadow: none !important; }
        }
      `}</style>

      <header className="print-hidden border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ANZRBO" className="h-10 w-auto" />
            <div>
              <div className="text-xs uppercase tracking-widest text-[#0c5b2e]">Portail imprimeur</div>
              <div className="text-sm font-semibold">Cartes officielles ANZRBO</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-[#0c5b2e]" />
            Accès réservé · URL non listée
          </div>
        </div>
      </header>

      <main className="print-hidden container mx-auto max-w-5xl px-4 py-8">
        <Card className="border-[#0c5b2e]/15">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-[#0c5b2e]">Rechercher un membre</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Saisissez le numéro de téléphone du membre (ou son matricule <span className="font-mono">ANZRBO-...</span>)
              pour générer sa carte officielle recto/verso au format CR80 (85,6 × 53,98 mm).
            </p>

            <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="q" className="sr-only">Numéro de téléphone ou matricule</Label>
                <Input
                  id="q" autoFocus inputMode="tel"
                  placeholder="Ex. 0759566087 ou ANZRBO-2026-00004"
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" className="h-12 bg-[#0c5b2e] hover:bg-[#0a4a26]">
                <Search className="mr-2 h-4 w-4" /> Rechercher
              </Button>
            </form>
          </CardContent>
        </Card>

        {submitted && !member && (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-5 text-red-700">
              <XCircle className="h-5 w-5" />
              <div>
                <div className="font-semibold">Aucun membre trouvé pour « {submitted} »</div>
                <div className="text-sm">Vérifiez le numéro saisi ou contactez le secrétariat ANZRBO.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {member && (
          <section className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Membre identifié</div>
                <div className="truncate text-xl font-bold text-[#0c5b2e]">
                  {member.prenoms} {member.nom}
                </div>
                <div className="font-mono text-xs text-muted-foreground">{member.numeroMembre}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimer
                </Button>
                <Button onClick={() => window.print()} className="bg-[#0c5b2e] hover:bg-[#0a4a26]">
                  <Download className="mr-2 h-4 w-4" /> Enregistrer en PDF
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-[#0c5b2e]/30 bg-white/80 p-6">
              <p className="mb-4 text-xs text-muted-foreground">
                Aperçu à l'échelle réelle (1:1). Le QR code pointe vers la fiche publique du membre et reste vérifiable même après impression.
              </p>
              <div className="flex flex-col items-center gap-8">
                <MemberCardRecto m={member} />
                <MemberCardVerso m={member} />
              </div>
            </div>
          </section>
        )}
      </main>

      {member && (
        <div className="hidden print:block">
          <div className="print-page"><MemberCardRecto m={member} /></div>
          <div className="print-page"><MemberCardVerso m={member} /></div>
        </div>
      )}
    </div>
  );
}
