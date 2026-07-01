# Blumi — Synthèse du projet (mémoire de travail)

> Ce fichier résume l'état du projet et les décisions prises, pour ne pas avoir à
> rejouer tout l'historique de conversation. **À lire en priorité** au début d'une
> session, et **à tenir à jour** quand une décision importante change.

## Le produit
**Blumi** (anciennement « Lumi », renommé car le nom n'était pas utilisé) est une
app web (FR) qui estime l'exposition d'un métier à l'automatisation par l'IA, et
qui propose un **copilote IA** pour aider l'utilisateur. Prototype à visée
pédagogique.

- **Stack** : Vite + React + TypeScript + Tailwind. Avatar 3D via three.js /
  @react-three/fiber / drei / postprocessing. IA via `@anthropic-ai/sdk`.
- **Modèles Claude** : `claude-sonnet-4-6` (MODEL, tâches complexes : verdict,
  comparaison, copilote, veille) et `claude-haiku-4-5` (MODEL_LIGHT, tâches
  simples — ex. extraction de CV). Choix dicté par le COÛT (cf. section coûts) :
  Opus était trop cher. Sonnet supporte `web_search_20260209` (≠ Haiku) → la
  veille sectorielle tourne sur Sonnet. ⚠️ Le proxy n'autorise QUE ces 2 modèles
  (`ALLOWED_MODELS` dans `api/anthropic/[...path].ts`) — Opus a été retiré.
- **Accès API (prod)** : par défaut l'app appelle Claude via un **proxy serveur**
  (`api/anthropic/[...path].ts`, Edge function Vercel) qui détient la clé dans la
  variable d'env **`ANTHROPIC_API_KEY`** (à définir dans Vercel) → la clé ne vit
  jamais côté navigateur. `api/anthropic-status.ts` dit au front si la clé serveur
  est présente (sans la révéler) → l'IA s'active pour tous sans saisie.
  - **Repli BYOK** : si l'utilisateur saisit sa propre clé (`localStorage`
    `yourcareer.anthropic_key`), elle est utilisée en direct (`dangerouslyAllowBrowser`).
  - Logique dans `llm.ts` : `client()` (proxy vs BYOK), `checkServerKey()`,
    `aiReady()` (= clé serveur OU clé perso). `App.tsx` appelle `checkServerKey()`
    au montage et fixe `aiEnabled`.
  - ⚠️ `vercel.json` : le rewrite SPA exclut `/api` (`"/((?!api/).*)"`), sinon les
    fonctions seraient réécrites vers `index.html`.

## Marque & paliers — 3 niveaux (`src/lib/entitlement.ts`)
- **Blumi** (gratuit) = mascotte + nom de l'app (offre gratuite, diagnostic).
- **Blumiman** (4,99 €/mois) = le copilote = **même personnage + lunettes rondes**.
  C'est l'offre mise en avant (« ⭐ Le plus populaire »).
- **Bluminator** (14,99 €/mois) = palier premium pour **gros utilisateurs de l'IA**
  (usage IA étendu ~4×, réponses plus approfondies, priorité quand le service est
  saturé). Honnête : « n'a d'intérêt que si tu utilises l'IA très souvent ».
- **Modèle de données** : `type Tier = 'free' | 'blumiman' | 'bluminator'`.
  `getTier()`, `ownsPaid()`, `setTier()`, `tierName(t)`, `useTier()`. Stocké en
  `localStorage` `lumi.tier` (⚠️ NE PAS renommer la clé) + `lumi.luminator`
  (legacy booléen, maintenu pour compat + migration : ancien `'1'` → `bluminator`).
  - **Couche de compat** (à garder) : `ownsLuminator()`=`ownsPaid()`,
    `setLuminator(v)`=`setTier(v?'blumiman':'free')`, `useLuminator()`, `brandName()`
    (= nom du palier actif, sinon `APP_NAME`='Blumi'), `useBrand()` (`{ owns, name }`).
- Quand un palier payant est acquis, le personnage à lunettes **et le nom du palier**
  (Blumiman / Bluminator) prennent la place de Blumi partout (logo, avatars, chat,
  profil, verdicts) via `useBrand()`/`brandName()`.
