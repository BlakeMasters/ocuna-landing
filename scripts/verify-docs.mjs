import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DOC_REDIRECTS, documentationTarget } from "../src/content/legacyDocs.js";
import { OSS } from "../src/content/oss.js";
import { SITE_ORIGIN, knownRoutes, pageMeta, companyNavItems, footerNavItems } from "../src/content.js";
import { jsonLdGraph } from "../src/content/jsonld.js";

const sitemap = await readFile("dist/sitemap.xml", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const index = await readFile("dist/llms.txt", "utf8");
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.ok(robots.includes(`${SITE_ORIGIN}/sitemap.xml`));
assert.match(index, /^# Ocuna\n/);
assert.ok(index.includes(OSS.home));
assert.ok(!sitemap.includes(`${SITE_ORIGIN}/docs`));
assert.ok(!index.includes(`${SITE_ORIGIN}/docs`));
assert.ok([...companyNavItems, ...footerNavItems].every((item) => !item.href.startsWith("/docs")));
assert.ok(!jsonLdGraph()["@graph"].some((item) => item.name === "Ocura OSS"), "Company metadata does not claim OSS publication");

for (const page of DOC_REDIRECTS) {
  assert.ok(!knownRoutes.has(page.route) && !pageMeta[page.route]);
  const html = await readFile(`dist${page.route}/index.html`, "utf8");
  const alias = await readFile(`dist${page.route}.html`, "utf8");
  assert.equal(alias, html);
  assert.ok(html.includes(`rel="canonical" href="${page.target}"`));
  assert.ok(html.includes(`http-equiv="refresh" content="0; url=${page.target}"`));
  assert.ok(html.includes('location.search + location.hash'));
  assert.ok(html.includes(`href="${page.target}"`), "Redirect fallback also works without JavaScript");
  assert.ok(!html.includes('/assets/') && !html.includes('Documentation sections'));
  for (const suffix of ["", "/", ".html", "/index.html"]) {
    assert.equal(documentationTarget(page.route + suffix), page.target);
  }
  const markdown = await readFile(`dist/docs/${page.file}`, "utf8");
  assert.ok(markdown.includes(`https://protention.dev/docs/${page.file}`));
  assert.ok(markdown.length < 200, "Old Markdown URL contains a pointer only");
  assert.equal(documentationTarget(`/docs/${page.file}`), `https://protention.dev/docs/${page.file}`);
}
assert.equal(documentationTarget("/docs/unknown"), null);
assert.equal(documentationTarget("/docs/api/extra"), null);

for (const route of knownRoutes) {
  const html = await readFile(route === "/" ? "dist/index.html" : `dist${route}/index.html`, "utf8");
  assert.ok(!/href="\/docs(?:[\/"#?])/.test(html), `${route}: company pages have no internal docs links`);
  assert.ok(!html.includes('github.com/BlakeMasters/ocura-oss'), `${route}: current OSS repository owner`);
  assert.ok(!html.includes('"name":"Ocura OSS","url":"https://ocuna-ai.com'), `${route}: no company-owned OSS metadata`);
}
const home = await readFile("dist/index.html", "utf8");
assert.ok(home.includes('href="https://protention.dev/api/"'));
assert.ok(!home.includes("point.split") && !home.includes("ocura.chokepoint"));
const contact = await readFile("dist/contact/index.html", "utf8");
assert.ok(contact.includes(`href="${OSS.home}">Protention</a>`));
const missing = await readFile("dist/404.html", "utf8");
assert.ok(missing.includes('name="robots" content="noindex"'));
assert.ok(!missing.includes('rel="canonical"'));
console.log(`Verified ${DOC_REDIRECTS.length} legacy documentation redirects, external OSS links, company ownership metadata, and complete removal of hosted docs across ${knownRoutes.size} public routes.`);
