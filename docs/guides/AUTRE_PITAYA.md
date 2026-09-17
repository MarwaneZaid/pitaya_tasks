# Ajouter un autre restaurant Pitaya (DailyDo SaaS)

DailyDo est **multi-tenant** sur **un seul** projet Supabase (`dailydo-saas`) + Auth/RLS.
Chaque restaurant = une ligne `restaurants` + des `user_roles`. **Pas** besoin d’un second
déploiement Vercel ni d’une clé `VITE_STORAGE_KEY` (modèle obsolète `app_storage`).

---

## Option recommandée : même app, nouveau restaurant

1. Ouvrir **https://www.dailydo-saas.app**
2. Onglet **Gérant** → créer le compte avec le **nom du restaurant** + mot de passe
3. Configurer planning / checklists
4. **Équipe** → partager le **code d’invitation** (rotatif, expire)
5. L’équipe rejoint via **Équipe** (prénom + code) — session anonyme sur la tablette

Les données sont isolées par `restaurant_id` (RLS). Un employé / gérant = **un** restaurant.

---

## Quand créer un second projet Supabase ?

Seulement si vous voulez une **isolation totale** (autre client, autre facturation Magensy, autre région) :

1. Nouveau projet Supabase
2. Exécuter dans l’ordre (voir `docs/guides/DEPLOY_CHECKLIST.md`) :
   - `docs/supabase-dailydo-complete-fix.sql`
   - `docs/supabase-security-hardening.sql`
   - `docs/supabase-phase1-ops.sql` (si ops / checklists)
   - `docs/supabase-p0-hardening.sql`
   - `docs/supabase-p1-team-deadline.sql`
3. Nouveau projet Vercel pointant sur le **même** dépôt, avec :
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` du **nouveau** projet
4. Auth → activer **Anonymous** (accès équipe par code)

Ne plus utiliser `VITE_STORAGE_KEY` pour séparer les Pitaya : ce n’est plus le modèle Auth.

---

## Récap

| Besoin | Approche |
|--------|----------|
| 2e / 3e Pitaya (même boîte) | Créer un restaurant dans la même app |
| Client totalement séparé | Nouveau projet Supabase + Vercel |
| Inviter l’équipe | Code 8 caractères + prénom |
| Promouvoir un manager | Gérant → Équipe → Membres → ↑ |
