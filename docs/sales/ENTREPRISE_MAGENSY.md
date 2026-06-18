# Magensy — Fiche entreprise officielle (DailyDo)

Document de référence pour facturation, Revolut Business, devis et communication commerciale.

Sources : registre INSEE / [Pappers](https://www.pappers.fr/entreprise/mohammed-zaid-944772433) (juin 2026).

---

## Identité légale

| Champ | Valeur |
|-------|--------|
| **Raison sociale (nom légal)** | **ZAID MOHAMMED** |
| **Nom commercial** | **Magensy** |
| **Produit / marque logicielle** | **DailyDo** |
| **Forme juridique** | Entrepreneur individuel |
| **Micro-entreprise** | Oui |
| **Date de création** | 20/05/2025 |
| **Dirigeant** | Zaid Mohammed |
| **SIREN** | 944 772 433 |
| **SIRET** (établissement principal) | 944 772 433 00016 |
| **Code APE** | 7021Z — Conseil en relations publiques et communication |
| **N° TVA intracommunautaire** | FR09944772433 |
| **RCS** | Non inscrit (normal pour EI) |
| **Effectif** | 0 salarié |

### Adresse (établissement principal)

```
ZAID MOHAMMED — Magensy
Bâtiment C4 App 2142
53 rue du Maréchal Lyautey
59370 Mons-en-Barœul
France
```

---

## Activité déclarée au registre

> Agence de conseil en stratégie de marque et communication digitale. Magensy accompagne les entreprises dans leur transformation de marque, en proposant des services de rebranding, création d'identité visuelle, développement de sites internet, gestion de la présence en ligne et stratégie de communication. L'agence intervient également dans le conseil marketing, la création de contenus et l'optimisation de la visibilité digitale.

### Couverture de DailyDo (sans changer de code APE)

L’activité déclarée **couvre** la vente de DailyDo dans le cadre Magensy :

| Prestation | Justification APE 7021Z |
|------------|-------------------------|
| Abonnement DailyDo (SaaS) | Solution digitale / visibilité opérationnelle |
| Setup + paramétrage restaurant | Conseil et accompagnement digital |
| Formation manager | Conseil en communication et outils |

**Pas besoin de modifier le code APE** pour lancer DailyDo dans l’immédiat.

---

## Règles d’affichage sur les documents

### Factures et devis

Toujours faire apparaître **les deux noms** :

1. **Nom légal** (obligatoire) : ZAID MOHAMMED  
2. **Nom commercial** (recommandé) : Magensy  
3. **Produit** (selon la ligne) : DailyDo

Exemple d’en-tête :

```
ZAID MOHAMMED
Magensy — DailyDo
Entrepreneur individuel · Micro-entreprise
```

### Ce qui ne va pas

- Facturer uniquement « Magensy » sans ZAID MOHAMMED  
- Oublier le SIRET sur une facture B2B  
- Mélanger franchise TVA et facturation HT + TVA sans vérification

---

## TVA — FR09944772433

Le numéro **FR09944772433** est attribué à l’entreprise. En micro-entreprise, vous pouvez être :

| Régime | Mention sur facture | Prix affiché au client |
|--------|---------------------|-------------------------|
| **Franchise en base** (souvent le cas au début) | `TVA non applicable, art. 293 B du CGI` | Montant **net** = montant **total** (ex. 79 €) |
| **Assujetti TVA** (20 %) | `TVA 20 %` + détail HT / TTC | Devis en HT ; facture TTC (ex. 79 € HT → 94,80 € TTC) |

**À vérifier** sur [impots.gouv.fr](https://www.impots.gouv.fr) ou avec votre comptable / URSSAF selon votre CA et votre option TVA.

→ Modèles prêts à copier : **`docs/sales/FACTURATION_MAGENSY.md`**

---

## Revolut Business

| Champ compte | Valeur |
|--------------|--------|
| Titulaire / raison sociale | ZAID MOHAMMED |
| Nom affiché client | Magensy (ou Magensy — DailyDo) |
| SIRET | 94477243300016 |
| Adresse | Bât. C4 App 2142, 53 rue du Maréchal Lyautey, 59370 Mons-en-Barœul |
| Activité Merchant | Logiciel SaaS et conseil digital pour restaurants |

### Liens de paiement suggérés

| Produit | Libellé Revolut |
|---------|-----------------|
| Setup lancement | `DailyDo — Setup + formation manager` |
| Setup tarif normal | `DailyDo — Mise en service (290 €)` |
| Abonnement Starter | `DailyDo Starter — abonnement mensuel` |
| Abonnement Pro | `DailyDo Pro — abonnement mensuel` |

---

## Positionnement DailyDo (nouveau produit)

DailyDo **n’apparaît pas encore** comme produit distinct sur magensy.com / LinkedIn. À intégrer progressivement :

**Pitch court :**

> Magensy accompagne les restaurants avec **DailyDo** : un tableau de bord partagé pour suivre les tâches en direct (fait / pas fait), avec planning automatique et vue manager.

**Où le mentionner :**

- [ ] Page LinkedIn Magensy (section services)
- [ ] Profil Malt (nouvelle offre « DailyDo »)
- [ ] Signature email / WhatsApp
- [ ] Site magensy.com (quand disponible)

**Site produit :** [dailydo-saas.app](https://www.dailydo-saas.app)

---

## Contacts & technique

| Usage | Valeur suggérée |
|-------|-----------------|
| Email pro | contact@magensy.com *(à confirmer)* |
| Supabase `VAPID_SUBJECT` | `mailto:contact@magensy.com` |
| Zone commerciale | Lille / Hauts-de-France · Mons-en-Barœul |
| Marchés | France (priorité locale) · Maroc (historique Magensy) |

---

## Fichiers liés

| Fichier | Contenu |
|---------|---------|
| `FACTURATION_MAGENSY.md` | Factures, devis, lignes Revolut (franchise + TVA) |
| `PRICING_READY_TO_SEND.md` | Grille tarifaire DailyDo |
| `GUIDE_DEMARRAGE_ETAPE_PAR_ETAPE.md` | Vente + Revolut + onboarding |
| `PRESENTATION_CLIENT_RESTO.md` | Script démo restaurant |

---

*Dernière mise à jour : juin 2026*
