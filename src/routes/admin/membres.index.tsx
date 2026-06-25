import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import {
  MEMBRES, ayantsDroitDe, cotisationsDuMembre, souscriptionDe,
  declarationsDuMembre, aJour, Membre,
} from "@/lib/data";
import { Search, Users, Eye, IdCard, ExternalLink } from "lucide-react";
import { MemberCardRecto, MemberCardVerso } from "@/components/MemberCard";

export const Route = createFileRoute("/admin/membres/")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: ListeMembres,
  head: () => ({ meta: [{ title: "Membres — Admin ANZRBO" }] }),
});

function StatutBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    actif: "bg-emerald-100 text-emerald-700",
    suspendu: "bg-amber-100 text-amber-700",
    decede: "bg-rose-100 text-rose-700",
  };
  return <Badge className={map[s] ?? "bg-muted"}>{s}</Badge>;
}

function ListeMembres() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Membre | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MEMBRES;
    return MEMBRES.filter((m) =>
      m.nom.toLowerCase().includes(s) || m.prenoms.toLowerCase().includes(s)
      || m.telephone.includes(s) || m.numeroMembre.toLowerCase().includes(s)
      || m.village.toLowerCase().includes(s)
    );
  }, [q]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Membres — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Liste des membres</CardTitle>
              <CardDescription>{MEMBRES.length} membres enregistrés par l'administration ANZRBO.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-full pl-9 sm:w-80" placeholder="Nom, téléphone, n° membre…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Button asChild><Link to="/admin/membres/nouveau">+ Nouveau membre</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Membre</TableHead><TableHead>Nom complet</TableHead>
                  <TableHead>Téléphone</TableHead><TableHead>Village</TableHead>
                  <TableHead>Statut</TableHead><TableHead>Ayants droit</TableHead>
                  <TableHead>NSIA</TableHead><TableHead>À jour</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const ns = souscriptionDe(m.id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.numeroMembre}</TableCell>
                      <TableCell>{m.prenoms} {m.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{m.telephone}</TableCell>
                      <TableCell>{m.village}</TableCell>
                      <TableCell><StatutBadge s={m.statut} /></TableCell>
                      <TableCell>{ayantsDroitDe(m.id).length}</TableCell>
                      <TableCell>{ns ? `Formule ${ns.formule}` : "—"}</TableCell>
                      <TableCell>{m.statut === "actif" ? (aJour(m.id) ? "✅" : "⚠️") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(m)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fiche membre — {selected?.numeroMembre}</DialogTitle></DialogHeader>
          {selected && <FicheMembre m={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FicheMembre({ m }: { m: Membre }) {
  const ad = ayantsDroitDe(m.id);
  const cot = cotisationsDuMembre(m.id);
  const ns = souscriptionDe(m.id);
  const decl = declarationsDuMembre(m.id);
  return (
    <div className="space-y-4 text-sm">
      <section className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-4">
        <Info l="Nom et prénoms" v={`${m.prenoms} ${m.nom}`} />
        <Info l="Téléphone" v={m.telephone + (m.contact2 ? ` / ${m.contact2}` : "")} />
        <Info l="Sous-préfecture / Village" v={`${m.sousPrefecture} / ${m.village}`} />
        <Info l="Quartier / Campement" v={m.quartier || "—"} />
        <Info l="Date / Lieu de naissance" v={`${new Date(m.dateNaissance).toLocaleDateString("fr-FR")} à ${m.lieuNaissance}`} />
        <Info l="Date d'adhésion" v={new Date(m.dateInscription).toLocaleDateString("fr-FR")} />
        <Info l="Statut" v={<StatutBadge s={m.statut} />} />
        <Info l="Cotisations à jour" v={aJour(m.id) ? "Oui" : "Non"} />
      </section>

      <section>
        <h3 className="font-semibold">Personne d'urgence</h3>
        <p className="text-muted-foreground">{m.urgence.nom} — {m.urgence.contact1}{m.urgence.contact2 ? ` / ${m.urgence.contact2}` : ""} — {m.urgence.adresse}</p>
      </section>

      <section>
        <h3 className="font-semibold">Ayants droit ({ad.length})</h3>
        <ul className="mt-1 space-y-1 text-muted-foreground">
          {ad.map((a) => (
            <li key={a.id}>• {a.lien} — {a.nom} (né(e) le {new Date(a.dateNaissance).toLocaleDateString("fr-FR")} à {a.lieuNaissance})</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Souscription NSIA</h3>
        {ns ? (
          <p className="text-muted-foreground">
            Formule {ns.formule} — bénéfice {ns.benefice.toLocaleString("fr-FR")} F/personne, {ns.nbPersonnes} personnes,
            cotisation annuelle {ns.cotisationAnnuelle.toLocaleString("fr-FR")} F (depuis {new Date(ns.dateSouscription).toLocaleDateString("fr-FR")}).
          </p>
        ) : <p className="text-muted-foreground">Aucune souscription NSIA.</p>}
      </section>

      <section>
        <h3 className="font-semibold">Cotisations ({cot.length})</h3>
        <p className="text-xs text-muted-foreground">
          Payées : {cot.filter((c) => c.statut === "payee").length} — En retard : {cot.filter((c) => c.statut === "en_retard").length}
        </p>
      </section>

      <section>
        <h3 className="font-semibold">Déclarations de décès liées ({decl.length})</h3>
        <ul className="mt-1 space-y-1 text-muted-foreground">
          {decl.map((d) => <li key={d.id}>• {d.defuntType === "principal" ? "Décès du membre" : "Décès ayant droit"} : {d.nomDefunt} le {new Date(d.dateDeces).toLocaleDateString("fr-FR")}</li>)}
          {decl.length === 0 && <li>Aucune.</li>}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Preuve d'inscription</h3>
        <p className="text-muted-foreground">
          {m.paiementInscription.mode === "especes" ? "Espèces" : "Mobile Money"} —
          {m.paiementInscription.typePreuve === "id_transaction" ? ` ID transaction : ${m.paiementInscription.idTransaction}` : " Justificatif (photo/document)"} —
          {" "}{m.paiementInscription.montant.toLocaleString("fr-FR")} F le {new Date(m.paiementInscription.date).toLocaleDateString("fr-FR")}
        </p>
      </section>

      <section className="rounded-md border border-[#0c5b2e]/15 bg-[#f7f3e9]/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-[#0c5b2e]">
            <IdCard className="h-4 w-4" /> Carte officielle de membre
          </h3>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/verifier/${encodeURIComponent(m.numeroMembre)}`} target="_blank" rel="noreferrer">
                Fiche publique <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
            <Button asChild size="sm" className="bg-[#0c5b2e] hover:bg-[#0a4a26]">
              <a href={`/carte?q=${encodeURIComponent(m.telephone)}`} target="_blank" rel="noreferrer">
                Portail imprimeur
              </a>
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <MemberCardRecto m={m} />
          <MemberCardVerso m={m} />
        </div>
      </section>
    </div>
  );
}

function Info({ l, v }: { l: string; v: any }) {
  return <div><div className="text-xs uppercase text-muted-foreground">{l}</div><div className="font-medium">{v}</div></div>;
}
