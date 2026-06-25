import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import {
  MEMBRES, FORMULES_NSIA, SOUSCRIPTIONS_NSIA, ayantsDroitDe, souscriptionDe,
} from "@/lib/data";
import { ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/nsia/nouveau")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: Page,
  head: () => ({ meta: [{ title: "Souscrire un membre à NSIA — Admin ANZRBO" }] }),
});

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || user.role !== "admin_anzrbo")) nav({ to: "/login" }); }, [user, loading, nav]);

  const [membreId, setMembreId] = useState("");
  const [formule, setFormule] = useState<number>(5);
  const [nbPersonnes, setNbPersonnes] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const eligibles = useMemo(
    () => MEMBRES.filter((m) => m.statut === "actif" && !souscriptionDe(m.id)),
    [],
  );
  const f = FORMULES_NSIA.find((x) => x.n === formule)!;
  const cotisationTotale = f.cotisation * Math.max(1, nbPersonnes);
  const m = MEMBRES.find((x) => x.id === membreId);
  const maxPersonnes = m ? 1 + ayantsDroitDe(m.id).length : 1;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!m) { toast.error("Sélectionnez un membre"); return; }
    if (souscriptionDe(m.id)) { toast.error("Ce membre a déjà une souscription NSIA active"); return; }
    SOUSCRIPTIONS_NSIA.push({
      id: `s-${Date.now()}`,
      membreId: m.id, formule, benefice: f.benefice, cotisationUnitaire: f.cotisation,
      nbPersonnes, cotisationAnnuelle: cotisationTotale,
      dateSouscription: date, actif: true,
    });
    toast.success(`Souscription NSIA enregistrée pour ${m.prenoms} ${m.nom}`);
    nav({ to: "/admin/nsia" });
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Souscrire à NSIA — Admin ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/nsia"><ArrowLeft className="mr-1 h-4 w-4" /> Retour au suivi NSIA</Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> Nouvelle souscription NSIA Décès</CardTitle>
            <CardDescription>
              L'administrateur ANZRBO inscrit un membre actif à une formule du barème NSIA.
              Une seule formule active par membre — renouvellement annuel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-2">
                <Label>Membre principal</Label>
                <Select value={membreId} onValueChange={setMembreId}>
                  <SelectTrigger><SelectValue placeholder={`Choisir parmi ${eligibles.length} membre(s) éligible(s)…`} /></SelectTrigger>
                  <SelectContent>
                    {eligibles.map((mm) => (
                      <SelectItem key={mm.id} value={mm.id}>
                        {mm.numeroMembre} — {mm.prenoms} {mm.nom} ({mm.telephone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {m && (
                  <p className="text-xs text-muted-foreground">
                    Foyer : 1 souscripteur + {ayantsDroitDe(m.id).length} ayant(s) droit ⇒ max {maxPersonnes} personnes couvrables.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Formule</Label>
                  <Select value={String(formule)} onValueChange={(v) => setFormule(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMULES_NSIA.map((x) => (
                        <SelectItem key={x.n} value={String(x.n)}>
                          Formule {x.n} — {x.benefice.toLocaleString("fr-FR")} F / {x.cotisation.toLocaleString("fr-FR")} F/an/pers.
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nombre de personnes couvertes</Label>
                  <Input
                    type="number" min={1} max={maxPersonnes}
                    value={nbPersonnes}
                    onChange={(e) => setNbPersonnes(Math.max(1, Math.min(maxPersonnes, Number(e.target.value) || 1)))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Date de souscription</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="rounded-lg border bg-blue-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bénéfice / personne</span>
                  <span className="font-semibold">{f.benefice.toLocaleString("fr-FR")} F</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Cotisation annuelle totale</span>
                  <span className="text-lg font-bold text-blue-700">{cotisationTotale.toLocaleString("fr-FR")} F</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button asChild variant="outline"><Link to="/admin/nsia">Annuler</Link></Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Enregistrer la souscription
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
