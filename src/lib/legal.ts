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

// Pré-rempli pour un particulier (offre actuellement gratuite).
// À vérifier / compléter :
//  - editorName / publicationDirector : confirme l'orthographe.
//  - address : facultative pour un particulier (voir note ci-dessous), mais
//    OBLIGATOIRE dès le passage en micro-entreprise.
//
// 💡 Régime « particulier non professionnel » (LCEN art. 6 III 2) : tant que le
// site est gratuit et non professionnel, tu PEUX ne pas afficher ton nom/adresse
// publiquement, à condition d'avoir communiqué ton identité à l'hébergeur (Vercel,
// via ton compte). Dans ce cas, ne publie que l'hébergeur + un contact, et passe
// editorName à 'Éditeur particulier (identité connue de l’hébergeur)'.
export const LEGAL_INFO: LegalInfo = {
  status: 'particulier',
  brand: 'Blumi',
  editorName: 'Axel Ravassard',
  publicationDirector: 'Axel Ravassard',
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
