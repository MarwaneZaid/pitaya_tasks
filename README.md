# DailyDo — Tableau de bord partagé pour restaurants

**Site : [dailydo.app](https://dailydo.app)** (à brancher sur Vercel comme domaine personnalisé une fois le DNS configuré).

Application de gestion de tâches en temps réel pour équipes de restaurant. Un backend Supabase peut servir tous les établissements ; chaque restaurant est isolé dans la base (droits et données).

---

## Fonctionnalités

- **Synchronisation en temps réel** entre tous les appareils (téléphones, PC)
- **3 rôles** : Gérant (owner), Manager, Employé — avec permissions différentes
- **3 types de tâches** : Quotidien obligatoire 🔴 · Annexe 🟠 · Semaine 🟢
- **Report automatique** : les tâches annexes non faites sont reportées au lendemain
- **Planning hebdomadaire** : configurez les tâches récurrentes par jour de la semaine
- **Déploiement SaaS** : avec `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` sur l’hébergeur, les utilisateurs n’ont pas à coller de clés ; sinon mode setup manuel au premier lancement

---

## Déploiement

### Option A — App autonome (revendue à plusieurs restaurants)

1. Déployez l'app sur **[Vercel](https://vercel.com)** ou **[Netlify](https://netlify.com)** en important ce dépôt
2. Partagez l'URL avec vos clients restaurants
3. Chaque restaurant configure sa propre base Supabase au premier lancement (voir ci-dessous)

### Option B — Un seul restaurant, credentials en dur

Ajoutez ces variables d'environnement sur Vercel/Netlify avant de déployer :
- `VITE_SUPABASE_URL` → URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` → Clé anon publique

---

## Guide de configuration pour chaque restaurant

### 1. Créer un projet Supabase (gratuit, sans carte bancaire)

1. Allez sur [supabase.com](https://supabase.com) → **New project**
2. Choisissez un nom (ex. `mon-restaurant`), un mot de passe, une région → **Create**
3. Attendez la création (~30 secondes)

### 2. Exécuter le script SQL

1. Dans Supabase : **SQL Editor** → **New query**
2. Copiez tout le contenu de **`docs/supabase-dailydo-complete-fix.sql`** (schéma, RLS, RPC `create_restaurant` + `join_restaurant_by_invite_code`, realtime sur les tâches). Alternative historique : `supabase-setup.sql` à la racine — vérifiez alors que les RPC et le join par code sont bien déployés (voir le fichier `docs/` ci-dessus).
3. Cliquez **Run**

> **Authentication → Providers** : activez **Anonymous** si vous utilisez le flux « équipe + code » sans e-mail.  
> Si une ligne en fin de `supabase-setup.sql` provoque une erreur, ignorez-la et désactivez la confirmation e-mail dans **Authentication → Email** → décochez « Enable email confirmations ».

### 3. Récupérer les credentials

Dans Supabase : **Project Settings** → **API**
- Copiez **Project URL** (ex. `https://xxxxx.supabase.co`)
- Copiez la clé **anon public** (commence par `eyJ...`)

### 4. Configurer l'app

Au premier lancement, l'app affiche un écran de configuration.
Entrez l'URL et la clé → **Tester la connexion** → **Lancer l'application**.

---

## Gestion des rôles et de l'équipe

| Rôle | Symbole | Permissions |
|------|---------|-------------|
| Gérant | 👑 | Tout : configuration, planning, équipe, ajout/suppression, réinitialisation |
| Manager | 🔑 | Ajout, suppression, validation de tâches + gestion équipe |
| Employé | 👤 | Cocher les tâches terminées uniquement |

### Inviter un membre de l'équipe

1. Le gérant se connecte → icône **Équipe** (👥) → onglet **Inviter**
2. Copier le **code d'invitation** (8 caractères)
3. Le nouveau membre ouvre l'app, crée un compte, puis va dans **Équipe** → **Rejoindre** et saisit le code

---

## Types de tâches

| Type | Comportement |
|------|-------------|
| 🔴 Quotidien obligatoire | Générées automatiquement chaque jour depuis le planning |
| 🟠 Annexe | Reportées automatiquement au lendemain si non terminées |
| 🟢 Semaine | À faire dans la semaine, sans report automatique |

---

## Développement local

```bash
npm install
npm run dev
# Ouvre http://localhost:5173
# Entrez vos credentials Supabase au premier lancement
```

```bash
npm test   # Lancer les tests
```

---

## Structure du projet

```
src/
  config/           # Constantes et configuration du planning
  lib/              # Supabase client, DB, taskRollover, utilitaires
  components/       # SetupScreen, LoginScreen, Onboarding, TaskItem, ...
  Dashboard.jsx     # Tableau de bord principal avec gestion des rôles
  App.jsx           # Point d'entrée (setup flow → login → dashboard)
supabase-setup.sql  # Script SQL à exécuter dans Supabase (une seule fois)
```
