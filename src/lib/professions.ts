// Base de connaissances métiers de YourCareer.
//
// Chaque métier est décrit par 7 facteurs (0 = absent, 100 = très présent) qui
// caractérisent la nature du travail. Le moteur d'analyse combine ces facteurs
// pour estimer l'exposition du métier à l'automatisation par l'IA.
//
//  • routine    : tâches répétitives, prévisibles, codifiables       (↑ risque)
//  • digital    : travail sur données, texte, écran, code            (↑ risque)
//  • creativity : création originale, conception, idéation           (↓ risque)
//  • empathy    : relation humaine, soin, écoute, pédagogie          (↓ risque)
//  • physical   : dextérité fine, terrain, environnement imprévu     (↓ risque)
//  • judgment   : décision stratégique, responsabilité, éthique      (↓ risque)
//  • social     : négociation, persuasion, coordination d'équipes    (↓ risque)

export interface Factors {
  routine: number
  digital: number
  creativity: number
  empathy: number
  physical: number
  judgment: number
  social: number
}

export interface Profession {
  id: string
  label: string
  domain: string
  emoji: string
  keywords: string[]
  factors: Factors
}

export const PROFESSIONS: Profession[] = [
  // ── Tech & Data ───────────────────────────────────────────────────────────
  {
    id: 'data-entry',
    label: 'Opérateur·rice de saisie de données',
    domain: 'Tech & Data',
    emoji: '⌨️',
    keywords: ['saisie', 'data entry', 'operateur de saisie', 'encodage', 'data entry clerk'],
    factors: { routine: 96, digital: 90, creativity: 8, empathy: 12, physical: 15, judgment: 14, social: 12 },
  },
  {
    id: 'developer',
    label: 'Développeur·se logiciel',
    domain: 'Tech & Data',
    emoji: '💻',
    keywords: ['developpeur', 'developpeuse', 'developer', 'programmeur', 'ingenieur logiciel', 'software engineer', 'codeur', 'dev'],
    factors: { routine: 45, digital: 95, creativity: 68, empathy: 24, physical: 8, judgment: 66, social: 40 },
  },
  {
    id: 'data-scientist',
    label: 'Data Scientist',
    domain: 'Tech & Data',
    emoji: '📊',
    keywords: ['data scientist', 'data science', 'machine learning', 'ml engineer', 'analyste data'],
    factors: { routine: 38, digital: 96, creativity: 62, empathy: 18, physical: 6, judgment: 74, social: 38 },
  },
  {
    id: 'data-analyst',
    label: 'Analyste de données',
    domain: 'Tech & Data',
    emoji: '📈',
    keywords: ['analyste', 'data analyst', 'business analyst', 'analyste de donnees', 'bi'],
    factors: { routine: 58, digital: 92, creativity: 40, empathy: 18, physical: 6, judgment: 58, social: 36 },
  },
  {
    id: 'cybersecurity',
    label: 'Expert·e en cybersécurité',
    domain: 'Tech & Data',
    emoji: '🛡️',
    keywords: ['cybersecurite', 'cyber', 'securite informatique', 'pentester', 'soc', 'rssi'],
    factors: { routine: 36, digital: 94, creativity: 60, empathy: 16, physical: 8, judgment: 82, social: 44 },
  },
  {
    id: 'it-support',
    label: 'Technicien·ne support informatique',
    domain: 'Tech & Data',
    emoji: '🔧',
    keywords: ['support informatique', 'helpdesk', 'technicien informatique', 'support technique', 'it support'],
    factors: { routine: 64, digital: 78, creativity: 26, empathy: 48, physical: 28, judgment: 40, social: 50 },
  },

  // ── Santé ─────────────────────────────────────────────────────────────────
  {
    id: 'nurse',
    label: 'Infirmier·ère',
    domain: 'Santé',
    emoji: '🩺',
    keywords: ['infirmier', 'infirmiere', 'nurse', 'soignant', 'aide soignant', 'ide'],
    factors: { routine: 40, digital: 28, creativity: 28, empathy: 94, physical: 78, judgment: 70, social: 66 },
  },
  {
    id: 'doctor',
    label: 'Médecin',
    domain: 'Santé',
    emoji: '👨‍⚕️',
    keywords: ['medecin', 'docteur', 'doctor', 'generaliste', 'praticien', 'chirurgien', 'cardiologue'],
    factors: { routine: 30, digital: 46, creativity: 40, empathy: 86, physical: 60, judgment: 92, social: 64 },
  },
  {
    id: 'psychologist',
    label: 'Psychologue',
    domain: 'Santé',
    emoji: '🧠',
    keywords: ['psychologue', 'psy', 'psychotherapeute', 'therapeute', 'psychiatre'],
    factors: { routine: 18, digital: 30, creativity: 52, empathy: 96, physical: 14, judgment: 84, social: 78 },
  },
  {
    id: 'pharmacist',
    label: 'Pharmacien·ne',
    domain: 'Santé',
    emoji: '💊',
    keywords: ['pharmacien', 'pharmacie', 'pharmacist', 'preparateur pharmacie'],
    factors: { routine: 62, digital: 50, creativity: 22, empathy: 60, physical: 40, judgment: 64, social: 52 },
  },

  // ── Éducation ───────────────────────────────────────────────────────────
  {
    id: 'teacher',
    label: 'Enseignant·e',
    domain: 'Éducation',
    emoji: '👩‍🏫',
    keywords: ['enseignant', 'professeur', 'prof', 'teacher', 'instituteur', 'maitre', 'formateur'],
    factors: { routine: 40, digital: 42, creativity: 60, empathy: 84, physical: 24, judgment: 64, social: 80 },
  },
  {
    id: 'researcher',
    label: 'Chercheur·se / Scientifique',
    domain: 'Éducation',
    emoji: '🔬',
    keywords: ['chercheur', 'chercheuse', 'scientifique', 'researcher', 'doctorant', 'recherche'],
    factors: { routine: 26, digital: 70, creativity: 86, empathy: 24, physical: 30, judgment: 88, social: 42 },
  },

  // ── Création & Design ───────────────────────────────────────────────────
  {
    id: 'graphic-designer',
    label: 'Graphiste / Designer',
    domain: 'Création & Design',
    emoji: '🎨',
    keywords: ['graphiste', 'designer', 'design', 'directeur artistique', 'ui designer', 'ux designer', 'illustrateur'],
    factors: { routine: 34, digital: 76, creativity: 92, empathy: 30, physical: 12, judgment: 56, social: 44 },
  },
  {
    id: 'writer',
    label: 'Rédacteur·rice / Journaliste',
    domain: 'Création & Design',
    emoji: '✍️',
    keywords: ['redacteur', 'redactrice', 'journaliste', 'writer', 'copywriter', 'concepteur redacteur', 'auteur'],
    factors: { routine: 38, digital: 74, creativity: 84, empathy: 40, physical: 8, judgment: 62, social: 48 },
  },
  {
    id: 'architect',
    label: 'Architecte',
    domain: 'Création & Design',
    emoji: '📐',
    keywords: ['architecte', 'architect', 'maitre oeuvre'],
    factors: { routine: 34, digital: 62, creativity: 86, empathy: 38, physical: 32, judgment: 80, social: 56 },
  },
  {
    id: 'photographer',
    label: 'Photographe / Vidéaste',
    domain: 'Création & Design',
    emoji: '📷',
    keywords: ['photographe', 'videaste', 'cameraman', 'realisateur', 'monteur'],
    factors: { routine: 32, digital: 66, creativity: 88, empathy: 46, physical: 44, judgment: 56, social: 52 },
  },

  // ── Finance & Juridique ─────────────────────────────────────────────────
  {
    id: 'accountant',
    label: 'Comptable',
    domain: 'Finance & Juridique',
    emoji: '🧾',
    keywords: ['comptable', 'comptabilite', 'accountant', 'expert comptable', 'gestion comptable'],
    factors: { routine: 82, digital: 86, creativity: 16, empathy: 22, physical: 8, judgment: 54, social: 30 },
  },
  {
    id: 'lawyer',
    label: 'Avocat·e / Juriste',
    domain: 'Finance & Juridique',
    emoji: '⚖️',
    keywords: ['avocat', 'avocate', 'juriste', 'lawyer', 'notaire', 'droit', 'legal'],
    factors: { routine: 44, digital: 64, creativity: 50, empathy: 52, physical: 8, judgment: 90, social: 74 },
  },
  {
    id: 'financial-analyst',
    label: 'Analyste financier·ère',
    domain: 'Finance & Juridique',
    emoji: '💹',
    keywords: ['analyste financier', 'finance', 'trader', 'gestionnaire de portefeuille', 'controle de gestion', 'auditeur'],
    factors: { routine: 56, digital: 90, creativity: 36, empathy: 22, physical: 6, judgment: 72, social: 40 },
  },
  {
    id: 'bank-teller',
    label: 'Conseiller·ère bancaire',
    domain: 'Finance & Juridique',
    emoji: '🏦',
    keywords: ['conseiller bancaire', 'banque', 'guichet', 'charge de clientele', 'bank teller'],
    factors: { routine: 70, digital: 72, creativity: 18, empathy: 46, physical: 10, judgment: 44, social: 58 },
  },

  // ── Commerce & Marketing ────────────────────────────────────────────────
  {
    id: 'sales',
    label: 'Commercial·e',
    domain: 'Commerce & Marketing',
    emoji: '🤝',
    keywords: ['commercial', 'commerciale', 'vendeur', 'vendeuse', 'sales', 'business developer', 'account manager'],
    factors: { routine: 42, digital: 50, creativity: 46, empathy: 64, physical: 24, judgment: 56, social: 90 },
  },
  {
    id: 'marketing',
    label: 'Responsable marketing',
    domain: 'Commerce & Marketing',
    emoji: '📣',
    keywords: ['marketing', 'communication', 'community manager', 'growth', 'chef de produit', 'brand'],
    factors: { routine: 44, digital: 78, creativity: 72, empathy: 44, physical: 10, judgment: 62, social: 64 },
  },
  {
    id: 'cashier',
    label: 'Caissier·ère',
    domain: 'Commerce & Marketing',
    emoji: '🛒',
    keywords: ['caissier', 'caissiere', 'cashier', 'caisse', 'employe libre service', 'hote de caisse'],
    factors: { routine: 90, digital: 40, creativity: 8, empathy: 40, physical: 44, judgment: 18, social: 44 },
  },
  {
    id: 'customer-support',
    label: 'Conseiller·ère relation client',
    domain: 'Commerce & Marketing',
    emoji: '🎧',
    keywords: ['relation client', 'service client', 'teleconseiller', 'call center', 'customer support', 'sav', 'support client'],
    factors: { routine: 74, digital: 60, creativity: 16, empathy: 58, physical: 8, judgment: 34, social: 60 },
  },

  // ── Direction & Management ──────────────────────────────────────────────
  {
    id: 'manager',
    label: 'Manager / Chef·fe de projet',
    domain: 'Direction & Management',
    emoji: '🧑‍💼',
    keywords: ['manager', 'management', 'chef de projet', 'chef d equipe', 'directeur', 'directrice', 'dirigeant', 'product manager', 'project manager'],
    factors: { routine: 32, digital: 56, creativity: 58, empathy: 66, physical: 12, judgment: 86, social: 88 },
  },
  {
    id: 'hr',
    label: 'Responsable RH',
    domain: 'Direction & Management',
    emoji: '👥',
    keywords: ['rh', 'ressources humaines', 'recruteur', 'hr', 'talent', 'paie', 'gestion du personnel'],
    factors: { routine: 50, digital: 60, creativity: 36, empathy: 72, physical: 8, judgment: 66, social: 80 },
  },
  {
    id: 'entrepreneur',
    label: 'Entrepreneur·e',
    domain: 'Direction & Management',
    emoji: '🚀',
    keywords: ['entrepreneur', 'fondateur', 'ceo', 'startup', 'indépendant', 'freelance'],
    factors: { routine: 24, digital: 60, creativity: 80, empathy: 56, physical: 22, judgment: 90, social: 84 },
  },

  // ── Industrie, Logistique & Terrain ─────────────────────────────────────
  {
    id: 'driver',
    label: 'Chauffeur·se / Livreur·se',
    domain: 'Industrie & Logistique',
    emoji: '🚚',
    keywords: ['chauffeur', 'livreur', 'conducteur', 'routier', 'taxi', 'vtc', 'driver', 'coursier'],
    factors: { routine: 72, digital: 26, creativity: 10, empathy: 30, physical: 80, judgment: 36, social: 30 },
  },
  {
    id: 'factory-worker',
    label: 'Opérateur·rice de production',
    domain: 'Industrie & Logistique',
    emoji: '🏭',
    keywords: ['operateur production', 'ouvrier', 'usine', 'manutentionnaire', 'chaine de production', 'factory worker', 'agent de production'],
    factors: { routine: 88, digital: 30, creativity: 10, empathy: 14, physical: 78, judgment: 24, social: 22 },
  },
  {
    id: 'logistics',
    label: 'Agent·e logistique / Magasinier·ère',
    domain: 'Industrie & Logistique',
    emoji: '📦',
    keywords: ['logistique', 'magasinier', 'entrepot', 'preparateur de commande', 'cariste', 'supply chain'],
    factors: { routine: 82, digital: 44, creativity: 12, empathy: 18, physical: 70, judgment: 32, social: 30 },
  },

  // ── Artisanat, BTP & Service ────────────────────────────────────────────
  {
    id: 'electrician',
    label: 'Électricien·ne / Plombier·ère',
    domain: 'Artisanat & BTP',
    emoji: '🔌',
    keywords: ['electricien', 'plombier', 'artisan', 'btp', 'macon', 'chauffagiste', 'menuisier'],
    factors: { routine: 44, digital: 18, creativity: 36, empathy: 40, physical: 92, judgment: 58, social: 46 },
  },
  {
    id: 'chef',
    label: 'Cuisinier·ère / Chef·fe',
    domain: 'Artisanat & BTP',
    emoji: '👨‍🍳',
    keywords: ['cuisinier', 'chef cuisine', 'restaurateur', 'patissier', 'boulanger', 'cook', 'chef de cuisine'],
    factors: { routine: 46, digital: 14, creativity: 74, empathy: 40, physical: 84, judgment: 58, social: 50 },
  },
  {
    id: 'hairdresser',
    label: 'Coiffeur·se / Esthéticien·ne',
    domain: 'Artisanat & BTP',
    emoji: '💇',
    keywords: ['coiffeur', 'coiffeuse', 'estheticienne', 'beaute', 'barbier', 'manucure'],
    factors: { routine: 48, digital: 12, creativity: 66, empathy: 70, physical: 86, judgment: 40, social: 64 },
  },
  {
    id: 'farmer',
    label: 'Agriculteur·rice',
    domain: 'Artisanat & BTP',
    emoji: '🌾',
    keywords: ['agriculteur', 'agricultrice', 'fermier', 'paysan', 'maraicher', 'viticulteur', 'eleveur'],
    factors: { routine: 56, digital: 28, creativity: 30, empathy: 24, physical: 88, judgment: 60, social: 30 },
  },
  {
    id: 'social-worker',
    label: 'Travailleur·se social·e',
    domain: 'Santé',
    emoji: '🤲',
    keywords: ['travailleur social', 'assistant social', 'educateur', 'aide a domicile', 'auxiliaire de vie', 'social worker'],
    factors: { routine: 30, digital: 34, creativity: 42, empathy: 94, physical: 50, judgment: 70, social: 82 },
  },
]
