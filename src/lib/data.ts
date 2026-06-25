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
function num(i: number) {
  return `ANZRBO-2026-${String(i).padStart(5, "0")}`;
}

const MEMBRES_INITIAUX: Membre[] = [
  {
    id: "m01", numeroMembre: num(1), photoUrl: null,
    nom: "MEMBRE-01", prenoms: "Démo 01", telephone: "0000000001",
    sousPrefecture: "Bonon", village: "Village démo", quartier: "Quartier démo",
    dateNaissance: "1962-03-12", lieuNaissance: "Lieu démo",
    dateInscription: "2025-01-15", statut: "decede",
    urgence: { nom: "Contact 01", contact1: "0000000001", adresse: "Adresse démo" },
    paiementInscription: { mode: "especes", typePreuve: "id_transaction", idTransaction: "REC-0001", montant: 1500, date: "2025-01-15" },
  },
  {
    id: "m02", numeroMembre: num(2), photoUrl: null,
    nom: "MEMBRE-02", prenoms: "Démo 02", telephone: "0000000002",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1955-07-22", lieuNaissance: "Lieu démo",
    dateInscription: "2025-02-01", statut: "decede",
    urgence: { nom: "Contact 02", contact1: "0000000002", adresse: "Adresse démo" },
    paiementInscription: { mode: "mobile_money", typePreuve: "id_transaction", idTransaction: "MM-2025-0002", montant: 1500, date: "2025-02-01" },
  },
  {
    id: "m03", numeroMembre: num(3), photoUrl: null,
    nom: "MEMBRE-03", prenoms: "Démo 03", telephone: "0000000003",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1970-09-09", lieuNaissance: "Lieu démo",
    dateInscription: "2026-03-01", statut: "decede",
    urgence: { nom: "Contact 03", contact1: "0000000003", adresse: "Adresse démo" },
    paiementInscription: { mode: "especes", typePreuve: "photo_document", montant: 1500, date: "2026-03-01" },
  },
  {
    id: "m04", numeroMembre: num(4), photoUrl: null,
    nom: "MEMBRE-04", prenoms: "Démo 04", telephone: "0000000004", contact2: "0000000004",
    sousPrefecture: "Bonon", village: "Village démo", quartier: "Quartier démo",
    dateNaissance: "1980-11-30", lieuNaissance: "Lieu démo",
    dateInscription: "2024-09-12", statut: "actif",
    urgence: { nom: "Contact 04", contact1: "0000000004", adresse: "Adresse démo" },
    paiementInscription: { mode: "mobile_money", typePreuve: "id_transaction", idTransaction: "MM-2024-0004", montant: 1500, date: "2024-09-12" },
  },
  {
    id: "m05", numeroMembre: num(5), photoUrl: null,
    nom: "MEMBRE-05", prenoms: "Démo 05", telephone: "0000000005",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1975-05-05", lieuNaissance: "Lieu démo",
    dateInscription: "2024-10-04", statut: "actif",
    urgence: { nom: "Contact 05", contact1: "0000000005", adresse: "Adresse démo" },
    paiementInscription: { mode: "especes", typePreuve: "id_transaction", idTransaction: "REC-0005", montant: 1500, date: "2024-10-04" },
  },
  {
    id: "m06", numeroMembre: num(6), photoUrl: null,
    nom: "MEMBRE-06", prenoms: "Démo 06", telephone: "0000000006",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1982-12-18", lieuNaissance: "Lieu démo",
    dateInscription: "2024-06-01", statut: "actif",
    urgence: { nom: "Contact 06", contact1: "0000000006", adresse: "Adresse démo" },
    paiementInscription: { mode: "mobile_money", typePreuve: "id_transaction", idTransaction: "MM-2024-0006", montant: 1500, date: "2024-06-01" },
  },
  {
    id: "m07", numeroMembre: num(7), photoUrl: null,
    nom: "MEMBRE-07", prenoms: "Démo 07", telephone: "0000000007",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1968-04-14", lieuNaissance: "Lieu démo",
    dateInscription: "2025-05-20", statut: "actif",
    urgence: { nom: "Contact 07", contact1: "0000000007", adresse: "Adresse démo" },
    paiementInscription: { mode: "especes", typePreuve: "id_transaction", idTransaction: "REC-0007", montant: 1500, date: "2025-05-20" },
  },
  {
    id: "m08", numeroMembre: num(8), photoUrl: null,
    nom: "MEMBRE-08", prenoms: "Démo 08", telephone: "0000000008",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1990-08-08", lieuNaissance: "Lieu démo",
    dateInscription: "2024-12-01", statut: "actif",
    urgence: { nom: "Contact 08", contact1: "0000000008", adresse: "Adresse démo" },
    paiementInscription: { mode: "mobile_money", typePreuve: "photo_document", montant: 1500, date: "2024-12-01" },
  },
  {
    id: "m09", numeroMembre: num(9), photoUrl: null,
    nom: "MEMBRE-09", prenoms: "Démo 09", telephone: "0000000009",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1972-02-25", lieuNaissance: "Lieu démo",
    dateInscription: "2024-07-15", statut: "actif",
    urgence: { nom: "Contact 09", contact1: "0000000009", adresse: "Adresse démo" },
    paiementInscription: { mode: "especes", typePreuve: "id_transaction", idTransaction: "REC-0009", montant: 1500, date: "2024-07-15" },
  },
  {
    id: "m10", numeroMembre: num(10), photoUrl: null,
    nom: "MEMBRE-10", prenoms: "Démo 10", telephone: "0000000010",
    sousPrefecture: "Bonon", village: "Village démo",
    dateNaissance: "1988-10-02", lieuNaissance: "Lieu démo",
    dateInscription: "2024-11-09", statut: "actif",
    urgence: { nom: "Contact 10", contact1: "0000000010", adresse: "Adresse démo" },
    paiementInscription: { mode: "mobile_money", typePreuve: "id_transaction", idTransaction: "MM-2024-0010", montant: 1500, date: "2024-11-09" },
  },
];

