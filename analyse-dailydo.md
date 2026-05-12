# Analyse approfondie — DailyDo

> Rapport généré le 3 avril 2026

---

## Vue d'ensemble

**DailyDo** est une application SaaS de gestion de tâches en temps réel destinée aux équipes de restaurants. Elle est construite sur une stack moderne React + Supabase, déployable en mode autonome (chaque restaurant configure son propre Supabase) ou en mode centralisé (variables d'environnement injectées au build pour Vercel/Netlify).

Le projet est propre, bien structuré et clairement pensé pour un usage commercial. La lecture du code révèle une maturité réelle : séparation des responsabilités, tests unitaires, gestion fine des rôles, et une synchronisation temps réel fonctionnelle.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework UI | React 18.3 |
| Bundler | Vite 6 + @vitejs/plugin-react |
| Style | Tailwind CSS v4 (via plugin Vite natif) |
| Backend / Auth / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Icônes | Lucide React |
| Tests | Vitest + @testing-library/react + happy-dom |
| Déploiement | Vercel ou Netlify (config présente pour les deux) |

Le choix de **Tailwind v4** avec le plugin Vite est un choix récent et avant-gardiste — pas de fichier de configuration `tailwind.config.js`, tout est géré via le plugin. C'est la bonne direction mais il faut noter que la v4 est encore en phase de stabilisation (certaines classes peuvent se comporter différemment).

---

## Architecture du projet

```
src/
├── App.jsx                  # Point d'entrée — routing Setup → Login → Dashboard
├── Dashboard.jsx            # Composant principal (667 lignes — le plus gros du projet)
├── config/
│   ├── constants.js         # Constantes globales (types, filtres, couleurs, clés)
│   └── planning.js          # Tableau des jours de la semaine
├── lib/
│   ├── storage-supabase.js  # Init client Supabase, credentials, localStorage
│   ├── db.js                # Couche data — toutes les fonctions CRUD
│   ├── taskRollover.js      # Logique de report des tâches annexes
│   ├── taskUtils.js         # Utilitaires (isUrgent, isOverdue, displayName)
│   ├── saveTasksMerge.js    # Réconciliation batch upsert ↔ front
│   └── reminder.js          # Logique du rappel fin de journée
└── components/
    ├── LoginScreen.jsx      # Connexion / Inscription par nom de restaurant
    ├── SetupScreen.jsx      # Écran de saisie des credentials Supabase
    ├── Onboarding.jsx       # Création du restaurant après inscription
    ├── ErrorBoundary.jsx    # Filet de sécurité React
    ├── TaskItem.jsx         # Affichage d'une tâche
    ├── StatsBar.jsx         # Barre de statistiques (total/fait/en attente/urgent)
    ├── PlanningCard.jsx     # Carte affichant le planning du jour
    ├── PlanningSettings.jsx # Interface de configuration du planning (owner)
    └── TeamModal.jsx        # Gestion d'équipe (invitation, rejoindre)
```

### Flow de navigation

```
App.jsx
  └─ hasSupabaseCredentials() ?
       ├─ Non → <SetupScreen>  (saisie URL + anon key)
       └─ Oui → <Dashboard>
                  └─ session auth ?
                       ├─ Non → <LoginScreen>
                       └─ Oui → restaurant lié ?
                                  ├─ Non → <Onboarding> (créer restaurant)
                                  └─ Oui → Dashboard principal
```

---

## Modèle de données (Supabase/PostgreSQL)

Le schéma principal (`supabase-setup.sql`) définit 4 tables :

### `restaurants`
Entité centrale. Un restaurant = un espace de données isolé. Possède `id`, `name`, `created_at`, `updated_at`.

### `user_roles`
Table de liaison entre `auth.users` et `restaurants`. Contient le `role` (`owner`, `manager`, `employee`). Contrainte `UNIQUE(user_id)` dans le script principal — **un utilisateur ne peut appartenir qu'à un seul restaurant** (contrainte forte, à considérer si le projet évolue vers le multi-restaurant).

> Note : le script SaaS (`supabase-saas-setup.sql`) utilise `UNIQUE(user_id, restaurant_id)` à la place, ce qui permettrait un utilisateur dans plusieurs restaurants. Les deux scripts coexistent — il faudra choisir et unifier.

### `tasks`
Les tâches quotidiennes. Champs clés : `task_type` (`quotidien`/`annexe`/`semaine`), `scheduled_for` (DATE), `completed`, `completed_by`, `completed_at`. La RLS garantit qu'un utilisateur ne voit que les tâches de son restaurant.

### `planning_templates`
Templates hebdomadaires stockés en JSONB par jour (`lundi` à `dimanche` + `annexes`). Contrainte `UNIQUE(restaurant_id, day_of_week)`, mise à jour par upsert.

### Sécurité (Row Level Security)
Toutes les tables ont la RLS activée. Les politiques sont correctement définies par rôle :
- **SELECT** : tous les membres du restaurant
- **INSERT/DELETE** : owner + manager seulement (sauf tasks UPDATE : tous)
- **Planning** : owner seulement pour les modifications

La fonction `create_restaurant()` est en `SECURITY DEFINER`, ce qui est la bonne approche pour contourner les politiques lors de la création initiale.

---

## Fonctionnalités clés analysées

### 1. Système d'authentification (LoginScreen)
Le système utilise une astuce ingénieuse : l'utilisateur entre un **nom de restaurant** et un mot de passe. L'email réel envoyé à Supabase est généré automatiquement (`slug@dailydo.app`). Cela simplifie l'UX pour des restaurateurs qui ne veulent pas gérer d'emails techniques.

**Avantage** : UX simple, aucune friction email.
**Risque** : collision de noms si deux restaurants ont des noms très proches (slugification identique). Par exemple "Le Bistrot" et "le bistrot" donneraient le même slug.

### 2. Report automatique des tâches annexes (taskRollover)
La logique est pure, testée, et bien isolée. Les tâches `annexe` non faites et dont `scheduledFor < today` sont copiées sur aujourd'hui et supprimées de leur date d'origine. Le suffixe `(reportée)` est retiré du titre pour éviter les doublons. Les IDs numériques (drafts non persistés) sont exclus de la suppression en base.

C'est l'un des modules les mieux conçus du projet.

### 3. Synchronisation temps réel
Supabase Realtime est activé sur la table `tasks` via `ALTER PUBLICATION supabase_realtime ADD TABLE tasks`. Le channel est filtré par `restaurant_id` — seules les tâches du bon restaurant déclenchent un rechargement. La souscription est nettoyée à la déconnexion.

### 4. Réconciliation des upserts batch (saveTasksMerge)
`mergeTasksWithUpsertRows` gère un cas délicat : lors d'un upsert groupé, Supabase ne garantit pas l'ordre des lignes retournées. La fonction reconcile les tâches front (camelCase) avec les lignes DB (snake_case) en construisant une clé composite sur les champs stables. C'est du code défensif de qualité.

### 5. Gestion des rôles et permissions
Bien pensée avec deux fonctions utilitaires simples (`canManage`, `canAdmin`) qui alimentent la visibilité des boutons dans le Dashboard. Le rôle est récupéré depuis la table `user_roles` et mis en cache 10 secondes pour éviter les requêtes parallèles redondantes.

### 6. Code d'invitation
Le code d'invitation est les 8 premiers caractères de l'UUID du restaurant (en majuscules). Simple mais efficace. La recherche utilise `ilike('id', 'XXXXXXXX%')` — fonctionne mais pourrait théoriquement matcher plusieurs restaurants si les UUIDs commencent pareil (probabilité négligeable).

---

## Tests

Le projet dispose d'une couverture de tests unitaires sur les modules critiques :

| Fichier de test | Module testé | Cas couverts |
|----------------|--------------|--------------|
| `taskRollover.test.js` | `applyAnnexeRollover` | 9 cas (rollover, completed, types, UUID vs numérique, etc.) |
| `taskUtils.test.js` | Filtrage des tâches | 7 cas (tous les filtres) |
| `saveTasksMerge.test.js` | `mergeTasksWithUpsertRows` | Présent |
| `reminder.test.js` | `shouldShowEndOfDayReminder` | Présent |
| `StatsBar.test.jsx` | Composant StatsBar | Présent |
| `constants.test.js` | Constantes | Présent |

La configuration Vitest utilise `happy-dom` comme environnement (plus léger que jsdom). L'environnement de test est configuré dans `src/test/setup.js`.

**Point fort** : les tests de `taskRollover` sont exemplaires — ils utilisent `vi.useFakeTimers()` pour contrôler la date système, couvrent les edge cases (ID numérique vs UUID, suffixe `(reportée)`, `scheduledFor` absent).

---

## Points forts du projet

**Architecture claire** : la séparation `config/` → `lib/` → `components/` → composants de page est respectée. La couche `db.js` centralise tous les accès Supabase.

**Dual-mode de déploiement** : le projet supporte nativement les variables d'environnement Vercel (mode SaaS centralisé) ET la configuration manuelle par l'utilisateur final. C'est une conception flexible et commercialement intelligente.

**Sécurité base de données** : la RLS est bien configurée, avec des politiques granulaires par rôle et par opération. Le `SECURITY DEFINER` sur `create_restaurant()` est utilisé correctement.

**Cache et anti-duplication** : `inflightUserRestaurant` empêche les requêtes parallèles vers `user_roles`. Le cache de 10 secondes est un bon compromis.

**Optimistic UI** : `toggleTask` et `deleteTaskAction` mettent à jour l'état local immédiatement et effectuent un rollback en cas d'erreur réseau. L'UX est fluide.

**Tests de qualité** sur les modules purs.

---

## Points d'amélioration identifiés

### 🔴 Critique

**Dashboard.jsx trop monolithique (667 lignes)** : tout est dans un seul fichier — state management, effets, handlers, logique de tri, rendu. Il faudrait extraire au minimum : le hook de chargement des tâches (`useTaskLoader`), le hook d'authentification (`useAuth`), et le formulaire d'ajout de tâche (composant dédié).

**Deux scripts SQL qui divergent** : `supabase-setup.sql` et `supabase-saas-setup.sql` ont des contraintes différentes (`UNIQUE(user_id)` vs `UNIQUE(user_id, restaurant_id)`), des politiques RLS différentes, et le second n'a pas la fonction `create_restaurant()`. Il n'est pas clair lequel est "la référence". Cela peut créer de la confusion lors du déploiement.

### 🟠 Modéré

**Collision de noms de restaurants à l'inscription** : deux restaurants "Chez Pierre" et "chez pierre" produiront le même email `chez-pierre@dailydo.app`. L'utilisateur verra un message d'erreur peu clair. Il faudrait détecter le conflit et proposer une alternative (ex : ajouter un suffixe numérique).

**`loadTasks()` pas stabilisé avec `useCallback`** : `loadTasks` est recréée à chaque render et utilisée dans plusieurs handlers. Si elle est ajoutée dans un tableau de dépendances d'un `useEffect`, elle créera une boucle infinie. Actuellement les `useEffect` l'appellent directement donc ça fonctionne, mais c'est fragile.

**Pas de pagination sur les tâches** : `getTasks()` charge toutes les tâches du restaurant sans limite. Pour un restaurant actif depuis plusieurs mois, la table peut contenir des milliers de lignes. Un filtre sur `scheduled_for` plus strict (ex: les 7 derniers jours) serait prudent.

**Le `setTimeout(150ms)` dans App.jsx** : utilisé pour attendre l'initialisation du client Supabase après la configuration. C'est un hack temporel qui peut échouer sur des connexions lentes. Il vaudrait mieux attendre une promesse explicite.

**`getInviteCode()` est déterministe et permanent** : le code d'invitation d'un restaurant ne change jamais (c'est toujours les 8 premiers chars de son UUID). Si le code est partagé publiquement ou fuite, n'importe qui peut rejoindre le restaurant. Un code rotatif ou révocable serait plus sécurisé.

### 🟡 Mineur

**`confirm()` natif** : plusieurs endroits utilisent `confirm()` (resetAll, handleResetConfig). Ce dialogue bloquant est peu UX et n'est pas stylisable. Remplacer par une modale React.

**Champs `deadline` présents dans le formulaire mais absents du tri/filtre** : le champ `deadline` (datetime-local) existe dans le formulaire et dans `taskUtils.js` (`isUrgent`, `isOverdue`), mais il n'apparaît pas dans le schéma DB (`tasks`). La deadline est donc perdue à la persistance.

**Pas de gestion du changement de rôle en temps réel** : si un owner rétrograde un manager pendant sa session, le manager continuera à voir les boutons d'action jusqu'à la prochaine actualisation. La RLS bloquera les opérations côté serveur, mais l'UI sera incohérente.

**`taskUtils.test.js` réplique la logique de filtrage** au lieu d'importer depuis Dashboard. Si la logique évolue dans Dashboard, les tests ne le detecteront pas. Extraire `getFilteredTasks` dans `lib/taskUtils.js` et l'importer dans les deux endroits.

---

## Résumé des métriques

| Métrique | Valeur |
|----------|--------|
| Nombre de fichiers source | ~20 |
| Lignes de code principales | ~2 500 (hors node_modules) |
| Composants React | 9 |
| Modules lib | 6 |
| Fichiers de tests | 6 |
| Tables en base | 4 |
| Politiques RLS | 10+ |
| Fonctions SQL | 1 (create_restaurant) |
| Dépendances prod | 4 (react, react-dom, supabase-js, lucide-react) |

---

## Conclusion

DailyDo est un projet solide, bien pensé pour son cas d'usage, avec une architecture cohérente et une attention réelle portée à la sécurité des données (RLS) et à la qualité du code (tests unitaires sur les modules critiques). Les fonctionnalités métier — report automatique, temps réel, rôles — sont correctement implémentées.

Les principaux chantiers d'amélioration sont : **découper Dashboard.jsx**, **unifier les deux scripts SQL**, et **corriger le champ deadline** qui est actuellement collecté mais non persisté. Ces trois points auraient le plus d'impact immédiat.
