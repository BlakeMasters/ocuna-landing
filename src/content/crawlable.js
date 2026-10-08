import {
  CONTACT_EMAIL,
  OCURA_OSS_REPO,
  OCURA_OSS_SOURCE_REF,
  OCURA_OSS_VERSION,
  pageMeta,
} from "../content.js";
import { DOC_PAGES, isDocRoute } from "./docPages.js";
import { getResearchPost, RESEARCH_ART, RESEARCH_POSTS } from "./research.js";
import { extractHeadings, escapeHtml, renderInline, renderMarkdown } from "../lib/markdown.js";
import { FOUR1 } from "./four1.js";
import { researchStageSvg } from "../components/four1/researchStageArt.js";
import { CRITTER } from "./critter.js";
import { TENANTS_PLATE, TENANTS_PLATE_STYLE } from "./illustrations.js";
import { HOME } from "./home.js";

function navHtml() {
  return `
<header>
  <a href="/">Ocuna</a>
  <nav>
    <a href="/">Home</a>
    <a href="/#work">Ocura</a>
    <a href="/four1">Four1</a>
    <a href="/docs">Docs</a>
    <a href="/research">Research</a>
    <a href="/contact">Contact</a>
  </nav>
</header>`;
}

function footerHtml() {
  return `
<footer>
  <a href="/docs">Docs</a>
  <a href="/research">Research</a>
  <a href="/contact">Contact</a>
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
</footer>`;
}

function wrap(title, body) {
  return `${navHtml()}
<main>
  <h1>${title}</h1>
  ${body}
</main>
${footerHtml()}`;
}

function landingBody(extra = "") {
  return `
      <p>${escapeHtml(HOME.introduction)}</p>
      <section aria-labelledby="system-partners-title">
        <h2 id="system-partners-title">${escapeHtml(HOME.partnersTitle)}</h2>
        <ul>${HOME.partners.map((partner) => `<li><a href="${escapeHtml(partner.href)}"><img src="/${escapeHtml(partner.logo)}" alt="${escapeHtml(partner.name)}" width="${partner.width}" height="${partner.height}" style="width:auto;height:40px;max-width:100%;filter:grayscale(1)" /></a></li>`).join("\n")}</ul>
      </section>
      <nav aria-label="Ocuna systems">
        <a href="/#work">Scheduler</a>
        <a href="/#market">Training and inference</a>
        <a href="/#ocura">Execution graph</a>
        <a href="/docs">Ocura OSS docs</a>
        <a href="/docs/examples">PyTorch, JAX, and Ray example</a>
        <a href="/four1">Four1</a>
        <a href="/research">Field Notes</a>
      </nav>
      <section id="work">
        <h2>${escapeHtml(HOME.runtimeTitle)}</h2>
        <p>${escapeHtml(HOME.runtimeIntroduction)}</p>
        <div id="market">
          ${HOME.capabilities.map((capability) => `<article><h3>${escapeHtml(capability.title)}</h3><h4>${escapeHtml(capability.heading)}</h4><p>${escapeHtml(capability.description)}</p><a href="${capability.href}">${escapeHtml(capability.action)}</a></article>`).join("\n")}
        </div>
      </section>
      <section id="ocura"><h2>${escapeHtml(HOME.executionTitle)}</h2><p>${escapeHtml(HOME.executionIntroduction)}</p><p>The normal path writes <code>hello_world</code>. The review branch writes <code>review branch</code>, with both paths connected to the same chokepoint.</p></section>
      <section id="ocura-oss"><h2>Record, branch, and compare.</h2><p>Ocura OSS ${OCURA_OSS_VERSION} is the part you can run on your own machine today. Keep a baseline, branch from it with a reason, and connect each result to the original run through the JSON CLI, the Python API, or an AI agent.</p><pre><code>python -m pip install ocura-oss</code></pre><a href="/docs">Documentation</a><a href="/docs/examples">Try the training example</a></section>
      <section><h2>More from Ocuna.</h2><h3><a href="/four1">Four1</a></h3><p>${escapeHtml(FOUR1.definition)}</p><h3><a href="/research/${escapeHtml(RESEARCH_POSTS[0].slug)}">${escapeHtml(RESEARCH_POSTS[0].title)}</a></h3><p>${escapeHtml(RESEARCH_POSTS[0].category)} · ${escapeHtml(RESEARCH_POSTS[0].dateLabel)}</p></section>
      <p id="critter"><a href="/critter-acknowledgement">Critter acknowledgement</a></p>
      ${extra}`;
}

function researchImageHtml(image, priority = false) {
  const img = `<img src="/research/${escapeHtml(image.file)}" alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}" loading="${priority ? "eager" : "lazy"}" style="max-width:100%;height:auto" />`;
  return image.href ? `<a href="${escapeHtml(image.href)}">${img}</a>` : img;
}

