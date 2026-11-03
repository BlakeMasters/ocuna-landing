import {
  CONTACT_EMAIL,
  OCURA_OSS_DOCS,
  pageMeta,
} from "../content.js";
import { OSS } from "./oss.js";
import { EXECUTION_DESCRIPTION, EXECUTION_NODES, EXECUTION_TITLE } from "../lib/executionDisplay.js";
import { getResearchPost, RESEARCH_ART, RESEARCH_POSTS } from "./research.js";
import { escapeHtml, renderInline } from "../lib/markdown.js";
import { FOUR1 } from "./four1.js";
import { researchStageSvg } from "../components/four1/researchStageArt.js";
import { CRITTER } from "./critter.js";
import { TENANTS_PLATE, TENANTS_PLATE_STYLE } from "./illustrations.js";
import { HOME } from "./home.js";
import { homeEngravingHtml, homeRaccoonHtml } from "./homeMotion.js";
import { galleryImagePath, NOT_FOUND, RACCOON_GALLERY } from "./raccoonGallery.js";

function navHtml(styled = false, headerClass = "not-found-static-header") {
  return `
<a class="skip-link" href="#top">Skip to content</a>
<header${styled ? ` class="shell site-header ${headerClass}"` : ""}>
  <a${styled ? ' class="brand" aria-label="Ocuna home"' : ""} href="/">${styled ? '<img src="/images/ocuna_title_logo_nobackground.webp" alt="Ocuna" />' : "Ocuna"}</a>
  <nav${styled ? ' class="nav"' : ""} aria-label="Primary navigation">
    <a href="/">Home</a>
    <a href="/#work">Ocura</a>
    <a href="/four1">Four1</a>
    <a href="/research">Research</a>
    <a href="/contact">Contact</a>
  </nav>
</header>`;
}

function footerHtml(styled = false) {
  return `
<footer${styled ? ' class="site-footer"' : ""}>
  ${styled ? '<div class="shell footer-layout"><a class="footer-logo-link" href="#top" aria-label="Back to top"><img src="/favicons/ocuna-head-512.png" alt="" /></a><nav class="footer-contact" aria-label="Footer">' : ""}
  <a href="/research">Research</a>
  <a href="/contact">Contact</a>
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
  ${styled ? "</nav></div>" : ""}
</footer>`;
}

function raccoonArtworkHtml(art, featured = false) {
  return `<figure class="not-found-art${featured ? " not-found-art--featured" : ""}">
    <time class="not-found-art__year" datetime="${art.year}">${art.year}</time>
    <a class="not-found-art__image" href="/${galleryImagePath(art)}" aria-label="Enlarge ${escapeHtml(art.title)}, ${art.year}">
      <img src="/${galleryImagePath(art, !featured)}" alt="${escapeHtml(art.alt)}" width="${art.width}" height="${art.height}" loading="${featured ? "eager" : "lazy"}" fetchpriority="${featured ? "high" : "auto"}" decoding="async" />
      <span class="not-found-art__enlarge" aria-hidden="true">View artwork <span>↗</span></span>
    </a>
    <figcaption>
      <${featured ? "h2" : "h3"}>${escapeHtml(art.title)}</${featured ? "h2" : "h3"}>
      <p class="not-found-art__credit">${escapeHtml(art.credit)}</p>
      <p class="not-found-art__description">${escapeHtml(art.description)}</p>
      <a class="not-found-art__source" href="${escapeHtml(art.sourceHref)}">View source <span aria-hidden="true">↗</span><span class="not-found-sr-only"> for ${escapeHtml(art.title)}, ${art.year}</span></a>
    </figcaption>
  </figure>`;
}

function wrap(title, body, beforeTitle = "") {
  return `${navHtml()}
<main id="top" tabindex="-1">
  ${beforeTitle}
  <h1>${title}</h1>
  ${body}
</main>
${footerHtml()}`;
}