const NOMS_FICTIFS = ["Koffi", "Kouame", "Yao", "N'Guessan", "Konan", "Kadio", "Traore", "Bamba", "Amani", "Kouadio"];
const PRENOMS_FICTIFS = ["Awa", "Jean", "Mariam", "Serge", "Akissi", "Didier", "Affoué", "Benoît", "Rosine", "Armand"];
const VILLAGES_FICTIFS = ["Zaguiéta", "Gouéta", "N'Drikro", "Blaisekro", "Kouassikro", "Dioulabougou", "Belleville", "Yaokro"];

function telephoneFictif(i: number) {
  return `07${String(58000000 + i * 137).padStart(8, "0")}`;
}

function genererMembresFictifs(): Membre[] {
  return Array.from({ length: 100 }, (_, offset) => {
    const i = offset + 11;
    const statut: Statut = i % 29 === 0 ? "suspendu" : i % 19 === 0 ? "decede" : "actif";
    const mois = ((i % 12) + 1).toString().padStart(2, "0");
    const jour = ((i % 26) + 1).toString().padStart(2, "0");
    return {
      id: `m${String(i).padStart(3, "0")}`,
      numeroMembre: num(i),
      photoUrl: null,
      nom: `${NOMS_FICTIFS[i % NOMS_FICTIFS.length].toUpperCase()}-${String(i).padStart(3, "0")}`,
      prenoms: `${PRENOMS_FICTIFS[i % PRENOMS_FICTIFS.length]} Fictif ${String(i).padStart(2, "0")}`,
      telephone: telephoneFictif(i),
      contact2: i % 4 === 0 ? telephoneFictif(i + 500) : undefined,
      sousPrefecture: "Bonon",
      village: VILLAGES_FICTIFS[i % VILLAGES_FICTIFS.length],
      quartier: i % 3 === 0 ? "Quartier résidentiel" : "Quartier central",
      dateNaissance: `${1960 + (i % 35)}-${mois}-${jour}`,
      lieuNaissance: VILLAGES_FICTIFS[(i + 2) % VILLAGES_FICTIFS.length],
      dateInscription: `${2024 + (i % 3)}-${mois}-${jour}`,
      statut,
      urgence: {
        nom: `Contact urgence ${String(i).padStart(3, "0")}`,
        contact1: telephoneFictif(i + 900),
        contact2: i % 5 === 0 ? telephoneFictif(i + 950) : undefined,
        adresse: `${VILLAGES_FICTIFS[i % VILLAGES_FICTIFS.length]}, Bonon`,
      },
      paiementInscription: {
        mode: i % 2 === 0 ? "mobile_money" : "especes",
        typePreuve: i % 4 === 0 ? "photo_document" : "id_transaction",
        idTransaction: i % 4 === 0 ? undefined : `PAY-${2024 + (i % 3)}-${String(i).padStart(4, "0")}`,
        montant: FRAIS_INSCRIPTION_DIGITORG,
        date: `${2024 + (i % 3)}-${mois}-${jour}`,
      },
    };
  });
}

