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

The retained OnVeil page is available at `/onveil` (or `/onveil.html`) only in
local development. Its component, stylesheet and source artwork remain in the
checkout; the production build excludes the page and its navigation links.

## Production Build

```powershell
npm run build
npm run preview
```

The build writes static files to `dist/`. `postbuild` runs `scripts/prerender.mjs`,
which prerenders the company and research routes and writes `dist/404.html`.
Ocura OSS documentation, API reference, examples, and releases live at
[Protention](https://protention.dev/). This site contains no documentation renderer
or copied documentation. `src/content/oss.js` holds the external destinations;
`src/content/legacyDocs.js` preserves old `/docs` links as redirect stubs, including
`.html` aliases. Old Markdown URLs contain a short pointer to their new location.
Run `npm run verify:docs` after building to verify the migration, company metadata,
external links, and prerendered content. The Pages workflow runs this check.

Public routes include `/`, `/ocura`, `/contact`, `/four1`, and
`/critter-acknowledgement`. `/ocuna` aliases the home page; canonical URLs use `/`.

`site-public/` also ships `robots.txt` and `sitemap.xml` for GitHub Pages.

## Research

The research section at `/research` contains "Double Hackathon Weekend",
"A Dream-RSI workflow with Ocura OSS", and "Good experiments leave a trail".
Each article has its own route, illustration, section navigation, and links
to related articles.

The Dream-RSI study describes a bounded CPU training workflow built around Ocura
OSS execution records, lineage, and verified logs. It evaluates implementation
support; the experiment did not establish a useful policy advantage.

Article metadata and routes live in `src/content/research.js`; the Dream-RSI
article is defined in `src/content/dreamRsiPost.js`, and the hackathon article
in `src/content/csimPost.js`. The UI loads as a separate
chunk. The build emits readable HTML for the index and articles, including
`.html` aliases, canonical URLs, and article artwork for social previews.
Research routes are included in the sitemap. Unknown routes remain `noindex`.

The illustrations in `site-public/research/` were generated for Ocuna. The
Dream-RSI image depicts a raccoon inspecting drawings of a branching search tree;
the companion article uses `raccoon-field-note.png`. The hackathon article uses
the park-bench raccoon illustration in `site-public/research/weekend/`, alongside
project marks, event artwork, and a Csim screenshot. Image provenance is recorded
in `docs/research-image-sources.md`.

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
  content/oss.js         # External OSS destinations at Protention
  content/legacyDocs.js  # Compatibility redirects only
  content/research.js    # Articles and research route metadata
  components/
    LandingPage.jsx
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
