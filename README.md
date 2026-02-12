# Gestion des Tâches – Restaurant

App partagée pour les tâches (cuisine, service, nettoyage) avec **planning nettoyage PITAYA BÉTHUNE**. Tous les managers peuvent ouvrir le même lien sur leur téléphone et voir les mêmes tâches.

---

## Méthode simple (sans technique)

### 1. Déployer l’app (un lien pour tout le monde)

- Va sur **[vercel.com](https://vercel.com)** → **Add New Project** → importe le dossier du projet (ou ton repo GitHub).
- Clique sur **Deploy**. Tu obtiens une URL du type : **`https://ton-projet.vercel.app`**
- **Aucune variable d’environnement à configurer** pour cette étape.

### 2. Activer le partage des tâches (une seule fois)

- Ouvre ton lien Vercel.
- En haut à droite, clique sur l’**icône engrenage** (⚙️) → **Partager avec l’équipe**.
- Tu dois créer un compte gratuit sur **[supabase.com](https://supabase.com)** :
  1. **New project** → donne un nom → **Create**.
  2. **SQL Editor** → **New query** → copie-colle le contenu du fichier **`supabase-setup.sql`** (à la racine du projet) → **Run**.
  3. **Project Settings** (engrenage) → **API** → copie **Project URL** et la clé **anon public**.
- Reviens dans l’app (modal Paramètres) : colle l’**URL Supabase** et la **clé anon** → **Enregistrer**.
- L’app recharge : les tâches sont maintenant partagées pour tous ceux qui ouvrent ce lien.

### 3. Partager avec les managers

- Envoie le **même lien** (`https://ton-projet.vercel.app`) à tes managers (SMS, WhatsApp, etc.).
- Chacun l’ouvre **sur son téléphone ou ordinateur** (navigateur) : tout le monde voit et modifie les **mêmes tâches**.

Résumé : **un lien** à partager, **une config Supabase** une fois dans l’app (icône ⚙️), plus besoin de toucher à Vercel.

---

## Alternatives sans déployer cette app

Si tu veux encore plus simple, sans créer de projet :

- **[Trello](https://trello.com)** : crée un tableau, invite les gens par lien ou email, tout le monde a l’app mobile.
- **[Notion](https://notion.so)** : une page partagée avec listes de tâches, accessible sur téléphone.
- **Google Tasks** ou **Google Keep** : listes partagées, synchronisées sur tous les appareils.

Tu perds en revanche le planning nettoyage PITAYA intégré et les catégories métier de cette app.

---

## Développement en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173. Pour tester le partage en local, configure Supabase via l’icône ⚙️ dans l’app (même principe qu’en production).

---

## Mettre le projet sur GitHub

1. Va sur **https://github.com/new**.
2. Nom du repo : par ex. **`restaurant-tasks`** (ou `App_tasks`).
3. **Create repository** (sans cocher « Add README »).
4. Dans ton terminal, à la racine du projet :

```bash
cd /Users/skat/Documents/App_tasks
git remote add origin https://github.com/TON_USERNAME/restaurant-tasks.git
git push -u origin main
```

Remplace `TON_USERNAME` et `restaurant-tasks` par ton compte GitHub et le nom du repo. Si GitHub te demande de t’authentifier, utilise un **Personal Access Token** (Settings → Developer settings → Personal access tokens) à la place du mot de passe.
