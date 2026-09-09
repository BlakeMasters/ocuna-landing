import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DOC_PAGES } from "../src/content/docPages.js";
import { OCURA_OSS_REPO, OCURA_OSS_VERSION, SITE_ORIGIN, knownRoutes, pageMeta } from "../src/content.js";
import { extractHeadings, renderMarkdown } from "../src/lib/markdown.js";

const sitemap = await readFile("dist/sitemap.xml", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const index = await readFile("dist/llms.txt", "utf8");
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.ok(robots.includes(`${SITE_ORIGIN}/sitemap.xml`));
assert.ok(index.includes(`Ocura OSS ${OCURA_OSS_VERSION}`));
assert.equal(new Set(DOC_PAGES.map((page) => page.route)).size, DOC_PAGES.length);
const rendered = new Map();
assert.equal(renderMarkdown("1. First\n2. Second\n\n> A quoted\n> instruction."),
  "<ol><li>First</li><li>Second</li></ol>\n<blockquote><p>A quoted instruction.</p></blockquote>");

for (const page of DOC_PAGES) {
  assert.ok(knownRoutes.has(page.route) && pageMeta[page.route], page.route);
  const source = await readFile(`src/content/docs/${page.file}`, "utf8");
  const markdown = await readFile(`dist/docs/${page.file}`, "utf8");
  const html = await readFile(`dist${page.route}/index.html`, "utf8");
  const alias = await readFile(`dist${page.route}.html`, "utf8");
  assert.equal(markdown, source, `${page.route}: Markdown bytes match source`);
  assert.equal(alias, html, `${page.route}: direct HTML alias matches`);
  assert.ok(source.includes(`Version ${OCURA_OSS_VERSION}.`), page.route);
  assert.ok(html.includes(renderMarkdown(source)), `${page.route}: full content without JavaScript`);
  assert.ok(html.includes(`href="${SITE_ORIGIN}${page.route}"`), `${page.route}: canonical URL`);
  assert.ok(html.includes(`type="text/markdown" href="${SITE_ORIGIN}/docs/${page.file}"`));
  assert.ok(html.includes(`href="/docs/${page.file}">Read Markdown</a>`));
  assert.ok(html.includes(`${OCURA_OSS_REPO}/blob/v${OCURA_OSS_VERSION}/${page.repositoryPath}`));
  assert.ok(sitemap.includes(`<loc>${SITE_ORIGIN}${page.route}</loc>`));
  assert.ok(index.includes(`${SITE_ORIGIN}/docs/${page.file}`));
  for (const other of DOC_PAGES) assert.ok(html.includes(`href="${other.route}"`));
  for (const heading of extractHeadings(source)) {
    assert.ok(html.includes(`id="${heading.id}"`), `${page.route}: heading ${heading.id}`);
  }
  const graph = JSON.parse(html.match(/<script id="ocuna-jsonld" type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(graph["@graph"].find((item) => item.name === "Ocura OSS").softwareVersion, OCURA_OSS_VERSION);
  rendered.set(page.route, html);
}

for (const [route, html] of rendered) {
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (!href.startsWith("/") && !href.startsWith("#")) continue;
    const target = new URL(href, `${SITE_ORIGIN}${route}`);
    if (!rendered.has(target.pathname) || !target.hash) continue;
    const id = decodeURIComponent(target.hash.slice(1));
    assert.ok(rendered.get(target.pathname).includes(`id="${id}"`), `${route}: missing linked heading ${href}`);
  }
}

const cli = await readFile("src/content/docs/cli.md", "utf8");
assert.ok(cli.includes("[--name NAME] [--json]"));
assert.ok(cli.includes("[--quiet] [--json] -- COMMAND..."));
assert.ok(cli.includes("`default_pathway_id`") && cli.includes("`launch_error_category`"));
assert.ok(!cli.includes("do not provide JSON mode"));
const missing = await readFile("dist/404.html", "utf8");
assert.ok(missing.includes('name="robots" content="noindex"'));
assert.ok(!missing.includes('rel="canonical"'));
console.log(`Verified ${DOC_PAGES.length} documentation routes: complete static HTML, Markdown parity, aliases, navigation, metadata, source links, headings, sitemap, and discovery index.`);