const MEMBRES_FICTIFS_GENERES = genererMembresFictifs();
export const MEMBRES: Membre[] = [...MEMBRES_INITIAUX, ...MEMBRES_FICTIFS_GENERES];

const AYANTS_DROIT_INITIAUX: AyantDroit[] = [
  // M01
  { id: "a01a", membreId: "m01", lien: "conjoint", nom: "Ayant droit 01A", dateNaissance: "1965-04-10", lieuNaissance: "Lieu démo" },
  { id: "a01b", membreId: "m01", lien: "mere", nom: "Ayant droit 01B", dateNaissance: "1938-01-01", lieuNaissance: "Lieu démo" },
  // M02
  { id: "a02a", membreId: "m02", lien: "pere", nom: "Ayant droit 02A", dateNaissance: "1930-06-15", lieuNaissance: "Lieu démo" },
  { id: "a02b", membreId: "m02", lien: "conjoint", nom: "Ayant droit 02B", dateNaissance: "1952-03-20", lieuNaissance: "Lieu démo" },
  // M03
  { id: "a03a", membreId: "m03", lien: "conjoint", nom: "Ayant droit 03A", dateNaissance: "1972-05-11", lieuNaissance: "Lieu démo" },
  { id: "a03b", membreId: "m03", lien: "mere", nom: "Ayant droit 03B", dateNaissance: "1945-09-01", lieuNaissance: "Lieu démo" },
  // M04
  { id: "a04a", membreId: "m04", lien: "pere", nom: "Ayant droit 04A", dateNaissance: "1950-02-02", lieuNaissance: "Lieu démo" },
  { id: "a04b", membreId: "m04", lien: "mere", nom: "Ayant droit 04B", dateNaissance: "1955-07-19", lieuNaissance: "Lieu démo" },
  { id: "a04c", membreId: "m04", lien: "conjoint", nom: "Ayant droit 04C", dateNaissance: "1978-12-01", lieuNaissance: "Lieu démo" },
  // M05
  { id: "a05a", membreId: "m05", lien: "conjoint", nom: "Ayant droit 05A", dateNaissance: "1980-03-03", lieuNaissance: "Lieu démo" },
  { id: "a05b", membreId: "m05", lien: "mere", nom: "Ayant droit 05B", dateNaissance: "1948-11-11", lieuNaissance: "Lieu démo" },
  // M06
  { id: "a06a", membreId: "m06", lien: "mere", nom: "Ayant droit 06A", dateNaissance: "1948-06-22", lieuNaissance: "Lieu démo" },
  { id: "a06b", membreId: "m06", lien: "conjoint", nom: "Ayant droit 06B", dateNaissance: "1980-01-30", lieuNaissance: "Lieu démo" },
  // M07
  { id: "a07a", membreId: "m07", lien: "mere", nom: "Ayant droit 07A", dateNaissance: "1942-04-04", lieuNaissance: "Lieu démo" },
  { id: "a07b", membreId: "m07", lien: "conjoint", nom: "Ayant droit 07B", dateNaissance: "1970-09-09", lieuNaissance: "Lieu démo" },
  // M08
  { id: "a08a", membreId: "m08", lien: "pere", nom: "Ayant droit 08A", dateNaissance: "1940-08-08", lieuNaissance: "Lieu démo" },
  { id: "a08b", membreId: "m08", lien: "conjoint", nom: "Ayant droit 08B", dateNaissance: "1988-05-12", lieuNaissance: "Lieu démo" },
  // M09
  { id: "a09a", membreId: "m09", lien: "conjoint", nom: "Ayant droit 09A", dateNaissance: "1975-10-10", lieuNaissance: "Lieu démo" },
  { id: "a09b", membreId: "m09", lien: "mere", nom: "Ayant droit 09B", dateNaissance: "1945-03-15", lieuNaissance: "Lieu démo" },
  // M10
  { id: "a10a", membreId: "m10", lien: "mere", nom: "Ayant droit 10A", dateNaissance: "1950-12-25", lieuNaissance: "Lieu démo" },
  { id: "a10b", membreId: "m10", lien: "conjoint", nom: "Ayant droit 10B", dateNaissance: "1985-07-07", lieuNaissance: "Lieu démo" },
];

