# DailyDo — Notifications push (app fermée)

Les rappels quotidiens de tâches planifiées peuvent arriver **même quand l’app est fermée**, via **Web Push** + **Supabase Edge Function**.

## Architecture

```
Utilisateur active les notifs dans l’app
        ↓
Service worker (PWA) + abonnement push enregistré dans Supabase
        ↓
Cron horaire → Edge Function `push-reminders`
        ↓
Notification système sur le téléphone / ordinateur
```

## 1) Générer les clés VAPID

En local :

```bash
npx web-push generate-vapid-keys
```

Conserver :
- **Public Key** → `VITE_VAPID_PUBLIC_KEY` (Vercel + `.env` local)
- **Private Key** → secret Supabase `VAPID_PRIVATE_KEY` (jamais dans le front)

## 2) Variables d’environnement

### Vercel (front)

| Variable | Exemple |
|----------|---------|
| `VITE_VAPID_PUBLIC_KEY` | clé publique VAPID |

### Supabase Edge Function `push-reminders`

Dans **Project Settings → Edge Functions → Secrets** :

| Secret | Description |
|--------|-------------|
| `VAPID_PUBLIC_KEY` | Même clé publique |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID |
| `VAPID_SUBJECT` | `mailto:votre@email.fr` |
| `CRON_SECRET` | (optionnel) secret pour sécuriser l’appel cron |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement.

## 3) Migration SQL

Dans **Supabase SQL Editor**, exécuter :

`docs/supabase-push-notifications.sql`

Crée la table `push_subscriptions` avec RLS.

## 4) Déployer l’Edge Function

Avec Supabase CLI :

```bash
supabase functions deploy push-reminders
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:contact@dailydo-saas.app
```

## 5) Planifier l’envoi (chaque heure)

Dans **Supabase Dashboard → Database → Extensions**, activer `pg_cron` si besoin.

Créer un cron qui appelle la fonction **à chaque heure** (minute 5) :

```sql
-- Exemple via pg_net / cron Supabase (adapter l’URL projet)
SELECT cron.schedule(
  'dailydo-push-reminders',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_REF.supabase.co/functions/v1/push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'VOTRE_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Alternative : **Supabase Dashboard → Edge Functions → Schedules** (si disponible sur votre plan).

## 6) Côté utilisateur

1. Ouvrir DailyDo → icône cloche → activer les notifications.
2. **Android / desktop** : fonctionne dans Chrome, Edge, Firefox.
3. **iPhone** : obligatoire d’ajouter le site à l’écran d’accueil (Safari → Partager → Sur l’écran d’accueil), puis activer les notifs.

## 7) Test rapide

1. Activer les notifs dans l’app (connecté à Supabase prod).
2. Vérifier une ligne dans `push_subscriptions` (Table Editor).
3. Invoquer manuellement la fonction :

```bash
curl -X POST "https://VOTRE_REF.supabase.co/functions/v1/push-reminders" \
  -H "Authorization: Bearer VOTRE_ANON_OU_SERVICE_KEY" \
  -H "x-cron-secret: VOTRE_CRON_SECRET"
```

(Ajuster l’heure de rappel à l’heure actuelle pour un test immédiat.)

## Dépannage

| Problème | Piste |
|----------|-------|
| Pas de notif app fermée | Vérifier `VITE_VAPID_PUBLIC_KEY` sur Vercel + redeploy |
| iPhone ne reçoit rien | Site ajouté à l’écran d’accueil ? iOS 16.4+ |
| Table manquante | Exécuter `supabase-push-notifications.sql` |
| Rien à l’heure prévue | Cron actif ? `reminder_hour` = heure locale utilisateur |
| Abonnement supprimé | Normal si l’utilisateur a révoqué (erreur 410) |

## Fichiers du projet

| Fichier | Rôle |
|---------|------|
| `src/sw.js` | Service worker (réception push) |
| `src/lib/webPush.js` | Abonnement côté client |
| `src/lib/db.js` | Sauvegarde `push_subscriptions` |
| `supabase/functions/push-reminders/index.ts` | Envoi serveur |
| `docs/supabase-push-notifications.sql` | Schéma BDD |
