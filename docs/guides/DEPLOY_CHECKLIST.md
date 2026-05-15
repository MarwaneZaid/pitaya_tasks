# Checklist déploiement DailyDo (Vercel + Supabase)

Utilisez cette liste pour une mise en production **sans surprise**. Cochez au fur et à mesure.

---

## 1. Supabase — base de données et sécurité

- Créer un projet sur [supabase.com](https://supabase.com) (région proche des utilisateurs).
- **SQL Editor** — exécuter dans cet ordre (même ordre en prod / preview / clone) :
  1. **`docs/supabase-dailydo-complete-fix.sql`** en entier (schéma, RLS, RPC, Realtime : `tasks` dans `supabase_realtime` + `REPLICA IDENTITY FULL` pour les filtres `restaurant_id`).
  2. **`docs/supabase-security-hardening.sql`** dans une **nouvelle** requête (`set_updated_at` / `search_path`, `app_storage` si présente).
- Vérifier que les tables `restaurants`, `user_roles`, `planning_templates`, `tasks` existent et que **RLS** est activé sur chacune.
- Schéma minimal hérité : `docs/supabase-mcp-fix-dailydo-saas.sql` (alignement ancien schéma ; ne remplace pas le couple canonique ci-dessus pour un nouveau projet).
- **Realtime** : **Database → Publications** → `supabase_realtime` doit lister **`public.tasks`**. En cas de doute, réexécuter la section Realtime du `complete-fix` (idempotent). Le dashboard **Realtime** du projet ne doit pas exclure cette table par une règle qui bloquerait `postgres_changes`.
- Alternative historique : `supabase-setup.sql` — vérifier RPC join / Realtime ; pour tout nouveau déploiement, préférer le couple `docs/` ci-dessus.

---

## 2. Supabase — Authentication

- **Authentication → URL configuration**  
  - **Site URL** : `https://www.dailydo-saas.app` (ou l’URL Vercel `https://<projet>.vercel.app`).  
  - **Redirect URLs** : ajoutez **toutes** les origines utiles, une par ligne :  
    - Production : `https://www.dailydo-saas.app`, `https://dailydo-saas.app` (apex si utilisé)  
    - Préprod Vercel : `https://<nom>-<team>.vercel.app`  
    - Développement : `http://localhost:5173`, `http://localhost:5174`, `http://127.0.0.1:5173`, `http://127.0.0.1:5174` (selon le port affiché par `npm run dev`)
- Flux **équipe (code seul, sans mot de passe)** : **Authentication → Providers** → activer **Anonymous** (obligatoire). Les employés entrent uniquement le code à 8 caractères ; la session est conservée sur l’appareil.
- **Confirm email** (**Authentication → Providers → Email**) : désactivé = pratique pour **dev / tests** sans boîte mail ; en **production** avec exigence de vérification, laisser **Confirm email** activé et compléter les Redirect URLs pour les liens de confirmation.
- Optionnel : variable `VITE_APP_ORIGIN` dans le build (voir `.env.example`) — doit correspondre à une **Redirect URL** autorisée si votre flux d’auth en dépend.

---

## 3. Vercel — projet et build

- Node **≥ 20** en local et sur Vercel (**Settings → General → Node.js Version** = 20.x si disponible). Le dépôt contient `.nvmrc` avec `20`.
- Importer le dépôt Git : **Add New → Project** → framework **Vite** détecté ; build `npm run build`, sortie `dist` (déjà dans `vercel.json`).
- **Settings → Environment Variables** (au minimum pour le mode SaaS « sans écran clés ») :  

  | Nom                      | Valeur                                            | Environnements                              |
  | ------------------------ | ------------------------------------------------- | ------------------------------------------- |
  | `VITE_SUPABASE_URL`      | URL du projet (Settings → API)                    | Production, Preview, Development            |
  | `VITE_SUPABASE_ANON_KEY` | Clé **anon** publique                             | Idem                                        |
  | `VITE_APP_ORIGIN`        | URL canonique du site (ex. `https://www.dailydo-saas.app`) | Idem si vous l’utilisez dans le code / auth |

- **Redeploy** après chaque modification des variables (les variables `VITE_*` sont injectées au **build**).
- Lier le dossier local (optionnel) : `npx vercel link` puis `npx vercel env pull .env.local` pour développer avec les mêmes clés qu’en preview.

---

## 4. Après déploiement

- Ouvrir l’URL de production : pas d’écran « URL + clé » si les variables `VITE_*` sont bien présentes au build.
- Parcours complet : inscription gérant → onboarding restaurant → tâche → deuxième navigateur / incognito → sync.
- **Domaine personnalisé** (`www.dailydo-saas.app`) : Vercel **Domains** + DNS ; ajouter les URLs dans Supabase **Redirect URLs**.

---

## 5. Netlify (si vous utilisez Netlify au lieu de Vercel)

- Mêmes variables `VITE_*` dans **Site settings → Environment variables**.
- Build command `npm run build`, publish directory `dist` (voir `netlify.toml`).
- Redéployer après modification des variables d’environnement.

---

## 6. MCP Supabase dans Cursor (audit distant)

Pour que l’assistant interroge votre projet (SQL, advisors) via le serveur MCP Supabase : authentifiez le serveur **plugin-supabase-supabase** quand Cursor le propose (`mcp_auth`). Sans cela, seule cette checklist et les scripts SQL locaux servent de référence.

---

## Fichiers de référence


| Fichier                                  | Rôle                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| `.env.example`                           | Modèle des variables `VITE_*` (Supabase + origine)          |
| `docs/supabase-dailydo-complete-fix.sql` | SQL canonique (schéma + RLS + RPC + Realtime `tasks` + replica identity) |
| `docs/supabase-security-hardening.sql`   | À exécuter **après** le fichier ci-dessus (`set_updated_at`, `app_storage`) |
| `docs/supabase-prod-alignment.sql`       | Alignement prod (RLS par rôle, Realtime `REPLICA IDENTITY FULL`) — déjà appliqué sur **dailydo-saas** via migration MCP |
| `docs/supabase-mcp-fix-dailydo-saas.sql` | Alignement ancien schéma → RLS + RPC join + Realtime        |
| `vercel.json`                            | Build Vite + en-têtes HTTP                                  |
| `netlify.toml`                           | Build + headers + SPA redirect                              |
