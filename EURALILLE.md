# Déployer l’app pour Pitaya Euralille

L’app peut tourner pour **PITAYA EURALILLE** avec le planning Euralille (Salle/Terrasse, Toilettes, Réserves, Vestiaire, Bureau, Couloir de livraison, Plonge, Chambres froides, Laboratoire, Caisse, Cuisine).

- **Tâches « Chaque jour »** = **Quotidien obligatoire** (rouge) : même liste tous les jours, bouton **« Ajouter les tâches du jour »**.
- **Tâches « Chaque semaine »** = **Annexes** (orange) : bouton **« Ajouter les tâches de la semaine (annexes) »**. Si non faites, elles réapparaissent le lendemain (report automatique).

---

## Variables d’environnement (Vercel ou .env)

Pour un déploiement **Pitaya Euralille** :

| Variable | Valeur |
|----------|--------|
| **VITE_SITE_NAME** | `PITAYA EURALILLE` |
| **VITE_PLANNING** | `euralille` |
| **VITE_STORAGE_KEY** | `restaurant-tasks-shared-euralille` (ou autre clé unique si même Supabase) |
| **VITE_SUPABASE_URL** | URL de ton projet Supabase (nouveau ou partagé) |
| **VITE_SUPABASE_ANON_KEY** | Clé anon Supabase |

- **Nouveau projet Supabase** pour Euralille : crée le projet, exécute `supabase-setup.sql`, puis mets l’URL et la clé anon ci-dessus. Tu peux garder `VITE_STORAGE_KEY=restaurant-tasks-shared`.
- **Même projet Supabase** que BÉTHUNE : utilise une **clé différente** (`VITE_STORAGE_KEY=restaurant-tasks-shared-euralille`) pour que les tâches Euralille soient séparées.

Après avoir défini ces variables sur Vercel, redéploie. L’app affichera « PITAYA EURALILLE », le planning Euralille (quotidien + bouton tâches de la semaine), et une base de données dédiée (ou une clé dédiée).
