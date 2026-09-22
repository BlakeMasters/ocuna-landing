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

## Research

The research section at `/research` contains two articles: "A Dream-RSI workflow
with Ocura OSS" and "Good experiments leave a trail". Each article has its own
route, illustration, section navigation, and link to the companion article.

The Dream-RSI study describes a bounded CPU training workflow built around Ocura
OSS execution records, lineage, and verified logs. It evaluates implementation
support; the experiment did not establish a useful policy advantage.

Article metadata and routes live in `src/content/research.js`; the Dream-RSI
article is defined in `src/content/dreamRsiPost.js`. The UI loads as a separate
chunk. The build emits readable HTML for the index and articles, including
`.html` aliases, canonical URLs, and article artwork for social previews.
Research routes are included in the sitemap. Unknown routes remain `noindex`.

The illustrations in `site-public/research/` were generated for Ocuna. The
Dream-RSI image depicts a raccoon inspecting drawings of a branching search tree;
the companion article uses `raccoon-field-note.png`.

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
  content/research.js    # Articles and research route metadata
  components/
    LandingPage.jsx
    DocsPage.jsx
    ContactPage.jsx
    CritterPage.jsx
    ResearchPage.jsx
site-public/
  CNAME
  robots.txt
  sitemap.xml
  sprites/
images/                  # production images copied into dist/images/
```
