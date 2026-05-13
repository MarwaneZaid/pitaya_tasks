# Security — DailyDo

## Principes

- **Clé anon uniquement** dans le client : la clé `service_role` ne doit jamais figurer dans le dépôt ni dans le bundle Vite.
- **RLS Supabase** : l’isolation multi-restaurant repose sur les politiques SQL ; toute évolution de schéma doit être revue au regard des politiques (voir `docs/`).
- **Variables d’environnement** : fichiers `.env` listés dans `.gitignore` ; seul `.env.example` est versionné (sans secrets).

## Signalement

Pour signaler une vulnérabilité, contacte le mainteneur via GitHub (issues privées si activées) ou l’e-mail associé au compte du dépôt.

## Démo / production

En production, configure `VITE_APP_ORIGIN` pour qu’elle corresponde exactement à l’URL utilisée par les utilisateurs (redirects Auth Supabase).
