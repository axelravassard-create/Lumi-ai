# YourCareer 🧭

> Votre métier survivra-t-il à l'intelligence artificielle ?

**YourCareer** est une application web qui estime le **risque de remplacement
par l'IA** d'un métier, projette sa progression jusqu'en **2040**, et propose un
**plan d'action concret** pour rester employable.

Prototype à visée pédagogique — interface moderne, expérience guidée.

---

## ✨ Fonctionnalités

- **Page d'accueil intuitive** : on saisit simplement sa profession (avec
  suggestions et reconnaissance de texte libre + accents).
- **Score de remplaçabilité** : une jauge animée donnant un pourcentage clair.
- **Verdict de l'IA** : une synthèse en une phrase, calibrée sur le niveau de risque.
- **Projection 2026 → 2040** : graphique d'aire interactif de la trajectoire d'automatisation.
- **Décomposition par tâche** : quelles activités sont menacées, lesquelles restent humaines.
- **Profil d'atouts** : les dimensions humaines (créativité, empathie, jugement…) qui protègent.
- **Plan anti-obsolescence** : recommandations personnalisées (augmentation, différenciation, évolution).
- **Compétences d'avenir** : les compétences à développer en priorité.
- **Pistes de reconversion** : des métiers plus résilients à explorer.

## 🧠 Le moteur d'analyse

Aucune clé API n'est requise : l'analyse repose sur un **modèle heuristique**
embarqué, inspiré des travaux sur la susceptibilité à l'automatisation
(type Frey & Osborne / OCDE).

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
    ui.ts                 # thème par risque + hook d'animation
  components/
    LandingPage.tsx       # page d'accueil
    Dashboard.tsx         # tableau de bord des résultats
    RadialGauge.tsx       # jauge circulaire
    ProjectionChart.tsx   # graphique de projection
    Logo.tsx
```

---

_Les estimations sont indicatives et ne constituent ni une prédiction certaine
ni un conseil en orientation professionnelle._
