# DailyDo — Guide de démarrage étape par étape

Objectif : passer de zéro à votre **premier client restaurant payant**, avec statut juridique, paiements Revolut et mise en service DailyDo.

> Ce guide est pratique, pas un avis juridique. Validez le statut et la fiscalité avec un expert-comptable si besoin.

---

## Vue d'ensemble

```
Étape 1  → Choisir votre statut (micro-entreprise recommandé au début)
Étape 2  → Créer l'entreprise
Étape 3  → Ouvrir Revolut Business + compte Merchant
Étape 4  → Configurer les paiements (setup + abonnement)
Étape 5  → Préparer la vente (démo + messages)
Étape 6  → Signer le 1er client
Étape 7  → Encaisser (setup puis abonnement)
Étape 8  → Configurer DailyDo pour le restaurant
Étape 9  → Former le manager
Étape 10 → Suivre l'abonnement chaque mois
```

Durée estimée avant le 1er client : **3 à 7 jours**.

---

## Étape 1 — Choisir le type de société

### Option A — Micro-entreprise (recommandé pour démarrer)

Choisissez cette option si :
- vous êtes seul ;
- vous visez 3 à 15 restaurants au début ;
- vous voulez le minimum d'administration.

| Critère | Détail |
|---------|--------|
| Activité à déclarer | **Programmation informatique** ou **Édition de logiciels applicatifs** |
| Plafond CA 2026 | **83 600 € HT / an** (prestations de services) |
| TVA | Franchise en base possible (pas de TVA sur facture) sous un certain seuil |
| Coût création | Gratuit en ligne |
| Compta | Déclaration CA mensuelle ou trimestrielle sur URSSAF |

**Ordre de grandeur DailyDo :**
- 10 restos × 79 €/mois ≈ 9 500 €/an → OK en micro-entreprise
- 30 restos ≈ 28 000 €/an → OK
- 80+ restos → envisager SASU

### Option B — SASU (quand vous scalez)

Passez en SASU quand :
- vous avez **15+ clients** ou CA > ~50 000 €/an ;
- un client demande une facture « société » ;
- vous voulez déduire vos frais (Vercel, Supabase, etc.).

| Critère | Détail |
|---------|--------|
| Forme | SASU (SAS à associé unique) |
| Capital | 100 € minimum (souvent suffisant) |
| Coût création | ~200 à 500 € (greffe + annonce légale) |
| Compta | Expert-comptable obligatoire (~80–150 €/mois) |
| Facturation | HT + TVA 20 % (ex. 79 € HT = 94,80 € TTC) |

### Décision rapide

| Situation | Choix |
|-----------|-------|
| 1er à 10 clients locaux | **Micro-entreprise** |
| 15+ clients ou image corporate | **SASU** |

---

## Étape 2 — Créer l'entreprise

### Si micro-entreprise

1. Aller sur [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr)
2. Créer le compte et remplir le formulaire
3. Choisir l'activité : **Programmation informatique** (code APE 62.01Z) ou équivalent édition logiciel
4. Indiquer le début d'activité (date du jour ou date proche)
5. Noter votre **SIRET** (reçu par mail sous 1 à 15 jours)
6. Choisir le régime fiscal micro-entreprise

**Checklist :**
- [ ] SIRET reçu
- [ ] Activité déclarée (SaaS / logiciel)
- [ ] Compte URSSAF actif

### Si SASU

1. Rédiger les statuts (modèle en ligne ou avocat / formaliste)
2. Déposer le capital (100 € minimum sur compte bloqué)
3. Publier l'annonce légale
4. Immatriculer au greffe (Infogreffe)
5. Obtenir le **KBIS** et le **SIRET**
6. Choisir un expert-comptable

**Checklist :**
- [ ] KBIS reçu
- [ ] SIRET actif
- [ ] Compte bancaire société ouvert
- [ ] Expert-comptable contacté

---

## Étape 3 — Ouvrir Revolut Business

1. Télécharger l'app **Revolut Business** ou aller sur [revolut.com/business](https://www.revolut.com/fr-FR/business/)
2. Choisir le plan **Grow** (suffisant pour démarrer)
3. Créer le compte au nom de votre entreprise (micro-entreprise ou SASU)
4. Fournir : pièce d'identité, justificatif d'activité, SIRET
5. Attendre la validation (souvent 1 à 3 jours)

### Activer le compte Merchant (obligatoire pour encaisser)

1. Dans Revolut Business → **Merchant** (ou **Paiements en ligne**)
2. Compléter la vérification commerçant
3. Décrire l'activité : *« Logiciel SaaS de gestion des tâches pour restaurants »*
4. Attendre l'activation Merchant

**Checklist :**
- [ ] Compte Revolut Business validé
- [ ] IBAN français disponible
- [ ] Compte Merchant activé

---

## Étape 4 — Configurer les paiements Revolut

### 4.1 — Lien de paiement SETUP (one-shot)

Pour l'offre lancement : **145 €** (au lieu de 290 €).