function researchMediaHtml(media, priority = false) {
  const visual = media.layout === "event"
    ? `<div class="field-event-panel"><div class="field-event-marks">${media.marks.map((mark) => `<div class="field-event-mark field-event-mark-${escapeHtml(mark.kind)}">${researchImageHtml(mark, priority)}</div>`).join("")}</div><div class="field-event-art">${researchImageHtml(media.image, priority)}</div></div>`
    : researchImageHtml(media.image);
  return `<figure class="field-media field-media-${escapeHtml(media.layout)}${media.theme ? ` field-media-${escapeHtml(media.theme)}` : ""}">${visual}<figcaption>${escapeHtml(media.caption)}${media.credit ? ` <a href="${escapeHtml(media.credit.href)}">${escapeHtml(media.credit.label)}</a>.` : ""}</figcaption></figure>`;
}

export function crawlableHtml(route, markdown = "") {
  if (route === "/research") {
    return wrap(
      "Field Notes",
      `<section aria-label="Research notes">
        ${RESEARCH_POSTS.map((post) => `<article>
          <figure><img src="/research/${escapeHtml(RESEARCH_ART[post.art].file)}" width="${RESEARCH_ART[post.art].width ?? 1536}" height="${RESEARCH_ART[post.art].height ?? 1024}" style="max-width:100%;height:auto" alt="${escapeHtml(RESEARCH_ART[post.art].alt)}" /></figure>
          <p>${escapeHtml(post.category)} · <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.dateLabel)}</time> · ${escapeHtml(post.readTime)}</p>
          <h2><a href="/research/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
        </article>`).join("\n")}
      </section>`,
    );
  }

  const researchPost = getResearchPost(route);
  if (researchPost) {
    const illustration = RESEARCH_ART[researchPost.art] ?? RESEARCH_ART.trail;
    return `${navHtml()}
<main id="top" tabindex="-1">
  <article>
    <p><a href="/research">All field notes</a></p>
    <p>${escapeHtml(researchPost.category)}</p>
    <h1>${escapeHtml(researchPost.title)}</h1>
    <p><time datetime="${escapeHtml(researchPost.date)}">${escapeHtml(researchPost.dateLabel)}</time> · ${escapeHtml(researchPost.readTime)}</p>
    ${researchPost.cover ? researchMediaHtml(researchPost.cover, true) : `<figure><img src="/research/${escapeHtml(illustration.file)}" width="${illustration.width ?? 1536}" height="${illustration.height ?? 1024}" style="max-width:100%;height:auto" alt="${escapeHtml(illustration.alt)}" /></figure>`}
    <nav aria-label="On this page">${researchPost.sections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join(" ")}</nav>
    ${researchPost.sections.map((section) => `<section aria-labelledby="${escapeHtml(section.id)}">
      <h2 id="${escapeHtml(section.id)}" tabindex="-1">${escapeHtml(section.title)}</h2>
      ${section.figures?.map((media) => researchMediaHtml(media)).join("\n      ") ?? ""}
      ${section.paragraphs.map((paragraph) => `<p>${renderInline(paragraph)}</p>`).join("\n      ")}
      ${section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : ""}
      ${section.links?.length ? `<ul>${section.links.map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`).join("")}</ul>` : ""}
    </section>`).join("\n    ")}
    <section aria-label="Read next"><h2>Read next</h2>${RESEARCH_POSTS.filter((post) => post.slug !== researchPost.slug).map((post) => `<p><a href="/research/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></p>`).join("")}</section>
    <p><a href="/research">All field notes</a></p>
  </article>
</main>
${footerHtml()}`;
  }

  if (route === "/" || route === "/ocuna") {
    return wrap(HOME.headline, landingBody());
  }

  if (route === "/ocura") {
    return wrap(
      HOME.headline,
      landingBody(),
    );
  }

  if (isDocRoute(route)) {
    const page = DOC_PAGES.find((item) => item.route === route);
    const toc = extractHeadings(markdown)
      .map((heading) => `<a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`)
      .join(" ");
    const body = renderMarkdown(markdown);
    return `${navHtml()}
<main>
  <aside>
    <nav aria-label="Documentation sections">
      ${DOC_PAGES.map((item) => `<a href="${item.route}">${item.label}</a>`).join("\n      ")}
    </nav>
  </aside>
  <article>
    <p>Ocura OSS ${OCURA_OSS_VERSION}</p>
    <nav aria-label="Alternative documentation formats">
      <a href="/docs/${page.file}">Read Markdown</a>
      <a href="${OCURA_OSS_REPO}/blob/${OCURA_OSS_SOURCE_REF}/${page.repositoryPath}">Read on GitHub</a>
    </nav>
    <nav aria-label="On this page">${toc}</nav>
    ${body}
  </article>