function executionGraphHtml() {
  const nodeHtml = (id, children = "") => {
    const node = EXECUTION_NODES.find((item) => item.id === id);
    return `<li aria-label="${escapeHtml(`${node.label}. ${node.description}`)}">${escapeHtml(node.label)}${children}</li>`;
  };
  const branches = `<ul aria-label="Variations from the baseline">${[
    ["warmup", "warmupRun"],
    ["inputs", "inputsRun"],
  ].map(([branch, run]) => nodeHtml(branch, `<ol>${nodeHtml(run)}</ol>`)).join("")}</ul>`;
  return `<section id="ocura" aria-labelledby="execution-display-title">
        <header><h2 id="execution-display-title">${escapeHtml(EXECUTION_TITLE)}</h2><a href="${OCURA_OSS_DOCS}">Workflow</a></header>
        <div role="group" aria-label="${escapeHtml(EXECUTION_DESCRIPTION)}"><ol>${nodeHtml("baseline", branches)}${["verify", "compare", "choose"].map((id) => nodeHtml(id)).join("")}</ol></div>
      </section>`;
}

function landingBody(extra = "") {
  return `
      <p>${escapeHtml(HOME.introduction)}</p>
      ${homeRaccoonHtml()}
      <section aria-labelledby="system-partners-title">
        <h2 id="system-partners-title">${escapeHtml(HOME.partnersTitle)}</h2>
        <ul>${HOME.partners.map((partner) => `<li><a href="${escapeHtml(partner.href)}"><img src="/${escapeHtml(partner.logo)}" alt="${escapeHtml(partner.name)}" width="${partner.width}" height="${partner.height}" style="width:auto;height:40px;max-width:100%;filter:grayscale(1)" /></a></li>`).join("\n")}</ul>
      </section>
      <nav aria-label="Ocuna systems">
        <a href="/#work">Scheduler</a>
        <a href="/#market">Training and inference</a>
        <a href="/#ocura">Execution graph</a>
        <a href="${OSS.home}">Ocura OSS at Protention</a>
        <a href="${OSS.examples}">PyTorch, JAX, and Ray example</a>
        <a href="/four1">Four1</a>
        <a href="/research">Field Notes</a>
      </nav>
      <section id="work" aria-label="Training, inference, and run records">
        <div id="market">
          ${HOME.capabilities.map((capability) => `<article><h2>${escapeHtml(capability.title)}</h2><h3>${escapeHtml(capability.heading)}</h3><p>${escapeHtml(capability.description)}</p></article>`).join("\n")}
        </div>
      </section>
      <section aria-labelledby="system-builders-title"><h2 id="system-builders-title">${escapeHtml(HOME.buildersTitle)}</h2></section>
      ${executionGraphHtml()}
      <section id="ocura-oss"><h2>Record, branch, and compare.</h2><p>Ocura OSS is an open-source execution ledger hosted at Protention. Record local command runs and their lineage, branch from a completed run, and compare the evidence.</p><pre><code>python -m pip install ocura-oss</code></pre><a href="${OSS.home}">Visit protention.dev</a><a href="${OSS.api}">Python API</a><a href="${OSS.examples}">Training example</a></section>
      <section><h2>More from Ocuna.</h2><h3><a href="/four1">Four1</a></h3><p>${escapeHtml(FOUR1.definition)}</p><h3><a href="/research/${escapeHtml(RESEARCH_POSTS[0].slug)}">${escapeHtml(RESEARCH_POSTS[0].title)}</a></h3><p>${escapeHtml(RESEARCH_POSTS[0].category)} · ${escapeHtml(RESEARCH_POSTS[0].dateLabel)}</p></section>
      <p id="critter"><a href="/critter-acknowledgement">Critter acknowledgement</a></p>
      ${extra}`;
}

function researchImageHtml(image, priority = false) {
  const img = `<img src="/research/${escapeHtml(image.file)}" alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}" loading="${priority ? "eager" : "lazy"}" fetchpriority="${priority ? "high" : "auto"}" decoding="async" style="max-width:100%;height:auto" />`;
  return image.href ? `<a href="${escapeHtml(image.href)}">${img}</a>` : img;
}

