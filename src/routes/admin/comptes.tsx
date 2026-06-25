import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardHeader, ADMIN_NAV } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, KeyRound, Trash2, ShieldCheck } from "lucide-react";
import { useAuth, clientRoleGuard } from "@/lib/auth";
import {
  listAccounts, createAccount, resetAccountPassword, deleteAccount,
  type AccountRole,
} from "@/lib/accounts.functions";

export const Route = createFileRoute("/admin/comptes")({
  beforeLoad: () => { const r = clientRoleGuard(["digitorg"]); if (r) throw r; },
  component: Page,
  head: () => ({ meta: [{ title: "Gestion des comptes — DigitOrg" }] }),
});

type AccountRow = Awaited<ReturnType<typeof listAccounts>>[number];

const ROLE_LABELS: Record<AccountRole, string> = {
  super_admin: "Super admin (DigitOrg)",
  admin_national: "Admin ANZRBO",
  delegue_section: "Délégué ANZRBO",
  nsia: "NSIA",
};

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || !user.roles.includes("digitorg"))) nav({ to: "/login" }); }, [user, loading, nav]);

  const fetchList = useServerFn(listAccounts);
  const fnCreate = useServerFn(createAccount);
  const fnReset = useServerFn(resetAccountPassword);
  const fnDelete = useServerFn(deleteAccount);

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try { setRows(await fetchList()); }
    catch (e: any) { toast.error(e?.message ?? "Chargement impossible"); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  // Create form
  const [open, setOpen] = useState(false);
  const [fIdent, setFIdent] = useState("");
  const [fPwd, setFPwd] = useState("");
  const [fRole, setFRole] = useState<AccountRole>("delegue_section");
  const [fName, setFName] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fnCreate({ data: { identifiant: fIdent, password: fPwd, role: fRole, display_name: fName } });
      toast.success("Compte créé");
      setOpen(false); setFIdent(""); setFPwd(""); setFName(""); setFRole("delegue_section");
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  async function onReset(row: AccountRow) {
    const pwd = window.prompt(`Nouveau mot de passe pour « ${row.identifiant} » :`);
    if (!pwd) return;
    try { await fnReset({ data: { user_id: row.user_id, password: pwd } }); toast.success("Mot de passe mis à jour"); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  async function onDelete(row: AccountRow) {
    if (!window.confirm(`Supprimer définitivement le compte « ${row.identifiant} » ?`)) return;
    try { await fnDelete({ data: { user_id: row.user_id } }); toast.success("Compte supprimé"); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="DigitOrg — Comptes" nav={ADMIN_NAV} />
      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Comptes administrateurs & délégués</CardTitle>
              <CardDescription>Connexion exclusivement par identifiant + mot de passe (sans email).</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-2 h-4 w-4" /> Créer un compte</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau compte</DialogTitle></DialogHeader>
                <form onSubmit={onCreate} className="space-y-3">
                  <div>
                    <Label htmlFor="i">Identifiant</Label>
                    <Input id="i" required minLength={3} value={fIdent} onChange={(e) => setFIdent(e.target.value)} autoComplete="off" />
                  </div>
                  <div>
                    <Label htmlFor="n">Nom affiché</Label>
                    <Input id="n" value={fName} onChange={(e) => setFName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="p">Mot de passe</Label>
                    <Input id="p" type="password" required minLength={6} value={fPwd} onChange={(e) => setFPwd(e.target.value)} />
                  </div>
                  <div>
                    <Label>Rôle</Label>
                    <Select value={fRole} onValueChange={(v) => setFRole(v as AccountRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_national">Admin ANZRBO</SelectItem>
                        <SelectItem value="delegue_section">Délégué ANZRBO</SelectItem>
                        <SelectItem value="nsia">NSIA</SelectItem>
                        <SelectItem value="super_admin">Super admin (DigitOrg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Créer</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {busy && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun compte. Créez-en un avec le bouton ci-dessus.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">Identifiant</th><th>Nom</th><th>Rôles</th><th>Créé le</th><th className="text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.user_id} className="border-t">
                        <td className="py-2 font-mono">{r.identifiant}</td>
                        <td>{r.display_name ?? "—"}</td>
                        <td className="space-x-1">
                          {r.roles.length === 0 ? <Badge variant="outline">aucun</Badge>
                            : r.roles.map((role) => (
                                <Badge key={role} variant="secondary">{ROLE_LABELS[role as AccountRole] ?? role}</Badge>
                              ))}
                        </td>
                        <td className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => onReset(r)} title="Réinitialiser le mot de passe">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(r)} title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
