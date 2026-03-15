# Déployer Pitaya Tasks sur Vercel

Ce guide explique comment mettre l’app en ligne avec **Vercel** pour que tous les managers puissent y accéder (téléphone et ordinateur).

---

## C’est quoi Vercel ?

**Vercel** est une plateforme qui héberge des sites et applications web. Tu lui donnes ton projet (depuis GitHub ou en upload), elle le compile et te donne une **URL publique** (ex. `https://pitaya-tasks.vercel.app`).

- **Gratuit** pour des projets personnels / petites équipes
- Pas de serveur à gérer : tu déploies, le site est en ligne
- Chaque modification poussée sur GitHub peut déclencher un nouveau déploiement automatique

---

## Étapes pour déployer

### 1. Avoir le projet sur GitHub

Le code doit être sur GitHub (par ex. **MarwaneZaid/pitaya_tasks**).

- Si ce n’est pas fait : pousse le projet avec `git push -u origin main`.

### 2. Créer un compte Vercel

- Va sur **https://vercel.com**
- Clique sur **Sign Up** et connecte-toi avec **GitHub** (recommandé pour importer le repo facilement).

### 3. Créer un nouveau projet

1. Une fois connecté, clique sur **Add New…** → **Project**.
2. Tu vois la liste de tes dépôts GitHub. Choisis **pitaya_tasks** (ou le nom de ton repo).
3. Si le repo n’apparaît pas : **Import Third-Party Git Repository** et colle l’URL du repo (ex. `https://github.com/MarwaneZaid/pitaya_tasks`).

### 4. Paramètres du projet (laisser par défaut)

Vercel détecte automatiquement un projet **Vite** :

- **Framework Preset** : Vite
- **Build Command** : `npm run build` (ou vide, Vercel le met par défaut)
- **Output Directory** : `dist`
- **Install Command** : `npm install`

Tu n’as **pas besoin** de remplir de **Environment Variables** pour faire fonctionner l’app (la config Supabase se fait dans l’app, via l’icône engrenage).

### 5. Déployer

- Clique sur **Deploy**.
- Vercel clone le repo, installe les dépendances, lance `npm run build`, et met le contenu de `dist` en ligne.
- À la fin tu obtiens une URL du type : **`https://pitaya-tasks-xxxxx.vercel.app`** (ou un nom que tu as choisi).

### 6. Ouvrir l’app et configurer la synchronisation

- Ouvre le **lien Vercel** dans ton navigateur.
- Entre ton nom pour accéder au tableau de bord.
- Clique sur l’**icône engrenage** (⚙️) et configure **Supabase** (voir la section ci‑dessous).
- Envoie **ce même lien** à tes managers : ils l’ouvrent sur leur téléphone ou ordinateur.

---

## Comment configurer Supabase (icône engrenage ⚙️)

Pour que les tâches soient synchronisées entre tous les managers (téléphones et ordinateurs), il faut créer une base Supabase **une seule fois**, récupérer l’URL et la clé, puis les coller dans l’app.

### Étape A : Créer un projet Supabase (gratuit)

1. Va sur **https://supabase.com** et connecte-toi (ou crée un compte avec ton email ou GitHub).
2. Clique sur **New project**.
3. Renseigne :
   - **Name** : par ex. `pitaya-tasks`
   - **Database Password** : choisis un mot de passe (note-le au cas où)
   - **Region** : une proche de toi (ex. West EU)
4. Clique sur **Create new project** et attends 1–2 minutes que le projet soit créé.

### Étape B : Créer la table (SQL)

1. Dans le projet Supabase, clique sur **SQL Editor** dans le menu de gauche.
2. Clique sur **New query**.
3. Ouvre le fichier **`supabase-setup.sql`** à la racine du projet Pitaya Tasks (dans ton ordinateur ou sur GitHub).
4. Copie **tout** son contenu et colle-le dans l’éditeur SQL Supabase.
5. Clique sur **Run** (ou Ctrl+Entrée). Tu dois voir un message du type « Success ».

### Étape C : Récupérer l’URL et la clé anon

1. Dans Supabase, clique sur l’**icône engrenage** (⚙️) en bas à gauche : **Project Settings**.
2. Dans le menu de gauche, clique sur **API**.
3. Tu vois deux infos importantes :
   - **Project URL** : une URL du type `https://abcdefgh.supabase.co`
   - **Project API keys** : une clé nommée **anon** **public** (longue chaîne qui commence souvent par `eyJ...`)
4. Clique sur **Copy** à côté de **Project URL** et garde-la (bloc-notes ou autre).
5. Clique sur **Copy** à côté de la clé **anon public** et garde-la aussi.

### Étape D : Coller dans l’app Pitaya Tasks

1. Ouvre **ton app** (le lien Vercel, ex. `https://pitaya-tasks-xxx.vercel.app`).
2. Connecte-toi avec ton nom si besoin.
3. En haut à droite, clique sur l’**icône engrenage** (⚙️). Une fenêtre **« Synchronisation équipe »** s’ouvre.
4. Dans le champ **URL Supabase** : colle l’URL copiée (ex. `https://xxxxx.supabase.co`).
5. Dans le champ **Clé anon (publique)** : colle la clé anon copiée (ex. `eyJhbGciOiJIUzI1NiIs...`).
6. Clique sur **Enregistrer**. La page se recharge.
7. Tu dois voir apparaître le badge vert **« Sync équipe »** en haut à droite : la synchronisation est active.

Dès que c’est fait, tous les managers qui ouvrent **le même lien** (sur téléphone ou ordinateur) voient et modifient les **mêmes tâches** en temps réel.

---

## Après le premier déploiement

- **Modifier le code** : tu travailles en local, tu fais `git push origin main`. Si le projet Vercel est relié à ce repo, Vercel refait un déploiement automatique et l’URL affiche la nouvelle version.
- **Voir les déploiements** : sur Vercel, dans ton projet → onglet **Deployments**.
- **Changer le nom de l’URL** : **Settings** → **Domains** pour ajouter un sous-domaine personnalisé (ex. `pitaya.vercel.app` si dispo).

---

## En résumé

| Étape | Action |
|-------|--------|
| 1 | Code sur GitHub (ex. `MarwaneZaid/pitaya_tasks`) |
| 2 | Compte sur vercel.com (connexion GitHub) |
| 3 | Add New → Project → importer le repo |
| 4 | Deploy (garder les options par défaut) |
| 5 | Ouvrir l’URL → configurer Supabase (engrenage) → partager le lien aux managers |

Aucune variable d’environnement à configurer sur Vercel pour que l’app tourne ; la synchronisation se règle une fois dans l’app avec Supabase.