function genererAyantsDroitFictifs(): AyantDroit[] {
  const liens: AyantDroit["lien"][] = ["conjoint", "pere", "mere", "enfant", "beau-pere", "belle-mere"];
  return MEMBRES_FICTIFS_GENERES.flatMap((m, index) => {
    const rang = index + 11;
    const total = 2 + (rang % 3);
    return Array.from({ length: total }, (_, j) => ({
      id: `a${String(rang).padStart(3, "0")}${String.fromCharCode(97 + j)}`,
      membreId: m.id,
      lien: liens[(rang + j) % liens.length],
      nom: `Ayant droit fictif ${String(rang).padStart(3, "0")}-${j + 1}`,
      dateNaissance: `${1935 + ((rang + j * 7) % 55)}-${String(((rang + j) % 12) + 1).padStart(2, "0")}-${String(((rang + j * 2) % 26) + 1).padStart(2, "0")}`,
      lieuNaissance: VILLAGES_FICTIFS[(rang + j) % VILLAGES_FICTIFS.length],
    }));
  });
}

export const AYANTS_DROIT: AyantDroit[] = [...AYANTS_DROIT_INITIAUX, ...genererAyantsDroitFictifs()];

// 6 souscriptions NSIA (M01, M04, M05, M06, M09, M10)
const SOUSCRIPTIONS_NSIA_INITIALES: SouscriptionNsia[] = [
  mkSouscription("s01", "m01", 5, 2, "2024-08-10"),  // 12500 x 2 = 25000
  mkSouscription("s04", "m04", 3, 3, "2024-10-05"),  // 7500 x 3 = 22500
  mkSouscription("s05", "m05", 6, 2, "2024-11-20"),  // 15000 x 2 = 30000
  mkSouscription("s06", "m06", 4, 4, "2024-07-12"),  // 10000 x 4 = 40000
  mkSouscription("s09", "m09", 4, 3, "2024-09-01"),  // 10000 x 3 = 30000
  mkSouscription("s10", "m10", 2, 5, "2025-01-05"),  // 5000 x 5 = 25000
];

function mkSouscription(id: string, membreId: string, formule: number, nbPersonnes: number, date: string): SouscriptionNsia {
  const f = FORMULES_NSIA.find((x) => x.n === formule)!;
  return {
    id, membreId, formule, benefice: f.benefice, cotisationUnitaire: f.cotisation,
    nbPersonnes, cotisationAnnuelle: f.cotisation * nbPersonnes, dateSouscription: date, actif: true,
  };
}

const SOUSCRIPTIONS_NSIA_FICTIVES = MEMBRES_FICTIFS_GENERES
  .filter((m, index) => m.statut !== "suspendu" && index % 2 === 0)
  .map((m, index) => {
    const rang = Number(m.id.slice(1));
    return mkSouscription(
      `s${m.id.slice(1)}`,
      m.id,
      ((rang + index) % FORMULES_NSIA.length) + 1,
      1 + (rang % 5),
      `${2024 + (rang % 3)}-${String((rang % 12) + 1).padStart(2, "0")}-${String((rang % 24) + 1).padStart(2, "0")}`,
    );
  });

export const SOUSCRIPTIONS_NSIA: SouscriptionNsia[] = [...SOUSCRIPTIONS_NSIA_INITIALES, ...SOUSCRIPTIONS_NSIA_FICTIVES];

