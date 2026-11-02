# ALFRED — fondations bêta privée

Cette branche conserve le projet original sur main et amorce sa refonte en majordome personnel.

## Aperçu

Ouvrir `alfred-preview.html` localement dans un navigateur. Interface responsive, trois thèmes, données de démonstration explicites. Aucune connexion, collecte ou exécution réelle n'est active.

## Architecture cible

- Next.js sur Vercel, Supabase Auth/Postgres/Storage dans un **projet Supabase dédié**.
- Inscription uniquement sur invitation : propriétaire + 5 bêta-testeurs initialement, mais aucune limite de six comptes codée en dur.
- Chaque table contenant des données personnelles possède un `user_id`, RLS avec politiques d'appartenance et tests d'isolation multi-comptes.
- Connexions OAuth Google/Microsoft par utilisateur, multiples comptes et permissions minimales; jetons côté serveur uniquement, chiffrés, révocables. Les consentements et vérifications fournisseurs sont requis avant activation.
- Missions persistantes avec statuts, permissions, journal d'exécution, reprises et validation humaine des actions sensibles.
- Documents dans des buckets privés avec politiques de stockage, analyses et classement confirmés.
- Aucune donnée fictive ne doit être présentée comme synchronisée ou exécutée.

## Prochaines tâches

1. Auditer les fichiers du dépôt original et créer une application Next.js isolée, sans écraser les services existants.
2. Créer le projet Supabase dédié (organisation et éventuel coût à confirmer).
3. Mettre en place authentification, invitations, RLS, stockage privé et tests d'isolation.
4. Construire le moteur de missions et les connexions Google/Microsoft, avec consentements.
5. Tester en preview protégée avant tout déploiement public.
