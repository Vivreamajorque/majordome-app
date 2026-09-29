# Range Ton Biz — Majordome

Application web (PWA) installable sur mobile, tablette et ordinateur.
Tu écris au Majordome, il range dans ton Cerveau numérique (Notion) via Claude.

## Activer l'app (3 variables dans Vercel → Settings → Environment Variables)

| Variable | À quoi ça sert | Où la créer |
|---|---|---|
| `ANTHROPIC_API_KEY` | Le cerveau (Claude) | console.anthropic.com → API Keys (+ activer la facturation) |
| `NOTION_TOKEN` | Écrire dans le Cerveau | notion.so/my-integrations → New integration → copier le token, puis partager la page "Majordome — Aujourd'hui" avec l'intégration |
| `NOTION_DATA_SOURCE` | (optionnel) id du Cerveau | déjà par défaut : `6afac3f7-a478-48a0-9c89-cbef61d0ac36` |

Après avoir ajouté les variables : Vercel → Deployments → Redeploy.

## À venir
- Gmail (tri des mails), Agenda (rendez-vous), Drive (fichiers) via Google OAuth.
