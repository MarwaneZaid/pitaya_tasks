# Résumé du projet — Pitaya Tasks

## C’est quoi ?

**Pitaya Tasks** est une application web de **gestion des tâches** pour l’équipe **PITAYA BÉTHUNE**.  
Tableau de bord partagé : tous les managers voient et modifient la **même liste** sur téléphone et ordinateur.

---

## Pour qui ?

- **Managers** du restaurant (ex. marwane, nour)
- Utilisation sur **téléphone** ou **ordinateur** (navigateur, pas d’app à installer)

---

## Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Tâches** | Créer, cocher, supprimer des tâches. Auteur et personne qui termine enregistrés. |
| **Types** | Quotidien obligatoire (rouge), Annexe (orange), À faire dans la semaine (vert). |
| **Planning** | Bouton « Ajouter les tâches du jour » pour insérer les tâches de nettoyage du planning (lundi–dimanche). |
| **Report annexes** | Les tâches annexes non faites sont reportées automatiquement au lendemain. |
| **Rappel** | Après 18 h, alerte si des tâches ne sont pas réalisées. |
| **Sync équipe** | Avec Supabase : config une fois sur Vercel (variables d’env) ou via réglages dans l’app. Tout le monde voit la même liste. |
| **Sans Supabase** | L’app fonctionne en local sur un seul appareil (liste propre à l’appareil). |

**Recommandation (plusieurs personnes) :** Configurer **une seule fois** sur Vercel (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), puis **partager le lien**. Les managers ouvrent le lien, entrent leur nom, et voient la même liste sans rien configurer sur leur appareil.

---

## Technique

- **Front** : React, Vite, Tailwind CSS
- **Données** : 
  - **Sans config** : `localStorage` (une liste par appareil)
  - **Avec config** : Supabase (une liste partagée pour tous)
- **Déploiement** : Vercel (ou Netlify) — une URL à partager avec les managers
- **Config Supabase** : soit **une fois sur Vercel** (variables d’env), puis partager le lien ; soit dans l’app (icône engrenage) sur chaque appareil avec la même URL et clé

---

## Fichiers importants

- **`src/Dashboard.jsx`** — écran principal (liste, formulaire, filtres, rappel)
- **`src/config/planning.js`** — tâches de nettoyage par jour
- **`src/config/constants.js`** — types de tâches, couleurs, clés
- **`src/lib/storage-supabase.js`** — lecture/écriture Supabase
- **`src/lib/storage-polyfill.js`** — fallback localStorage
- **`supabase-setup.sql`** — à exécuter une fois dans Supabase pour créer la table
- **`SUPABASE.md`** — guide pas à pas pour configurer Supabase
- **`README.md`** — déploiement et structure

---

## En une phrase

Application de tâches partagées pour les managers de PITAYA BÉTHUNE, utilisable sur téléphone et PC, avec synchronisation via Supabase (optionnel).