// 8 déclarations de décès (3 principaux + 5 ayants droit)
const DECLARATIONS_INITIALES: DeclarationDeces[] = [
  { id: "d1", membreId: "m01", defuntType: "principal", nomDefunt: "Défunt démo", dateDeces: "2026-04-12", dateDeclaration: "2026-04-13" },
  { id: "d2", membreId: "m02", defuntType: "principal", nomDefunt: "Défunt démo", dateDeces: "2026-04-25", dateDeclaration: "2026-04-26" },
  { id: "d3", membreId: "m03", defuntType: "principal", nomDefunt: "Défunt démo", dateDeces: "2026-05-08", dateDeclaration: "2026-05-09" },
  { id: "d4", membreId: "m06", defuntType: "ayant_droit", ayantDroitId: "a06a", nomDefunt: "Défunt démo", dateDeces: "2026-03-02", dateDeclaration: "2026-03-03" },
  { id: "d5", membreId: "m08", defuntType: "ayant_droit", ayantDroitId: "a08a", nomDefunt: "Défunt démo", dateDeces: "2026-03-22", dateDeclaration: "2026-03-23" },
  { id: "d6", membreId: "m09", defuntType: "ayant_droit", ayantDroitId: "a09a", nomDefunt: "Défunt démo", dateDeces: "2026-04-04", dateDeclaration: "2026-04-05" },
  { id: "d7", membreId: "m07", defuntType: "ayant_droit", ayantDroitId: "a07a", nomDefunt: "Défunt démo", dateDeces: "2026-02-18", dateDeclaration: "2026-02-19" },
  { id: "d8", membreId: "m10", defuntType: "ayant_droit", ayantDroitId: "a10a", nomDefunt: "Défunt démo", dateDeces: "2026-05-28", dateDeclaration: "2026-05-30" },
];

const DECLARATIONS_FICTIVES: DeclarationDeces[] = SOUSCRIPTIONS_NSIA_FICTIVES.slice(0, 18).map((s, index) => {
  const droit = AYANTS_DROIT.find((a) => a.membreId === s.membreId);
  const isAyantDroit = index % 2 === 1 && Boolean(droit);
  const mois = String((index % 8) + 1).padStart(2, "0");
  const jour = String(((index * 3) % 24) + 1).padStart(2, "0");
  return {
    id: `df${String(index + 1).padStart(2, "0")}`,
    membreId: s.membreId,
    defuntType: isAyantDroit ? "ayant_droit" : "principal",
    ayantDroitId: isAyantDroit ? droit?.id : undefined,
    nomDefunt: isAyantDroit ? droit!.nom : `Défunt simulation ${String(index + 1).padStart(2, "0")}`,
    dateDeces: `2026-${mois}-${jour}`,
    dateDeclaration: `2026-${mois}-${String(Number(jour) + 1).padStart(2, "0")}`,
  };
});

export const DECLARATIONS: DeclarationDeces[] = [...DECLARATIONS_INITIALES, ...DECLARATIONS_FICTIVES];

// Assistances ANZRBO (8 déclarations) : 5 versées, 3 refusées/en attente
const ASSISTANCES_INITIALES: Assistance[] = [
  { id: "as1", declarationId: "d1", beneficiaire: "Bénéficiaire démo", montant: ASSISTANCE_ANZRBO, statut: "versee", dateTraitement: "2026-04-15" },
  { id: "as2", declarationId: "d2", beneficiaire: "Bénéficiaire démo", montant: ASSISTANCE_ANZRBO, statut: "versee", dateTraitement: "2026-04-28" },
  { id: "as3", declarationId: "d3", beneficiaire: "Bénéficiaire démo", montant: 0, statut: "refusee", motifRefus: "Membre principal non à jour des cotisations" },
  { id: "as4", declarationId: "d4", beneficiaire: "Bénéficiaire démo", montant: ASSISTANCE_ANZRBO, statut: "versee", dateTraitement: "2026-03-05" },
  { id: "as5", declarationId: "d5", beneficiaire: "Bénéficiaire démo", montant: ASSISTANCE_ANZRBO, statut: "versee", dateTraitement: "2026-03-25" },
  { id: "as6", declarationId: "d6", beneficiaire: "Bénéficiaire démo", montant: ASSISTANCE_ANZRBO, statut: "versee", dateTraitement: "2026-04-07" },
  { id: "as7", declarationId: "d7", beneficiaire: "Bénéficiaire démo", montant: 0, statut: "refusee", motifRefus: "Membre principal non à jour des cotisations" },
  { id: "as8", declarationId: "d8", beneficiaire: "Bénéficiaire démo", montant: 0, statut: "en_attente" },
];

