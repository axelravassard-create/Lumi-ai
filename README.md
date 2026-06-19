# Lumi 🧭

> Votre métier survivra-t-il à l'intelligence artificielle ?

**Lumi** est une application web qui estime le **risque de remplacement
par l'IA** d'un métier, projette sa progression jusqu'en **2040**, et propose un
**plan d'action concret** pour rester employable.

Prototype à visée pédagogique — interface moderne, expérience guidée.

---

## ✨ Fonctionnalités

- **Page d'accueil intuitive** : on saisit simplement sa profession (avec
  suggestions et reconnaissance de texte libre + accents).
- **Score de remplaçabilité** : une jauge animée donnant un pourcentage clair.
- **Verdict de l'IA** : une synthèse en une phrase, calibrée sur le niveau de risque.
- **Projection 2026 → 2040** : graphique d'aire interactif, avec marqueur « Aujourd'hui ».
- **Risque actualisé dans le temps** : la part « déjà automatisable » est recalculée à la date réelle et progresse au fil des mois (suivi vivant).
- **Tendance de votre secteur** : Claude recherche l'actualité IA du secteur (recherche web) et en fait une note hebdomadaire, mise en cache 7 jours (mutualisable par secteur).
- **Partage & invitation** : diffuser son résultat et inviter ses proches (opt-in, sans réseau social).
- **Décomposition par tâche** : quelles activités sont menacées, lesquelles restent humaines.
- **Profil d'atouts** : les dimensions humaines (créativité, empathie, jugement…) qui protègent.
- **Plan anti-obsolescence** : recommandations personnalisées (augmentation, différenciation, évolution).
- **Compétences d'avenir** : les compétences à développer en priorité.
- **Pistes de reconversion** : des métiers plus résilients à explorer.
- **Comparateur de métiers** : deux professions face à face (jauges, trajectoires superposées, verdict).
- **Profil carrière + historique** : suivi dans le temps, jauge de complétude, frise d'évolution.
- **Import de CV** : Claude lit un PDF (ou du texte collé) et pré-remplit le profil automatiquement.
- **IA Claude (optionnelle)** : verdict, recommandations, comparaison et import CV propulsés par **Claude Opus 4.8**.

## 🤖 Intégration Claude (optionnelle)

Par défaut, l'application tourne en **mode démo** : tout est calculé localement, sans
clé API. En connectant une clé API Anthropic (bouton « Mode démo / IA Claude » en haut
à droite), le discours rédactionnel — verdict, recommandations, compétences, comparaison —
est généré par **Claude Opus 4.8** via des **sorties structurées** (`output_config.format`),
ancrées sur les chiffres du moteur (usage *grounded* : l'IA ne fabrique pas les données).

> ⚠️ **Prototype uniquement** : la clé est stockée dans le navigateur (`localStorage`) et
> appelle `api.anthropic.com` directement (`dangerouslyAllowBrowser`). En production, les
> appels LLM doivent transiter par un backend pour ne jamais exposer la clé côté client.

## 🧠 Le moteur d'analyse

Aucune clé API n'est requise pour les **chiffres** : le score, la projection et les
facteurs reposent sur un **modèle heuristique** déterministe embarqué, inspiré des
travaux sur la susceptibilité à l'automatisation (type Frey & Osborne / OCDE).

Chaque métier est décrit par **7 facteurs** (0–100) :

| Facteur      | Effet sur le risque | Description                                |
|--------------|---------------------|--------------------------------------------|
| `routine`    | ↑                   | tâches répétitives et prévisibles          |
| `digital`    | ↑                   | travail sur données / texte / écran        |
| `creativity` | ↓                   | création et conception originales          |
| `empathy`    | ↓                   | relation humaine, soin, écoute             |
| `physical`   | ↓                   | dextérité, terrain, environnement imprévu  |
| `judgment`   | ↓                   | décision stratégique, responsabilité       |
| `social`     | ↓                   | négociation, influence, coordination       |

Le score combine ces facteurs, puis une **courbe logistique** modélise la
diffusion de l'automatisation dans le temps.

## 🚀 Démarrer

```bash
npm install
npm run dev      # serveur de développement (http://localhost:5173)
npm run build    # build de production (type-check + bundle)
npm run preview  # prévisualiser le build
```

## 🛠️ Stack

- **React 18** + **TypeScript** (mode strict)
- **Vite 5**
- **Tailwind CSS 3**
- Graphiques **SVG** maison (aucune dépendance de charting)

## 📁 Structure

```
src/
  App.tsx                 # routage de vues + séquence d'analyse
  lib/
    professions.ts        # base de connaissances métiers (facteurs)
    engine.ts             # moteur : matching, score, projection, conseils
    llm.ts                # intégration Claude (narratif + comparaison)
    profile.ts            # profil carrière : modèle, stockage, complétude
    ui.ts                 # thème par risque + hook d'animation
  components/
    LandingPage.tsx       # page d'accueil (analyse + comparaison)
    Dashboard.tsx         # tableau de bord des résultats
    CompareView.tsx       # vue de comparaison de deux métiers
    ProfileScreen.tsx     # profil carrière + jauge de complétude
    ApiKeyModal.tsx       # configuration de la clé API Claude
    AiStatusButton.tsx    # pastille d'état IA / mode démo
    RadialGauge.tsx       # jauge circulaire
    ProjectionChart.tsx   # graphique de projection
    Logo.tsx
```

---

_Les estimations sont indicatives et ne constituent ni une prédiction certaine
ni un conseil en orientation professionnelle._
