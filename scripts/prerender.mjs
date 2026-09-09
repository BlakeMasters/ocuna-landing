import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { jsonLdGraph } from "../src/content/jsonld.js";
import { crawlableHtml } from "../src/content/crawlable.js";
import { SITE_ORIGIN, OCURA_OSS_REPO, OCURA_OSS_VERSION, pageMeta } from "../src/content.js";
import { DOC_PAGES } from "../src/content/docPages.js";

const origin = SITE_ORIGIN;
const routes = [
  "/",
  "/ocuna",
  "/ocura",
  "/onveil",
  "/critter-acknowledgement",
  ...DOC_PAGES.map((page) => page.route),
  "/contact",
];

const documentationSources = new Map(
  DOC_PAGES.map((page) => [page.route, `src/content/docs/${page.file}`]),
);
const documentation = new Map(
  await Promise.all(
    [...documentationSources].map(async ([route, source]) => [route, await readFile(source, "utf8")]),
  ),
);
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
    documentation.get(route) ?? "",
  );
  const jsonLd = escapeJsonLd(jsonLdGraph());
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
  next = replaceFirst(next, /<div id="root"><\/div>/, `<div id="root">${rootHtml}</div>`);
  const docPage = DOC_PAGES.find((page) => page.route === route);
  if (docPage && !isNotFound) {
    next = next.replace("</head>", `<link rel="alternate" type="text/markdown" href="${origin}/docs/${docPage.file}" title="Markdown" />\n</head>`);
  }

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

await mkdir("dist/docs", { recursive: true });
await Promise.all(
  [...documentationSources.values()].map((source) =>
    copyFile(source, path.join("dist/docs", path.basename(source))),
  ),
);

await writeFile("dist/llms.txt", `# Ocura OSS ${OCURA_OSS_VERSION}\n\nA local execution ledger for recording, branching, and comparing command runs. Use the JSON CLI or typed Python API from a terminal, script, or AI agent.\n\n## Documentation\n\n${DOC_PAGES.map((page) => `- [${page.label}](${origin}/docs/${page.file})`).join("\n")}\n\n## Source\n\n- [Version ${OCURA_OSS_VERSION}](${OCURA_OSS_REPO}/tree/v${OCURA_OSS_VERSION})\n- [Repository training example](${OCURA_OSS_REPO}/tree/v${OCURA_OSS_VERSION}/examples/autoregressive)\n\nExamples are repository-only. The core package has no runtime dependencies. Commands inherit their execution environment's permissions; checksums verify local consistency.\n`);
