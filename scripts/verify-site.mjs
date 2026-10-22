import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { knownRoutes, pageMeta, SITE_ORIGIN } from "../src/content.js";
import { isDocRoute } from "../src/content/docPages.js";
import { getResearchPost, RESEARCH_POSTS } from "../src/content/research.js";
import { renderInline } from "../src/lib/markdown.js";

const index = await readFile("dist/llms.txt", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.ok(robots.includes(`${SITE_ORIGIN}/sitemap.xml`));
assert.match(index, /^# Ocuna\n/);

const routes = [...knownRoutes].filter((route) => !isDocRoute(route));
for (const route of routes) {
  const html = await readFile(route === "/" ? "dist/index.html" : `dist${route}/index.html`, "utf8");
  const canonical = `${SITE_ORIGIN}${route === "/ocuna" ? "/" : route}`;
  assert.equal([...html.matchAll(/<main(?:\s|>)/g)].length, 1, `${route}: one main landmark`);
  assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, `${route}: one primary heading`);
  assert.match(html, /<main[^>]*id="top"/, `${route}: skip-link destination`);
  assert.ok(html.includes('aria-label="Primary navigation"'), `${route}: named navigation`);
  assert.ok(html.includes('class="skip-link" href="#top"'), `${route}: skip link without JavaScript`);
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `${route}: canonical URL`);
  assert.ok(html.includes('href="/llms.txt"'), `${route}: discoverable site index`);
  assert.ok(!html.includes('name="robots" content="noindex"'), `${route}: indexable`);
  assert.ok(index.includes(`](${canonical})`), `${route}: listed for agents`);
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${route}: sitemap discovery`);

  const graph = JSON.parse(html.match(/<script id="ocuna-jsonld" type="application\/ld\+json">(.*?)<\/script>/s)[1])["@graph"];
  const page = graph.find((item) => ["WebPage", "CollectionPage"].includes(item["@type"]));
  assert.equal(page.url, canonical, `${route}: page-specific structured data`);
  assert.equal(page.name, pageMeta[route].title);
  assert.equal(page.description, pageMeta[route].description);
  const article = graph.find((item) => item["@type"] === "BlogPosting");
  const post = getResearchPost(route);
  if (post) {
    assert.equal(article.headline, post.title);
    assert.equal(article.datePublished, post.date);
    assert.equal(article.author.name, "Ocuna Research");
    assert.ok(html.includes("<p>Ocuna Research</p>"), `${route}: byline matches structured data`);
    assert.equal(article.mainEntityOfPage["@id"], page["@id"]);
    for (const section of post.sections) {
      assert.ok(html.includes(`id="${section.id}"`), `${route}: article sections without JavaScript`);
      for (const paragraph of section.paragraphs) {
        assert.ok(html.includes(`<p>${renderInline(paragraph)}</p>`), `${route}: complete article text without JavaScript`);
      }
    }
  } else {
    assert.equal(article, undefined, `${route}: no unrelated article metadata`);
  }
  if (route === "/research") {
    assert.deepEqual(page.mainEntity.itemListElement.map((item) => item.name), RESEARCH_POSTS.map((item) => item.title));
    const images = [...html.matchAll(/<img[^>]+src="\/research\/[^>]+>/g)].map(([tag]) => tag);
    assert.ok(images[0].includes('loading="eager"') && images[0].includes('fetchpriority="high"'));
    assert.ok(images.slice(1).every((tag) => tag.includes('loading="lazy"')), "Defer below-the-fold research images in the original HTML");
  }
}

const missing = await readFile("dist/404.html", "utf8");
assert.ok(missing.includes('name="robots" content="noindex"'));
assert.ok(!missing.includes('rel="canonical"'));
assert.ok(!missing.includes('"@type":"WebPage"'), "No indexable page metadata on the 404");

// Count every eagerly referenced JS and CSS file, including module preloads.
const home = await readFile("dist/index.html", "utf8");
const assets = [...new Set([...home.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g)].map(([, file]) => file))];
const totals = { js: 0, css: 0, gzipJs: 0, gzipCss: 0 };
for (const file of assets) {
  const bytes = await readFile(`dist${file}`);
  const kind = file.endsWith(".js") ? "js" : "css";
  totals[kind] += bytes.length;
  totals[kind === "js" ? "gzipJs" : "gzipCss"] += gzipSync(bytes).length;
}
assert.ok(totals.js > 0 && totals.js <= 350 * 1024, `Initial JavaScript exceeds 350 KiB: ${totals.js}`);
assert.ok(totals.css > 0 && totals.css <= 120 * 1024, `Initial CSS exceeds 120 KiB: ${totals.css}`);
console.log(`Verified ${routes.length} public routes: semantic HTML, agent index, canonical URLs, sitemap, article metadata, image loading, and 404 handling.`);
console.log(`Initial bytes: ${JSON.stringify(totals)}`);
