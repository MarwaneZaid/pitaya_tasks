# Pitaya Tasks

**Tableau de bord partagé** pour la gestion des tâches — **PITAYA BÉTHUNE**.  
Tous les managers accèdent à la même app sur **téléphone ou ordinateur** ; les tâches sont **synchronisées** entre eux.

---

## Déploiement : une seule config, puis partager le lien

**Objectif :** Tu configures la sync **une seule fois** sur Vercel. Ensuite tu envoies **juste le lien** à tes managers : ils ouvrent, se connectent avec leur nom, et voient directement la même liste. **Aucune config à faire sur chaque téléphone ou ordinateur.**

### 1. Créer le projet Supabase (une fois)

1. Va sur **[supabase.com](https://supabase.com)** → connecte-toi ou crée un compte.
2. **New project** → nom (ex. `pitaya-tasks`), mot de passe, région → **Create**.
3. **SQL Editor** → **New query** → copie tout le contenu de **`supabase-setup.sql`** (à la racine du repo) → **Run**.
4. **Project Settings** (engrenage) → **API** : copie **Project URL** et la clé **anon public**.

### 2. Déployer sur Vercel avec la sync activée

1. Va sur **[vercel.com](https://vercel.com)** → **Add New Project** → importe le dépôt (ex. **MarwaneZaid/pitaya_tasks**).
2. **Avant** de cliquer Deploy : **Settings** du projet → **Environment Variables**.
3. Ajoute deux variables (pour Production, Preview, Development) :
   - **Name :** `VITE_SUPABASE_URL` — **Value :** l’URL Supabase (ex. `https://xxxxx.supabase.co`).
   - **Name :** `VITE_SUPABASE_ANON_KEY` — **Value :** la clé anon publique.
4. **Deploy** (ou **Redeploy** si le projet existait déjà).

Tu obtiens une URL, ex. : **`https://pitaya-tasks.vercel.app`**.

### 3. Partager avec les managers

- Envoie **ce lien** à tes managers (SMS, WhatsApp, etc.).
- Chacun ouvre le lien sur **téléphone ou ordinateur**, entre **son nom**, et voit tout de suite la **même liste** synchronisée. Aucune étape de configuration à faire sur leur appareil.

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
