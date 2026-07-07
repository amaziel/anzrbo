import { useState } from "react";
import logo from "@/assets/anzrbo-logo.png";
import inocentPhoto from "@/assets/inocent-koffi.jpg";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const WA_MESSAGE = `Bonjour Inocent, je vous contacte depuis la plateforme ANZRBO. Je souhaiterais échanger avec vous au sujet de la plateforme (assistance, personnalisation ou déploiement pour mon organisation). Merci d'avance pour votre retour.`;

export function SiteFooter() {
  const [open, setOpen] = useState(false);
  const waHref = `https://wa.me/2250759566087?text=${encodeURIComponent(WA_MESSAGE)}`;

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

      <div className="border-t bg-background/60">
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} ANZRBO — Plateforme DigitOrg. Tous droits réservés.</div>
          <div className="flex items-center gap-2">
            <span>Par</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Voir la photo d'Inocent KOFFI en grand"
              className="group inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1 transition hover:border-primary hover:shadow-sm"
            >
              <img
                src={inocentPhoto}
                alt="Inocent KOFFI"
                width={28}
                height={28}
                loading="lazy"
                className="h-7 w-7 rounded-full object-cover"
              />
              <a
                href="https://ikoffi.agricapital.ci"
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-foreground hover:text-primary"
              >
                Inocent KOFFI
              </a>
            </button>
            <span>—</span>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono font-semibold text-primary hover:underline"
              title="Ouvrir WhatsApp"
            >
              +225 07 59 56 60 87
            </a>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-2 sm:p-4">
          <DialogTitle className="sr-only">Photo — Inocent KOFFI</DialogTitle>
          <img
            src={inocentPhoto}
            alt="Inocent KOFFI — portrait"
            className="mx-auto max-h-[80vh] w-auto rounded-lg object-contain"
          />
          <div className="mt-2 text-center text-sm text-muted-foreground">
            Inocent KOFFI — Concepteur de la plateforme ANZRBO
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
