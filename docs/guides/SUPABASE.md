# Configurer Supabase pour DailyDo

Deux façons d’activer la synchronisation. Le script SQL **recommandé** est **`docs/supabase-dailydo-complete-fix.sql`** (RPC équipe, RLS, index, realtime). L’ancien fichier racine `supabase-setup.sql` reste une alternative si vous maintenez un schéma compatible.

**Checklist complète (Vercel + Auth + variables)** : [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md).

---

## Solution recommandée : config une fois sur Vercel (puis partager le lien)

Vous configurez **une seule fois** sur le déploiement Vercel. Ensuite vous partagez le **lien** : les utilisateurs ouvrent l’app sans coller d’URL ni de clé sur leur téléphone.

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com) → New project.
2. **SQL Editor** → New query → coller le contenu de **`docs/supabase-dailydo-complete-fix.sql`** → Run.
3. **Project Settings** → **API** : copier **Project URL** et la clé **anon public**.
4. Sur **Vercel** : projet → **Settings** → **Environment Variables** :  
   - **`VITE_SUPABASE_URL`**  
   - **`VITE_SUPABASE_ANON_KEY`**  
   Optionnel : **`VITE_APP_ORIGIN`** (voir `.env.example`) — à déclarer aussi dans Supabase **Authentication → URL configuration → Redirect URLs**.
5. **Redeploy** le projet. Partager l’URL de l’app (ex. `https://www.dailydo-saas.app` ou `https://<projet>.vercel.app`).

**Authentication** : activer **Anonymous** si vous utilisez le flux équipe par code ; ajouter toutes les URLs d’app (prod, preview Vercel, `http://localhost:5173`) dans **Redirect URLs**.

---

## Alternative : configurer dans l’app (sans variables sur l’hébergeur)

1. Créer le projet Supabase et exécuter le script SQL (même fichier **`docs/supabase-dailydo-complete-fix.sql`** recommandé).
2. **Project Settings** → **API** : copier l’URL et la clé anon.
3. Sur **chaque** appareil : premier lancement → écran de configuration → URL + clé → enregistrer.

Tous doivent utiliser **la même** URL et **la même** clé pour la même équipe.
