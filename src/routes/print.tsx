import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { verifyMemberPublic } from "@/lib/members.functions";
import { MemberCardRecto, MemberCardVerso } from "@/components/MemberCard";

export const Route = createFileRoute("/print")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  component: PrintPage,
  head: () => ({ meta: [{ title: "Impression carte membre — ANZRBO" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function PrintPage() {
  const { q: initialQ } = Route.useSearch();
  const verifyFn = useServerFn(verifyMemberPublic);
  const [q, setQ] = useState(initialQ ?? "");
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search(qv?: string) {
    const term = (qv ?? q).trim();
    if (!term) return;
    setLoading(true); setErr(null); setRow(null);
    try {
      const r = await verifyFn({ data: { q: term } });
      if (!r.member) setErr(`Aucun membre trouvé pour "${term}".`);
      else setRow(r.member);
    } catch (e: any) { setErr(e?.message ?? "Erreur"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (initialQ) void search(initialQ); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const m = row ? {
    id: row.id, numeroMembre: row.numero_membre, photoUrl: row.photo_url,
    nom: row.nom, prenoms: row.prenoms, telephone: row.telephone, contact2: row.contact2 ?? undefined,
    sousPrefecture: "Bonon" as const, village: row.ville || "Bonon", quartier: undefined,
    dateNaissance: "", lieuNaissance: "",
    dateInscription: row.date_inscription || new Date().toISOString(),
    statut: row.statut || "actif",
    urgence: { nom: "", contact1: "", adresse: "" },
    paiementInscription: { mode: "especes" as const, typePreuve: "id_transaction" as const, montant: 1500, date: row.date_inscription || new Date().toISOString() },
  } : null;

  return (
    <div className="min-h-screen bg-secondary/40">
      <style>{`
        @page { size: 85.6mm 53.98mm; margin: 0 }
        @media print {
          body { background: white !important }
          .no-print { display: none !important }
          .print-sheet { padding: 0 !important; background: white !important }
          .card-anzrbo { box-shadow: none !important; page-break-after: always; break-after: page }
          .card-anzrbo:last-child { page-break-after: auto; break-after: auto }
        }
      `}</style>
      <main className="print-sheet container mx-auto max-w-3xl px-4 py-8">
        <div className="no-print mb-6 flex flex-col gap-3 rounded-md border bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#0c5b2e]">Recherche membre (n° / téléphone / nom)</label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }} placeholder="Ex. ANZRBO-2026-99747 ou 0707175632" />
          </div>
          <Button onClick={() => void search()} disabled={loading}><Search className="mr-2 h-4 w-4" /> {loading ? "Recherche…" : "Rechercher"}</Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!m}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
        </div>

         {loading && <div className="no-print space-y-4" aria-label="Recherche en cours"><Skeleton className="mx-auto aspect-[1.586/1] w-full max-w-[540px]" /><Skeleton className="mx-auto aspect-[1.586/1] w-full max-w-[540px]" /></div>}
         {err && <Card className="no-print border-destructive/30"><CardContent className="p-6 text-sm text-destructive">{err}</CardContent></Card>}

        {m && (
          <div className="flex flex-col items-center gap-6">
            <MemberCardRecto m={m} />
            <MemberCardVerso m={m} />
          </div>
        )}
      </main>
    </div>
  );
}
