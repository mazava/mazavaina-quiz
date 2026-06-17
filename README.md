# Mazavaina Quiz v2.0 — Mobile First sans Reveal.js

Cette version supprime Reveal.js pour corriger les problèmes de clic sur téléphone.

## Technologies

- React + Vite
- CSS responsive mobile-first
- Backend Node.js + Express
- SQLite
- GitHub Pages pour le frontend
- Render pour le backend

## Structure

```txt
mazavaina-quiz-v2-mobile/
├── .github/workflows/deploy-frontend.yml
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── .gitignore
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── style.css
```

## Lancer en local

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

API locale :

```txt
http://localhost:3001
```

### Frontend

Dans un autre terminal :

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Site local :

```txt
http://localhost:5173
```

## Déploiement GitHub Pages

Le workflow est inclus.

Dans GitHub :

```txt
Settings → Pages → Source → GitHub Actions
```

Variable GitHub Actions :

```txt
VITE_API_URL=https://ton-api-render.onrender.com
```

## Render

Configuration du backend :

```txt
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Variables Render :

```txt
FRONTEND_URL=https://mazava.github.io
NODE_VERSION=20
```
