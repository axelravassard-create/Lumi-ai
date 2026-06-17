// Références publiques reconnues sur l'automatisation et l'emploi.
// Affichées dans le bloc "Méthodologie & sources" pour ancrer la crédibilité
// du score : la méthode s'inspire de ces travaux (sans en reprendre de chiffres
// précis — il s'agit d'une estimation indicative).

export interface Reference {
  name: string
  org: string
  detail: string
  url: string
}

export const REFERENCES: Reference[] = [
  {
    name: 'The Future of Employment',
    org: 'Frey & Osborne · Oxford Martin School (2013)',
    detail: 'Étude fondatrice sur la susceptibilité des emplois à l\'automatisation.',
    url: 'https://www.oxfordmartin.ox.ac.uk/publications/the-future-of-employment',
  },
  {
    name: 'Perspectives de l\'emploi & avenir du travail',
    org: 'OCDE',
    detail: 'Travaux sur l\'impact de l\'automatisation et de l\'IA sur les métiers.',
    url: 'https://www.oecd.org',
  },
  {
    name: 'Intelligence artificielle et travail',
    org: 'France Stratégie',
    detail: 'Analyses des effets de l\'IA sur l\'emploi en France.',
    url: 'https://www.strategie.gouv.fr',
  },
  {
    name: 'Future of Jobs Report',
    org: 'World Economic Forum',
    detail: 'Tendances mondiales des compétences et de l\'emploi face à l\'IA.',
    url: 'https://www.weforum.org',
  },
]
