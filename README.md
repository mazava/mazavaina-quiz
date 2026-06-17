# Mazavaina Quiz v2.3 — Types de questions affinés

Version basée sur v2.2 avec les types de questions suivants :

- `fill_blank` : mot à compléter
- `short_answer` : réponse courte
- `multiple_choice` : choix multiples avec une seule bonne réponse
- `checkbox` : cases à cocher avec plusieurs bonnes réponses

Compatibilité :
- les anciens types `single`, `multiple`, `text` sont aussi reconnus :
  - `single` → `multiple_choice`
  - `multiple` → `checkbox`
  - `text` → `short_answer`

## Lancer en local

Backend :

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend :

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Admin local :

```txt
Utilisateur : admin
Mot de passe : admin123
```

## Render

Variables à garder/ajouter :

```txt
FRONTEND_URL=https://mazava.github.io
NODE_VERSION=20
ADMIN_USER=admin
ADMIN_PASSWORD=ton_mot_de_passe
ADMIN_TOKEN=un_token_secret_long
```

## GitHub Actions

Variable :

```txt
VITE_API_URL=https://mazavaina-quiz-api.onrender.com
```
