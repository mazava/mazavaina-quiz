# Déploiement GitHub Pages

## Étape 1 — Modifier le nom du repo

Dans :

```txt
frontend/vite.config.js
```

remplacer :

```js
base: "/quiz-react-reveal-github-ready/"
```

par le nom de ton repo.

Exemple :

```js
base: "/mazavaina-reveal/"
```

## Étape 2 — Push sur GitHub

```bash
git init
git add .
git commit -m "Initialisation quiz React Reveal"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/NOM_DU_REPO.git
git push -u origin main
```

## Étape 3 — Activer GitHub Pages

Dans GitHub :

```txt
Settings → Pages → Source → GitHub Actions
```

## Étape 4 — Vérifier l'action

Va dans :

```txt
Actions
```

Puis vérifie que le workflow `Deploy Frontend to GitHub Pages` passe en vert.

## Étape 5 — URL finale

```txt
https://TON_COMPTE.github.io/NOM_DU_REPO/
```

## Pour le backend

GitHub Pages ne déploie pas le backend.

Tu peux utiliser Render ou Railway.

Quand le backend est en ligne, configure la variable GitHub :

```txt
Settings → Secrets and variables → Actions → Variables
```

Ajouter :

```txt
VITE_API_URL=https://ton-backend-en-ligne.com
```