const ASSISTANCES_FICTIVES: Assistance[] = DECLARATIONS_FICTIVES.map((d, index) => ({
  id: `asf${String(index + 1).padStart(2, "0")}`,
  declarationId: d.id,
  beneficiaire: `Bénéficiaire simulation ${String(index + 1).padStart(2, "0")}`,
  montant: index % 5 === 0 ? 0 : ASSISTANCE_ANZRBO,
  statut: index % 5 === 0 ? "en_attente" : index % 7 === 0 ? "refusee" : "versee",
  motifRefus: index % 7 === 0 && index % 5 !== 0 ? "Pièces justificatives incomplètes" : undefined,
  dateTraitement: index % 5 === 0 ? undefined : d.dateDeclaration,
}));

export const ASSISTANCES: Assistance[] = [...ASSISTANCES_INITIALES, ...ASSISTANCES_FICTIVES];

// Paiements NSIA : 4 décès couverts NSIA → versés (D1, D4, D6, D8)
const PAIEMENTS_NSIA_INITIAUX: PaiementNsia[] = [
  mkPaiementNsia("p1", "d1", "s01", "2026-04-30"),
  mkPaiementNsia("p2", "d4", "s06", "2026-03-20"),
  mkPaiementNsia("p3", "d6", "s09", "2026-04-22"),
  mkPaiementNsia("p4", "d8", "s10", "2026-05-31"),
];

const PAIEMENTS_NSIA_FICTIFS: PaiementNsia[] = DECLARATIONS_FICTIVES
  .filter((_, index) => index % 3 !== 0)
  .map((d, index) => {
    const souscription = SOUSCRIPTIONS_NSIA.find((s) => s.membreId === d.membreId)!;
    return mkPaiementNsia(`pf${String(index + 1).padStart(2, "0")}`, d.id, souscription.id, d.dateDeclaration);
  });

export const PAIEMENTS_NSIA: PaiementNsia[] = [...PAIEMENTS_NSIA_INITIAUX, ...PAIEMENTS_NSIA_FICTIFS];

function mkPaiementNsia(id: string, declId: string, souscriptionId: string, date: string): PaiementNsia {
  const s = SOUSCRIPTIONS_NSIA.find((x) => x.id === souscriptionId)!;
  const commission = Math.round(s.benefice * TAUX_COMMISSION_NSIA);
  return {
    id, declarationId: declId, souscriptionId,
    beneficeBrut: s.benefice, commissionAssoc: commission,
    netFamille: s.benefice - commission, date,
  };
}

// Cotisations : pour chaque déclaration, chaque membre actif au moment du décès doit 1200 FCFA.
// Génération déterministe + 9 cotisations en retard pour illustrer "non cotisé".
function genererCotisations(): Cotisation[] {
  const enRetardTargets = new Set<string>([
    "d1:m07", "d1:m08",
    "d2:m07", "d2:m10",
    "d3:m04", "d3:m07",
    "d4:m07", "d5:m07", "d7:m10",
  ]); // 9 cotisations en retard
  const list: Cotisation[] = [];
  for (const d of DECLARATIONS) {
    // membres tenus de cotiser : tous les actifs sauf le défunt principal lui-même
    for (const m of MEMBRES) {
      if (m.id === d.membreId && d.defuntType === "principal") continue;
      if (m.statut === "decede" && d.dateDeces < m.dateInscription) continue;
      const key = `${d.id}:${m.id}`;
      const enRetard = enRetardTargets.has(key);
      list.push({
        id: `c-${d.id}-${m.id}`,
        declarationId: d.id, membreId: m.id,
        montant: COTISATION_PAR_DECES,
        statut: enRetard ? "en_retard" : "payee",
        date: enRetard ? undefined : d.dateDeclaration,
      });
    }
  }
  return list;
}

export const COTISATIONS: Cotisation[] = genererCotisations();

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
