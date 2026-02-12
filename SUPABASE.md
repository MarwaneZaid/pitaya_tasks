# Configurer Supabase pour Pitaya Tasks

Ce guide détaille **comment récupérer l’URL et la clé anon Supabase** et **où les coller dans l’app** (icône engrenage ⚙️) pour activer la synchronisation entre tous les managers.

---

## 1. Créer un projet Supabase (gratuit)

1. Va sur **https://supabase.com** → connecte-toi ou crée un compte.
2. **New project**.
3. **Name** : ex. `pitaya-tasks`  
   **Database Password** : choisis un mot de passe (note-le).  
   **Region** : ex. West EU (France).
4. **Create new project** → attends 1–2 minutes.

---

## 2. Créer la table (exécuter le SQL)

1. Menu de gauche → **SQL Editor**.
2. **New query**.
3. Ouvre le fichier **`supabase-setup.sql`** (à la racine du projet), copie tout son contenu.
4. Colle dans l’éditeur Supabase → **Run**.
5. Vérifie que tu vois « Success » (aucune erreur).

---

## 3. Récupérer l’URL et la clé anon

1. Menu de gauche → **Project Settings** (icône engrenage ⚙️).
2. Onglet **API**.
3. Copie :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`)
   - La clé **anon public** (ex. `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) — bouton **Copy** à côté.

---

## 4. Coller dans l’app (icône engrenage ⚙️)

1. Ouvre **ton app** (lien Vercel, ex. `https://pitaya-tasks-xxx.vercel.app`).
2. Connecte-toi avec ton nom.
3. En haut à droite, clique sur l’**icône engrenage** (⚙️).
4. Une fenêtre **« Synchronisation équipe »** s’ouvre avec deux champs :
   - **URL Supabase** → colle l’URL (étape 3).
   - **Clé anon (publique)** → colle la clé anon (étape 3).
5. Clique sur **Enregistrer**. La page recharge.
6. Si tout est bon, le badge vert **« Sync équipe »** apparaît en haut à droite.

Après ça, tous ceux qui ouvrent le même lien (téléphone ou ordinateur) voient les mêmes tâches, synchronisées en temps réel.
