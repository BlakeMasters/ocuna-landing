# Ocuna Landing

Static React site for Ocuna, built with Vite and deployed through GitHub Pages.

## Local Development

```powershell
npm install
npm run dev
```

Vite will print the local URL, usually:

```text
http://127.0.0.1:5173/
```

## Production Build

```powershell
npm run build
npm run preview
```

The build writes static files to `dist/`. The postbuild step copies `dist/index.html`
to `dist/404.html` so direct links like `/critter-acknowledgement` can fall back to
the React app on GitHub Pages.

## GitHub Pages

The deployment workflow lives in `.github/workflows/pages.yml`.

For the public repository project page, the workflow builds with:

```text
GITHUB_PAGES=true
```

That sets Vite's base path to:

```text
/ocuna-landing/
```

Deployments run on pushes to `main` or `react`, and can also be started manually
from the Actions tab.

## Structure

```text
src/
  App.jsx
  assets.js
  content.js
  components/
    LandingPage.jsx
    CritterPage.jsx
  styles.css
site-public/
  ocuna_logo.png
  ocuna_background*.png
  sprites/
```
