# Magensy — Facturation & devis (DailyDo)

Modèles prêts à copier dans **Revolut Factures**, Word ou PDF.  
Entreprise : **ZAID MOHAMMED** — nom commercial **Magensy**.

---

## En-tête commun (toutes factures / devis)

```
ZAID MOHAMMED
Magensy — DailyDo
Entrepreneur individuel · Micro-entreprise

Bâtiment C4 App 2142
53 rue du Maréchal Lyautey
59370 Mons-en-Barœul
France

SIRET : 944 772 433 00016
SIREN : 944 772 433
Code APE : 7021Z
N° TVA : FR09944772433
```

*(Ajoutez : email, téléphone, IBAN Revolut quand le compte est ouvert.)*

---

## Option A — Franchise TVA (art. 293 B)

À utiliser si vous êtes en **franchise de base de TVA** (fréquent en micro-entreprise au démarrage).

### Mention obligatoire

```
TVA non applicable, art. 293 B du CGI
```

### Facture — Setup + formation (offre lancement 145 €)

| Champ | Valeur |
|-------|--------|
| **Client** | [Nom du restaurant] |
| **Date** | [JJ/MM/AAAA] |
| **N° facture** | MAG-2026-001 |

| Désignation | Qté | Prix unitaire | Total |
|-------------|-----|---------------|-------|
| DailyDo — Mise en service : configuration planning, checklists, équipe + formation manager (45–60 min) | 1 | 145,00 € | **145,00 €** |

```
Total TTC : 145,00 €
TVA non applicable, art. 293 B du CGI
```

### Facture — Abonnement Starter (79 €/mois)

| Désignation | Qté | Prix unitaire | Total |
|-------------|-----|---------------|-------|
| DailyDo Starter — Abonnement mensuel (suivi tâches, planning, code équipe) — Période : [mois AAAA] | 1 | 79,00 € | **79,00 €** |

```
Total TTC : 79,00 €
TVA non applicable, art. 293 B du CGI
```

### Facture — Offre lancement (59 €/mois)

| Désignation | Qté | Prix unitaire | Total |
|-------------|-----|---------------|-------|
| DailyDo Starter — Abonnement mensuel (offre lancement) — Période : [mois AAAA] | 1 | 59,00 € | **59,00 €** |

---

## Option B — Assujetti TVA (20 %)

À utiliser **uniquement** si vous facturez avec TVA (vérifier avec comptable / impots.gouv.fr).

### Facture — Setup 290 € HT

| Désignation | Qté | PU HT | Total HT |
|-------------|-----|-------|----------|
| DailyDo — Mise en service et formation manager | 1 | 290,00 € | 290,00 € |

```
Total HT  : 290,00 €
TVA 20 %  :  58,00 €
Total TTC : 348,00 €
```

### Facture — Abonnement Starter 79 € HT/mois

| Désignation | Qté | PU HT | Total HT |
|-------------|-----|-------|----------|
| DailyDo Starter — Abonnement [mois AAAA] | 1 | 79,00 € | 79,00 € |

```
Total HT  :  79,00 €
TVA 20 %  :  15,80 €
Total TTC :  94,80 €
```

---

## Devis type (restaurant local)

```
DEVIS N° MAG-DEV-2026-001
Date : [JJ/MM/AAAA]
Validité : 30 jours

Client :
[Nom du restaurant]
[Adresse]
[Contact]

────────────────────────────────────────
PRESTATAIRE
ZAID MOHAMMED — Magensy — DailyDo
SIRET 944 772 433 00016
────────────────────────────────────────

OBJET : Déploiement DailyDo — suivi des tâches restaurant

PRESTATIONS :

1. Mise en service (one-shot) — 145,00 €
   - Configuration planning (lundi → dimanche)
   - Paramétrage checklists
   - Code équipe et rôles
   - Formation manager (45–60 min)
   - Support lancement 7 jours

2. Abonnement DailyDo Starter — 59,00 €/mois pendant 3 mois
   puis 79,00 €/mois
   - Tableau de bord partagé temps réel
   - Planning automatique
   - Statuts tâches (à faire / en cours / terminée)
   - Support WhatsApp / mail

────────────────────────────────────────
TOTAL MISE EN SERVICE : 145,00 €
ABONNEMENT : 59,00 €/mois (3 mois) puis 79,00 €/mois

[TVA non applicable, art. 293 B du CGI]
← ou détail HT/TVA si assujetti

Conditions de paiement :
- Setup : à régler avant la formation
- Abonnement : prélèvement mensuel (Revolut / CB)

Signature client :                    Signature prestataire :
___________________                   Zaid Mohammed — Magensy
```

---

## Lignes pour Revolut (paiement unique / abonnement)

### Setup — offre lancement

```
Nom : DailyDo — Setup + formation
Description : Configuration complète restaurant + formation manager 45–60 min. ZAID MOHAMMED — Magensy. SIRET 94477243300016.
Montant : 145,00 EUR
```

### Abonnement Starter

```
Nom : DailyDo Starter — Mensuel
Description : Abonnement logiciel suivi tâches restaurant. Renouvellement mensuel. Magensy / DailyDo.
Montant : 59,00 EUR (lancement) ou 79,00 EUR (tarif standard)
```

---

## Pied de page facture (mentions légales)

```
ZAID MOHAMMED — Magensy
Entrepreneur individuel
SIRET 944 772 433 00016 · APE 7021Z · TVA FR09944772433

Pénalités de retard : taux légal en vigueur.
Indemnité forfaitaire de recouvrement : 40 € (clients professionnels, art. L441-10 C. com.).
```

*(Pas d’obligation de pénalités si client est un particulier ; les restaurants pro sont en B2B.)*

---

## Numérotation suggérée

| Type | Format | Exemple |
|------|--------|---------|
| Facture | `MAG-AAAA-NNN` | MAG-2026-001 |
| Devis | `MAG-DEV-AAAA-NNN` | MAG-DEV-2026-001 |

Tenir un tableau simple (Excel / Notion) : n° · date · client · montant · payé oui/non.

---

## Checklist avant d’envoyer une facture

- [ ] Nom légal **ZAID MOHAMMED** + commercial **Magensy**
- [ ] SIRET **944 772 433 00016**
- [ ] Adresse complète (bât. C4 App 2142)
- [ ] Mention TVA correcte (franchise **ou** HT + TVA 20 %)
- [ ] Libellé produit **DailyDo** clair
- [ ] IBAN Revolut si paiement par virement
- [ ] Email client pour envoi PDF

---

*Voir aussi : `ENTREPRISE_MAGENSY.md` · `PRICING_READY_TO_SEND.md`*
