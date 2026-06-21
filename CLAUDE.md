# Lumi — Synthèse du projet (mémoire de travail)

> Ce fichier résume l'état du projet et les décisions prises, pour ne pas avoir à
> rejouer tout l'historique de conversation. **À lire en priorité** au début d'une
> session, et **à tenir à jour** quand une décision importante change.

## Le produit
**Lumi** est une app web (FR) qui estime l'exposition d'un métier à l'automatisation
par l'IA, et qui propose un **copilote IA** pour aider l'utilisateur. Prototype à
visée pédagogique.

- **Stack** : Vite + React + TypeScript + Tailwind. Avatar 3D via three.js /
  @react-three/fiber / drei / postprocessing. IA via `@anthropic-ai/sdk`.
- **Modèle Claude utilisé** : `claude-opus-4-8`. Clé API saisie par l'utilisateur,
  stockée en `localStorage` (`yourcareer.anthropic_key`), appel direct navigateur
  (`dangerouslyAllowBrowser`) — OK pour le proto, à proxifier en prod.

## Marque : Lumi (gratuit) vs Luminator (payant)
- **Lumi** = mascotte + nom de l'app (offre gratuite).
- **Luminator** = offre payante = **même personnage + lunettes rondes**.
- Possession gérée dans `src/lib/entitlement.ts` (flag `localStorage` `lumi.luminator`).
  Hooks : `useLuminator()`, `useBrand()` (`{ owns, name }`), `brandName()`.
- Quand l'offre est acquise, le personnage à lunettes **et le nom « Luminator »**
  prennent la place de Lumi un peu partout (logo, avatars, verdicts).

## Personnage 3D — `src/components/avatar/RobotAvatar.tsx` (+ `Avatar.tsx`)
- Yeux qui suivent le curseur, clignements, couleur d'humeur (mood).
- Props clés (sur `Avatar` et `RobotAvatar`) :
  - `glasses` : ajoute les lunettes rondes (Luminator). Si non précisé sur `Avatar`,
    suit la possession (`useLuminator`).
  - `speaking` : anime la bouche (utilisé par le chat).
  - `mood`, `state` ('idle'|'thinking'), `active` (pause du rendu hors écran),
    `forceFallback` (emoji au lieu de la 3D).
- **Réaction « tapote sur la tête »** (clic sur la tête) — cinématiques DISTINCTES :
  - **Lumi** (sans lunettes) → **bulles de lumière multicolores** (`SPARKLE_COLORS`).
  - **Luminator** (lunettes) → **rayons de lumière dorée** (`RAY_*`), plus intenses.
