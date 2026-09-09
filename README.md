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

The build writes static files to `dist/`. `postbuild` runs `scripts/prerender.mjs`,
which prerenders the main routes (home, Ocura, docs, contact, and others),
writes `dist/404.html`, and copies OSS markdown into `dist/docs/`.
The documentation route list lives in `src/content/docPages.js`; it drives the React
navigation, prerendered navigation, raw Markdown exports, and `llms.txt` index.
Each documentation page links to its Markdown file and versioned GitHub reference.
Run `npm run verify:docs` after building to check route coverage, static content,
Markdown parity, metadata, navigation, source links, and discovery files. The Pages
workflow runs this check before deployment.

Published routes include `/`, `/ocura`, `/docs`, `/contact`, `/onveil`, and
`/critter-acknowledgement`. `/ocuna` aliases the home page; canonical URLs use `/`.

`site-public/` also ships `robots.txt` and `sitemap.xml` for GitHub Pages.

## GitHub Pages

The deployment workflow lives in `.github/workflows/pages.yml`.

The site is configured for the custom domain root path. `site-public/CNAME`
contains `ocuna-ai.com`, and Vite builds with `base: "/"`.

Deployments run on pushes to `main` or `react`, and can also be started manually
from the Actions tab.

## Structure

```text
src/
  App.jsx
  content.js
  content/docs/          # Ocura OSS markdown (source for /docs)
  components/
    LandingPage.jsx
    DocsPage.jsx
    ContactPage.jsx
    CritterPage.jsx
site-public/
  CNAME
  robots.txt
  sitemap.xml
  sprites/
images/                  # production images copied into dist/images/
```
