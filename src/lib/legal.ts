// Informations légales centralisées — le SEUL endroit à compléter.
//
// Pour passer de « particulier » à « micro-entreprise » ou « société » plus tard :
// change `status` et renseigne les champs correspondants. Les mentions légales
// (LegalScreen) s'adaptent automatiquement au statut choisi.

export type EditorStatus = 'particulier' | 'micro' | 'societe'

export interface LegalInfo {
  status: EditorStatus
  brand: string
  /** Nom + prénom (particulier / micro) ou raison sociale (société). */
  editorName: string
  /** Société uniquement : forme juridique (SAS, SARL…). */
  legalForm?: string
  /** Société uniquement : capital social (ex : « 1 000 € »). */
  capital?: string
  /** Micro / société : numéro SIRET. */
  siret?: string
  /** Société uniquement : immatriculation RCS. */
  rcs?: string
  /** Adresse (recommandée dès la micro-entreprise). */
  address?: string
  /** Responsable de la publication. */
  publicationDirector?: string
  contact: string
  host: { name: string; address: string; url: string }
  updated: string
}

// Micro-entreprise (créée). Reste à compléter :
//  - siret : le numéro SIRET de la micro-entreprise (14 chiffres). Tant qu'il est
//    `undefined`, la ligne SIRET ne s'affiche pas dans les mentions légales
//    (LegalScreen masque la ligne si le SIRET manque). ⚠️ À renseigner : le SIRET
//    est OBLIGATOIRE sur les mentions légales d'une micro-entreprise.
//  - address / editorName / publicationDirector : vérifie l'orthographe.
export const LEGAL_INFO: LegalInfo = {
  status: 'micro',
  brand: 'Blumi',
  editorName: 'Axel Ravassard',
  publicationDirector: 'Axel Ravassard',
  address: '16 bis Avenue des Monts d’Or, 69890 La Tour-de-Salvagny, France',
  siret: '10675480700019', // SIRET de la micro-entreprise (14 chiffres)
  rcs: undefined,
  legalForm: undefined,
  capital: undefined,
  contact: 'axel.ravassard@gmail.com',
  host: {
    name: 'Vercel Inc.',
    address: '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis',
    url: 'vercel.com',
  },
  updated: 'juillet 2026',
}