</main>
${footerHtml()}`;
  }

  if (route === "/contact") {
    return wrap(
      "Write to Ocuna",
      `
      <p>${pageMeta["/contact"].description}</p>
      <p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. There is no signup form on this site.</p>
      <p>Security reports for Ocura OSS should use <a href="${OCURA_OSS_REPO}/security/advisories/new">GitHub private vulnerability reporting</a>.</p>
      <figure style="max-width:25rem;margin:2rem auto;${Object.entries(TENANTS_PLATE_STYLE).map(([key, value]) => `${key}:${value}`).join(";")}">
        <div style="padding:1.1rem;background:#e9dfbc">
          <div style="position:relative;overflow:hidden;aspect-ratio:var(--plate-aspect)">
            <img src="/${TENANTS_PLATE.file}" alt="${escapeHtml(TENANTS_PLATE.alt)}" width="${TENANTS_PLATE.width}" height="${TENANTS_PLATE.height}" style="position:absolute;top:var(--plate-top);left:var(--plate-left);width:var(--plate-width);height:var(--plate-height);max-width:none" />
          </div>
        </div>
        <figcaption><a href="${TENANTS_PLATE.sourceHref}"><cite>${TENANTS_PLATE.title}</cite></a> · ${TENANTS_PLATE.illustrator}, ${TENANTS_PLATE.year}</figcaption>
      </figure>`,
    );
  }

  if (route === "/four1") {
    return `${navHtml()}
<main id="top" tabindex="-1">
  <section>
    <p>Four1</p>
    <img src="/four1/logo.png" alt="Four1 factory mark" width="100" height="100" style="background:#111312" />
    <h1>${escapeHtml(FOUR1.headline)}</h1>
    <p>${escapeHtml(FOUR1.definition)}</p>
    <p>${escapeHtml(FOUR1.heroBenefit)}</p>
    <p><a href="/contact">Discuss Four1</a></p>
    <img src="/four1/city.png" alt="" width="1672" height="941" style="max-width:100%;height:auto" />
  </section>
  <section aria-labelledby="four1-native-title">
    <h2 id="four1-native-title">${escapeHtml(FOUR1.nativeEnvironments.title)}</h2>
    <p>${escapeHtml(FOUR1.nativeEnvironments.introduction)}</p>
    <p><a href="/contact">Discuss a research workflow</a></p>
    <figure class="research-stage" id="four1-research-animation" data-running="false">${researchStageSvg("four1-static-stage")}</figure>
  </section>
</main>
${footerHtml()}`;
  }

  if (route === "/critter-acknowledgement") {
    const { illustration, book } = CRITTER;
    return wrap(
      "Critter acknowledgement",
      `<p>${escapeHtml(CRITTER.recognition)} (<em>${escapeHtml(CRITTER.species)}</em>).</p>
      ${CRITTER.quotes.map((quote) => `<figure><blockquote><p>${escapeHtml(quote.text)}</p></blockquote><figcaption>${escapeHtml(book.author)}, <cite>${escapeHtml(book.title)}</cite>, <a href="${quote.href}">p. ${quote.page}</a>.</figcaption></figure>`).join("\n")}
      <figure>
        <img src="/${escapeHtml(illustration.file)}" alt="${escapeHtml(illustration.alt)}" width="${illustration.width}" height="${illustration.height}" style="display:block;max-width:100%;height:auto" />
        <figcaption><cite>${escapeHtml(illustration.title)}</cite>, ${illustration.year}</figcaption>
      </figure>
      <section>
        <h2><cite>${escapeHtml(illustration.title)}</cite></h2>
        <p>${escapeHtml(illustration.volume)}. ${escapeHtml(illustration.author)}, ${illustration.year}.</p>
        <p>${escapeHtml(illustration.context)}</p>
        <p>Original illustration in the <a href="${illustration.licenseHref}">public domain</a>. Image from <a href="${illustration.sourceHref}">${escapeHtml(illustration.source)}</a>.</p>
        <p>Quotations from <cite>${escapeHtml(book.title)}</cite> by ${escapeHtml(book.author)} (${book.year}), pages 62 and 40.</p>
        <nav aria-label="Illustration sources"><a href="${book.href}">Read ${escapeHtml(book.title)}</a> <a href="${illustration.originalHref}">View the original drawing</a></nav>
      </section>
      <p><a href="/">Back to site</a></p>`,
    );
  }

  return wrap(
    "This path is not a page",
    `
    <p>${pageMeta["/404"].description}</p>
    <nav>
      <a href="/">Ocuna home</a>
      <a href="/ocura">Ocura</a>
      <a href="/docs">Docs</a>
      <a href="/contact">Contact</a>
    </nav>`,
  );
}
