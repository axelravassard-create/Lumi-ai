// Références publiques reconnues sur l'automatisation et l'emploi.
// Affichées dans le bloc "Méthodologie & sources" pour ancrer la crédibilité
// du score : la méthode s'inspire de ces travaux (sans en reprendre de chiffres
// précis — il s'agit d'une estimation indicative).
// Les textes (name/org/detail) sont traduits via i18n : clés `src.<id>.*`.

export interface Reference {
  /** Identifiant stable → clés i18n `src.<id>.name|org|detail`. */
  id: string
  url: string
}

export const REFERENCES: Reference[] = [
  { id: 'frey', url: 'https://www.oxfordmartin.ox.ac.uk/publications/the-future-of-employment' },
  { id: 'ocde', url: 'https://www.oecd.org' },
  { id: 'fs', url: 'https://www.strategie.gouv.fr' },
  { id: 'wef', url: 'https://www.weforum.org' },
]
