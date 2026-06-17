# Mazavaina Quiz v2.1 — Admin

Version basée sur v2.0 sans Reveal.js, avec :
- roue dentée ⚙️ pour accéder à la configuration ;
- admin avec mot de passe ;
- ajout/suppression de questions ;
- vidage du classement réservé à l'admin ;
- backend Express + SQLite ;
- frontend React + Vite mobile-first ;
- compatible GitHub Pages + Render.

## Local

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