1. Revolut Business → **Merchant** → **Liens de paiement** → **Créer**
2. Nom : `DailyDo — Setup + formation`
3. Montant : **145 €** (ou 290 € tarif normal)
4. Type : **Paiement unique**
5. Description : *Configuration planning, checklists, formation manager 45–60 min*
6. Enregistrer le lien → copier l'URL

Répéter pour le tarif normal si besoin (290 €).

### 4.2 — Abonnement mensuel

Pour l'offre lancement : **59 €/mois** (3 mois), puis **79 €/mois**.

1. Revolut Business → **Merchant** → **Abonnements** → **Créer un plan**
2. Nom : `DailyDo Starter`
3. Prix : **59 €** (offre lancement) ou **79 €** (tarif standard)
4. Fréquence : **Mensuel**
5. Mode : **Prélèvement automatique** (recommandé)
6. Enregistrer → copier le lien d'inscription abonnement

**Astuce offre 59 € × 3 mois :**
- Créer un plan à 59 €/mois ;
- Après 3 mois, modifier manuellement l'abonnement client à 79 € dans Revolut ;
- Ou créer 2 plans distincts (Lancement / Standard).

### 4.3 — Facturation (optionnel mais pro)

1. Revolut Business → **Factures**
2. Créer un modèle avec votre logo, SIRET, mentions légales
3. Associer les moyens de paiement (carte, virement)

**Mentions obligatoires sur facture** — modèles complets : `docs/sales/FACTURATION_MAGENSY.md`

```
ZAID MOHAMMED
Magensy — DailyDo
Entrepreneur individuel · Micro-entreprise

Bât. C4 App 2142, 53 rue du Maréchal Lyautey, 59370 Mons-en-Barœul
SIRET : 944 772 433 00016 · TVA : FR09944772433 · APE : 7021Z

TVA non applicable, art. 293 B du CGI  ← si franchise TVA
```

**Checklist :**
- [ ] Lien setup 145 € créé
- [ ] Plan abonnement 59 € ou 79 € créé
- [ ] Modèle de facture prêt

---

## Étape 5 — Préparer la vente

### Documents à avoir sous la main

