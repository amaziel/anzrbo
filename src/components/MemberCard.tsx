import { useEffect, useState } from "react";
import QRCode from "qrcode";
import logo from "@/assets/anzrbo-logo.png";
import type { Membre } from "@/lib/data";

/**
 * Carte de membre ANZRBO — format CR80 (85,60 × 53,98 mm — standard ISO/IEC 7810 ID-1,
 * équivalent ~ 8,5 × 5,4 cm). La carte est rendue à 1:1 sur écran à 96dpi
 * et à l'impression via `@page { size: 85.6mm 53.98mm }` côté route imprimeur.
 */
const CARD_W = "85.6mm";
const CARD_H = "53.98mm";

function fullVerifierUrl(numeroMembre: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://anzrbo.digitorg.net";
  return `${origin}/verifier/${encodeURIComponent(numeroMembre)}`;
}

function formatDateFr(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function statutLabel(s: Membre["statut"]) {
  if (s === "actif") return "MEMBRE ACTIF";
  if (s === "suspendu") return "MEMBRE SUSPENDU";
  return "MEMBRE DÉCÉDÉ";
}

function photoFor(m: Membre) {
  if (m.photoUrl) return m.photoUrl;
  // Avatar généré déterministe (DiceBear) — pas de PII réelle.
  const seed = encodeURIComponent(m.numeroMembre);
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=0c5b2e,a78838&fontFamily=Georgia`;
}

export function useMemberQr(numeroMembre: string) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(fullVerifierUrl(numeroMembre), {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 360,
      color: { dark: "#0c5b2e", light: "#ffffff" },
    })
      .then((d) => { if (!cancelled) setDataUrl(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [numeroMembre]);
  return dataUrl;
}

export function MemberCardRecto({ m }: { m: Membre }) {
  const qr = useMemberQr(m.numeroMembre);
  return (
    <div
      className="card-anzrbo relative overflow-hidden rounded-[3mm] bg-white text-[#1a1a1a] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
      style={{ width: CARD_W, height: CARD_H, fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {/* filigrane logo */}
      <img
        src={logo}
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto opacity-[0.04]"
        style={{ width: "70%", objectFit: "contain" }}
      />
      {/* bandeau bas vague verte+or */}
      <svg className="absolute bottom-0 left-0 right-0 w-full" height="14mm" viewBox="0 0 856 140" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rectoBottom" x1="0" x2="1">
            <stop offset="0" stopColor="#0c5b2e" />
            <stop offset="1" stopColor="#0a4a26" />
          </linearGradient>
        </defs>
        <path d="M0,60 C200,10 540,130 856,40 L856,140 L0,140 Z" fill="url(#rectoBottom)" />
        <path d="M0,55 C220,5 540,125 856,30" fill="none" stroke="#c9a24c" strokeWidth="2" />
      </svg>

      {/* en-tête */}
      <div className="absolute left-0 right-0 top-0 flex items-start gap-[2mm] px-[3mm] pt-[2.2mm]">
        <img src={logo} alt="ANZRBO" className="h-[14mm] w-[14mm] shrink-0 object-contain" />
        <div className="min-w-0 flex-1 pt-[0.5mm]">
          <div className="truncate text-[3.2mm] font-extrabold leading-tight tracking-tight text-[#0c5b2e]">
            ASSOCIATION DES N'ZIPRIS
          </div>
          <div className="flex items-center gap-[1mm]">
            <span className="h-px flex-1 bg-[#c9a24c]" />
            <span className="text-[2.1mm] font-semibold tracking-[0.2em] text-[#c9a24c]">RÉSIDENTS À BONON</span>
            <span className="h-px flex-1 bg-[#c9a24c]" />
          </div>
          <div className="mt-[0.4mm] text-[1.7mm] text-[#555]">
            Solidarité · Transparence · Accompagnement
          </div>
        </div>
        {/* drapeau CI */}
        <div className="flex h-[5mm] w-[8mm] shrink-0 overflow-hidden rounded-[0.5mm] shadow-sm">
          <span className="flex-1 bg-[#f77f00]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#009e60]" />
        </div>
      </div>

      {/* corps : photo + infos + QR */}
      <div className="absolute inset-x-0 top-[18mm] grid grid-cols-[20mm_1fr_22mm] gap-[2mm] px-[3mm]">
        <img
          src={photoFor(m)}
          alt={`${m.prenoms} ${m.nom}`}
          className="h-[26mm] w-[20mm] rounded-[1.5mm] border border-[#c9a24c] object-cover"
          crossOrigin="anonymous"
        />
        <div className="min-w-0 space-y-[1.2mm] text-[2mm] leading-tight">
          <div>
            <div className="text-[1.5mm] font-semibold tracking-wider text-[#777]">NOM ET PRÉNOMS</div>
            <div className="truncate text-[2.4mm] font-bold text-[#0c5b2e]">
              {m.nom} {m.prenoms}
            </div>
          </div>
          <div>
            <div className="text-[1.5mm] font-semibold tracking-wider text-[#777]">N° DE MEMBRE</div>
            <div className="font-mono text-[2.2mm] font-bold">{m.numeroMembre}</div>
          </div>
          <div>
            <div className="text-[1.5mm] font-semibold tracking-wider text-[#777]">DATE D'ADHÉSION</div>
            <div className="text-[2mm] font-semibold">{formatDateFr(m.dateInscription)}</div>
          </div>
          <div>
            <div className="text-[1.5mm] font-semibold tracking-wider text-[#777]">STATUT</div>
            <div
              className={`inline-block rounded-[0.8mm] px-[1.5mm] py-[0.4mm] text-[1.7mm] font-bold text-white ${
                m.statut === "actif" ? "bg-[#0c5b2e]" : m.statut === "suspendu" ? "bg-[#b0791f]" : "bg-[#8a1c1c]"
              }`}
            >
              {statutLabel(m.statut)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          {qr ? (
            <img src={qr} alt="QR" className="h-[20mm] w-[20mm] rounded-[1mm] border border-[#0c5b2e] bg-white p-[0.5mm]" />
          ) : (
            <div className="h-[20mm] w-[20mm] animate-pulse rounded-[1mm] border border-[#0c5b2e] bg-[#f0ebd8]" />
          )}
          <div className="mt-[0.6mm] text-center text-[1.3mm] font-semibold leading-tight text-[#0c5b2e]">
            SCANNEZ POUR VÉRIFIER<br />MA QUALITÉ DE MEMBRE
          </div>
        </div>
      </div>

      {/* colonne droite infos lieu/contact */}
      <div className="absolute left-[25mm] right-[25mm] top-[18mm] hidden">
        {/* (Espace réservé — déjà dans le bloc principal ci-dessus) */}
      </div>

      <div className="absolute bottom-[4mm] left-[3mm] z-10 text-[2.3mm] font-extrabold tracking-[0.25em] text-white">
        ANZRBO
      </div>
      <div className="absolute bottom-[4mm] right-[3mm] z-10 flex items-center gap-[1mm] text-[1.8mm] font-bold tracking-wider text-white">
        CARTE DE MEMBRE
        <svg width="3.5mm" height="3.5mm" viewBox="0 0 24 24" fill="none" stroke="#c9a24c" strokeWidth="2.5"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/></svg>
      </div>
    </div>
  );
}

export function MemberCardVerso({ m }: { m: Membre }) {
  return (
    <div
      className="card-anzrbo relative overflow-hidden rounded-[3mm] bg-white text-[#1a1a1a] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
      style={{ width: CARD_W, height: CARD_H, fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {/* bandeau titre */}
      <div className="flex h-[7mm] items-center justify-center bg-[#0c5b2e] text-white">
        <span className="text-[1.8mm] font-bold tracking-[0.25em] text-[#c9a24c]">»</span>
        <span className="mx-[2mm] text-[2.2mm] font-extrabold tracking-[0.18em]">CARTE OFFICIELLE DE MEMBRE ANZRBO</span>
        <span className="text-[1.8mm] font-bold tracking-[0.25em] text-[#c9a24c]">«</span>
      </div>

      <img
        src={logo}
        aria-hidden
        className="pointer-events-none absolute right-[3mm] top-[10mm] opacity-[0.12]"
        style={{ height: "22mm", width: "22mm", objectFit: "contain" }}
      />

      <div className="px-[3mm] pt-[2mm] text-[1.8mm] leading-[1.35] text-[#1a1a1a]">
        <p>
          Cette carte atteste que son titulaire est membre régulièrement enregistré de l'
          <b>Association des N'Zipris Résidents à Bonon (ANZRBO)</b>.
        </p>
        <p className="mt-[1mm]">
          Elle facilite l'identification du membre dans le cadre des activités de solidarité,
          d'assistance aux familles et de gestion des prestations prévues par l'association.
        </p>
        <p className="mt-[1.2mm] font-bold">
          En cas de découverte de cette carte, prière de la retourner aux responsables de l'ANZRBO.
        </p>
      </div>

      <div className="absolute bottom-[7mm] left-[3mm] right-[3mm] grid grid-cols-[1fr_1fr] gap-[2mm]">
        <div className="rounded-[1mm] border border-[#c9a24c] px-[2mm] py-[1.2mm]">
          <div className="text-[1.7mm] font-bold text-[#0c5b2e]">Secrétariat Général (SG)</div>
          <div className="font-mono text-[2mm] font-bold text-[#1a1a1a]">+225 07 59 56 60 87</div>
        </div>
        <ul className="space-y-[0.4mm] text-[1.6mm]">
          <li>✓ Carte strictement personnelle.</li>
          <li>✓ Non cessible.</li>
          <li>✓ Toute perte doit être signalée immédiatement.</li>
          <li>✓ Soumise au respect des statuts de l'association.</li>
        </ul>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex h-[5mm] items-center justify-between bg-[#0c5b2e] px-[3mm] text-[1.6mm] text-white">
        <span><b>ANZRBO</b> — Bonon, Côte d'Ivoire</span>
        <span className="font-semibold text-[#c9a24c]">Solidarité · Transparence · Assistance</span>
      </div>
    </div>
  );
}

export function MemberCardBoth({ m }: { m: Membre }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <MemberCardRecto m={m} />
      <MemberCardVerso m={m} />
    </div>
  );
}
