import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import { listMembers, getMember, deleteMember, addPaiement, uploadFile, updateMember, type MemberRow } from "@/lib/members.functions";
import { Search, Users, Eye, Trash2, Receipt, ChevronLeft, ChevronRight, Printer, QrCode, Pencil, PauseCircle, CheckCircle2, Skull } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
  useEffect(() => { if (!loading && (!user || !user.roles.includes("admin_anzrbo"))) nav({ to: "/login" }); }, [user, loading, nav]);

  const listFn = useServerFn(listMembers);
  const delFn = useServerFn(deleteMember);
  const updateFn = useServerFn(updateMember);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);
  const [statut, setStatut] = useState("tous");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["members", qDebounced, statut, page],
    queryFn: () => listFn({ data: { q: qDebounced, page, pageSize, statut: statut === "tous" ? "" : statut } }),
    enabled: !!user,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });


  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Membre supprimé"); qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: "actif" | "suspendu" | "decede" }) => updateFn({ data: { id, patch: { statut } } }),
    onSuccess: () => { toast.success("Statut membre mis à jour"); qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Modification impossible"),
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
              <Select value={statut} onValueChange={(v) => { setStatut(v); setPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous statuts</SelectItem>
                  <SelectItem value="actif">Actifs</SelectItem>
                  <SelectItem value="suspendu">Suspendus</SelectItem>
                  <SelectItem value="decede">Décédés</SelectItem>
                </SelectContent>
              </Select>
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
                  Array.from({ length: 7 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton className="h-9 w-9 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-8 w-32" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucun membre trouvé.</TableCell></TableRow>
                )}
                {rows.map((m: MemberRow) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" onLoad={() => console.info('[photo_health][liste]', m.numero_membre, 'ok')} onError={() => console.error('[photo_health][liste]', m.numero_membre, 'photo illisible', m.photo_url)} />
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
                      <Button size="sm" variant="ghost" onClick={() => nav({ to: "/admin/membres/$id/modifier" as any, params: { id: m.id } as any })} title="Modifier le membre"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => nav({ to: "/verifier/$telephone", params: { telephone: m.numero_membre } })} title="Aperçu carte / QR"><QrCode className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => nav({ to: "/print", search: { q: m.numero_membre } as any })} title="Imprimer carte"><Printer className="h-4 w-4" /></Button>
                      {m.statut !== "actif" && <Button size="sm" variant="ghost" onClick={() => statusMut.mutate({ id: m.id, statut: "actif" })} title="Activer"><CheckCircle2 className="h-4 w-4 text-emerald-700" /></Button>}
                      {m.statut !== "suspendu" && <Button size="sm" variant="ghost" onClick={() => statusMut.mutate({ id: m.id, statut: "suspendu" })} title="Suspendre"><PauseCircle className="h-4 w-4 text-amber-700" /></Button>}
                      {m.statut !== "decede" && <Button size="sm" variant="ghost" onClick={() => statusMut.mutate({ id: m.id, statut: "decede" })} title="Marquer décédé"><Skull className="h-4 w-4 text-rose-700" /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Supprimer ${m.prenoms} ${m.nom} ?`)) delMut.mutate(m.id);
                      }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">Page {page} / {lastPage}{isFetching && !isLoading ? " · Actualisation…" : ""}</div>
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
  const [type, setType] = useState("cotisation");
  const [methode, setMethode] = useState<"especes" | "mobile_money">("especes");
  const [typePreuve, setTypePreuve] = useState<"id_transaction" | "photo_document">("id_transaction");
  const [refExterne, setRefExterne] = useState("");
  const [justif, setJustif] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<{ step: string; message: string; raw?: any } | null>(null);

  async function fileToBase64Safe(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    return btoa(bin);
  }

  async function ajouterPaiement() {
    if (!id) return;
    if (typePreuve === "id_transaction" && !refExterne.trim()) { toast.error("ID de transaction requis."); return; }
    if (typePreuve === "photo_document" && !justif) { toast.error("Justificatif requis."); return; }
    setBusy(true);
    setPayError(null);
    let step = "init";
    try {
      let url: string | null = null;
      if (typePreuve === "photo_document" && justif) {
        step = "upload_justificatif";
        const b64 = await fileToBase64Safe(justif);
        const r = await uploadFn({ data: {
          bucket: "payment-proofs",
          path: `${id}-${Date.now()}-${justif.name}`,
          base64: b64,
          contentType: justif.type || "application/octet-stream",
        }});
        url = r.url;
      }
      step = "create_paiement";
      await addPayFn({ data: { member_id: id, paiement: {
        type, montant,
        methode,
        reference_externe: typePreuve === "id_transaction" ? refExterne.trim() : null,
        justificatif_url: url,
      } } });
      toast.success("Paiement enregistré");
      setJustif(null); setRefExterne("");
      qc.invalidateQueries({ queryKey: ["member", id] });
    } catch (e: any) {
      const message = e?.message ?? String(e) ?? "Erreur inconnue";
      console.error(`[paiement][${step}]`, e);
      setPayError({ step, message, raw: e });
      toast.error(`${step} — ${message}`);
    }
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

              <div className="mt-3 grid gap-2 rounded-md border p-3 md:grid-cols-6">
                <select className="rounded border px-2 py-1" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="cotisation">Cotisation (décès)</option>
                  <option value="assistance">Assistance</option>
                  <option value="autre">Autre</option>
                </select>
                <Input type="number" value={montant} onChange={(e) => setMontant(+e.target.value)} placeholder="Montant (F)" />
                <select className="rounded border px-2 py-1" value={methode} onChange={(e) => setMethode(e.target.value as any)}>
                  <option value="especes">Espèces</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
                <select className="rounded border px-2 py-1" value={typePreuve} onChange={(e) => setTypePreuve(e.target.value as any)}>
                  <option value="id_transaction">ID transaction</option>
                  <option value="photo_document">Photo/document</option>
                </select>
                {typePreuve === "id_transaction" ? (
                  <Input value={refExterne} onChange={(e) => setRefExterne(e.target.value)} placeholder="ID de transaction" />
                ) : (
                  <Input type="file" accept="image/*,application/pdf" capture="environment"
                    onChange={(e) => setJustif(e.target.files?.[0] ?? null)} />
                )}
                <Button onClick={ajouterPaiement} disabled={busy}>
                  <Receipt className="mr-1 h-4 w-4" /> {busy ? "…" : "Ajouter"}
                </Button>
                {payError && (
                  <div className="col-span-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive md:col-span-6">
                    <div className="font-semibold">Échec paiement — {payError.step}</div>
                    <div className="break-words">{payError.message}</div>
                    <div className="text-muted-foreground">Détails complets dans la console.</div>
                  </div>
                )}
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
