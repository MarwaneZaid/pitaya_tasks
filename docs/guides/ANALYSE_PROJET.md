# Analyse du projet

## 1. Vue d’ensemble

Le dépôt contient une application de **gestion des tâches** pour restaurants / équipes, avec deux modes possibles selon la configuration Supabase :

| Mode | Schéma Supabase | Authentification | Planning | Usage |
|------|-----------------|------------------|----------|--------|
| **SaaS (DailyDo)** | `supabase-saas-setup.sql` | Supabase Auth (email/mot de passe) | En base (`planning_templates` par restaurant) | Multi-restaurants, un compte par utilisateur |
| **Simple (Pitaya)** | `supabase-setup.sql` | Aucune (nom saisi dans l’app) | Fichier `planning.js` (ou env) | Un site = un restaurant, partage par lien |

Le **code actuel** (Dashboard, `db.js`, LoginScreen) est orienté **SaaS** : il utilise `supabase.auth`, `getUserRestaurant()`, `getTasks()`, `getPlanningConfig()`, et les tables `restaurants`, `user_roles`, `planning_templates`, `tasks`. Le **README** décrit encore le flux **Pitaya** (un lien, un nom, pas d’auth).

---

## 2. Structure des dossiers et fichiers

```
App_tasks/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.jsx   # Affichage erreur si crash React
│   │   ├── LoginScreen.jsx     # Connexion (Auth ou nom selon mode)
│   │   ├── Onboarding.jsx      # Création restaurant (SaaS)
│   │   ├── PlanningCard.jsx    # Bloc "Planning" + boutons jour / semaine
│   │   ├── PlanningSettings.jsx # Config planning par jour (SaaS)
│   │   ├── StatsBar.jsx        # Total, Terminées, En cours, Urgentes
│   │   ├── TaskItem.jsx        # Une tâche (affichage / actions)
│   │   └── TeamModal.jsx       # Gestion équipe (SaaS)
│   ├── config/
│   │   ├── constants.js        # Types tâches, filtres, STORAGE_KEY, PLANNING_KEY, DEFAULT_SITE_NAME
│   │   └── planning.js        # JOURS uniquement (planning réel en DB en mode SaaS)
│   ├── lib/
│   │   ├── db.js               # API Supabase : restaurants, tasks, planning_templates, user_roles
│   │   ├── reminder.js        # Rappel fin de journée (heure, pending)
│   │   ├── storage-polyfill.js # Fallback localStorage
│   │   ├── storage-supabase.js # Client Supabase + window.storage (table app_storage)
│   │   ├── taskRollover.js    # Report tâches annexes au lendemain
│   │   └── taskUtils.js       # Filtrage tâches (all, quotidien, annexe, semaine)
│   ├── test/
│   │   └── setup.js
│   ├── App.jsx                 # ErrorBoundary + Dashboard
│   ├── Dashboard.jsx           # Écran principal (tâches, planning, stats, rappel)
│   ├── main.jsx                # Init storage + rendu React
│   ├── index.css
│   ├── supabase-saas-setup.sql # Schéma multi-tenant (restaurants, user_roles, planning_templates, tasks)
│   └── *.test.js / *.test.jsx  # Tests (constants, planning, reminder, rollover, StatsBar, taskUtils)
├── docs/
│   ├── guides/                 # EURALILLE, SUPABASE, VERCEL, AUTRE_PITAYA, RESUME, ANALYSE
│   └── reports/                # RAPPORT_FORMATEUR (md, html, pdf, screenshots)
├── supabase-setup.sql          # Schéma simple : table app_storage (key, value, updated_at)
├── index.html
├── package.json                # name: "dailydo", scripts: dev, build, test
├── vite.config.js
├── vercel.json
└── netlify.toml
```

---

## 3. Flux de données (mode SaaS actuel)

1. **Entrée** : `main.jsx` initialise le client Supabase (si `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), puis rend `App` → `Dashboard`.
2. **Session** : Le Dashboard appelle `supabase.auth.getSession()`. Si une session existe, il charge le restaurant de l’utilisateur (`getUserRestaurant()` → table `user_roles` + `restaurants`).
3. **Onboarding** : Si l’utilisateur n’a pas de restaurant, `Onboarding` permet de créer un restaurant et d’être assigné comme owner.
4. **Planning** : `getPlanningConfig()` lit les tâches par jour et les annexes dans `planning_templates` (par `restaurant_id`). Le Dashboard affiche le bloc planning et peut ajouter les tâches du jour / de la semaine à partir de ce config.
5. **Tâches** : `getTasks()` / `saveTask()` / `deleteTask()` utilisent la table `tasks` (filtrée par `restaurant_id`). Le rollover des annexes (`applyAnnexeRollover`) est appliqué en mémoire puis les tâches sont sauvegardées.
6. **Temps réel** : Un channel Supabase Realtime est souscrit sur la table `tasks` pour le `restaurant_id` courant pour mettre à jour la liste quand un autre utilisateur modifie les tâches.

**Constantes utiles** : `STORAGE_KEY`, `PLANNING_KEY` (constants.js), `JOURS` (planning.js). Le nom du site vient de `planningConfig.siteName` (nom du restaurant en DB) ou `DEFAULT_SITE_NAME`.

---

## 4. Points d’attention

- **Schéma Supabase** : Pour le mode SaaS, il faut exécuter **`src/supabase-saas-setup.sql`** (et activer Auth Email/Password dans Supabase). Le fichier **`supabase-setup.sql`** à la racine crée seulement `app_storage` (mode simple / Pitaya).
- **`planning.js`** : Il n’exporte plus que **`JOURS`**. Tout le planning (quotidien + annexes) est en base dans `planning_templates` pour le mode actuel. Un mode “Pitaya” avec planning en dur nécessiterait soit un autre branchement (env + ancien `planning.js`), soit des données par défaut en DB.
- **`storage-supabase.js`** : Définit `window.storage` (table `app_storage`) et exporte **`supabase`** pour `db.js`. La constante **`TABLE = 'app_storage'`** doit être définie (présente après correction).
- **README** : Décrit le déploiement “Pitaya” (un lien, variables Vercel, pas d’auth). À aligner avec le mode SaaS si c’est la cible principale, ou à distinguer clairement (deux modes documentés).

---

## 5. Résumé

- **Nom package** : `dailydo` (package.json).
- **Stack** : React, Vite, Tailwind, Supabase (Auth + Postgres + Realtime).
- **Architecture actuelle** : Multi-tenant (restaurants, rôles, planning en DB, tâches par restaurant).
- **Fichiers clés** : `Dashboard.jsx`, `lib/db.js`, `lib/storage-supabase.js`, `config/constants.js`, `config/planning.js` (JOURS), `supabase-saas-setup.sql`.
- **Correction faite** : Ajout de la constante `TABLE = 'app_storage'` dans `storage-supabase.js` pour éviter une erreur au runtime.

Pour faire fonctionner l’app en mode SaaS : exécuter **`src/supabase-saas-setup.sql`** dans le projet Supabase, activer l’authentification, puis configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sur Vercel.
