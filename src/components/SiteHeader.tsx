import { Link } from "@tanstack/react-router";
import logo from "@/assets/anzrbo-logo.png";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Accueil" },
  { to: "/guide/procedure-deces", label: "Guide décès" },
  { to: "/scanner", label: "Scanner QR" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { user, signOut, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Association ANZRBO — Entraide et Solidarité" className="h-12 w-auto md:h-14" />
          <span className="hidden text-sm font-semibold uppercase tracking-wider text-primary sm:inline">ANZRBO</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to} to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-primary"
              activeProps={{ className: "text-primary bg-secondary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? <div className="h-9 w-32" aria-hidden /> : user ? (
            <>
              <Button asChild variant="outline" size="sm"><Link to={user.home}>Mon espace</Link></Button>
              <Button size="sm" variant="ghost" onClick={() => signOut()}>Déconnexion</Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm"><Link to="/login">Connexion</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
