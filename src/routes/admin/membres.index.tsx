import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { listMembers, getMember, deleteMember, addPaiement, uploadFile, type MemberRow } from "@/lib/members.functions";
import { Search, Users, Eye, Trash2, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

  const listFn = useServerFn(listMembers);
  const delFn = useServerFn(deleteMember);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["members", q, page],
    queryFn: () => listFn({ data: { q, page, pageSize } }),
    enabled: !!user,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Membre supprimé"); qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center">Chargement…</div>;

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader title="Membres — ANZRBO" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Liste des membres</CardTitle>
              <CardDescription>{total} membre(s) enregistré(s).</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-full pl-9 sm:w-80" placeholder="Nom, téléphone, n° membre…"
                  value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </div>
              <Button asChild><Link to="/admin/membres/nouveau">+ Nouveau membre</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead><TableHead>N° Membre</TableHead><TableHead>Nom complet</TableHead>
                  <TableHead>Téléphone</TableHead><TableHead>Village</TableHead>
                  <TableHead>Statut</TableHead><TableHead>Inscrit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucun membre trouvé.</TableCell></TableRow>
                )}
                {rows.map((m: MemberRow) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : <div className="h-9 w-9 rounded-full bg-muted" />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.numero_membre}</TableCell>
                    <TableCell>{m.prenoms} {m.nom}</TableCell>
                    <TableCell className="text-muted-foreground">{m.telephone}</TableCell>
                    <TableCell>{m.quartier ?? m.ville ?? "—"}</TableCell>
                    <TableCell><StatutBadge s={m.statut} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.date_inscription ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedId(m.id)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Supprimer ${m.prenoms} ${m.nom} ?`)) delMut.mutate(m.id);
                      }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">Page {page} / {lastPage}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage(p => Math.min(lastPage, p + 1))}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <FicheDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function FicheDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const getFn = useServerFn(getMember);
  const addPayFn = useServerFn(addPaiement);
  const uploadFn = useServerFn(uploadFile);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getFn({ data: { id: id! } }),
    enabled: !!id,
  });

  const [montant, setMontant] = useState(1000);
  const [periode, setPeriode] = useState("");
  const [type, setType] = useState("cotisation");
  const [justif, setJustif] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function ajouterPaiement() {
    if (!id) return;
    setBusy(true);
    try {
      let url: string | null = null;
      if (justif) {
        const buf = await justif.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const r = await uploadFn({ data: {
          bucket: "payment-proofs",
          path: `${id}-${Date.now()}-${justif.name}`,
          base64: b64,
          contentType: justif.type || "application/octet-stream",
        }});
        url = r.url;
      }
      await addPayFn({ data: { member_id: id, paiement: { type, montant, periode: periode || null, justificatif_url: url, methode: "especes" } } });
      toast.success("Paiement enregistré");
      setJustif(null); setPeriode("");
      qc.invalidateQueries({ queryKey: ["member", id] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Fiche membre {data?.member?.numero_membre ?? ""}</DialogTitle></DialogHeader>
        {isLoading || !data ? <p className="text-muted-foreground">Chargement…</p> : (
          <div className="space-y-4 text-sm">
            <div className="flex gap-4">
              {data.member.photo_url && <img src={data.member.photo_url} alt="" className="h-24 w-24 rounded-md object-cover" />}
              <div className="grid grid-cols-2 gap-2">
                <Info l="Nom" v={`${data.member.prenoms} ${data.member.nom}`} />
                <Info l="Téléphone" v={data.member.telephone} />
                <Info l="Village" v={data.member.quartier ?? data.member.ville ?? "—"} />
                <Info l="Naissance" v={`${data.member.date_naissance ?? "—"} — ${data.member.lieu_naissance ?? ""}`} />
                <Info l="Inscrit le" v={data.member.date_inscription ?? "—"} />
                <Info l="Statut" v={<StatutBadge s={data.member.statut} />} />
              </div>
            </div>

            <section>
              <h3 className="font-semibold">Ayants droit ({data.ayants.length})</h3>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {data.ayants.map((a: any) => (
                  <li key={a.id}>• {a.relation} — {a.nom} {a.date_naissance ? `(né(e) le ${a.date_naissance})` : ""}</li>
                ))}
                {data.ayants.length === 0 && <li>Aucun.</li>}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold">Paiements ({data.paiements.length})</h3>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {data.paiements.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>• {p.type} — {p.montant?.toLocaleString("fr-FR")} F {p.periode ? `(${p.periode})` : ""} — {new Date(p.paye_le ?? p.created_at).toLocaleDateString("fr-FR")}</span>
                    {p.justificatif_url && <a href={p.justificatif_url} target="_blank" rel="noreferrer" className="text-primary underline">justif.</a>}
                  </li>
                ))}
                {data.paiements.length === 0 && <li>Aucun paiement.</li>}
              </ul>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border p-3 md:grid-cols-5">
                <select className="rounded border px-2 py-1" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="cotisation">Cotisation</option>
                  <option value="nsia">NSIA</option>
                  <option value="autre">Autre</option>
                </select>
                <Input type="number" value={montant} onChange={(e) => setMontant(+e.target.value)} placeholder="Montant" />
                <Input value={periode} onChange={(e) => setPeriode(e.target.value)} placeholder="Période (2026-01)" />
                <Input type="file" accept="image/*,application/pdf" capture="environment"
                  onChange={(e) => setJustif(e.target.files?.[0] ?? null)} />
                <Button onClick={ajouterPaiement} disabled={busy}>
                  <Receipt className="mr-1 h-4 w-4" /> {busy ? "…" : "Ajouter"}
                </Button>
              </div>
            </section>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ l, v }: { l: string; v: any }) {
  return <div><div className="text-xs uppercase text-muted-foreground">{l}</div><div className="font-medium">{v}</div></div>;
}
