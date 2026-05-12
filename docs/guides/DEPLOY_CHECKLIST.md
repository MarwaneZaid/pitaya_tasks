# Checklist déploiement DailyDo (Vercel + Supabase)

Utilisez cette liste pour une mise en production **sans surprise**. Cochez au fur et à mesure.

---

## 1. Supabase — base de données et sécurité

- Créer un projet sur [supabase.com](https://supabase.com) (région proche des utilisateurs).
- **SQL Editor** → nouvelle requête → exécuter le script `**docs/supabase-dailydo-complete-fix.sql`** (recommandé : schéma complet, RLS, RPC, realtime).  
  - Alternative : `supabase-setup.sql` à la racine — vérifiez alors que les RPC d’équipe / join par code sont bien présents (sinon rejoindre une équipe échouera).
- Vérifier que les tables `restaurants`, `user_roles`, `planning_templates`, `tasks` existent et que **RLS** est activé sur chacune.
- Schéma minimal hérité : `docs/supabase-mcp-fix-dailydo-saas.sql` (déjà appliqué sur le projet cloud **dailydo-saas** ; rejouable sur un clone).
- **Database → Replication** (ou équivalent) : confirmer que **Realtime** est activé pour la table `tasks` si vous comptez sur la sync live (le script `complete-fix` le prévoit).
- Optionnel : exécuter `**docs/supabase-security-hardening.sql`** après le schéma (corrige `set_updated_at` / `search_path`, retire l’accès `**anon`** sur `app_storage` si cette table existe).

---

## 2. Supabase — Authentication

- **Authentication → URL configuration**  
  - **Site URL** : `https://www.dailydo-saas.app` (ou l’URL Vercel `https://<projet>.vercel.app`).  
  - **Redirect URLs** : ajoutez **toutes** les origines utiles, une par ligne :  
    - Production : `https://www.dailydo-saas.app`, `https://dailydo-saas.app` (apex si utilisé)  
    - Préprod Vercel : `https://<nom>-<team>.vercel.app`  
    - Développement : `http://localhost:5173`, `http://127.0.0.1:5173`
- Si vous utilisez le flux **équipe / code d’invitation** sans e-mail classique : **Authentication → Providers** → activer **Anonymous**.
- Pour des tests rapides sans valider la boîte mail : **Authentication → Providers → Email** → désactiver **Confirm email** (à réactiver en prod stricte si besoin).
- Optionnel : variable `**VITE_APP_ORIGIN`** dans le build (voir `.env.example`) — doit correspondre à une **Redirect URL** autorisée si votre flux d’auth en dépend.

---

## 3. Vercel — projet et build

- Node **≥ 20** en local et sur Vercel (**Settings → General → Node.js Version** = 20.x si disponible). Le dépôt contient `.nvmrc` avec `20`.
- Importer le dépôt Git : **Add New → Project** → framework **Vite** détecté ; build `npm run build`, sortie `**dist`** (déjà dans `vercel.json`).
- **Settings → Environment Variables** (au minimum pour le mode SaaS « sans écran clés ») :  

  | Nom                      | Valeur                                            | Environnements                              |
  | ------------------------ | ------------------------------------------------- | ------------------------------------------- |
  | `VITE_SUPABASE_URL`      | URL du projet (Settings → API)                    | Production, Preview, Development            |
  | `VITE_SUPABASE_ANON_KEY` | Clé **anon** publique                             | Idem                                        |
  | `VITE_APP_ORIGIN`        | URL canonique du site (ex. `https://www.dailydo-saas.app`) | Idem si vous l’utilisez dans le code / auth |

- **Redeploy** après chaque modification des variables (les `VITE_`* sont injectées au **build**).
- Lier le dossier local (optionnel) : `npx vercel link` puis `npx vercel env pull .env.local` pour développer avec les mêmes clés qu’en preview.

---

## 4. Après déploiement

- Ouvrir l’URL de production : pas d’écran « URL + clé » si les `VITE_`* sont bien présentes au build.
- Parcours complet : inscription gérant → onboarding restaurant → tâche → deuxième navigateur / incognito → sync.
- **Domaine personnalisé** (`www.dailydo-saas.app`) : Vercel **Domains** + DNS ; ajouter les URLs dans Supabase **Redirect URLs**.

---

## 5. Netlify (si vous utilisez Netlify au lieu de Vercel)

- Mêmes variables `VITE_`* dans **Site settings → Environment variables**.
- Build command `npm run build`, publish directory `**dist`** (voir `netlify.toml`).
- Redéployer après modification des variables d’environnement.

---

## 6. MCP Supabase dans Cursor (audit distant)

Pour que l’assistant interroge votre projet (SQL, advisors) via le serveur MCP Supabase : authentifiez le serveur **plugin-supabase-supabase** quand Cursor le propose (`mcp_auth`). Sans cela, seule cette checklist et les scripts SQL locaux servent de référence.

---

## Fichiers de référence


| Fichier                                  | Rôle                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| `.env.example`                           | Modèle des variables `VITE_`*                               |
| `docs/supabase-dailydo-complete-fix.sql` | SQL idempotent recommandé (schéma + RLS + RPC)              |
| `docs/supabase-security-hardening.sql`   | Durcissement post-install (`set_updated_at`, `app_storage`) |
| `docs/supabase-mcp-fix-dailydo-saas.sql` | Alignement ancien schéma → RLS + RPC join + Realtime        |
| `vercel.json`                            | Build Vite + en-têtes HTTP                                  |
| `netlify.toml`                           | Build + headers + SPA redirect                              |
