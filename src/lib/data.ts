// Données 100% locales conformes au CDC ANZRBO / DigitOrg (UI uniquement).
// Aucune requête vers une base de données.

export type Statut = "actif" | "suspendu" | "decede";

export type AyantDroit = {
  id: string;
  membreId: string;
  lien: "pere" | "mere" | "beau-pere" | "belle-mere" | "conjoint" | "enfant";
  nom: string;
  dateNaissance: string;
  lieuNaissance: string;
};

export type Membre = {
  id: string;
  numeroMembre: string;        // ANZRBO-2026-00001
  photoUrl: string | null;
  nom: string;
  prenoms: string;
  telephone: string;
  contact2?: string;
  sousPrefecture: "Bonon";
  village: string;
  quartier?: string;
  dateNaissance: string;
  lieuNaissance: string;
  dateInscription: string;
  statut: Statut;
  urgence: { nom: string; contact1: string; contact2?: string; adresse: string };
  paiementInscription: {
    mode: "especes" | "mobile_money";
    typePreuve: "id_transaction" | "photo_document";
    idTransaction?: string;
    montant: number; // 1500 FCFA frais inscription DigitOrg
    date: string;
  };
};

export type SouscriptionNsia = {
  id: string;
  membreId: string;
  formule: number;            // 1..10
  benefice: number;           // FCFA par personne
  cotisationUnitaire: number; // FCFA / an
  nbPersonnes: number;
  cotisationAnnuelle: number; // unitaire x nb
  dateSouscription: string;
  actif: boolean;
};

export type DeclarationDeces = {
  id: string;
  membreId: string;             // membre principal lié
  defuntType: "principal" | "ayant_droit";
  ayantDroitId?: string;
  nomDefunt: string;
  dateDeces: string;
  dateDeclaration: string;
};

export type Cotisation = {
  id: string;
  declarationId: string;
  membreId: string;       // celui qui doit payer
  montant: number;        // 1200 FCFA
  statut: "payee" | "en_retard" | "en_attente";
  date?: string;
};

export type Assistance = {
  id: string;
  declarationId: string;
  beneficiaire: string;
  montant: number;         // 500 000 ANZRBO
  statut: "versee" | "refusee" | "en_attente";
  motifRefus?: string;
  dateTraitement?: string;
};

export type PaiementNsia = {
  id: string;
  declarationId: string;
  souscriptionId: string;
  beneficeBrut: number;       // versé par NSIA
  commissionAssoc: number;    // 25% prélevés par ANZRBO
  netFamille: number;         // 75%
  date: string;
};

// ---------------------------------------------------------------
// Tarifs NSIA Décès (cf. CDC §5.1)
// ---------------------------------------------------------------
export const FORMULES_NSIA = [
  { n: 1, benefice: 100_000,  cotisation: 2_500 },
  { n: 2, benefice: 200_000,  cotisation: 5_000 },
  { n: 3, benefice: 300_000,  cotisation: 7_500 },
  { n: 4, benefice: 400_000,  cotisation: 10_000 },
  { n: 5, benefice: 500_000,  cotisation: 12_500 },
  { n: 6, benefice: 600_000,  cotisation: 15_000 },
  { n: 7, benefice: 700_000,  cotisation: 17_500 },
  { n: 8, benefice: 800_000,  cotisation: 20_000 },
  { n: 9, benefice: 900_000,  cotisation: 22_500 },
  { n: 10, benefice: 1_000_000, cotisation: 25_000 },
] as const;

export const ASSISTANCE_ANZRBO = 500_000;
export const COTISATION_PAR_DECES = 1_200;
export const FRAIS_INSCRIPTION_DIGITORG = 1_500;
export const TAUX_COMMISSION_NSIA = 0.25;

// ---------------------------------------------------------------
// Jeu de données (10 membres) — fixtures pédagogiques
// ---------------------------------------------------------------
// Données de démonstration supprimées — l'application utilise désormais Supabase pour toutes les données.
export const MEMBRES: Membre[] = [];
export const AYANTS_DROIT: AyantDroit[] = [];
export const SOUSCRIPTIONS_NSIA: SouscriptionNsia[] = [];
export const DECLARATIONS: DeclarationDeces[] = [];
export const ASSISTANCES: Assistance[] = [];
export const PAIEMENTS_NSIA: PaiementNsia[] = [];
export const COTISATIONS: Cotisation[] = [];


// ---------------------------------------------------------------
// Helpers de calcul
// ---------------------------------------------------------------
export function membre(id: string) {
  return MEMBRES.find((m) => m.id === id);
}

export function ayantsDroitDe(membreId: string) {
  return AYANTS_DROIT.filter((a) => a.membreId === membreId);
}

export function souscriptionDe(membreId: string) {
  return SOUSCRIPTIONS_NSIA.find((s) => s.membreId === membreId);
}

export function cotisationsDuMembre(membreId: string) {
  return COTISATIONS.filter((c) => c.membreId === membreId);
}

export function aJour(membreId: string) {
  return cotisationsDuMembre(membreId).every((c) => c.statut === "payee");
}

export function declarationsDuMembre(membreId: string) {
  return DECLARATIONS.filter((d) => d.membreId === membreId);
}

export function statsAnzrbo() {
  const total = MEMBRES.length;
  const actifs = MEMBRES.filter((m) => m.statut === "actif").length;
  const suspendus = MEMBRES.filter((m) => m.statut === "suspendu").length;
  const decedes = MEMBRES.filter((m) => m.statut === "decede").length;
  const fraisInscription = total * FRAIS_INSCRIPTION_DIGITORG;
  const cotisationsPayees = COTISATIONS.filter((c) => c.statut === "payee");
  const totalCotPayees = cotisationsPayees.reduce((s, c) => s + c.montant, 0);
  const enAttente = COTISATIONS.filter((c) => c.statut !== "payee");
  const totalEnAttente = enAttente.reduce((s, c) => s + c.montant, 0);
  const assistancesVersees = ASSISTANCES.filter((a) => a.statut === "versee");
  const totalAssistances = assistancesVersees.reduce((s, a) => s + a.montant, 0);
  const totalSouscriptionsNsia = SOUSCRIPTIONS_NSIA.reduce((s, x) => s + x.cotisationAnnuelle, 0);
  const totalNsiaRecu = PAIEMENTS_NSIA.reduce((s, x) => s + x.beneficeBrut, 0);
  const commissionsNsia = PAIEMENTS_NSIA.reduce((s, x) => s + x.commissionAssoc, 0);
  return {
    total, actifs, suspendus, decedes,
    fraisInscription, totalCotPayees, nbCotPayees: cotisationsPayees.length,
    totalEnAttente, nbEnAttente: enAttente.length,
    totalAssistances, nbAssistances: assistancesVersees.length,
    totalSouscriptionsNsia, nbSouscriptions: SOUSCRIPTIONS_NSIA.length,
    totalNsiaRecu, commissionsNsia, nbPaiementsNsia: PAIEMENTS_NSIA.length,
    nbDeclarations: DECLARATIONS.length,
    partAssociation: totalCotPayees,   // 100% cotisations vont à l'association
    partDigitorg: fraisInscription,    // DigitOrg = frais d'inscription uniquement
  };
}
