# Breathing App

A minimal, customisable breathing exercise app built with React + Vite.

## Features

- Animated circle that expands (inhale) and contracts (exhale)
- Configurable ball size, session duration, breathing rate, and inhale:exhale patterns
- Dark mode support (follows system preference)
- Works on desktop and mobile

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deploy to GitHub Pages

### 1. Create a GitHub repository

Go to [github.com/new](https://github.com/new) and create a new repo, e.g. `breathing-app`.

### 2. Set the base path in vite.config.js

Open `vite.config.js` and update `base` to match your repo name:

```js
base: '/your-repo-name/',
```

### 3. Push your code

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 4. Deploy

```bash
npm run deploy
```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch automatically.

### 5. Enable GitHub Pages

In your repo on GitHub:
- Go to **Settings → Pages**
- Set source to **Deploy from a branch**
- Select branch: `gh-pages`, folder: `/ (root)`
- Click **Save**

Your app will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

> **Tip:** After the first deploy, `npm run deploy` is all you need for future updates.

---

## Settings reference

| Setting | Range | Description |
|---|---|---|
| Ball size | 45–105 | Max radius of the circle in pixels |
| Duration | 1–30 min | Total session length |
| Breaths / min | 2–20 | Breathing rate |
| Pattern | 1:1, 1:2, 1:3, 2:1, 3:1 | Inhale to exhale time ratio |

---

## Project structure

```
breathing-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx          # React entry point
    ├── index.css         # Global styles + CSS variables
    ├── App.jsx           # Main component + animation logic
    └── App.module.css    # Scoped component styles
```
