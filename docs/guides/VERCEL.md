# Déployer DailyDo sur Vercel

Ce guide explique comment mettre l’app en ligne avec **Vercel** pour que toute l’équipe y accède (téléphone et ordinateur).

**Checklist à cocher** (variables `VITE_*`, Auth Supabase, redirect URLs, Node 20) : [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md).

---

## C’est quoi Vercel ?

**Vercel** est une plateforme qui héberge des sites et applications web. Tu lui donnes ton projet (depuis GitHub ou en upload), elle le compile et te donne une **URL publique** (ex. `https://dailydo.vercel.app`).

- **Gratuit** pour des projets personnels / petites équipes
- Pas de serveur à gérer : tu déploies, le site est en ligne
- Chaque modification poussée sur GitHub peut déclencher un nouveau déploiement automatique

---

## Étapes pour déployer

### 1. Avoir le projet sur GitHub

Le code doit être sur GitHub (ton fork ou le dépôt d’équipe **App_tasks** / DailyDo).

- Si ce n’est pas fait : pousse le projet avec `git push -u origin main`.

### 2. Créer un compte Vercel

- Va sur **https://vercel.com**
- Clique sur **Sign Up** et connecte-toi avec **GitHub** (recommandé pour importer le repo facilement).

### 3. Créer un nouveau projet

1. Une fois connecté, clique sur **Add New…** → **Project**.
2. Choisis le dépôt **App_tasks** / **DailyDo** (ou importe l’URL Git du repo).
3. Si le repo n’apparaît pas : **Import Third-Party Git Repository** et colle l’URL du dépôt.

### 4. Paramètres du projet (laisser par défaut)

Vercel détecte automatiquement un projet **Vite** :

- **Framework Preset** : Vite
- **Build Command** : `npm run build` (ou vide, Vercel le met par défaut)
- **Output Directory** : `dist`
- **Install Command** : `npm install`

Pour le **mode SaaS** (aucune saisie d’URL/clé côté utilisateur), ajoutez **`VITE_SUPABASE_URL`** et **`VITE_SUPABASE_ANON_KEY`** dans **Settings → Environment Variables**, puis redeployez. Sinon, la config Supabase peut se faire dans l’app au premier lancement (sans variables sur Vercel).

### 5. Déployer

- Clique sur **Deploy**.
- Vercel clone le repo, installe les dépendances, lance `npm run build`, et met le contenu de `dist` en ligne.
- À la fin tu obtiens une URL du type : **`https://dailydo-xxxxx.vercel.app`** (ou un nom que tu as choisi).

### 6. Ouvrir l’app et configurer la synchronisation

- Ouvre le **lien Vercel** dans ton navigateur.
- Si les variables **`VITE_SUPABASE_*`** sont définies au build, l’app va directement au flux de connexion. Sinon, configure **Supabase** au premier lancement (voir [SUPABASE.md](./SUPABASE.md)).
- Envoie **ce même lien** à l’équipe.

---

## Comment configurer Supabase (icône engrenage ⚙️)

Pour que les tâches soient synchronisées entre tous les managers (téléphones et ordinateurs), il faut créer une base Supabase **une seule fois**, récupérer l’URL et la clé, puis les coller dans l’app.

### Étape A : Créer un projet Supabase (gratuit)

1. Va sur **https://supabase.com** et connecte-toi (ou crée un compte avec ton email ou GitHub).
2. Clique sur **New project**.
3. Renseigne :
   - **Name** : par ex. `dailydo-prod`
   - **Database Password** : choisis un mot de passe (note-le au cas où)
   - **Region** : une proche de toi (ex. West EU)
4. Clique sur **Create new project** et attends 1–2 minutes que le projet soit créé.

### Étape B : Créer les tables (SQL)

1. Dans le projet Supabase : **SQL Editor** → **New query**.
2. Copie tout le contenu de **`docs/supabase-dailydo-complete-fix.sql`** (recommandé) ou, en alternative, `supabase-setup.sql` à la racine.
3. **Run**. Vérifie le message de succès.

### Étape C : Récupérer l’URL et la clé anon

1. Dans Supabase, clique sur l’**icône engrenage** (⚙️) en bas à gauche : **Project Settings**.
2. Dans le menu de gauche, clique sur **API**.
3. Tu vois deux infos importantes :
   - **Project URL** : une URL du type `https://abcdefgh.supabase.co`
   - **Project API keys** : une clé nommée **anon** **public** (longue chaîne qui commence souvent par `eyJ...`)
4. Clique sur **Copy** à côté de **Project URL** et garde-la (bloc-notes ou autre).
5. Clique sur **Copy** à côté de la clé **anon public** et garde-la aussi.

### Étape D : Variables Vercel ou collage dans l’app

**Recommandé (SaaS)** : dans Vercel → **Settings → Environment Variables**, ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis **Redeploy**.

**Alternative** : ouvre l’app (lien Vercel) → premier lancement → écran de configuration → colle l’URL et la clé anon → enregistrer. Le badge **Sync active** confirme la connexion.

Dès que c’est fait, tous les managers qui ouvrent **le même lien** (sur téléphone ou ordinateur) voient et modifient les **mêmes tâches** en temps réel.

---

## Après le premier déploiement

- **Modifier le code** : tu travailles en local, tu fais `git push origin main`. Si le projet Vercel est relié à ce repo, Vercel refait un déploiement automatique et l’URL affiche la nouvelle version.
- **Voir les déploiements** : sur Vercel, dans ton projet → onglet **Deployments**.
- **Changer le nom de l’URL** : **Settings** → **Domains** pour ajouter un domaine personnalisé (ex. `www.dailydo-saas.app`).

---

## En résumé

| Étape | Action |
|-------|--------|
| 1 | Code sur GitHub (dépôt DailyDo / App_tasks) |
| 2 | Compte sur vercel.com (connexion GitHub) |
| 3 | Add New → Project → importer le repo |
| 4 | Deploy (garder les options par défaut) |
| 5 | Ouvrir l’URL → configurer Supabase (engrenage) → partager le lien aux managers |

Aucune variable d’environnement à configurer sur Vercel pour que l’app tourne ; la synchronisation se règle une fois dans l’app avec Supabase.
