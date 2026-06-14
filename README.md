# Quiz React + Reveal.js + SQLite — prêt pour GitHub

Ce projet contient :

- un frontend React + Reveal.js ;
- un backend Node.js + Express + SQLite ;
- un stockage persistant des pseudos et scores dans SQLite ;
- un classement final ;
- une configuration GitHub Pages ;
- un workflow GitHub Actions pour déployer automatiquement le frontend.

## Structure

```txt
quiz-react-reveal-github-ready/
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml
├── backend/
│   ├── package.json
│   ├── server.js
│   └── .gitignore
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── style.css
├── .gitignore
└── README.md
```

## Important

GitHub Pages héberge uniquement le frontend statique.

Le backend Node.js + SQLite ne peut pas tourner directement sur GitHub Pages.

Pour tester en local :

```bash
cd backend
npm install
npm run dev
```

Puis, dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

## Déploiement frontend avec GitHub Pages

### 1. Créer un repo GitHub

Exemple :

```txt
quiz-react-reveal-github-ready
```

### 2. Modifier le nom du repo dans `frontend/vite.config.js`

Dans ce fichier :

```js
base: "/quiz-react-reveal-github-ready/"
```

Remplace `quiz-react-reveal-github-ready` par le nom exact de ton repo GitHub.

### 3. Pousser le projet

```bash
git init
git add .
git commit -m "Initialisation du quiz React Reveal"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/NOM_DU_REPO.git
git push -u origin main
```

### 4. Activer GitHub Pages

Dans GitHub :

```txt
Settings → Pages
```

Puis choisir :

```txt
Source: GitHub Actions
```

Le workflow `.github/workflows/deploy-frontend.yml` va publier automatiquement le frontend.

## URL finale

Ton site sera disponible à une adresse de ce type :

```txt
https://TON_COMPTE.github.io/NOM_DU_REPO/
```

## Backend en ligne

Pour que le classement fonctionne en ligne, il faut déployer le backend sur un service comme :

- Render ;
- Railway ;
- Fly.io ;
- VPS.

Ensuite, dans `frontend/src/App.jsx`, remplace :

```js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
```

Puis ajoute dans GitHub Actions ou dans un fichier `.env.production` :

```txt
VITE_API_URL=https://ton-backend-en-ligne.com
```

En local, tu peux garder :

```txt
http://localhost:3001
```
