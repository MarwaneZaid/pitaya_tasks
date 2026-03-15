# Déployer la même app pour un autre Pitaya (base de données différente)

Tu peux utiliser **le même code** pour un deuxième restaurant Pitaya (ex. PITAYA LYON) avec une **base de données séparée**. Deux façons de faire :

---

## Option 1 : Un seul dépôt, deux déploiements Vercel (recommandé)

1. **Crée un nouveau projet sur Vercel** (ou une deuxième “équipe” / projet) qui pointe vers **le même dépôt GitHub** que Pitaya BÉTHUNE.

2. **Configure les variables d’environnement** pour ce nouveau déploiement :
   - **`VITE_SITE_NAME`** = le nom affiché partout, ex. `PITAYA LYON`
   - **`VITE_STORAGE_KEY`** = une clé unique pour les tâches, ex. `restaurant-tasks-shared-pitaya-lyon`  
     → Même projet Supabase possible : une clé = une liste de tâches. Chaque Pitaya a sa propre liste.
   - **`VITE_SUPABASE_URL`** et **`VITE_SUPABASE_ANON_KEY`** :
     - soit **un nouveau projet Supabase** (base totalement séparée),
     - soit **le même projet** que BÉTHUNE : dans ce cas seule la clé `VITE_STORAGE_KEY` change, les données sont séparées par clé.

3. **Déploie**. Tu obtiens une **deuxième URL** (ex. `pitaya-tasks-lyon.vercel.app`). C’est la même appli, avec un autre nom et une autre base (nom + clé de stockage différents).

**Résumé :**  
- BÉTHUNE : pas de `VITE_SITE_NAME` / `VITE_STORAGE_KEY` (ou les laisser par défaut) + ton Supabase actuel.  
- Autre Pitaya : `VITE_SITE_NAME` = nom du site, `VITE_STORAGE_KEY` = clé unique, et soit même Supabase (données séparées par clé), soit autre projet Supabase.

---

## Option 2 : Projet Supabase dédié pour l’autre Pitaya

Si tu veux une **base de données entièrement séparée** (autre projet Supabase) :

1. Crée un **nouveau projet** sur [supabase.com](https://supabase.com).
2. Dans ce projet : **SQL Editor** → exécute le même script **`supabase-setup.sql`** que pour BÉTHUNE.
3. **Project Settings** → **API** : récupère la **Project URL** et la clé **anon**.
4. Sur **Vercel** (nouveau projet pour l’autre Pitaya), définis :
   - **`VITE_SITE_NAME`** = ex. `PITAYA LYON`
   - **`VITE_STORAGE_KEY`** = ex. `restaurant-tasks-shared` (tu peux garder la même clé car la base est différente)
   - **`VITE_SUPABASE_URL`** = l’URL du **nouveau** projet Supabase
   - **`VITE_SUPABASE_ANON_KEY`** = la clé anon du **nouveau** projet
5. Déploie. Cette instance a sa propre base, rien en commun avec BÉTHUNE.

---

## Récap des variables par déploiement

| Variable | BÉTHUNE (défaut) | Autre Pitaya (ex. LYON) |
|----------|-------------------|--------------------------|
| `VITE_SITE_NAME` | (optionnel) PITAYA BÉTHUNE | PITAYA LYON |
| `VITE_STORAGE_KEY` | (optionnel) restaurant-tasks-shared | restaurant-tasks-shared-pitaya-lyon (si même Supabase) |
| `VITE_SUPABASE_URL` | ton projet actuel | même ou nouveau projet |
| `VITE_SUPABASE_ANON_KEY` | clé actuelle | même ou nouvelle clé |

Une fois configuré, tu partages simplement **le lien** du déploiement (BÉTHUNE ou autre) aux managers concernés ; chaque lien = un site + une base de données.