- **Son** : `src/lib/sfx.ts` joue un petit « couic » au tapote. `installAudioUnlock()`
  est appelé dans `App.tsx` (réveille l'audio au 1er geste, sinon 1er son avalé).

## Accueil — `src/components/LandingPage.tsx`
- **Visiteur gratuit** (`!owns`) : hero « Votre métier survivra-t-il à l'IA ? » +
  scène Lumi/Luminator : Lumi centré devant, **Luminator en arrière-plan (haut-droite,
  petit, semi-transparent)**. Au clic sur Luminator → il vient **à gauche (devant)**,
  Lumi part à droite, bulle « Moi c'est Luminator » alignée à gauche + boutons
  « Débloquer Luminator » / « Plus tard ».
  - ⚠️ Implémenté en **2 états déterministes** (transform/opacity directs par
    personnage). NE PAS revenir au « plateau tournant » (rotation parent +
    contre-rotation) : il se désynchronisait au scroll → positions incohérentes.
- **Abonné Luminator** (`owns`) : accueil **orienté action / automatisation** (pas
  « ton métier est-il exposé »). Accès direct au chat + raccourcis. (cf. MemberHome)

## Chat Luminator — `src/components/LuminatorChat.tsx` + `streamLuminatorChat` (llm.ts)
- Persona : **copilote carrière ET automatisation**. Priorité n°1 = aider à
  **automatiser les tâches du métier** de l'utilisateur (outils IA, no-code, modèles
  prêts à l'emploi), ciblé sur sa profession + ses compétences. Garde aussi le
  coaching (reconversion, compétences, etc.).
- **Streaming** (la bouche bouge pendant qu'il parle).
- **Mémoire** : conversation persistée en `localStorage` (`lumi.luminator.chat`).
- **Outil `update_career_profile`** : Luminator note les infos de parcours sur le
  profil (`applyProfilePatch` dans `profile.ts`) → évite de re-demander / refaire
  travailler l'API. Le `ProfileScreen` affiche un badge « 🤓 Luminator » sur les
  champs qu'il a remplis (`luminatorFields()`).
- Accès au chat : bouton flottant (FAB) quand `owns`, + bouton sur l'écran Tarifs.

## Tarifs — `src/components/PricingScreen.tsx`
- Carte **Lumi** (gratuit) / carte **Luminator** (payant) — chacune avec le perso.
- « Devenir Luminator » = **achat simulé** (`setLuminator(true)`, gratuit dans le proto).
- Argumentaire centré sur la **valeur d'automatisation** (gain de temps).

## Profil — `src/components/ProfileScreen.tsx` / `src/lib/profile.ts`
- Profil carrière en `localStorage` (`yourcareer.profile`). Jauge de complétude.
- Import de CV (lu par Claude). Bouton **« Supprimer toutes mes données »**
  (`src/lib/privacy.ts` → `clearAllLocalData`).

## Moteur — `src/lib/engine.ts` / `src/lib/professions.ts`
- Score heuristique sur 7 facteurs ; ~242 métiers. Le compteur de l'accueil affiche
  `PROFESSIONS.length`.

## Conformité / légal
- Pages : `src/components/LegalScreen.tsx` (routes `#/legal/mentions|confidentialite|cgu`),
  liens dans le footer. Mentions légales à compléter (éditeur, SIRET…).
- **Polices auto-hébergées** via `@fontsource/inter` + `@fontsource-variable/plus-jakarta-sans`
  (plus de requête Google Fonts). Famille display = `Plus Jakarta Sans Variable`.
- `LICENSE` propriétaire ("UNLICENSED" dans package.json).
- Messages « données » honnêtes : démo = tout local ; IA = envoi à Anthropic (US).

## Clés localStorage utilisées
`yourcareer.profile`, `yourcareer.history`, `yourcareer.anthropic_key`,
`yourcareer.trend.*`, `lumi.luminator`, `lumi.luminator.chat`,
`lumi.profile.luminator_fields`. ⚠️ localStorage est **par domaine** → changer
d'URL réinitialise les données utilisateur.

## ⚙️ Déploiement & Git (IMPORTANT)
- Dépôt GitHub : **`axelravassard-create/Lumi-ai`** (renommé depuis `yourcareer`).
  Les outils GitHub MCP utilisent `owner=axelravassard-create`, `repo=yourcareer`
  (l'ancien nom **redirige** encore et est le seul autorisé par le scope).
- Branche de dev : **`claude/clever-hypatia-5btva6`**. Déploiement Vercel depuis **`main`**.
- ⚠️ **`git push origin main` échoue (HTTP 503 serveur)**. Procédure qui marche :
  1. committer sur `main` en local (auteur **`Claude <noreply@anthropic.com>`**),
  2. `git branch -f claude/clever-hypatia-5btva6 main` puis force-push la branche,
  3. créer + merger la PR via **GitHub MCP** (`create_pull_request` / `merge_pull_request`,
     base `main` ← `claude/clever-hypatia-5btva6`),
  4. `git fetch` + `git reset --hard origin/main` en local.
- Vercel redéploie `main` automatiquement. Si « pas à jour » : ouvrir le site via le
  bouton **Visit** du bon projet Vercel (éviter les URLs devinées), et au besoin
  **Redeploy sans cache**. `vercel.json` fige le framework Vite + dossier `dist`.
- Toujours **builder** (`npm run build`) avant de pousser.

## Préférences utilisateur notées
- Veut des effets **dans le cadre** (pas d'éléments coupés au bord).
- Tient à des **animations fluides** (éviter d'animer le flou CSS sur un canvas 3D).
- Parle français ; donner des réponses claires et concrètes.
