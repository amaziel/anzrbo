import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

// Étiquettes UI (élargies). Les valeurs `fils`/`fille`/`petit_fils`/`petite_fille`
// sont stockées telles quelles dans l'enum SQL actuel.
export type AyantRelation =
  | "pere"
  | "mere"
  | "conjoint"
  | "fils"
  | "fille"
  | "petit_fils"
  | "petite_fille"
  | "";

export type AyantDroit = {
  type: AyantRelation;
  nom: string;
  dateNaissance: string;
  lieuNaissance: string;
};

export const EMPTY_AYANT: AyantDroit = {
  type: "",
  nom: "",
  dateNaissance: "",
  lieuNaissance: "",
};

export const RELATION_LABEL: Record<Exclude<AyantRelation, "">, string> = {
  pere: "Père",
  mere: "Mère",
  conjoint: "Conjoint(e)",
  fils: "Fils",
  fille: "Fille",
  petit_fils: "Petit-fils",
  petite_fille: "Petite-fille",
};

export function relationToEnum(r: AyantRelation): string {
  return r || "autre";
}

export function AyantsDroitFields({
  value,
  onChange,
  max = 8,
}: {
  value: AyantDroit[];
  onChange: (v: AyantDroit[]) => void;
  max?: number;
}) {
  const list = value.length ? value : [{ ...EMPTY_AYANT }];

  function update(i: number, patch: Partial<AyantDroit>) {
    onChange(list.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function add() {
    if (list.length >= max) return;
    onChange([...list, { ...EMPTY_AYANT }]);
  }
  function remove(i: number) {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [{ ...EMPTY_AYANT }]);
  }

  return (
    <div className="space-y-3">
      <p className="rounded-md border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
        Les ayants droit ne sont <strong>pas des membres secondaires</strong>. Ils ne
        cotisent pas et ne font pas l'objet d'une déclaration de décès — ce sont
        uniquement les personnes de référence en cas d'absence du membre principal.
      </p>
      {list.map((a, i) => (
        <div
          key={i}
          className="grid gap-3 rounded-md border bg-background/50 p-3 md:grid-cols-[170px_1fr_160px_1fr_auto]"
        >
          <div>
            <Label className="text-xs">Lien de parenté</Label>
            <Select
              value={a.type}
              onValueChange={(v) => update(i, { type: v as AyantRelation })}
            >
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pere">Père</SelectItem>
                <SelectItem value="mere">Mère</SelectItem>
                <SelectItem value="conjoint">Conjoint(e)</SelectItem>
                <SelectItem value="fils">Fils</SelectItem>
                <SelectItem value="fille">Fille</SelectItem>
                <SelectItem value="petit_fils">Petit-fils</SelectItem>
                <SelectItem value="petite_fille">Petite-fille</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nom complet</Label>
            <Input
              value={a.nom}
              onChange={(e) => update(i, { nom: e.target.value })}
              placeholder={a.type ? `Nom et prénoms du ${RELATION_LABEL[a.type as Exclude<AyantRelation,"">]}` : "Nom et prénoms"}
            />
          </div>
          <div>
            <Label className="text-xs">Date de naissance</Label>
            <Input
              type="date"
              value={a.dateNaissance}
              onChange={(e) => update(i, { dateNaissance: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Lieu de naissance</Label>
            <Input
              value={a.lieuNaissance}
              onChange={(e) => update(i, { lieuNaissance: e.target.value })}
              placeholder="Ville / Pays"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)} aria-label="Retirer">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {list.length < max ? (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-3 w-3" /> Ajouter un ayant droit ({list.length}/{max})
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Maximum {max} ayants droit atteint.</p>
      )}
    </div>
  );
}

export function ayantsDroitToText(list: AyantDroit[]): string {
  return list
    .filter((a) => a.type && a.nom)
    .map((a) => {
      const label = RELATION_LABEL[a.type as Exclude<AyantRelation, "">];
      const dn = a.dateNaissance ? ` — né(e) le ${a.dateNaissance}` : "";
      const lieu = a.lieuNaissance ? ` à ${a.lieuNaissance}` : "";
      return `${label} : ${a.nom}${dn}${lieu}`;
    })
    .join("\n");
}