- [ ] App DailyDo ouverte : [dailydo-saas.app](https://dailydo-saas.app)
- [ ] Grille tarifaire : `docs/sales/PRICING_READY_TO_SEND.md`
- [ ] Script présentation : `docs/sales/PRESENTATION_CLIENT_RESTO.md`
- [ ] Liens Revolut (setup + abonnement) prêts à coller

### Message de prospection WhatsApp

```
Bonjour [Prénom],

Je développe DailyDo, un outil simple pour suivre les tâches
en restaurant en direct (fait / pas fait), avec planning
automatique et code équipe pour les employés.

En 10 minutes je vous montre comment ça marche sur votre téléphone.
On peut faire une démo cette semaine ?
```

### Démo 10 minutes (ordre)

1. Connexion gérant
2. Tâches du jour + barre de progression
3. Statut : À faire → En cours → Terminée
4. Planning hebdo (lundi → dimanche)
5. Calendrier : revoir un jour passé
6. Code équipe pour les employés

---

## Étape 6 — Signer le 1er client

### À la fin de la démo, dire :

> « Je vous propose de démarrer sur votre établissement.
> Le setup (145 €) couvre la configuration complète et la formation manager.
> L'abonnement est à 59 €/mois pendant 3 mois, puis 79 €/mois.
> Si vous êtes d'accord, je vous envoie les liens de paiement et on planifie la mise en service. »

### Obtenir l'accord oral ou par message

Minimum à noter :
- [ ] Nom du restaurant
- [ ] Nom du gérant / manager
- [ ] Email (pour facture)
- [ ] Date souhaitée pour la formation
- [ ] Offre choisie (Starter 59 € ou Pro 119 €)

---

## Étape 7 — Encaisser

### Message WhatsApp après accord

```
Parfait [Prénom], voici les étapes :

1. Setup + formation manager : 145 € (une fois)
   → [LIEN REVOLUT SETUP]

2. Abonnement DailyDo : 59 €/mois (3 mois), puis 79 €/mois
   → [LIEN REVOLUT ABONNEMENT]

Paiement par carte en 30 secondes.
Facture envoyée automatiquement.

Dès réception du setup, on planifie la formation :
- [Proposer 2 créneaux, ex. mardi 14h ou jeudi 10h]
```

### Ordre de paiement recommandé

| Moment | Paiement | Montant |
|--------|----------|---------|
| Avant formation | Setup + formation | 145 € |
| Jour de mise en service | 1er mois abonnement | 59 € |

### Si le client préfère un virement

1. Envoyer facture Revolut avec IBAN
2. Attendre réception avant de configurer
3. Délai virement : 1 à 3 jours

**Checklist :**
- [ ] Setup encaissé (145 €)
- [ ] Abonnement activé (59 €/mois)
- [ ] Facture envoyée au client

---

## Étape 8 — Configurer DailyDo pour le restaurant

Durée : **30 à 45 minutes** (avant la formation).

### 8.1 — Créer le restaurant

1. Aller sur [dailydo-saas.app](https://dailydo-saas.app)
2. Créer le compte manager au nom du client (ou leur faire créer)
3. Nom du restaurant : ex. `Pitaya Béthune`
4. Noter le **code équipe** (8 caractères) → à donner au manager

### 8.2 — Configurer le planning

1. Ouvrir **Planning** (calendrier annuel)
2. Renseigner les tâches par jour (lundi → dimanche)
3. Reprendre la liste de nettoyage / ouverture / fermeture du client
4. Vérifier que les tâches apparaissent le bon jour

### 8.3 — Configurer les checklists (offre Pro)

1. Ouvrir **Checklists** (icône presse-papiers)
2. Créer : Ouverture, Fermeture, Hygiène (selon besoin)
3. Associer chaque checklist à un poste (cuisine, salle, plonge…)
4. Tester **Générer les checklists** sur la date du jour

### 8.4 — Vérification finale

- [ ] Restaurant créé
- [ ] Planning lundi → dimanche configuré
- [ ] Checklists créées (si Pro)
- [ ] Code équipe noté
- [ ] 1 tâche test passée en « Terminée » pour la démo formation

---

## Étape 9 — Former le manager (45–60 min)

### Sur place ou en visio

| Minute | Action |
|--------|--------|
| 0–5 | Connexion manager sur son téléphone |
| 5–15 | Tableau de bord : tâches du jour, progression |
| 15–25 | Exécuter 2–3 tâches (À faire → En cours → Terminée) |
| 25–35 | Montrer le planning et le calendrier historique |
| 35–45 | Donner le code équipe, faire connecter 1 employé |
| 45–60 | Questions + support WhatsApp 7 jours |

### Message WhatsApp post-formation

```
Bonjour [Prénom],

Votre DailyDo est prêt :
- App : dailydo-saas.app
- Restaurant : [Nom]
- Code équipe : [XXXXXXXX]

Les employés se connectent avec ce code.
Je reste dispo 7 jours pour toute question.

Bonne utilisation !
```

**Checklist :**
- [ ] Manager connecté sur son téléphone
- [ ] Au moins 1 employé connecté
- [ ] Message récap envoyé

---

## Étape 10 — Suivi mensuel

### Chaque mois

- [ ] Vérifier que l'abonnement Revolut est bien prélevé
- [ ] Relancer si paiement échoué (Revolut envoie des rappels auto)
- [ ] Appeler / WhatsApp le client à J+30 pour feedback

### Après 3 mois (offre lancement)

1. Passer l'abonnement de **59 €** à **79 €** dans Revolut
2. Prévenir le client 1 semaine avant :

```
Bonjour [Prénom],

Votre offre de lancement (59 €/mois) se termine ce mois-ci.
À partir du [date], l'abonnement passe à 79 €/mois (tarif Starter standard).
Merci pour votre confiance !
```

### KPI à suivre (chaque semaine)

| KPI | Objectif début |
|-----|----------------|
| Démos réalisées | 2–3 / semaine |
| Conversion démo → payant | > 30 % |
| Restaurants actifs | +1 / semaine |
| Churn (résiliations) | 0 au début |

---

## Quand passer de micro-entreprise à SASU

| Signal | Action |
|--------|--------|
| 15+ clients payants | Consulter un expert-comptable |
| CA > 50 000 €/an | Envisager SASU |
| Client demande facture société | Créer SASU |
| Vous voulez embaucher | SASU obligatoire |

---

## Récap tarifs (offre lancement locale)

| Élément | Prix lancement | Prix standard |
|---------|----------------|---------------|
| Setup + formation | **145 €** (one-shot) | 290 € |
| Abonnement Starter | **59 €/mois** × 3 mois | 79 €/mois |
| Abonnement Pro | Sur devis | 119 €/mois |

---

## Fichiers liés

| Fichier | Contenu |
|---------|---------|
| `ENTREPRISE_MAGENSY.md` | Fiche légale complète (ZAID MOHAMMED / Magensy) |
| `FACTURATION_MAGENSY.md` | Factures, devis, lignes Revolut (franchise + TVA) |
| `POSITIONNEMENT_DAILYDO_MAGENSY.md` | LinkedIn, Malt, WhatsApp, site web |
| `PRICING_READY_TO_SEND.md` | Grille tarifaire + messages WhatsApp |
| `PRESENTATION_CLIENT_RESTO.md` | Script démo 10–15 min |
| `LOCAL_SALES_PLAYBOOK.md` | Stratégie vente locale |

---

## Contacts utiles

| Besoin | Ressource |
|--------|-----------|
| Créer micro-entreprise | [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr) |
| Compte pro + paiements | [revolut.com/business](https://www.revolut.com/fr-FR/business/) |
| App DailyDo | [dailydo-saas.app](https://dailydo-saas.app) |
| Expert-comptable | Chercher « expert-comptable SaaS » + votre ville |

---

*Dernière mise à jour : juin 2026*
