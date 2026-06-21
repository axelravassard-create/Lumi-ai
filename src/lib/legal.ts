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

// ⚠️ À COMPLÉTER avant exploitation : remplace les champs entre crochets.
export const LEGAL_INFO: LegalInfo = {
  status: 'particulier',
  brand: 'Lumi',
  editorName: '[Prénom Nom à compléter]',
  publicationDirector: '[Prénom Nom à compléter]',
  address: undefined, // facultatif pour un particulier ; obligatoire dès la micro
  siret: undefined,
  rcs: undefined,
  legalForm: undefined,
  capital: undefined,
  contact: 'axel.ravassard@gmail.com',
  host: {
    name: 'Vercel Inc.',
    address: '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis',
    url: 'vercel.com',
  },
  updated: 'juin 2026',
}