function researchMediaHtml(media, priority = false) {
  const visual = media.layout === "event"
    ? `<div class="field-event-panel"><div class="field-event-marks">${media.marks.map((mark) => `<div class="field-event-mark field-event-mark-${escapeHtml(mark.kind)}">${researchImageHtml(mark, priority)}</div>`).join("")}</div><div class="field-event-art">${researchImageHtml(media.image, priority)}</div></div>`
    : researchImageHtml(media.image, priority);
  return `<figure class="field-media field-media-${escapeHtml(media.layout)}${media.theme ? ` field-media-${escapeHtml(media.theme)}` : ""}">${visual}<figcaption>${escapeHtml(media.caption)}${media.credit ? ` <a href="${escapeHtml(media.credit.href)}">${escapeHtml(media.credit.label)}</a>.` : ""}</figcaption></figure>`;
}

export function crawlableHtml(route) {
  if (route === "/research") {
    return wrap(
      "Field Notes",
      `<section aria-label="Research notes">
        ${RESEARCH_POSTS.map((post, index) => `<article>
          <figure><img src="/research/${escapeHtml(RESEARCH_ART[post.art].file)}" width="${RESEARCH_ART[post.art].width ?? 1536}" height="${RESEARCH_ART[post.art].height ?? 1024}" loading="${index === 0 ? "eager" : "lazy"}" fetchpriority="${index === 0 ? "high" : "auto"}" decoding="async" style="max-width:100%;height:auto" alt="${escapeHtml(RESEARCH_ART[post.art].alt)}" /></figure>
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
    <p>Ocuna Research</p>
    <p><time datetime="${escapeHtml(researchPost.date)}">${escapeHtml(researchPost.dateLabel)}</time> · ${escapeHtml(researchPost.readTime)}${researchPost.updated ? ` · Updated <time datetime="${escapeHtml(researchPost.updated)}">${escapeHtml(researchPost.updatedLabel)}</time>` : ""}</p>
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
    return wrap(HOME.headline, landingBody(), homeEngravingHtml());
  }

  if (route === "/ocura") {
    return wrap(
      HOME.headline,
      landingBody(),
      homeEngravingHtml(),
    );
  }

  if (route === "/contact") {
    return wrap(
      "Write to Ocuna",
      `
      <p>${pageMeta["/contact"].description}</p>
      <p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. There is no signup form on this site.</p>
      <p>For Ocura OSS documentation and support, visit <a href="${OSS.home}">Protention</a>.</p>
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

  return `${navHtml(true)}
<main class="not-found-page" id="top" tabindex="-1">
  <div class="not-found-shell">
    <section class="not-found-hero" aria-labelledby="not-found-title">
      <div class="not-found-hero__copy">
        <p class="not-found-code" aria-label="Error 404">404</p>
        <h1 id="not-found-title">${escapeHtml(NOT_FOUND.title)}</h1>
        <p class="not-found-message">${escapeHtml(NOT_FOUND.message)}</p>
        <nav class="not-found-actions" aria-label="Find your way back">
          ${NOT_FOUND.actions.map((action, index) => `<a class="${index === 0 ? "not-found-home" : "not-found-text-link"}" href="/${action.href}">${index === 0 ? '<span aria-hidden="true">←</span>' : ""}${escapeHtml(action.label)}${index !== 0 ? '<span aria-hidden="true">↗</span>' : ""}</a>`).join("\n")}
        </nav>
      </div>
      ${raccoonArtworkHtml(RACCOON_GALLERY[0], true)}
    </section>
    <section class="not-found-gallery" aria-labelledby="raccoon-gallery-title">
      <div class="not-found-gallery__heading">
        <h2 id="raccoon-gallery-title">${escapeHtml(NOT_FOUND.galleryTitle)}</h2>
        <p>${RACCOON_GALLERY[0].year}–${RACCOON_GALLERY.at(-1).year}</p>
      </div>
      <ol class="not-found-gallery__list" start="2" aria-label="Later raccoon artwork in chronological order">
        ${RACCOON_GALLERY.slice(1).map((art) => `<li>${raccoonArtworkHtml(art)}</li>`).join("\n")}
      </ol>
    </section>
  </div>
</main>
${footerHtml(true)}`;
}
