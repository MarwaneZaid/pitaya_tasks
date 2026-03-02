# Configurer Supabase pour Pitaya Tasks

Deux façons d’activer la synchronisation :

---

## Solution recommandée : config une fois sur Vercel (puis partager le lien)

Tu configures **une seule fois** sur le déploiement Vercel. Ensuite tu envoies juste le **lien** aux managers : ils ouvrent, entrent leur nom, et voient la même liste. **Aucune config à faire sur chaque téléphone ou ordinateur.**

1. **Créer un projet Supabase** (gratuit) sur [supabase.com](https://supabase.com) → New project.
2. **SQL Editor** → New query → coller le contenu de **`supabase-setup.sql`** → Run.
3. **Project Settings** → **API** : copier **Project URL** et la clé **anon public**.
4. Sur **Vercel** : ton projet → **Settings** → **Environment Variables**. Ajouter :
   - **`VITE_SUPABASE_URL`** = l’URL Supabase
   - **`VITE_SUPABASE_ANON_KEY`** = la clé anon
5. **Redeploy** le projet. Ensuite : partager l’URL de l’app (ex. `https://pitaya-tasks.vercel.app`) aux managers. Ils n’ont rien à configurer.

---

## Alternative : configurer dans l’app (icône engrenage)

Si tu ne peux pas utiliser les variables d’environnement sur Vercel, chaque personne peut configurer la sync **sur son appareil** :

1. Créer le projet Supabase et exécuter **`supabase-setup.sql`** (étapes 1–2 ci-dessus).
2. **Project Settings** → **API** : copier l’URL et la clé anon.
3. Sur **chaque** téléphone/ordinateur : ouvrir l’app → icône **engrenage** → coller l’URL et la clé → **Enregistrer**.

Tous doivent utiliser **la même** URL et **la même** clé pour voir la même liste.
