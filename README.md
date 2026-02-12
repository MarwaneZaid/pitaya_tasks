# Pitaya Tasks

**Tableau de bord partagé** pour la gestion des tâches (cuisine, service, nettoyage, stock) — **PITAYA BÉTHUNE**.  
Tous les managers accèdent à la même app sur **téléphone ou ordinateur** ; les tâches sont **synchronisées en temps réel** entre eux.

---

## Déploiement (pour que les managers aient l’app sur leur téléphone)

### 1. Déployer l’app

- Va sur **[vercel.com](https://vercel.com)** → **Add New Project**.
- Importe le dépôt GitHub **MarwaneZaid/pitaya_tasks** (ou uploade le dossier du projet).
- Clique sur **Deploy**. Tu obtiens une URL, par ex. : **`https://pitaya-tasks.vercel.app`**.

Aucune variable d’environnement n’est nécessaire pour cette étape.

### 2. Activer la synchronisation (une seule fois)

Pour que tout le monde voie les **mêmes tâches** (sync entre téléphones et ordinateurs) :

1. Ouvre le **lien Vercel** de ton app.
2. Connecte-toi (entre ton nom), puis clique sur l’**icône engrenage** (⚙️) en haut à droite.
3. Crée un projet gratuit sur **[supabase.com](https://supabase.com)** :
   - **New project** → nom du projet → **Create**.
   - **SQL Editor** → **New query** → copie-colle tout le contenu du fichier **`supabase-setup.sql`** (à la racine du repo) → **Run**.
   - **Project Settings** (engrenage) → **API** : copie **Project URL** et la clé **anon public**.
4. Reviens dans l’app (fenêtre « Synchronisation équipe ») : colle l’**URL Supabase** et la **clé anon** → **Enregistrer**.
5. L’app recharge : un badge **« Sync équipe »** confirme que la synchronisation est active.

### 3. Partager avec les managers

- Envoie **le même lien** (ex. `https://pitaya-tasks.vercel.app`) à tes managers (SMS, WhatsApp, etc.).
- Chacun ouvre le lien dans le **navigateur de son téléphone ou de son ordinateur**.
- Aucune installation : tout le monde voit et modifie les **mêmes tâches**, à jour en temps réel.

---

## Structure du projet

```
src/
  config/          # Planning nettoyage, constantes (catégories, filtres)
  lib/             # Stockage (Supabase + polyfill localStorage)
  components/     # LoginScreen, SettingsModal, StatsBar, PlanningCard
  Dashboard.jsx   # Tableau de bord principal
  App.jsx, main.jsx, index.css
supabase-setup.sql # Script SQL à exécuter dans Supabase (une fois)
```

---

## Développement en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173. Pour tester la sync, configure Supabase via l’icône ⚙️ dans l’app.

---

## GitHub

- Dépôt : **https://github.com/MarwaneZaid/pitaya_tasks**
- Pour pousser des changements : `git push -u origin main` (utilise un **Personal Access Token** comme mot de passe si demandé).