- ⚠️ **Renommage** : ne PAS remplacer aveuglément « Luminator » dans `llm.ts`
  (identifiants `streamLuminatorChat`, `LUMINATOR_SYSTEM`) ni `LuminatorChat`,
  `useLuminator`, `LumiSpeech`, `byLumi` (identifiants de code). Idem clés
  `localStorage` (`lumi.*`, `yourcareer.*`). Seuls les **textes visibles** sont
  rebrandés. Le persona du chat injecte le nom du palier via `{NAME}` dans
  `LUMINATOR_SYSTEM` (`.replace('{NAME}', tierName(getTier()))`).

## Personnage 3D — `src/components/avatar/RobotAvatar.tsx` (+ `Avatar.tsx`)
- Yeux qui suivent le curseur, clignements, couleur d'humeur (mood).
- **3 apparences = 3 paliers** (auto-déduites du tier dans `Avatar`) :
  - **Blumi** (free) : visage nu.
  - **Blumiman** (blumiman) : + lunettes rondes (`glasses`).
  - **Bluminator** (bluminator) : lunettes **+ petit ordinateur portable lumineux**
    (`laptop`, composant `Laptop` dans `RobotAvatar.tsx`). Quand `laptop` est actif,
    on **remonte + réduit (scale 0.8) la tête** pour caser l'écran sous le menton
    sans rien couper au bord (préférence user : effets « dans le cadre »).
    - **Il fixe SON écran, pas nous** : son regard est verrouillé vers le bas (ne
      suit PAS le curseur — override de `gx`/`gy` + tilt tête quand `laptop`), et
      la **dalle lumineuse est tournée vers la tête** (−z, cachée au spectateur) ;
      on voit le dos du capot + un petit logo lumineux, et la lueur éclaire le menton.
- Props clés (sur `Avatar` et `RobotAvatar`) :
  - `glasses` : lunettes rondes. Si non précisé sur `Avatar`, suit la possession
    d'un palier payant (`useLuminator`).
  - `laptop` : ordinateur portable. Si non précisé sur `Avatar`, vrai seulement
    pour le palier `bluminator` (`useTier`).
  - `speaking` : anime la bouche (utilisé par le chat).
  - `mood`, `state` ('idle'|'thinking'), `active` (pause du rendu hors écran),
    `forceFallback` (emoji au lieu de la 3D).
