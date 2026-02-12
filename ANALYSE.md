# Analyse et état du projet Pitaya Tasks

## Structure du projet (organisée)

```
App_tasks/
├── public/                 # Fichiers statiques (servis à la racine)
│   └── favicon.svg
├── src/
│   ├── assets/             # Images utilisées dans le code (logo)
│   │   └── logo-pitaya.png
│   ├── components/         # Composants réutilisables
│   │   ├── LoginScreen.jsx
│   │   ├── PlanningCard.jsx
│   │   ├── SettingsModal.jsx
│   │   └── StatsBar.jsx
│   ├── config/             # Données et constantes
│   │   ├── constants.js    # Catégories, filtres, clés storage
│   │   └── planning.js    # Planning nettoyage PITAYA BÉTHUNE
│   ├── lib/                # Logique métier / services
│   │   ├── storage-polyfill.js   # localStorage (sans Supabase)
│   │   └── storage-supabase.js   # Sync équipe (Supabase)
│   ├── App.jsx
│   ├── Dashboard.jsx       # Tableau de bord principal
│   ├── main.jsx
│   └── index.css
├── supabase-setup.sql      # À exécuter une fois dans Supabase
├── README.md
├── VERCEL.md               # Guide déploiement Vercel
├── SUPABASE.md             # Guide config Supabase (URL + clé anon)
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── netlify.toml
```

## Vérifications effectuées

- **Build** : `npm run build` réussit (pas d’erreur).
- **Linter** : aucune erreur sur `src/`.
- **Logo** : importé depuis `src/assets/logo-pitaya.png`, visible en fond (tableau de bord + écran de connexion).
- **Affichage du nom** : si une URL est enregistrée comme nom, l’app affiche « Équipe » à la place.

## Dernier push à faire

Dans le terminal, à la racine du projet :

```bash
cd /Users/skat/Documents/App_tasks
git add -A
git status
git commit -m "Nettoyage: supprimer ancien composant, fix affichage nom et logo fond"
git push origin main
```

(Si Git demande un mot de passe, utilise ton **token GitHub**.)

---

## Erreurs / points à corriger possiblement

### 1. Logo pas visible sur l’app déployée (Vercel)

- **Cause possible** : cache du navigateur ou déploiement pas à jour.
- **À faire** : rechargement forcé (Ctrl+F5 ou Cmd+Shift+R), ou attendre 1–2 min après le push pour que Vercel redéploie.

### 2. « Créée par » ou nom = URL Supabase

- **Cause** : l’URL Supabase a été collée dans le champ « Votre nom » à la connexion.
- **Correction** : supprimer la clé `restaurant-user-name` dans le **Local Storage** du navigateur (F12 → Application → Local Storage), recharger, puis ressaisir ton vrai nom.

### 3. Les tâches ne se synchronisent pas entre téléphones

- **Vérifier** : dans l’app, icône engrenage → URL Supabase + clé anon bien renseignées → Enregistrer. Le badge vert « Sync équipe » doit apparaître.
- **Vérifier Supabase** : Table Editor → table `app_storage` → le script `supabase-setup.sql` a bien été exécuté (une ligne avec `key = restaurant-tasks-shared` peut apparaître après utilisation).

### 4. Erreur au push (authentification)

- **Message** : `could not read Username` / `Device not configured`.
- **À faire** : lancer `git push origin main` **dans ton propre terminal** (pas depuis l’IDE), et utiliser ton **Personal Access Token** comme mot de passe si demandé.

### 5. Déploiement Vercel qui échoue

- **Vérifier** : Build Command = `npm run build`, Output Directory = `dist`.
- **Vérifier** : pas besoin de variables d’environnement pour faire tourner l’app (la config Supabase se fait dans l’app).

---

## Résumé

- Projet **structuré**, **build OK**, **prêt à pousser**.
- Un seul commit à faire (nettoyage + derniers correctifs), puis `git push origin main`.
- Les « erreurs » listées ci-dessus sont des **pièges courants** à corriger si tu les rencontres (cache, mauvais nom, config Supabase, auth Git, réglages Vercel).
