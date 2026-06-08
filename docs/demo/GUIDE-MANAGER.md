# DailyDo — Guide manager (Pitaya Béthune)

Vidéo : `dailydo-demo-managers.mp4` (~56 s, texte explicatif intégré)

## Connexion

1. Ouvrez **www.dailydo-saas.app** (ou `http://localhost:5173` en local).
2. Onglet **Gérant**.
3. Saisissez le **nom du restaurant** et votre **mot de passe** (6 caractères minimum).
4. **Se connecter**.

## Tableau de bord

- **Sync active** : la liste est partagée en temps réel avec toute l’équipe.
- Les **tâches du jour** (planning) sont **ajoutées automatiquement** à chaque ouverture.
- Les cartes **Total / Terminées / En cours / Urgentes** donnent une vue rapide.

## Faire avancer une tâche

Cliquez sur l’icône à gauche de chaque tâche :

1. **À faire** (cercle vide)
2. **En cours** (icône orange) — vous pouvez saisir une **note / preuve**
3. **Terminée** (coche verte)

Un nouveau clic repasse la tâche à « À faire ».

## Planning nettoyage (gérant uniquement)

1. Icône **crayon orange** → **Configuration du restaurant**.
2. Onglets **Lundi** à **Dimanche** : saisissez les tâches indispensables du jour.
3. **Enregistrer la configuration**.

Les tâches configurées se recréent chaque matin sans action manuelle.

## Inviter l’équipe

1. Icône **Équipe** (personnes).
2. **Copier le code** à 8 caractères.
3. Les employés : onglet **Équipe** → entrent le code → **pas de mot de passe**.

## Checklists ouverture / fermeture

1. Icône **presse-papiers** → modèles **Ouverture**, **Fermeture**, etc.
2. Ajoutez les étapes et priorités → **Enregistrer**.
3. Sur le tableau : **Générer les checklists** pour créer les tâches du jour.

## Suivi et filtres

- **Exécution du jour** : barre de progression en %.
- **Filtres** : Toutes, Quotidien, Annexe, par **poste** (cuisine, salle, bar, stock).
- Bouton **↻ Actualiser** pour forcer la synchronisation.

## Régénérer la vidéo démo

```bash
./scripts/build-demo-video.sh
```