- **Réaction « tapote sur la tête »** (clic sur la tête) — cinématiques DISTINCTES :
  - **Blumi** (sans lunettes) → **bulles de lumière multicolores** (`SPARKLE_COLORS`).
  - **Blumiman** (lunettes) → **rayons de lumière dorée** (`RAY_GOLD`), plus intenses.
  - **Bluminator** (ordi) → **énormes rayons BLEUS projetés par l'écran** vers son
    visage (`RAY_BLUE`, `SCREEN_RAY_COUNT`) : origine basse (l'écran), faisceaux
    larges (`RAY_WIDTH`) qui montent en éventail. Réutilise le système `rayData`.
- **Son** : `src/lib/sfx.ts` joue un petit « couic » au tapote. `installAudioUnlock()`
  est appelé dans `App.tsx` (réveille l'audio au 1er geste, sinon 1er son avalé).

## Accueil — `src/components/LandingPage.tsx`
- **Visiteur gratuit** (`!owns`) : hero + **carrousel CIRCULAIRE des 3 personnages**
  (= les 3 paliers) : tableau `TRIO` (`Blumi`/`Blumiman`/`Bluminator`, chacun avec
  `glasses`/`laptop`/`descKey`/`paid`). Les 3 sont **équidistants (120°) sur un cercle
  vu de face** ; `front` = index du perso au premier plan (3D), les 2 autres sur les
  côtés (réduits, assombris `brightness(0.5)` mais VISIBLES). Clic sur un perso de
  côté → `rotateToFront(i)` fait **tourner tout l'anneau** (les 3 bougent ensemble)
  pour l'amener devant, par le chemin le plus court (un sens à gauche, l'autre à
  droite). La bulle présente le perso central (`trio.meIm` + `descKey`) + un CTA
  « Débloquer {name} » → `onOpenPricing` pour les paliers payants.
  - ⚙️ **Animation rAF** (vraie trajectoire en arc) : `applyStyles(rot)` calcule par
    trigo `left = 50 + 33·sin(θ)`, profondeur `cos(θ)` → `scale`/`zIndex`/ombre.
    Écrit **directement sur les refs** (`wrapRefs`) → AUCUN `style` géré par React sur
    ces divs (sinon un re-render écraserait l'anim). `rotationRef` = angle cumulé ;
    `rotateToFront` choisit le delta dans (-180,180]. Position initiale via
    `useLayoutEffect` (avant 1re peinture). NE PAS remettre de `style`/transition CSS
    React sur ces wrappers ni revenir aux slots `left` fixes (sliding, pas rotation).
  - Perf : **un seul canvas 3D** (le perso `front`) ; les côtés en emoji. `paused={moving}`
    gèle la 3D pendant la rotation. L'anim ne re-render pas React (refs directs).
  - ⚠️ Le bouton nav « Tarifs » affiche **« Abonnements »** (`nav.luminator`, traduit
    5 langues), plus « Blumiman ».
- **Abonné Luminator** (`owns`) : accueil **orienté action / automatisation** (pas
  « ton métier est-il exposé »). Accès direct au chat + raccourcis. (cf. MemberHome)

## Chat Luminator — `src/components/LuminatorChat.tsx` + `streamLuminatorChat` (llm.ts)
- Persona : **copilote carrière ET automatisation**. Priorité n°1 = aider à
  **automatiser les tâches du métier** de l'utilisateur (outils IA, no-code, modèles
  prêts à l'emploi), ciblé sur sa profession + ses compétences. Garde aussi le
  coaching (reconversion, compétences, etc.).
- **Streaming** (la bouche bouge pendant qu'il parle).
- **Crash de l'API géré** : `describeError()` (`llm.ts`) traduit les pannes
  (`InternalServerError`/5xx, `APIConnectionError`, surcharge…) en messages clairs
  dans le chat (« Le service IA est momentanément indisponible. Réessaie dans un
  instant. 🛠️ ») au lieu d'une erreur brute. Le `catch` de `LuminatorChat`
  remplace la bulle par « ⚠️ » + ce message.
- **Mémoire** : conversation persistée en `localStorage` (`lumi.luminator.chat`).
- **Profil D'ABORD** : le system prompt demande à Luminator de faire connaissance
  (1-2 questions) avant de guider si le profil est trop maigre. Côté UI, la home
  membre (`MemberHome`) est **gardée par `profileReady(profile)`** (`profile.ts`) :
  tant que le profil n'a pas le métier + 2 signaux (tâches/compétences/objectif/
  expérience), elle affiche « Faisons connaissance » (jauge + CTA profil / chat).
- **Outil `update_career_profile`** : Luminator note les infos de parcours sur le
  profil (`applyProfilePatch` dans `profile.ts`) → évite de re-demander / refaire
  travailler l'API. Le `ProfileScreen` affiche un badge « 🤓 Luminator » sur les
  champs qu'il a remplis (`luminatorFields()`).
- **Outil `add_plan_item`** : Luminator pousse des actions concrètes dans le
  **plan d'action** (`src/lib/plan.ts`, localStorage `lumi.luminator.plan`).
  Écran `PlanScreen.tsx` (vue `plan`) : colonnes À faire / En cours / Fait, ajout
  manuel, statuts, suppression. Le chat affiche « ✅ ajouté à ton plan ».
- **Outil `recommend_tool`** : Luminator range les outils conseillés dans la
  **boîte à outils** (`src/lib/toolbox.ts`, localStorage `lumi.luminator.tools`).
  Écran `ToolboxScreen.tsx` (vue `toolbox`) : liens cliquables, ajout manuel.
- **Autres modules membres** (cartes sur `MemberHome`) :
  `VeilleScreen.tsx` (vue `veille`, réutilise `SectorTrendCard` → action),
  `GeneratorsScreen.tsx` (vue `generators`, livrables 1 clic → ouvrent le chat),
  + raccourci « Opportunités locales » (exploite `profile.location`).
- Accès au chat : bouton flottant (FAB) quand `owns`, + bouton sur l'écran Tarifs.

## Différenciation réelle des paliers (limites appliquées, `src/lib/llm.ts`)
- **Vraie valeur de Bluminator** = pas du vent, c'est mesurable et appliqué :
  - **`DAILY_LIMITS`** = plafond d'actions IA / jour, par palier :
    `free: 10`, `blumiman: 25`, `bluminator: 100` (**exactement 4× Blumiman** →
    argument « 4× plus »). Resserrés vs l'origine (20/50/200) car le coût Sonnet
    est ~2-3,5 cts/message → un usage max devait rester soutenable.
  - ✅ **VRAIE limite serveur (infalsifiable)** : appliquée dans le **proxy**
    (`api/anthropic/[...path].ts`, fn `quotaExceeded`) via un compteur jour/
    utilisateur en **KV** (`quota:<u:email|ip:…>:<YYYY-MM-DD>`, INCR + EXPIRE 2 j).
    Palier lu sur `luminator:<email>` (sinon `free`), identité = session (email)
    ou IP. Dépassement → **429** `{type:'quota_exceeded'}` → `describeError` →
    `QUOTA_MSG`. ⚠️ `DAILY_LIMITS` est dupliqué dans le proxy ET `llm.ts` — les
    garder EN PHASE. Le `consumeQuota()` localStorage de `llm.ts` n'est plus qu'un
    **pré-contrôle d'UX** (instantané, contournable) ; le serveur fait foi.
    Inerte si KV absent (retombe sur le pré-contrôle non bloquant).
  - **`CHAT_MAX_TOKENS`** (exporté) = profondeur des réponses du copilote :
    `blumiman: 1024`, `bluminator: 2048` → Bluminator répond plus longuement
    (plans détaillés, livrables complets). Utilisé dans `streamLuminatorChat`.
  - La page Tarifs **affiche les vrais chiffres** (`DAILY_LIMITS.blumiman/.bluminator`)
    pour rester transparente plutôt que « tout Blumiman en mieux ».

## Tarifs — `src/components/PricingScreen.tsx`
- **3 cartes** (tableau `PLANS`) : **Blumi** (gratuit) / **Blumiman** 4,99 €
  (« ⭐ Le choix de la plupart ») / **Bluminator** 14,99 € (« 🚀 Usage intensif »,
  avatar avec **ordinateur portable**). Toggle mensuel / annuel (« 2 mois offerts »).
  Copie **concrète et honnête** (chiffres réels, pas de « en mieux » vague). Note de
  bas de page assumée : « Blumiman suffit à la grande majorité ; ne prends
  Bluminator que si tu atteins vraiment la limite quotidienne ».
- **Compte OBLIGATOIRE pour s'abonner** (quand les comptes sont activés) :
  `needsAccount = account.configured && !account.email`. Si vrai, `buy()` ouvre
  `AccountModal` au lieu du checkout (+ bannière « Crée ton compte pour t'abonner »).
  Gardé sur `configured` → tant que KV/Resend ne sont pas posés, le parcours
  simulé marche encore (sinon l'app serait bloquée).
- `buy(tier)` → si Stripe configuré : `startCheckout(tier, plan)` (Checkout) ;
  sinon **achat simulé** (`setTier(tier)`). `manage()` → `openBillingPortal()`.
  Logique : `src/lib/billing.ts` (`checkBilling`, `startCheckout`,
  `handleCheckoutReturn`, `openBillingPortal`) + Edge functions `api/stripe/*`
  (`status`, `create-checkout-session`, `verify-session`, `portal`, `webhook`).
- **Stripe Tax (TVA) DÉSACTIVÉ par défaut** dans `create-checkout-session.ts` :
  la micro-entreprise est en **franchise de TVA** (art. 293 B du CGI → pas de TVA
  facturée). Le bloc `automatic_tax`/`billing_address_collection`/`tax_id_collection`
  est gardé derrière `process.env.STRIPE_TAX_ENABLED === 'true'` (off par défaut).
  ⚠️ Le jour où tu dépasses les seuils de franchise : poser `STRIPE_TAX_ENABLED=true`
  dans Vercel **et** activer Stripe Tax dans le dashboard (adresse d'origine, seuils).
  - **`status.ts`** = `enabled` si `STRIPE_SECRET_KEY` + au moins un
    `STRIPE_PRICE_BLUMIMAN`/`STRIPE_PRICE_BLUMINATOR` (⚠️ ne PAS revenir à l'ancien
    `STRIPE_PRICE_ID` qui n'existe pas — c'était un bug).
  - **Variables Vercel (prix par palier)** : `STRIPE_SECRET_KEY`,
    `STRIPE_PRICE_BLUMIMAN`, `STRIPE_PRICE_BLUMIMAN_YEARLY`,
    `STRIPE_PRICE_BLUMINATOR`, `STRIPE_PRICE_BLUMINATOR_YEARLY`. Au retour de
    Stripe, `App.tsx` appelle `handleCheckoutReturn()` → `setTier(j.tier)`.
  - ⚠️ Accès stocké en localStorage (proto) → falsifiable / non multi-appareil :
    pour un vrai produit payant, s'appuyer sur les **comptes (email)** ci-dessous.
- Argumentaire centré sur la **valeur d'automatisation** (gain de temps).

## Comptes (lien magique) — « prêt à brancher »
- **Inerte tant que non configuré** (Vercel KV + Resend) → l'app marche comme avant
  (accès Luminator via localStorage / Stripe simulé). Une fois branché, le compte
  devient la **source de vérité** de l'accès Luminator (multi-appareil).
- Back : Edge functions `api/auth/*` (`request`, `verify`, `me`, `logout`) +
  helpers `api/_lib/kv.ts` (Upstash/Vercel KV REST), `api/_lib/email.ts` (Resend) &
  `api/_lib/session.ts` (`sessionEmail(req)` : cookie → email, partagé).
  Session = cookie httpOnly `lumi_session`. Clés KV : `magic:<token>`, `sess:<id>`,
  `user:<email>`, `luminator:<email>`, `cust:<stripeCustomer>`, `data:<email>`.
- **Données utilisateur sur le compte (multi-appareils)** : `api/data.ts`
  (GET/POST, session-gated) stocke un blob JSON par utilisateur (`data:<email>`).
  Côté front, `src/lib/sync.ts` synchronise un jeu de clés localStorage
  (`SYNC_KEYS` : profil, historique, plan, boîte à outils, chat, provenance) —
  PAS la clé API perso (sensible), ni le palier (serveur fait foi), ni les caches.
  - `account.ts` `apply()` (login) → `syncOnLogin()` : `pullData()` (serveur→local,
    recharge 1× si plus récent, drapeau `lumi.synced` anti-boucle) puis `pushData()`
    (amorce un compte neuf avec les données déjà saisies). Push auto toutes les 15 s
    + sur `visibilitychange`/`pagehide`.
  - `logoutAccount()` → `stopSync()` + `clearSyncedData()` (efface les `SYNC_KEYS`
    de l'appareil ; le serveur garde tout) + `reload()` pour repartir propre.
- `api/stripe/webhook.ts` : à `checkout.session.completed`, met
  `luminator:<email>` = palier (`'blumiman'` | `'bluminator'`, via metadata) +
  `cust:<customer>`/`stripecust:<email>` ; à `subscription.deleted` repasse en
  `'free'` (signature vérifiée via `STRIPE_WEBHOOK_SECRET`).
  `create-checkout-session` passe l'email du compte connecté (`customer_email` +
  metadata `tier`) → le webhook sait qui créditer et à quel palier.
- Front : `src/lib/account.ts` (`checkAccount`, `requestLoginLink`,
  `completeLoginFromUrl`, `logoutAccount`, `useAccount`) + `AccountModal.tsx`.
  Bouton compte dans la nav (affiché seulement si `account.configured`).
- **Variables Vercel à poser le jour J** : `KV_REST_API_URL`, `KV_REST_API_TOKEN`,
  `RESEND_API_KEY`, `EMAIL_FROM` (expéditeur vérifié), `STRIPE_WEBHOOK_SECRET`,
  `APP_URL` (optionnel). ⚠️ logique non testable tant que KV/Resend absents.

## Profil — `src/components/ProfileScreen.tsx` / `src/lib/profile.ts`
- Profil carrière en `localStorage` (`yourcareer.profile`). Jauge de complétude.
- Import de CV (lu par Claude). Bouton **« Supprimer toutes mes données »**
  (`src/lib/privacy.ts` → `clearAllLocalData`).

## Moteur — `src/lib/engine.ts` / `src/lib/professions.ts`
- Score heuristique sur 7 facteurs ; ~242 métiers. Le compteur de l'accueil affiche
  `PROFESSIONS.length`.

## Studio de clips viraux — route `#/studio` (`src/components/studio/`)
- **Outil PRIVÉ (mono-utilisateur)** pour produire des shorts verticaux (9:16) :
  vidéo de fond importée + cinématique animée par-dessus (Blumi débarque, scanne le
  métier, révèle un score choc, puis Blumiman donne la solution), export MP4.
- **Architecture déterministe** (aperçu == export, image par image) :
  `src/lib/studio/timeline.ts` `evalFrame(project, t) → Frame` (état visuel complet à
  l'instant t, aucun recours à l'horloge réelle). `src/lib/studio/render.ts`
  `renderOverlay(ctx, frame, …)` dessine TOUS les overlays 2D (hook karaoké, faisceau
  de scan, jauge+compteur %, cartes d'action, CTA, watermark, safe-zones) — code de
  rendu **partagé** entre l'aperçu et l'export.
- **3 couches composées** dans un canvas maître 1080×1920 : vidéo de fond (crop 9:16
  via `coverRect`) → **avatar WebGL capturable** (`RobotAvatar capture` =
  `preserveDrawingBuffer`, rendu hors-vue puis `drawImage` dans le maître) → overlays
  2D. Voir `StudioPreview.tsx` (le seul `drawFrame(t)`, réutilisé par l'export).
- **Beats** (7, déplaçables/redimensionnables via `Timeline.tsx`) : hook / scan /
  verdict / pivot / glowup / solution / cta. Le glow-up transforme Blumi → palier
  choisi (`character.tier` : lunettes Blumiman, +ordi Bluminator). Presets dans
  `library.ts` (Doom→Glow-up, POV analyse, Tier list) + bibliothèque de HOOKS/CTA.
- **Métier & score** : autocomplétion sur `PROFESSIONS`, score auto via
  `analyze().currentRisk`, override manuel. `{METIER}`/`{SCORE}` injectés partout.
- **Audio** (`audio.ts`) : SFX synthétisés Web Audio (pop/riser/sting/shimmer/whoosh)
  calés sur les beats + voix off TTS FR (`tts.ts`) + musique importée. ⚠️ La voix
  TTS (SpeechSynthesis) n'est PAS routable dans Web Audio → jouée à l'aperçu mais
  **absente du MP4 exporté** ; emplacement prévu pour brancher une voix API (buffer
  mixable) dans `tts.ts`.
- **Export** (`export.ts`) : `captureStream(30)` + `MediaRecorder` (WebM) avec piste
  audio (musique+SFX mixés), puis WebM→MP4 (H.264/AAC) via **ffmpeg.wasm** (cœur
  mono-thread chargé depuis un CDN, repli unpkg→jsdelivr ; repli WebM si le CDN est
  injoignable). Multi-projets en `localStorage` (`blumi.studio.*`), les médias
  (object-URLs) ne sont PAS persistés. Cover PNG exportable.
- **Moments activables** : chaque beat a `enabled?: boolean` (onglet « Moments »,
  `BeatsPanel`). Un beat désactivé est ignoré par `windows()`/`activeBeat()` (aucun
  overlay ni transition — ex. retirer le pivot). Bouton « Compacter »
  (`compactBeats`) resserre les moments actifs bout à bout et ajuste `duration` ;
  les moments masqués sont parqués à la fin.
- **Réglages fins** : humeur du perso manuelle (`character.mood`, sinon `auto` par
  beat) + vraies entrées `pop`/`slide`/`zoom` (transforme `avatarScale`/`avatarDX/DY`
  dans le `Frame`) ; écoute TTS par réplique (bouton 🔊) ; **ducking** auto (la
  musique baisse quand `frame.speaking`) ; **tempo** (`project.tempo` : grille BPM +
  aimantation des beats) ; **7 facteurs** du métier affichés ; **timing manuel** des
  captions (`caption.timing/offset/pace`) ; **file multi-métiers** (onglet File →
  export en lot, un clip par métier). ⚠️ `projects.ts` `migrate()` complète les
  projets enregistrés avant l'ajout de ces champs.
- Deps ajoutées : `@ffmpeg/ffmpeg`, `@ffmpeg/util`.

## Conformité / légal
- Pages : `src/components/LegalScreen.tsx` (routes `#/legal/mentions|confidentialite|cgu`),
  liens dans le footer.
- **Infos légales centralisées dans `src/lib/legal.ts`** (`LEGAL_INFO`) : un seul
  endroit à compléter (nom éditeur, SIRET…). `status` ∈ `particulier|micro|societe`
  → les mentions s'adaptent. **Statut actuel : `micro`** (micro-entreprise créée ;
  éditeur Axel Ravassard, adresse 16 bis Avenue des Monts d'Or, 69890 La
  Tour-de-Salvagny). ⚠️ **Reste à renseigner : le `siret`** (14 chiffres) — tant
  qu'il est `undefined`, `LegalScreen` masque la ligne SIRET, mais il est
  OBLIGATOIRE pour une micro-entreprise.
- **Polices auto-hébergées** via `@fontsource/inter` + `@fontsource-variable/plus-jakarta-sans`
  (plus de requête Google Fonts). Famille display = `Plus Jakarta Sans Variable`.
- `LICENSE` propriétaire ("UNLICENSED" dans package.json).
- Messages « données » honnêtes : démo = tout local ; IA = envoi à Anthropic (US).

## Internationalisation (i18n) — en cours
- **Moteur** : `src/lib/i18n.ts` — léger, sans dépendance. Langues : `fr|en|de|es|zh`.
  Détection auto via `navigator.languages` → **repli sur `en`** si non couverte.
  Choix mémorisé (`localStorage` `lumi.lang`). `t('clé')`, `useLang()`, `setLang()`,
  `<LangSwitcher />` (sélecteur dans la nav).
- **IA multilingue** : `langDirective()` (`llm.ts`, via `getLang()`) injecte « réponds
  EXCLUSIVEMENT en <langue> » dans les prompts (verdict, comparaison, copilote, veille)
  → l'IA répond dans la langue de l'app, pas en FR par défaut. (Extraction de CV
  exclue : elle lit le CV tel quel.)
- **Traduit** : toute la **page d'accueil publique** (`LandingPage`, hors `MemberHome`),
  l'**écran d'analyse** (`AnalyzingScreen`, `analyzing.*`), le **tableau de bord**
  (`Dashboard`, `dash.*`) et la page **Tarifs** (`PricingScreen`, `pricing.*` — les
  paliers sont construits depuis l'i18n via `PLAN_META` + `PLAN_TEXT`, quota injecté
  par `{n}`) et l'écran **Profil** (`ProfileScreen`, `prof.*` + `opt.*`). ⚠️ Les
  options des `<Select>` du profil restent STOCKÉES en français (le moteur
  `engine.ts`/`llm.ts` les matche exactement) ; seul l'AFFICHAGE est traduit via
  `OPTION_LABELS` (valeur FR → clé i18n), le **chat copilote** (`LuminatorChat`,
  `chat.*` : accueil, suggestions, statut, indicateurs, saisie, actions) et les
  **modules membres** : plan (`PlanScreen`, `plan.*`), boîte à outils
  (`ToolboxScreen`, `tb.*`), générateurs (`GeneratorsScreen`, `gen.*`), veille
  (`VeilleScreen`, `veille.*`) + la carte de tendance sectorielle
  (`SectorTrendCard`, `str.*`, réutilisée dans Dashboard/Veille/MemberHome),
  l'**accueil membre** (`MemberHome` dans `LandingPage`, `mh.*` : étape « faisons
  connaissance », hero, démarrages rapides, jauge d'avancée, cartes raccourcis +
  leurs prompts) et les **pages légales** (`LegalScreen`, `legal.*` : mentions,
  confidentialité, CGU — textes traduits à l'identique, liens mailto conservés ;
  ⚠️ traduction littérale d'un texte légal FR, à faire valider juridiquement par
  pays avant exploitation). ✅ **Tous les écrans sont désormais traduits.**
- Pour ajouter une langue/écran : ajouter les clés dans les 5 dictionnaires de
  `i18n.ts` et remplacer les littéraux par `t('clé')` (appeler `useLang()` une fois
  dans le composant).

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
