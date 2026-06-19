// Base de connaissances métiers de Lumi.
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

const f = (
  routine: number,
  digital: number,
  creativity: number,
  empathy: number,
  physical: number,
  judgment: number,
  social: number,
): Factors => ({ routine, digital, creativity, empathy, physical, judgment, social })

export const PROFESSIONS: Profession[] = [
  // ══ Tech & Data ════════════════════════════════════════════════════════════
  { id: 'data-entry', label: 'Opérateur·rice de saisie de données', domain: 'Tech & Data', emoji: '⌨️', keywords: ['saisie', 'data entry', 'operateur de saisie', 'encodage'], factors: f(96, 90, 8, 12, 15, 14, 12) },
  { id: 'developer', label: 'Développeur·se logiciel', domain: 'Tech & Data', emoji: '💻', keywords: ['developpeur', 'developpeuse', 'developer', 'programmeur', 'codeur', 'dev', 'ingenieur logiciel'], factors: f(45, 95, 68, 24, 8, 66, 40) },
  { id: 'frontend-dev', label: 'Développeur·se front-end', domain: 'Tech & Data', emoji: '🖥️', keywords: ['frontend', 'front end', 'react', 'developpeur web', 'integrateur', 'developpeur front'], factors: f(48, 94, 66, 22, 8, 58, 38) },
  { id: 'backend-dev', label: 'Développeur·se back-end', domain: 'Tech & Data', emoji: '🗄️', keywords: ['backend', 'back end', 'developpeur back', 'api', 'serveur'], factors: f(46, 96, 60, 18, 8, 68, 36) },
  { id: 'fullstack-dev', label: 'Développeur·se full-stack', domain: 'Tech & Data', emoji: '🧑‍💻', keywords: ['fullstack', 'full stack', 'developpeur fullstack'], factors: f(44, 95, 68, 22, 8, 68, 42) },
  { id: 'mobile-dev', label: 'Développeur·se mobile', domain: 'Tech & Data', emoji: '📱', keywords: ['developpeur mobile', 'ios', 'android', 'swift', 'kotlin', 'flutter'], factors: f(46, 94, 66, 22, 10, 64, 38) },
  { id: 'devops', label: 'Ingénieur·e DevOps', domain: 'Tech & Data', emoji: '⚙️', keywords: ['devops', 'sre', 'infrastructure', 'ci cd', 'kubernetes'], factors: f(50, 95, 50, 16, 10, 72, 44) },
  { id: 'data-scientist', label: 'Data Scientist', domain: 'Tech & Data', emoji: '📊', keywords: ['data scientist', 'data science', 'machine learning', 'ml'], factors: f(38, 96, 62, 18, 6, 74, 38) },
  { id: 'data-analyst', label: 'Analyste de données', domain: 'Tech & Data', emoji: '📈', keywords: ['analyste de donnees', 'data analyst', 'business analyst', 'bi'], factors: f(58, 92, 40, 18, 6, 58, 36) },
  { id: 'data-engineer', label: 'Data Engineer', domain: 'Tech & Data', emoji: '🔧', keywords: ['data engineer', 'ingenieur data', 'pipeline de donnees', 'etl'], factors: f(52, 96, 48, 14, 8, 68, 36) },
  { id: 'ml-engineer', label: 'Ingénieur·e Machine Learning', domain: 'Tech & Data', emoji: '🤖', keywords: ['ml engineer', 'ingenieur machine learning', 'deep learning', 'ia engineer', 'ingenieur ia'], factors: f(36, 96, 66, 16, 6, 78, 38) },
  { id: 'prompt-engineer', label: 'Prompt Engineer / Spécialiste IA', domain: 'Tech & Data', emoji: '✨', keywords: ['prompt engineer', 'specialiste ia', 'ingenieur prompt', 'llm', 'ia generative'], factors: f(34, 90, 74, 28, 6, 70, 46) },
  { id: 'cybersecurity', label: 'Expert·e en cybersécurité', domain: 'Tech & Data', emoji: '🛡️', keywords: ['cybersecurite', 'cyber', 'securite informatique', 'pentester', 'soc', 'rssi'], factors: f(36, 94, 60, 16, 8, 82, 44) },
  { id: 'qa-tester', label: 'Testeur·se QA', domain: 'Tech & Data', emoji: '🧪', keywords: ['testeur', 'qa', 'assurance qualite logiciel', 'test logiciel', 'recette'], factors: f(70, 88, 30, 16, 8, 50, 34) },
  { id: 'it-support', label: 'Technicien·ne support informatique', domain: 'Tech & Data', emoji: '🖧', keywords: ['support informatique', 'helpdesk', 'technicien informatique', 'it support'], factors: f(64, 78, 26, 48, 28, 40, 50) },
  { id: 'sysadmin', label: 'Administrateur·rice systèmes & réseaux', domain: 'Tech & Data', emoji: '🌐', keywords: ['administrateur systeme', 'admin reseau', 'sysadmin', 'administrateur reseau'], factors: f(60, 90, 34, 18, 18, 58, 38) },
  { id: 'cloud-architect', label: 'Architecte cloud', domain: 'Tech & Data', emoji: '☁️', keywords: ['architecte cloud', 'aws', 'azure', 'gcp', 'architecte technique'], factors: f(38, 94, 62, 16, 6, 82, 50) },
  { id: 'game-developer', label: 'Développeur·se de jeux vidéo', domain: 'Tech & Data', emoji: '🎮', keywords: ['developpeur jeux', 'game developer', 'gameplay', 'unity', 'unreal'], factors: f(42, 92, 78, 24, 8, 60, 42) },

  // ══ Santé ══════════════════════════════════════════════════════════════════
  { id: 'doctor', label: 'Médecin généraliste', domain: 'Santé', emoji: '👨‍⚕️', keywords: ['medecin', 'docteur', 'generaliste', 'praticien'], factors: f(30, 46, 40, 86, 60, 92, 64) },
  { id: 'surgeon', label: 'Chirurgien·ne', domain: 'Santé', emoji: '🔪', keywords: ['chirurgien', 'chirurgie', 'bloc operatoire'], factors: f(34, 44, 44, 70, 92, 94, 56) },
  { id: 'radiologist', label: 'Radiologue', domain: 'Santé', emoji: '🩻', keywords: ['radiologue', 'radiologie', 'imagerie medicale', 'irm', 'scanner'], factors: f(48, 70, 30, 50, 40, 84, 44) },
  { id: 'anesthetist', label: 'Anesthésiste', domain: 'Santé', emoji: '💉', keywords: ['anesthesiste', 'anesthesie', 'reanimation'], factors: f(40, 56, 32, 64, 68, 90, 48) },
  { id: 'dentist', label: 'Dentiste', domain: 'Santé', emoji: '🦷', keywords: ['dentiste', 'chirurgien dentiste', 'orthodontiste'], factors: f(46, 38, 40, 62, 88, 76, 52) },
  { id: 'nurse', label: 'Infirmier·ère', domain: 'Santé', emoji: '🩺', keywords: ['infirmier', 'infirmiere', 'nurse', 'ide'], factors: f(40, 28, 28, 94, 78, 70, 66) },
  { id: 'caregiver', label: 'Aide-soignant·e', domain: 'Santé', emoji: '🧑‍⚕️', keywords: ['aide soignant', 'aide soignante', 'soignant'], factors: f(48, 18, 18, 92, 82, 46, 58) },
  { id: 'midwife', label: 'Sage-femme', domain: 'Santé', emoji: '🤰', keywords: ['sage femme', 'maieuticien', 'accouchement'], factors: f(34, 26, 30, 92, 78, 80, 64) },
  { id: 'physio', label: 'Kinésithérapeute', domain: 'Santé', emoji: '💪', keywords: ['kinesitherapeute', 'kine', 'reeducation', 'osteopathe'], factors: f(38, 22, 36, 84, 86, 64, 62) },
  { id: 'psychologist', label: 'Psychologue', domain: 'Santé', emoji: '🧠', keywords: ['psychologue', 'psy', 'psychotherapeute', 'therapeute'], factors: f(18, 30, 52, 96, 14, 84, 78) },
  { id: 'psychiatrist', label: 'Psychiatre', domain: 'Santé', emoji: '🛋️', keywords: ['psychiatre', 'psychiatrie'], factors: f(22, 40, 48, 94, 24, 88, 74) },
  { id: 'pharmacist', label: 'Pharmacien·ne', domain: 'Santé', emoji: '💊', keywords: ['pharmacien', 'pharmacie'], factors: f(62, 50, 22, 60, 40, 64, 52) },
  { id: 'pharmacy-tech', label: 'Préparateur·rice en pharmacie', domain: 'Santé', emoji: '⚗️', keywords: ['preparateur pharmacie', 'preparatrice pharmacie'], factors: f(72, 48, 16, 50, 44, 38, 44) },
  { id: 'vet', label: 'Vétérinaire', domain: 'Santé', emoji: '🐾', keywords: ['veterinaire', 'veto', 'soins animaux'], factors: f(36, 36, 38, 80, 74, 82, 58) },
  { id: 'optician', label: 'Opticien·ne', domain: 'Santé', emoji: '👓', keywords: ['opticien', 'optique', 'lunetier'], factors: f(58, 46, 30, 56, 56, 48, 56) },
  { id: 'speech-therapist', label: 'Orthophoniste', domain: 'Santé', emoji: '🗣️', keywords: ['orthophoniste', 'orthophonie'], factors: f(34, 28, 44, 92, 36, 70, 70) },
  { id: 'dietitian', label: 'Diététicien·ne / Nutritionniste', domain: 'Santé', emoji: '🥗', keywords: ['dieteticien', 'nutritionniste', 'nutrition'], factors: f(46, 42, 40, 78, 24, 62, 64) },
  { id: 'paramedic', label: 'Ambulancier·ère', domain: 'Santé', emoji: '🚑', keywords: ['ambulancier', 'ambulance', 'secouriste', 'urgentiste'], factors: f(50, 24, 18, 72, 78, 58, 54) },
  { id: 'social-worker', label: 'Travailleur·se social·e', domain: 'Santé', emoji: '🤲', keywords: ['travailleur social', 'assistant social', 'educateur', 'aide a domicile', 'auxiliaire de vie'], factors: f(30, 34, 42, 94, 50, 70, 82) },

  // ══ Éducation & Recherche ══════════════════════════════════════════════════
  { id: 'teacher', label: 'Enseignant·e', domain: 'Éducation & Recherche', emoji: '👩‍🏫', keywords: ['enseignant', 'professeur', 'prof', 'teacher', 'maitre'], factors: f(40, 42, 60, 84, 24, 64, 80) },
  { id: 'primary-teacher', label: 'Professeur·e des écoles', domain: 'Éducation & Recherche', emoji: '🍎', keywords: ['professeur des ecoles', 'instituteur', 'institutrice', 'maitresse'], factors: f(42, 36, 58, 90, 30, 60, 82) },
  { id: 'professor', label: 'Professeur·e d\'université', domain: 'Éducation & Recherche', emoji: '🎓', keywords: ['professeur universite', 'enseignant chercheur', 'maitre de conference'], factors: f(34, 58, 72, 70, 18, 80, 70) },
  { id: 'trainer', label: 'Formateur·rice professionnel·le', domain: 'Éducation & Recherche', emoji: '📚', keywords: ['formateur', 'formatrice', 'formation professionnelle'], factors: f(46, 50, 56, 78, 22, 58, 78) },
  { id: 'researcher', label: 'Chercheur·se / Scientifique', domain: 'Éducation & Recherche', emoji: '🔬', keywords: ['chercheur', 'chercheuse', 'scientifique', 'researcher', 'doctorant', 'recherche'], factors: f(26, 70, 86, 24, 30, 88, 42) },
  { id: 'career-advisor', label: 'Conseiller·ère d\'orientation', domain: 'Éducation & Recherche', emoji: '🧭', keywords: ['conseiller orientation', 'orientation', 'coach scolaire'], factors: f(40, 44, 44, 80, 14, 62, 74) },
  { id: 'librarian', label: 'Documentaliste / Bibliothécaire', domain: 'Éducation & Recherche', emoji: '📖', keywords: ['documentaliste', 'bibliothecaire', 'archiviste'], factors: f(64, 62, 32, 48, 22, 46, 44) },

  // ══ Création & Design ══════════════════════════════════════════════════════
  { id: 'graphic-designer', label: 'Graphiste', domain: 'Création & Design', emoji: '🎨', keywords: ['graphiste', 'design graphique', 'directeur artistique'], factors: f(34, 76, 92, 30, 12, 56, 44) },
  { id: 'ux-designer', label: 'Designer UX', domain: 'Création & Design', emoji: '🧩', keywords: ['ux designer', 'ux', 'experience utilisateur', 'product designer'], factors: f(34, 78, 84, 50, 10, 66, 56) },
  { id: 'ui-designer', label: 'Designer UI', domain: 'Création & Design', emoji: '🖌️', keywords: ['ui designer', 'ui', 'interface designer'], factors: f(38, 82, 86, 26, 10, 54, 44) },
  { id: 'motion-designer', label: 'Motion Designer', domain: 'Création & Design', emoji: '🎞️', keywords: ['motion designer', 'animation 2d', 'motion design'], factors: f(36, 80, 88, 24, 12, 50, 40) },
  { id: 'illustrator', label: 'Illustrateur·rice', domain: 'Création & Design', emoji: '✏️', keywords: ['illustrateur', 'illustratrice', 'dessinateur', 'bd'], factors: f(30, 64, 92, 28, 24, 50, 38) },
  { id: 'product-designer', label: 'Designer produit / industriel', domain: 'Création & Design', emoji: '📐', keywords: ['designer produit', 'designer industriel', 'design produit'], factors: f(34, 68, 88, 28, 30, 66, 48) },
  { id: 'interior-designer', label: 'Architecte d\'intérieur / Décorateur·rice', domain: 'Création & Design', emoji: '🛋️', keywords: ['architecte interieur', 'decorateur', 'decoratrice', 'design interieur'], factors: f(30, 56, 88, 44, 34, 66, 56) },
  { id: 'architect', label: 'Architecte', domain: 'Création & Design', emoji: '🏛️', keywords: ['architecte', 'architect', 'maitre oeuvre'], factors: f(34, 62, 86, 38, 32, 80, 56) },
  { id: 'photographer', label: 'Photographe', domain: 'Création & Design', emoji: '📷', keywords: ['photographe', 'photographie', 'photo'], factors: f(34, 66, 88, 46, 50, 56, 52) },
  { id: 'video-editor', label: 'Monteur·se vidéo / Vidéaste', domain: 'Création & Design', emoji: '🎬', keywords: ['monteur video', 'videaste', 'montage', 'realisateur', 'cadreur'], factors: f(40, 74, 84, 36, 36, 54, 46) },
  { id: 'writer', label: 'Rédacteur·rice / Journaliste', domain: 'Création & Design', emoji: '✍️', keywords: ['redacteur', 'redactrice', 'journaliste', 'writer', 'copywriter', 'auteur'], factors: f(38, 74, 84, 40, 8, 62, 48) },
  { id: 'translator', label: 'Traducteur·rice / Interprète', domain: 'Création & Design', emoji: '🌍', keywords: ['traducteur', 'traductrice', 'interprete', 'traduction'], factors: f(56, 80, 56, 34, 8, 48, 40) },
  { id: 'screenwriter', label: 'Scénariste', domain: 'Création & Design', emoji: '📝', keywords: ['scenariste', 'scenario', 'dialoguiste'], factors: f(28, 66, 92, 40, 8, 60, 46) },
  { id: 'musician', label: 'Musicien·ne / Compositeur·rice', domain: 'Création & Design', emoji: '🎼', keywords: ['musicien', 'compositeur', 'musique', 'artiste musical'], factors: f(28, 52, 92, 48, 56, 50, 48) },

  // ══ Finance & Juridique ════════════════════════════════════════════════════
  { id: 'accountant', label: 'Comptable', domain: 'Finance & Juridique', emoji: '🧾', keywords: ['comptable', 'comptabilite', 'gestion comptable'], factors: f(82, 86, 16, 22, 8, 54, 30) },
  { id: 'chartered-accountant', label: 'Expert·e-comptable', domain: 'Finance & Juridique', emoji: '📕', keywords: ['expert comptable', 'expertise comptable'], factors: f(58, 82, 24, 34, 8, 78, 52) },
  { id: 'controller', label: 'Contrôleur·se de gestion', domain: 'Finance & Juridique', emoji: '📉', keywords: ['controle de gestion', 'controleur de gestion', 'controleur financier'], factors: f(64, 88, 30, 22, 6, 70, 44) },
  { id: 'auditor', label: 'Auditeur·rice', domain: 'Finance & Juridique', emoji: '🔎', keywords: ['auditeur', 'audit', 'commissaire aux comptes'], factors: f(60, 82, 32, 28, 10, 78, 52) },
  { id: 'tax-advisor', label: 'Fiscaliste', domain: 'Finance & Juridique', emoji: '🏛️', keywords: ['fiscaliste', 'fiscalite', 'conseil fiscal'], factors: f(50, 76, 40, 30, 6, 84, 52) },
  { id: 'financial-analyst', label: 'Analyste financier·ère', domain: 'Finance & Juridique', emoji: '💹', keywords: ['analyste financier', 'finance', 'controle de gestion'], factors: f(56, 90, 36, 22, 6, 72, 40) },
  { id: 'trader', label: 'Trader', domain: 'Finance & Juridique', emoji: '📊', keywords: ['trader', 'salle de marche', 'trading'], factors: f(54, 92, 44, 18, 6, 76, 50) },
  { id: 'wealth-manager', label: 'Gestionnaire de patrimoine', domain: 'Finance & Juridique', emoji: '💰', keywords: ['gestionnaire de patrimoine', 'conseiller patrimonial', 'patrimoine'], factors: f(44, 70, 36, 56, 8, 72, 74) },
  { id: 'actuary', label: 'Actuaire', domain: 'Finance & Juridique', emoji: '📐', keywords: ['actuaire', 'actuariat', 'risque assurance'], factors: f(50, 94, 42, 16, 6, 80, 38) },
  { id: 'lawyer', label: 'Avocat·e', domain: 'Finance & Juridique', emoji: '⚖️', keywords: ['avocat', 'avocate', 'lawyer', 'droit', 'barreau'], factors: f(44, 64, 50, 52, 8, 90, 74) },
  { id: 'jurist', label: 'Juriste d\'entreprise', domain: 'Finance & Juridique', emoji: '📜', keywords: ['juriste', 'juriste entreprise', 'legal', 'conseil juridique'], factors: f(54, 70, 44, 40, 6, 82, 60) },
  { id: 'notary', label: 'Notaire', domain: 'Finance & Juridique', emoji: '🖋️', keywords: ['notaire', 'office notarial'], factors: f(64, 62, 28, 46, 8, 80, 60) },
  { id: 'magistrate', label: 'Magistrat·e / Juge', domain: 'Finance & Juridique', emoji: '👨‍⚖️', keywords: ['magistrat', 'juge', 'procureur'], factors: f(40, 58, 44, 50, 8, 94, 64) },
  { id: 'bank-teller', label: 'Conseiller·ère bancaire', domain: 'Finance & Juridique', emoji: '🏦', keywords: ['conseiller bancaire', 'banque', 'guichet', 'charge de clientele'], factors: f(70, 72, 18, 46, 10, 44, 58) },
  { id: 'insurer', label: 'Conseiller·ère / Agent·e d\'assurance', domain: 'Finance & Juridique', emoji: '🛟', keywords: ['assureur', 'assurance', 'agent assurance', 'courtier assurance'], factors: f(64, 66, 22, 50, 10, 52, 66) },

  // ══ Commerce & Marketing ═══════════════════════════════════════════════════
  { id: 'sales', label: 'Commercial·e', domain: 'Commerce & Marketing', emoji: '🤝', keywords: ['commercial', 'commerciale', 'vendeur', 'sales', 'business developer'], factors: f(42, 50, 46, 64, 24, 56, 90) },
  { id: 'b2b-sales', label: 'Commercial·e B2B / Grands comptes', domain: 'Commerce & Marketing', emoji: '💼', keywords: ['commercial b2b', 'key account', 'grands comptes', 'account manager'], factors: f(38, 56, 48, 60, 16, 70, 92) },
  { id: 'marketing', label: 'Responsable marketing', domain: 'Commerce & Marketing', emoji: '📣', keywords: ['marketing', 'responsable marketing', 'brand'], factors: f(44, 78, 72, 44, 10, 62, 64) },
  { id: 'product-marketing', label: 'Chef·fe de produit', domain: 'Commerce & Marketing', emoji: '📦', keywords: ['chef de produit', 'product marketing', 'product manager marketing'], factors: f(42, 74, 66, 44, 10, 72, 66) },
  { id: 'growth-marketer', label: 'Growth Marketer', domain: 'Commerce & Marketing', emoji: '🚀', keywords: ['growth', 'growth marketer', 'acquisition', 'growth hacking'], factors: f(46, 86, 62, 30, 8, 64, 54) },
  { id: 'seo-specialist', label: 'Spécialiste SEO / SEA', domain: 'Commerce & Marketing', emoji: '🔍', keywords: ['seo', 'sea', 'referencement', 'traffic manager'], factors: f(56, 88, 50, 22, 8, 56, 42) },
  { id: 'social-media', label: 'Community / Social Media Manager', domain: 'Commerce & Marketing', emoji: '📲', keywords: ['community manager', 'social media', 'reseaux sociaux', 'cm'], factors: f(48, 78, 70, 46, 10, 50, 64) },
  { id: 'buyer', label: 'Acheteur·se', domain: 'Commerce & Marketing', emoji: '🛍️', keywords: ['acheteur', 'achat', 'approvisionnement', 'sourcing'], factors: f(56, 64, 32, 40, 12, 64, 72) },
  { id: 'ecommerce-manager', label: 'Responsable e-commerce', domain: 'Commerce & Marketing', emoji: '🛒', keywords: ['e-commerce', 'ecommerce', 'responsable ecommerce'], factors: f(52, 82, 50, 34, 10, 60, 56) },
  { id: 'pr', label: 'Attaché·e de presse / Relations publiques', domain: 'Commerce & Marketing', emoji: '📰', keywords: ['attache de presse', 'relations publiques', 'rp', 'relations presse'], factors: f(42, 62, 60, 56, 12, 54, 80) },
  { id: 'shop-assistant', label: 'Vendeur·se en magasin', domain: 'Commerce & Marketing', emoji: '🏬', keywords: ['vendeur magasin', 'vendeuse', 'conseiller de vente', 'employe libre service'], factors: f(64, 38, 24, 56, 44, 30, 62) },
  { id: 'cashier', label: 'Caissier·ère', domain: 'Commerce & Marketing', emoji: '💳', keywords: ['caissier', 'caissiere', 'caisse', 'hote de caisse'], factors: f(90, 40, 8, 40, 44, 18, 44) },
  { id: 'customer-support', label: 'Conseiller·ère relation client', domain: 'Commerce & Marketing', emoji: '🎧', keywords: ['relation client', 'service client', 'teleconseiller', 'call center', 'sav'], factors: f(74, 60, 16, 58, 8, 34, 60) },

  // ══ Direction & Management ═════════════════════════════════════════════════
  { id: 'manager', label: 'Manager / Chef·fe d\'équipe', domain: 'Direction & Management', emoji: '🧑‍💼', keywords: ['manager', 'management', 'chef d equipe', 'responsable equipe'], factors: f(32, 56, 58, 66, 12, 86, 88) },
  { id: 'ceo', label: 'Dirigeant·e / CEO', domain: 'Direction & Management', emoji: '👔', keywords: ['ceo', 'dirigeant', 'directeur general', 'pdg', 'patron'], factors: f(22, 56, 70, 56, 12, 94, 90) },
  { id: 'cfo', label: 'Directeur·rice administratif·ve & financier·ère', domain: 'Direction & Management', emoji: '🏦', keywords: ['daf', 'directeur financier', 'cfo'], factors: f(40, 78, 44, 36, 8, 88, 72) },
  { id: 'project-manager', label: 'Chef·fe de projet', domain: 'Direction & Management', emoji: '🗂️', keywords: ['chef de projet', 'project manager', 'pmo', 'gestion de projet'], factors: f(40, 66, 50, 54, 10, 76, 80) },
  { id: 'product-manager', label: 'Product Manager', domain: 'Direction & Management', emoji: '🧭', keywords: ['product manager', 'product owner', 'po', 'chef de produit tech'], factors: f(34, 72, 66, 50, 8, 82, 78) },
  { id: 'consultant', label: 'Consultant·e en stratégie', domain: 'Direction & Management', emoji: '📊', keywords: ['consultant', 'conseil', 'strategie', 'consulting'], factors: f(34, 72, 64, 44, 10, 86, 74) },
  { id: 'hr', label: 'Responsable RH', domain: 'Direction & Management', emoji: '👥', keywords: ['rh', 'ressources humaines', 'hr', 'gestion du personnel', 'paie'], factors: f(50, 60, 36, 72, 8, 66, 80) },
  { id: 'recruiter', label: 'Recruteur·se / Chargé·e de recrutement', domain: 'Direction & Management', emoji: '🧲', keywords: ['recruteur', 'recrutement', 'talent acquisition', 'chasseur de tete'], factors: f(54, 60, 34, 70, 8, 56, 80) },
  { id: 'exec-assistant', label: 'Assistant·e de direction', domain: 'Direction & Management', emoji: '🗒️', keywords: ['assistant de direction', 'assistante de direction', 'secretaire de direction', 'office manager'], factors: f(70, 64, 26, 52, 12, 44, 60) },
  { id: 'entrepreneur', label: 'Entrepreneur·e', domain: 'Direction & Management', emoji: '🚀', keywords: ['entrepreneur', 'fondateur', 'startup', 'independant', 'freelance'], factors: f(24, 60, 80, 56, 22, 90, 84) },

  // ══ Industrie & Logistique ═════════════════════════════════════════════════
  { id: 'driver', label: 'Chauffeur·se / Livreur·se', domain: 'Industrie & Logistique', emoji: '🚚', keywords: ['chauffeur', 'livreur', 'conducteur', 'routier', 'taxi', 'vtc', 'coursier'], factors: f(72, 26, 10, 30, 80, 36, 30) },
  { id: 'factory-worker', label: 'Opérateur·rice de production', domain: 'Industrie & Logistique', emoji: '🏭', keywords: ['operateur production', 'ouvrier', 'usine', 'chaine de production', 'agent de production'], factors: f(88, 30, 10, 14, 78, 24, 22) },
  { id: 'logistics', label: 'Agent·e logistique / Magasinier·ère', domain: 'Industrie & Logistique', emoji: '📦', keywords: ['logistique', 'magasinier', 'entrepot', 'preparateur de commande', 'cariste'], factors: f(82, 44, 12, 18, 70, 32, 30) },
  { id: 'maintenance-tech', label: 'Technicien·ne de maintenance', domain: 'Industrie & Logistique', emoji: '🔧', keywords: ['technicien maintenance', 'maintenance industrielle', 'depannage'], factors: f(54, 46, 30, 24, 78, 56, 38) },
  { id: 'production-engineer', label: 'Ingénieur·e de production', domain: 'Industrie & Logistique', emoji: '🏗️', keywords: ['ingenieur production', 'ingenieur industriel', 'methodes'], factors: f(48, 70, 48, 22, 40, 74, 56) },
  { id: 'welder', label: 'Soudeur·se', domain: 'Industrie & Logistique', emoji: '🔥', keywords: ['soudeur', 'soudure', 'chaudronnier'], factors: f(56, 24, 28, 14, 90, 40, 26) },
  { id: 'cnc-operator', label: 'Opérateur·rice CNC / Usinage', domain: 'Industrie & Logistique', emoji: '🛠️', keywords: ['operateur cnc', 'usinage', 'fraiseur', 'tourneur'], factors: f(74, 50, 18, 12, 76, 38, 24) },
  { id: 'pilot', label: 'Pilote de ligne', domain: 'Industrie & Logistique', emoji: '✈️', keywords: ['pilote', 'pilote de ligne', 'aviation', 'commandant de bord'], factors: f(52, 56, 24, 36, 70, 86, 50) },
  { id: 'air-traffic', label: 'Contrôleur·se aérien·ne', domain: 'Industrie & Logistique', emoji: '🛫', keywords: ['controleur aerien', 'aiguilleur du ciel', 'trafic aerien'], factors: f(50, 62, 22, 26, 40, 88, 52) },
  { id: 'train-driver', label: 'Conducteur·rice de train', domain: 'Industrie & Logistique', emoji: '🚆', keywords: ['conducteur de train', 'cheminot', 'conducteur ferroviaire'], factors: f(70, 40, 10, 24, 70, 50, 28) },
  { id: 'site-manager', label: 'Chef·fe de chantier', domain: 'Industrie & Logistique', emoji: '👷', keywords: ['chef de chantier', 'conducteur de travaux'], factors: f(40, 44, 38, 40, 70, 74, 70) },
  { id: 'supply-chain', label: 'Responsable supply chain', domain: 'Industrie & Logistique', emoji: '🔗', keywords: ['supply chain', 'chaine logistique', 'responsable logistique'], factors: f(52, 76, 38, 26, 24, 74, 64) },

  // ══ Artisanat & BTP ════════════════════════════════════════════════════════
  { id: 'electrician', label: 'Électricien·ne', domain: 'Artisanat & BTP', emoji: '🔌', keywords: ['electricien', 'electricite', 'electrotechnicien'], factors: f(44, 22, 34, 38, 92, 58, 44) },
  { id: 'plumber', label: 'Plombier·ère / Chauffagiste', domain: 'Artisanat & BTP', emoji: '🚿', keywords: ['plombier', 'chauffagiste', 'plomberie', 'sanitaire'], factors: f(46, 16, 34, 40, 92, 56, 46) },
  { id: 'carpenter', label: 'Menuisier·ère / Charpentier·ère', domain: 'Artisanat & BTP', emoji: '🪚', keywords: ['menuisier', 'charpentier', 'ebeniste', 'menuiserie'], factors: f(44, 18, 56, 30, 90, 54, 38) },
  { id: 'mason', label: 'Maçon·ne', domain: 'Artisanat & BTP', emoji: '🧱', keywords: ['macon', 'maconnerie', 'btp', 'gros oeuvre'], factors: f(56, 14, 24, 24, 92, 44, 40) },
  { id: 'painter', label: 'Peintre en bâtiment', domain: 'Artisanat & BTP', emoji: '🎨', keywords: ['peintre batiment', 'peinture', 'platrier'], factors: f(58, 12, 40, 26, 88, 36, 36) },
  { id: 'roofer', label: 'Couvreur·se', domain: 'Artisanat & BTP', emoji: '🏠', keywords: ['couvreur', 'couverture', 'toiture', 'zingueur'], factors: f(50, 12, 34, 22, 94, 46, 36) },
  { id: 'chef', label: 'Cuisinier·ère / Chef·fe', domain: 'Artisanat & BTP', emoji: '👨‍🍳', keywords: ['cuisinier', 'chef cuisine', 'restaurateur', 'cook', 'chef de cuisine'], factors: f(46, 14, 74, 40, 84, 58, 50) },
  { id: 'baker', label: 'Boulanger·ère', domain: 'Artisanat & BTP', emoji: '🥖', keywords: ['boulanger', 'boulangerie', 'panification'], factors: f(64, 12, 54, 34, 88, 42, 40) },
  { id: 'pastry-chef', label: 'Pâtissier·ère', domain: 'Artisanat & BTP', emoji: '🍰', keywords: ['patissier', 'patisserie', 'chocolatier'], factors: f(54, 14, 78, 32, 88, 46, 40) },
  { id: 'butcher', label: 'Boucher·ère', domain: 'Artisanat & BTP', emoji: '🥩', keywords: ['boucher', 'boucherie', 'charcutier'], factors: f(64, 10, 36, 30, 90, 40, 44) },
  { id: 'hairdresser', label: 'Coiffeur·se', domain: 'Artisanat & BTP', emoji: '💇', keywords: ['coiffeur', 'coiffeuse', 'barbier', 'coiffure'], factors: f(48, 12, 66, 70, 86, 40, 64) },
  { id: 'beautician', label: 'Esthéticien·ne', domain: 'Artisanat & BTP', emoji: '💅', keywords: ['estheticienne', 'esthetique', 'beaute', 'manucure', 'spa'], factors: f(50, 14, 58, 68, 84, 38, 64) },
  { id: 'mechanic', label: 'Mécanicien·ne automobile', domain: 'Artisanat & BTP', emoji: '🔧', keywords: ['mecanicien', 'mecanique', 'garagiste', 'reparation auto'], factors: f(54, 32, 28, 30, 86, 56, 40) },
  { id: 'landscaper', label: 'Paysagiste / Jardinier·ère', domain: 'Artisanat & BTP', emoji: '🌳', keywords: ['paysagiste', 'jardinier', 'espaces verts', 'horticulteur'], factors: f(48, 22, 52, 32, 86, 50, 40) },
  { id: 'farmer', label: 'Agriculteur·rice', domain: 'Artisanat & BTP', emoji: '🌾', keywords: ['agriculteur', 'agricultrice', 'fermier', 'paysan', 'viticulteur', 'eleveur'], factors: f(56, 28, 30, 24, 88, 60, 30) },
  { id: 'tailor', label: 'Couturier·ère / Tailleur·se', domain: 'Artisanat & BTP', emoji: '🧵', keywords: ['couturier', 'couturiere', 'tailleur', 'couture', 'styliste modeliste'], factors: f(58, 24, 64, 30, 84, 42, 36) },

  // ══ Services & Public ══════════════════════════════════════════════════════
  { id: 'police', label: 'Policier·ère / Gendarme', domain: 'Services & Public', emoji: '👮', keywords: ['policier', 'police', 'gendarme', 'gendarmerie', 'agent de police'], factors: f(46, 40, 28, 50, 72, 70, 64) },
  { id: 'firefighter', label: 'Pompier·ère', domain: 'Services & Public', emoji: '🚒', keywords: ['pompier', 'sapeur pompier', 'secours'], factors: f(40, 26, 26, 64, 90, 66, 64) },
  { id: 'soldier', label: 'Militaire', domain: 'Services & Public', emoji: '🪖', keywords: ['militaire', 'armee', 'soldat'], factors: f(54, 38, 24, 40, 84, 66, 60) },
  { id: 'civil-servant', label: 'Agent·e administratif·ve / Fonctionnaire', domain: 'Services & Public', emoji: '🏛️', keywords: ['fonctionnaire', 'agent administratif', 'administration', 'secretaire administratif'], factors: f(82, 66, 16, 40, 12, 42, 44) },
  { id: 'receptionist', label: 'Réceptionniste / Agent·e d\'accueil', domain: 'Services & Public', emoji: '🛎️', keywords: ['receptionniste', 'agent d accueil', 'accueil', 'hote'], factors: f(72, 52, 18, 56, 18, 32, 60) },
  { id: 'flight-attendant', label: 'Hôte·sse de l\'air / Steward', domain: 'Services & Public', emoji: '✈️', keywords: ['hotesse de l air', 'steward', 'personnel navigant', 'pnc'], factors: f(58, 28, 22, 66, 60, 48, 66) },
  { id: 'real-estate', label: 'Agent·e immobilier·ère', domain: 'Services & Public', emoji: '🏡', keywords: ['agent immobilier', 'immobilier', 'negociateur immobilier'], factors: f(48, 56, 36, 54, 24, 56, 84) },
  { id: 'waiter', label: 'Serveur·se', domain: 'Services & Public', emoji: '🍽️', keywords: ['serveur', 'serveuse', 'restauration', 'commis de salle'], factors: f(66, 22, 22, 56, 72, 30, 60) },
  { id: 'bartender', label: 'Barman·aid', domain: 'Services & Public', emoji: '🍸', keywords: ['barman', 'barmaid', 'bar', 'mixologue'], factors: f(56, 18, 52, 56, 70, 36, 66) },
  { id: 'tour-guide', label: 'Guide touristique', domain: 'Services & Public', emoji: '🗺️', keywords: ['guide touristique', 'guide', 'accompagnateur tourisme'], factors: f(44, 38, 50, 64, 44, 50, 76) },
  { id: 'sports-coach', label: 'Coach sportif', domain: 'Services & Public', emoji: '🏋️', keywords: ['coach sportif', 'preparateur physique', 'educateur sportif', 'prof de sport'], factors: f(40, 30, 44, 76, 80, 56, 74) },
  { id: 'childcare', label: 'Assistant·e maternel·le / Petite enfance', domain: 'Services & Public', emoji: '🧸', keywords: ['assistante maternelle', 'nounou', 'petite enfance', 'auxiliaire puericulture', 'atsem'], factors: f(40, 14, 38, 92, 64, 56, 66) },
  { id: 'cleaner', label: 'Agent·e d\'entretien / de propreté', domain: 'Services & Public', emoji: '🧹', keywords: ['agent d entretien', 'agent de proprete', 'menage', 'nettoyage', 'femme de menage'], factors: f(84, 10, 10, 24, 78, 18, 24) },
  { id: 'security-guard', label: 'Agent·e de sécurité / Gardien·ne', domain: 'Services & Public', emoji: '🛡️', keywords: ['agent de securite', 'vigile', 'gardien', 'surveillance'], factors: f(74, 30, 12, 34, 64, 40, 42) },

  // ══ Médias & Communication ═════════════════════════════════════════════════
  { id: 'comms-manager', label: 'Chargé·e de communication', domain: 'Médias & Communication', emoji: '📢', keywords: ['charge de communication', 'communication', 'responsable communication', 'comm'], factors: f(46, 70, 64, 48, 12, 56, 72) },
  { id: 'web-writer', label: 'Rédacteur·rice web / Content manager', domain: 'Médias & Communication', emoji: '🖊️', keywords: ['redacteur web', 'content manager', 'content', 'redaction web'], factors: f(50, 82, 70, 32, 8, 50, 46) },
  { id: 'presenter', label: 'Présentateur·rice / Animateur·rice', domain: 'Médias & Communication', emoji: '🎙️', keywords: ['presentateur', 'animateur', 'journaliste tv', 'podcasteur', 'youtubeur', 'createur de contenu'], factors: f(40, 56, 76, 56, 30, 52, 78) },

  // ══ Ingénierie & Sciences ══════════════════════════════════════════════════
  { id: 'civil-engineer', label: 'Ingénieur·e génie civil', domain: 'Ingénierie & Sciences', emoji: '🏗️', keywords: ['ingenieur civil', 'genie civil', 'ingenieur structure', 'btp ingenieur'], factors: f(44, 70, 56, 20, 40, 80, 54) },
  { id: 'mechanical-engineer', label: 'Ingénieur·e mécanique', domain: 'Ingénierie & Sciences', emoji: '⚙️', keywords: ['ingenieur mecanique', 'mecanique', 'conception mecanique'], factors: f(46, 76, 60, 18, 36, 76, 48) },
  { id: 'electrical-engineer', label: 'Ingénieur·e électronique / électrique', domain: 'Ingénierie & Sciences', emoji: '🔋', keywords: ['ingenieur electronique', 'ingenieur electrique', 'electronique'], factors: f(46, 78, 56, 18, 38, 76, 46) },
  { id: 'chemist', label: 'Chimiste', domain: 'Ingénierie & Sciences', emoji: '🧪', keywords: ['chimiste', 'chimie', 'ingenieur chimiste'], factors: f(50, 72, 58, 16, 44, 76, 40) },
  { id: 'biologist', label: 'Biologiste', domain: 'Ingénierie & Sciences', emoji: '🧬', keywords: ['biologiste', 'biologie', 'microbiologiste'], factors: f(44, 70, 64, 20, 40, 80, 42) },
  { id: 'env-engineer', label: 'Ingénieur·e environnement', domain: 'Ingénierie & Sciences', emoji: '🌱', keywords: ['ingenieur environnement', 'environnement', 'developpement durable'], factors: f(42, 68, 58, 30, 40, 80, 56) },
  { id: 'statistician', label: 'Statisticien·ne', domain: 'Ingénierie & Sciences', emoji: '📐', keywords: ['statisticien', 'statistiques', 'biostatisticien'], factors: f(56, 92, 40, 14, 6, 72, 36) },
  { id: 'economist', label: 'Économiste', domain: 'Ingénierie & Sciences', emoji: '📈', keywords: ['economiste', 'economie', 'analyste economique'], factors: f(40, 82, 58, 22, 6, 82, 52) },
  { id: 'surveyor', label: 'Géomètre-topographe', domain: 'Ingénierie & Sciences', emoji: '📏', keywords: ['geometre', 'topographe', 'topographie'], factors: f(58, 64, 30, 20, 60, 58, 40) },
  { id: 'urban-planner', label: 'Urbaniste', domain: 'Ingénierie & Sciences', emoji: '🏙️', keywords: ['urbaniste', 'urbanisme', 'amenagement du territoire'], factors: f(38, 62, 66, 40, 24, 80, 64) },
  { id: 'lab-technician', label: 'Technicien·ne de laboratoire', domain: 'Ingénierie & Sciences', emoji: '🔬', keywords: ['technicien laboratoire', 'laborantin', 'technicien labo'], factors: f(74, 58, 22, 16, 56, 40, 30) },
  { id: 'meteorologist', label: 'Météorologue', domain: 'Ingénierie & Sciences', emoji: '🌦️', keywords: ['meteorologue', 'meteorologie', 'previsionniste'], factors: f(52, 84, 34, 18, 20, 70, 40) },
  { id: 'dpo', label: 'Délégué·e à la protection des données (DPO)', domain: 'Ingénierie & Sciences', emoji: '🔐', keywords: ['dpo', 'protection des donnees', 'rgpd', 'data privacy'], factors: f(52, 78, 38, 30, 8, 82, 56) },

  // ══ Arts & Spectacle ═══════════════════════════════════════════════════════
  { id: 'actor', label: 'Comédien·ne / Acteur·rice', domain: 'Arts & Spectacle', emoji: '🎭', keywords: ['comedien', 'acteur', 'actrice', 'theatre'], factors: f(26, 30, 90, 58, 72, 46, 66) },
  { id: 'dancer', label: 'Danseur·se', domain: 'Arts & Spectacle', emoji: '💃', keywords: ['danseur', 'danseuse', 'danse', 'choregraphe'], factors: f(30, 18, 86, 46, 92, 40, 56) },
  { id: 'sound-engineer', label: 'Ingénieur·e du son', domain: 'Arts & Spectacle', emoji: '🎚️', keywords: ['ingenieur du son', 'sound designer', 'mixage', 'technicien son'], factors: f(44, 66, 72, 24, 46, 54, 40) },
  { id: 'film-director', label: 'Réalisateur·rice / Producteur·rice', domain: 'Arts & Spectacle', emoji: '🎥', keywords: ['realisateur', 'realisatrice', 'producteur', 'cineaste'], factors: f(24, 58, 92, 46, 40, 74, 74) },
  { id: 'event-manager', label: 'Chef·fe de projet événementiel', domain: 'Arts & Spectacle', emoji: '🎪', keywords: ['evenementiel', 'event manager', 'wedding planner', 'organisateur evenement'], factors: f(40, 52, 58, 52, 38, 64, 82) },
  { id: 'makeup-artist', label: 'Maquilleur·se professionnel·le', domain: 'Arts & Spectacle', emoji: '💄', keywords: ['maquilleur', 'maquilleuse', 'maquillage', 'make up artist'], factors: f(44, 18, 72, 58, 80, 38, 58) },

  // ══ Services & Public (suite) ══════════════════════════════════════════════
  { id: 'bus-driver', label: 'Conducteur·rice de bus', domain: 'Services & Public', emoji: '🚌', keywords: ['conducteur de bus', 'chauffeur de bus', 'transport en commun'], factors: f(76, 28, 8, 34, 76, 38, 34) },
  { id: 'postal-worker', label: 'Facteur·rice', domain: 'Services & Public', emoji: '📮', keywords: ['facteur', 'factrice', 'la poste', 'distribution courrier'], factors: f(80, 30, 8, 34, 72, 26, 34) },
  { id: 'waste-collector', label: 'Éboueur·se / Agent·e de collecte', domain: 'Services & Public', emoji: '🗑️', keywords: ['eboueur', 'collecte dechets', 'ripeur', 'proprete urbaine'], factors: f(86, 14, 6, 16, 82, 18, 24) },
  { id: 'travel-agent', label: 'Agent·e de voyage', domain: 'Services & Public', emoji: '🧳', keywords: ['agent de voyage', 'agence de voyage', 'conseiller voyage'], factors: f(66, 64, 26, 48, 12, 40, 62) },
  { id: 'florist', label: 'Fleuriste', domain: 'Services & Public', emoji: '💐', keywords: ['fleuriste', 'fleurs', 'art floral'], factors: f(52, 22, 66, 46, 76, 40, 54) },
  { id: 'watchmaker', label: 'Horloger·ère', domain: 'Services & Public', emoji: '⌚', keywords: ['horloger', 'horlogerie', 'reparation montre'], factors: f(60, 24, 52, 18, 88, 48, 28) },
  { id: 'locksmith', label: 'Serrurier·ère', domain: 'Services & Public', emoji: '🔑', keywords: ['serrurier', 'serrurerie', 'depannage serrure'], factors: f(52, 22, 34, 34, 86, 50, 42) },
  { id: 'mover', label: 'Déménageur·se', domain: 'Services & Public', emoji: '📦', keywords: ['demenageur', 'demenagement', 'manutention demenagement'], factors: f(80, 10, 8, 24, 90, 24, 34) },
  { id: 'fishmonger', label: 'Poissonnier·ère', domain: 'Services & Public', emoji: '🐟', keywords: ['poissonnier', 'poissonnerie', 'maree'], factors: f(66, 10, 30, 34, 86, 38, 46) },
  { id: 'scrum-master', label: 'Scrum Master / Agile Coach', domain: 'Direction & Management', emoji: '🔄', keywords: ['scrum master', 'agile coach', 'agilite', 'coach agile'], factors: f(36, 58, 46, 56, 8, 70, 84) },

  // ══ Santé & Social (compléments) ═══════════════════════════════════════════
  { id: 'orderly', label: 'Brancardier·ère / Agent·e hospitalier·ère', domain: 'Santé', emoji: '🏥', keywords: ['brancardier', 'agent hospitalier', 'ash', 'agent de service hospitalier'], factors: f(72, 16, 8, 70, 86, 28, 46) },
  { id: 'radiographer', label: 'Manipulateur·rice en radiologie', domain: 'Santé', emoji: '🩻', keywords: ['manipulateur radio', 'manipulatrice radio', 'manipulateur radiologie', 'mer'], factors: f(64, 64, 18, 54, 52, 46, 42) },
  { id: 'audiologist', label: 'Audioprothésiste', domain: 'Santé', emoji: '🦻', keywords: ['audioprothesiste', 'audioprothese', 'appareillage auditif'], factors: f(50, 46, 30, 64, 52, 56, 58) },
  { id: 'dental-tech', label: 'Prothésiste dentaire', domain: 'Santé', emoji: '🦷', keywords: ['prothesiste dentaire', 'prothese dentaire', 'laboratoire dentaire'], factors: f(64, 40, 46, 18, 82, 46, 26) },
  { id: 'orthoptist', label: 'Orthoptiste', domain: 'Santé', emoji: '👁️', keywords: ['orthoptiste', 'orthoptie', 'reeducation visuelle'], factors: f(54, 40, 28, 66, 40, 56, 56) },
  { id: 'podiatrist', label: 'Pédicure-podologue', domain: 'Santé', emoji: '🦶', keywords: ['podologue', 'pedicure', 'pedicure podologue'], factors: f(46, 28, 34, 70, 72, 58, 52) },
  { id: 'occupational-therapist', label: 'Ergothérapeute', domain: 'Santé', emoji: '🧩', keywords: ['ergotherapeute', 'ergotherapie'], factors: f(34, 30, 48, 86, 56, 66, 64) },
  { id: 'psychomotor', label: 'Psychomotricien·ne', domain: 'Santé', emoji: '🤸', keywords: ['psychomotricien', 'psychomotricienne', 'psychomotricite'], factors: f(32, 26, 52, 88, 60, 64, 64) },
  { id: 'amp', label: 'Accompagnant·e éducatif·ve et social·e (AES/AMP)', domain: 'Santé', emoji: '🤝', keywords: ['aes', 'amp', 'aide medico psychologique', 'accompagnant educatif et social'], factors: f(44, 14, 22, 92, 70, 48, 60) },
  { id: 'puericultrice', label: 'Auxiliaire de puériculture', domain: 'Santé', emoji: '🍼', keywords: ['auxiliaire de puericulture', 'puericultrice', 'creche'], factors: f(46, 16, 24, 92, 68, 48, 58) },
  { id: 'special-educator', label: 'Éducateur·rice spécialisé·e', domain: 'Santé', emoji: '🧑‍🏫', keywords: ['educateur specialise', 'educatrice specialisee', 'moniteur educateur', 'es'], factors: f(30, 28, 46, 92, 40, 66, 80) },
  { id: 'youth-worker', label: 'Animateur·rice socioculturel·le', domain: 'Santé', emoji: '🎈', keywords: ['animateur', 'animatrice', 'animation', 'centre de loisirs', 'periscolaire', 'bafa'], factors: f(40, 30, 58, 80, 46, 48, 80) },
  { id: 'school-assistant', label: 'Accompagnant·e d\'élève (AESH / AVS)', domain: 'Éducation & Recherche', emoji: '🧑‍🦽', keywords: ['aesh', 'avs', 'accompagnant eleve', 'auxiliaire de vie scolaire'], factors: f(46, 20, 30, 90, 52, 46, 64) },
  { id: 'employment-advisor', label: 'Conseiller·ère en insertion / emploi', domain: 'Services & Public', emoji: '🧭', keywords: ['conseiller en insertion', 'conseiller emploi', 'france travail', 'pole emploi', 'conseiller mission locale'], factors: f(52, 52, 32, 74, 12, 54, 72) },

  // ══ Éducation & Services publics (compléments) ═════════════════════════════
  { id: 'driving-instructor', label: 'Moniteur·rice d\'auto-école', domain: 'Services & Public', emoji: '🚗', keywords: ['moniteur auto ecole', 'enseignant de la conduite', 'auto ecole'], factors: f(58, 24, 22, 66, 60, 52, 66) },
  { id: 'lifeguard', label: 'Maître-nageur·se sauveteur·se', domain: 'Services & Public', emoji: '🏊', keywords: ['maitre nageur', 'sauveteur', 'surveillant de baignade', 'mns'], factors: f(50, 16, 22, 62, 84, 52, 56) },
  { id: 'life-coach', label: 'Coach professionnel·le / de vie', domain: 'Services & Public', emoji: '🌟', keywords: ['coach', 'coaching', 'coach de vie', 'coach professionnel'], factors: f(28, 40, 56, 82, 16, 66, 80) },
  { id: 'prison-officer', label: 'Surveillant·e pénitentiaire', domain: 'Services & Public', emoji: '🔒', keywords: ['surveillant penitentiaire', 'gardien de prison', 'administration penitentiaire'], factors: f(62, 32, 14, 42, 66, 52, 56) },
  { id: 'customs-officer', label: 'Douanier·ère', domain: 'Services & Public', emoji: '🛂', keywords: ['douanier', 'douane', 'agent des douanes'], factors: f(58, 52, 16, 40, 52, 62, 54) },
  { id: 'undertaker', label: 'Conseiller·ère funéraire / Pompes funèbres', domain: 'Services & Public', emoji: '⚱️', keywords: ['conseiller funeraire', 'pompes funebres', 'agent funeraire', 'croque mort'], factors: f(48, 34, 30, 78, 52, 56, 68) },

  // ══ Finance, gestion & administration (compléments) ════════════════════════
  { id: 'payroll', label: 'Gestionnaire de paie', domain: 'Finance & Juridique', emoji: '💶', keywords: ['gestionnaire de paie', 'paie', 'paye', 'gestionnaire paie'], factors: f(78, 84, 14, 30, 6, 56, 40) },
  { id: 'assistant-accountant', label: 'Assistant·e comptable', domain: 'Finance & Juridique', emoji: '🧮', keywords: ['assistant comptable', 'aide comptable', 'comptable fournisseur', 'comptable client'], factors: f(80, 84, 16, 24, 8, 46, 34) },
  { id: 'secretary', label: 'Secrétaire / Assistant·e administratif·ve', domain: 'Direction & Management', emoji: '🗃️', keywords: ['secretaire', 'assistant administratif', 'assistante administrative', 'employe de bureau', 'agent administratif'], factors: f(78, 66, 18, 46, 12, 36, 52) },
  { id: 'medical-secretary', label: 'Secrétaire médical·e', domain: 'Santé', emoji: '🩺', keywords: ['secretaire medicale', 'secretaire medical', 'accueil medical'], factors: f(74, 60, 16, 58, 14, 38, 58) },
  { id: 'credit-analyst', label: 'Analyste crédit / risques', domain: 'Finance & Juridique', emoji: '📊', keywords: ['analyste credit', 'analyste risque', 'chargé de risques', 'scoring'], factors: f(60, 86, 30, 24, 6, 76, 42) },
  { id: 'compliance', label: 'Responsable conformité (Compliance)', domain: 'Finance & Juridique', emoji: '🧷', keywords: ['conformite', 'compliance', 'lcb ft', 'controle interne'], factors: f(54, 72, 32, 30, 8, 84, 56) },
  { id: 'order-management', label: 'Gestionnaire ADV / recouvrement', domain: 'Finance & Juridique', emoji: '📑', keywords: ['adv', 'administration des ventes', 'recouvrement', 'gestionnaire adv'], factors: f(78, 78, 16, 34, 6, 46, 48) },

  // ══ Commerce & Distribution (compléments) ══════════════════════════════════
  { id: 'store-manager', label: 'Responsable de magasin / Gérant·e', domain: 'Commerce & Marketing', emoji: '🏪', keywords: ['responsable de magasin', 'gerant magasin', 'directeur de magasin', 'responsable boutique'], factors: f(50, 52, 40, 56, 28, 68, 80) },
  { id: 'department-head', label: 'Chef·fe de rayon', domain: 'Commerce & Marketing', emoji: '🛒', keywords: ['chef de rayon', 'manager de rayon', 'responsable de rayon'], factors: f(60, 46, 28, 46, 46, 52, 64) },
  { id: 'merchandiser', label: 'Merchandiser', domain: 'Commerce & Marketing', emoji: '🧷', keywords: ['merchandiser', 'merchandising', 'mise en rayon visuelle'], factors: f(56, 60, 56, 34, 30, 50, 52) },
  { id: 'bookseller', label: 'Libraire', domain: 'Commerce & Marketing', emoji: '📚', keywords: ['libraire', 'librairie', 'vendeur livres'], factors: f(54, 40, 52, 56, 40, 48, 62) },
  { id: 'tobacconist', label: 'Buraliste', domain: 'Commerce & Marketing', emoji: '🚬', keywords: ['buraliste', 'bureau de tabac', 'tabac presse'], factors: f(72, 34, 18, 48, 40, 34, 52) },
  { id: 'wine-merchant', label: 'Caviste', domain: 'Commerce & Marketing', emoji: '🍷', keywords: ['caviste', 'cave a vin', 'vendeur de vin'], factors: f(50, 30, 52, 56, 52, 52, 66) },
  { id: 'greengrocer', label: 'Primeur / Épicier·ère', domain: 'Commerce & Marketing', emoji: '🥦', keywords: ['primeur', 'epicier', 'epicerie', 'marchand de fruits'], factors: f(66, 18, 28, 46, 66, 38, 56) },
  { id: 'telemarketer', label: 'Téléprospecteur·rice / Télévendeur·se', domain: 'Commerce & Marketing', emoji: '📞', keywords: ['teleprospecteur', 'televendeur', 'prospection telephonique', 'phoning'], factors: f(82, 52, 12, 46, 6, 28, 62) },

  // ══ Hôtellerie & Restauration (compléments) ════════════════════════════════
  { id: 'commis-chef', label: 'Commis de cuisine', domain: 'Artisanat & BTP', emoji: '🔪', keywords: ['commis de cuisine', 'commis', 'aide cuisinier'], factors: f(70, 10, 40, 28, 84, 34, 38) },
  { id: 'kitchen-porter', label: 'Plongeur·se en restauration', domain: 'Services & Public', emoji: '🍽️', keywords: ['plongeur', 'plonge', 'plongeur restauration'], factors: f(90, 6, 6, 16, 82, 16, 24) },
  { id: 'sommelier', label: 'Sommelier·ère', domain: 'Services & Public', emoji: '🍷', keywords: ['sommelier', 'sommeliere', 'sommellerie'], factors: f(38, 24, 64, 60, 56, 60, 72) },
  { id: 'barista', label: 'Barista', domain: 'Services & Public', emoji: '☕', keywords: ['barista', 'cafe', 'coffee shop'], factors: f(58, 16, 46, 56, 68, 36, 62) },
  { id: 'caterer', label: 'Traiteur·se', domain: 'Artisanat & BTP', emoji: '🍱', keywords: ['traiteur', 'traiteuse', 'restauration evenementielle'], factors: f(52, 18, 66, 42, 80, 52, 56) },
  { id: 'housekeeper', label: 'Femme/Valet de chambre · Gouvernant·e', domain: 'Services & Public', emoji: '🧺', keywords: ['femme de chambre', 'valet de chambre', 'gouvernante', 'housekeeping', 'etage hotel'], factors: f(86, 10, 10, 34, 80, 24, 34) },
  { id: 'concierge', label: 'Concierge / Gardien·ne d\'immeuble', domain: 'Services & Public', emoji: '🛎️', keywords: ['concierge', 'gardien d immeuble', 'gardienne', 'loge'], factors: f(64, 28, 18, 56, 52, 40, 62) },

  // ══ Transport & Logistique (compléments) ═══════════════════════════════════
  { id: 'truck-driver', label: 'Chauffeur·se poids lourd / Routier·ère', domain: 'Industrie & Logistique', emoji: '🚛', keywords: ['chauffeur poids lourd', 'routier', 'conducteur poids lourd', 'chauffeur pl', 'spl'], factors: f(74, 30, 8, 26, 80, 42, 30) },
  { id: 'taxi-vtc', label: 'Chauffeur·se VTC / Taxi', domain: 'Industrie & Logistique', emoji: '🚕', keywords: ['vtc', 'taxi', 'chauffeur prive', 'uber'], factors: f(70, 34, 10, 44, 70, 38, 48) },
  { id: 'delivery-rider', label: 'Coursier·ère / Livreur·se à vélo', domain: 'Industrie & Logistique', emoji: '🛵', keywords: ['coursier', 'livreur a velo', 'livreur repas', 'deliveroo', 'uber eats'], factors: f(80, 30, 8, 30, 84, 26, 30) },
  { id: 'warehouse-manager', label: 'Responsable d\'entrepôt', domain: 'Industrie & Logistique', emoji: '🏬', keywords: ['responsable entrepot', 'responsable d entrepot', 'chef d equipe logistique'], factors: f(54, 66, 34, 30, 30, 68, 66) },
  { id: 'crane-operator', label: 'Conducteur·rice d\'engins / Grutier·ère', domain: 'Industrie & Logistique', emoji: '🏗️', keywords: ['conducteur d engins', 'grutier', 'engins de chantier', 'pelleteuse'], factors: f(64, 34, 14, 18, 84, 48, 28) },
  { id: 'ship-captain', label: 'Officier·ère de marine marchande', domain: 'Industrie & Logistique', emoji: '⚓', keywords: ['marin', 'officier de marine', 'marine marchande', 'capitaine de navire'], factors: f(50, 48, 24, 34, 78, 78, 52) },
  { id: 'fisherman', label: 'Marin-pêcheur·se', domain: 'Industrie & Logistique', emoji: '🎣', keywords: ['marin pecheur', 'peche', 'pecheur', 'chalutier'], factors: f(58, 16, 18, 22, 90, 48, 34) },
  { id: 'ticket-inspector', label: 'Contrôleur·se des transports', domain: 'Services & Public', emoji: '🎫', keywords: ['controleur de train', 'controleur transports', 'controleur sncf', 'agent de controle'], factors: f(68, 40, 12, 44, 52, 46, 56) },

  // ══ Artisanat, BTP & Industrie (compléments) ═══════════════════════════════
  { id: 'tiler', label: 'Carreleur·se', domain: 'Artisanat & BTP', emoji: '🧱', keywords: ['carreleur', 'carrelage', 'pose de carrelage'], factors: f(58, 12, 32, 22, 92, 42, 34) },
  { id: 'plasterer', label: 'Plaquiste / Plâtrier·ère', domain: 'Artisanat & BTP', emoji: '🧱', keywords: ['plaquiste', 'platrier', 'placo', 'cloison seche'], factors: f(60, 12, 28, 20, 92, 40, 32) },
  { id: 'hvac', label: 'Frigoriste / Climaticien·ne', domain: 'Artisanat & BTP', emoji: '❄️', keywords: ['frigoriste', 'climaticien', 'climatisation', 'froid', 'pompe a chaleur'], factors: f(50, 34, 30, 24, 86, 58, 40) },
  { id: 'glazier', label: 'Vitrier·ère / Miroitier·ère', domain: 'Artisanat & BTP', emoji: '🪟', keywords: ['vitrier', 'miroitier', 'pose de vitrage'], factors: f(56, 16, 34, 24, 88, 46, 36) },
  { id: 'fiber-tech', label: 'Technicien·ne télécom / fibre', domain: 'Tech & Data', emoji: '📡', keywords: ['technicien fibre', 'technicien telecom', 'fibre optique', 'raccordement', 'antenniste'], factors: f(62, 56, 22, 26, 72, 48, 40) },
  { id: 'solar-installer', label: 'Installateur·rice panneaux solaires', domain: 'Artisanat & BTP', emoji: '☀️', keywords: ['installateur solaire', 'panneaux solaires', 'photovoltaique'], factors: f(54, 30, 30, 24, 84, 52, 38) },
  { id: 'car-body', label: 'Carrossier·ère / Peintre automobile', domain: 'Artisanat & BTP', emoji: '🚗', keywords: ['carrossier', 'carrosserie', 'peintre automobile', 'tolier'], factors: f(58, 22, 44, 20, 86, 46, 32) },
  { id: 'vehicle-inspector', label: 'Contrôleur·se technique automobile', domain: 'Artisanat & BTP', emoji: '🚙', keywords: ['controle technique', 'controleur technique', 'controleur technique automobile'], factors: f(74, 52, 14, 30, 56, 52, 38) },
  { id: 'upholsterer', label: 'Tapissier·ère / Sellier·ère', domain: 'Artisanat & BTP', emoji: '🛋️', keywords: ['tapissier', 'sellier', 'tapisserie d ameublement'], factors: f(54, 16, 62, 26, 84, 44, 36) },
  { id: 'jeweler', label: 'Bijoutier·ère / Joaillier·ère', domain: 'Artisanat & BTP', emoji: '💍', keywords: ['bijoutier', 'joaillier', 'joaillerie', 'bijouterie'], factors: f(50, 24, 72, 30, 84, 52, 40) },
  { id: 'cobbler', label: 'Cordonnier·ère', domain: 'Artisanat & BTP', emoji: '👞', keywords: ['cordonnier', 'cordonnerie', 'reparation chaussures'], factors: f(64, 12, 42, 28, 86, 40, 34) },
  { id: 'logger', label: 'Bûcheron·ne / Sylviculteur·rice', domain: 'Artisanat & BTP', emoji: '🪵', keywords: ['bucheron', 'sylviculteur', 'elagueur', 'exploitation forestiere'], factors: f(54, 14, 16, 18, 92, 44, 28) },

  // ══ Agriculture & Nature (compléments) ═════════════════════════════════════
  { id: 'farm-worker', label: 'Ouvrier·ère agricole / Saisonnier·ère', domain: 'Artisanat & BTP', emoji: '🌱', keywords: ['ouvrier agricole', 'saisonnier agricole', 'maraicher', 'cueilleur'], factors: f(78, 12, 14, 20, 90, 28, 28) },
  { id: 'beekeeper', label: 'Apiculteur·rice', domain: 'Artisanat & BTP', emoji: '🐝', keywords: ['apiculteur', 'apiculture', 'miel'], factors: f(54, 16, 30, 30, 86, 52, 30) },
  { id: 'oenologist', label: 'Œnologue', domain: 'Ingénierie & Sciences', emoji: '🍷', keywords: ['oenologue', 'oenologie', 'maitre de chai'], factors: f(40, 46, 58, 30, 46, 76, 52) },

  // ══ Arts, Spectacle & Sport (compléments) ══════════════════════════════════
  { id: 'dj', label: 'DJ / Disc-jockey', domain: 'Arts & Spectacle', emoji: '🎧', keywords: ['dj', 'disc jockey', 'platines', 'mix'], factors: f(40, 52, 80, 44, 46, 46, 60) },
  { id: 'stagehand', label: 'Régisseur·se / Technicien·ne du spectacle', domain: 'Arts & Spectacle', emoji: '🎭', keywords: ['regisseur', 'machiniste', 'technicien spectacle', 'technicien plateau', 'intermittent'], factors: f(52, 40, 52, 30, 72, 52, 52) },
  { id: 'cultural-mediator', label: 'Médiateur·rice culturel·le', domain: 'Arts & Spectacle', emoji: '🏛️', keywords: ['mediateur culturel', 'mediation culturelle', 'guide conferencier'], factors: f(40, 44, 54, 72, 30, 52, 76) },
  { id: 'pro-athlete', label: 'Sportif·ve professionnel·le', domain: 'Arts & Spectacle', emoji: '⚽', keywords: ['sportif professionnel', 'athlete', 'joueur professionnel', 'sport de haut niveau'], factors: f(40, 18, 52, 40, 94, 52, 56) },
  { id: 'ski-instructor', label: 'Moniteur·rice de ski / Guide de montagne', domain: 'Services & Public', emoji: '🎿', keywords: ['moniteur de ski', 'guide de montagne', 'guide haute montagne', 'esf'], factors: f(40, 18, 34, 66, 90, 58, 66) },

  // ══ Animaux & divers (compléments) ═════════════════════════════════════════
  { id: 'animal-keeper', label: 'Soigneur·se animalier·ère / Éleveur·se', domain: 'Services & Public', emoji: '🐾', keywords: ['soigneur animalier', 'eleveur', 'animalier', 'palefrenier', 'zoo'], factors: f(56, 16, 30, 58, 82, 46, 34) },
  { id: 'dog-groomer', label: 'Toiletteur·se canin·e', domain: 'Services & Public', emoji: '🐩', keywords: ['toiletteur', 'toilettage canin', 'toiletteur canin'], factors: f(54, 14, 46, 56, 82, 38, 48) },
]
