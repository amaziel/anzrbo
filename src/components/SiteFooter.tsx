import logo from "@/assets/anzrbo-logo.png";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-secondary/40">
      <div className="container mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <img src={logo} alt="Association ANZRBO — Entraide et Solidarité" className="h-12 w-auto" />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Association des N'Zipris Résidents à Bonon — Entraide et assistance mutuelle au décès, sous-préfecture de Bonon, Côte d'Ivoire.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Plateforme</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><a href="/guide/procedure-deces" className="hover:text-primary">Guide procédure décès</a></li>
            <li><a href="/scanner" className="hover:text-primary">Scanner un QR Code</a></li>
            <li><a href="/contact" className="hover:text-primary">Nous contacter</a></li>
            <li><a href="/login" className="hover:text-primary">Espace administrateur</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Contact</h4>
          <p className="text-sm text-muted-foreground">
            Siège : Sous-préfecture de Bonon
            <br />
            Côte d'Ivoire
          </p>
        </div>
      </div>
      <div className="border-t bg-background/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ANZRBO — Plateforme DigitOrg. Tous droits réservés.
      </div>
    </footer>
  );
}
