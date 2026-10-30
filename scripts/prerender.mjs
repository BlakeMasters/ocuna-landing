import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { jsonLdGraph } from "../src/content/jsonld.js";
import { crawlableHtml } from "../src/content/crawlable.js";
import { SITE_ORIGIN, pageMeta } from "../src/content.js";
import { DOC_REDIRECTS } from "../src/content/legacyDocs.js";
import { OSS } from "../src/content/oss.js";
import { RESEARCH_ROUTES } from "../src/content/research.js";
import { homeStartupMarkup } from "../src/content/homeStartup.js";

const origin = SITE_ORIGIN;
const routes = [
  "/",
  "/ocuna",
  "/ocura",
  "/four1",
  "/critter-acknowledgement",
  ...RESEARCH_ROUTES,
  "/contact",
];

const built = await readFile("dist/index.html", "utf8");

function replaceFirst(html, pattern, replacement) {
  return html.replace(pattern, () => replacement);
}

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function escapeTitle(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function escapeJsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function applyDocument(html, route, isNotFound = false) {
  const key = isNotFound ? "/404" : route;
  const meta = pageMeta[key];
  const canonicalPath = route === "/ocuna" ? "/" : route;
  const canonical = `${origin}${canonicalPath === "/" ? "/" : canonicalPath}`;
  const rootHtml = crawlableHtml(
    isNotFound ? "/404" : route,
  );
  const startup = homeStartupMarkup(key, rootHtml);
  const jsonLd = escapeJsonLd(jsonLdGraph(key));
  let next = html;
  next = replaceFirst(next, /<title>[^<]*<\/title>/, `<title>${escapeTitle(meta.title)}</title>`);
  next = replaceFirst(
    next,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  );
  next = replaceFirst(
    next,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
  );
  next = replaceFirst(
    next,
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
  );
  next = replaceFirst(
    next,
    /<script id="ocuna-jsonld" type="application\/ld\+json"><\/script>/,
    `<script id="ocuna-jsonld" type="application/ld+json">${jsonLd}</script>`,
  );
  next = replaceFirst(next, /<div id="root"><\/div>/, `<div id="root">${startup.content}</div>`);
  if (startup.head) {
    next = next.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${startup.head}`);
    next = next.replace("<body>", `<body class="${startup.bodyClass}">`);
  }
  next = replaceFirst(next, /<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${meta.type ?? "website"}" />`);
  next = replaceFirst(next, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${origin}${meta.image ?? "/images/ocuna_logo.png"}" />`);

  if (isNotFound) {
    next = replaceFirst(next, /<meta property="og:url" content="[^"]*" \/>/, "");
    next = replaceFirst(
      next,
      /<link rel="canonical" href="[^"]*" \/>/,
      `<meta name="robots" content="noindex" />`,
    );
  } else {
    next = replaceFirst(
      next,
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${canonical}" />`,
    );
    next = replaceFirst(
      next,
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${canonical}" />`,
    );
  }

  return next;
}

async function writeRoute(route, html) {
  const relative = route === "/" ? "index.html" : path.join(route.slice(1), "index.html");
  const filePath = path.join("dist", relative);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, html);
  if (route !== "/") {
    await writeFile(path.join("dist", `${route.slice(1)}.html`), html);
  }
}

await writeRoute("/", applyDocument(built, "/"));

for (const route of routes.slice(1)) {
  await writeRoute(route, applyDocument(built, route));
}

await writeFile("dist/404.html", applyDocument(built, "/", true));

// Legacy URLs retain only a redirect; no documentation content is hosted here.
for (const page of DOC_REDIRECTS) {
  const target = escapeAttr(page.target);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Ocura OSS | Protention</title><link rel="canonical" href="${target}" /><meta http-equiv="refresh" content="0; url=${target}" /><script>location.replace(${JSON.stringify(page.target)} + location.search + location.hash);</script></head><body><main><p><a href="${target}">Continue to Ocura OSS at Protention</a></p></main></body></html>`;
  await writeRoute(page.route, html);
  await writeFile(`dist/docs/${page.file}`, `Documentation is hosted at [Protention](https://protention.dev/docs/${page.file}).\n`);
}

await writeFile("dist/llms.txt", `# Ocuna\n\nOcuna builds infrastructure for uncertain computation. This index links to public company and research pages.\n\n## Site\n\n${["/", "/ocura", "/four1", "/research", "/critter-acknowledgement", "/contact"].map((route) => `- [${pageMeta[route].title}](${origin}${route}): ${pageMeta[route].description}`).join("\n")}\n\n## Field Notes\n\n${RESEARCH_ROUTES.filter((route) => route !== "/research").map((route) => `- [${pageMeta[route].title}](${origin}${route}): ${pageMeta[route].description}`).join("\n")}\n\n## Reading and navigation\n\nPublic pages include their content in the initial HTML without JavaScript. The main landmark contains the page content; headings and contents links identify sections. Diagrams have text descriptions, and decorative artwork is hidden from assistive technology.\n\n## Open source\n\n- [Ocura OSS at Protention](${OSS.home}): Local command-run records, branching, and comparison. Documentation and releases are hosted at Protention.\n- [Python API](${OSS.api})\n`);
