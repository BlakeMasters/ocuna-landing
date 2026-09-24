import {
  CONTACT_EMAIL,
  OCURA_OSS_REPO,
  OCURA_OSS_SOURCE_REF,
  OCURA_OSS_VERSION,
  pageMeta,
} from "../content.js";
import { DOC_PAGES, isDocRoute } from "./docPages.js";
import { getResearchPost, RESEARCH_ART, RESEARCH_POSTS } from "./research.js";
import { extractHeadings, escapeHtml, renderMarkdown } from "../lib/markdown.js";

function navHtml() {
  return `
<header>
  <a href="/">Ocuna</a>
  <nav>
    <a href="/ocuna">Ocuna</a>
    <a href="/ocura">Ocura</a>
    <a href="/onveil">OnVeil</a>
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
      <p>${pageMeta["/"].description}</p>
      <p>Ocuna builds the execution layer for AI workloads that branch as they run. Ocura is the runtime. Ocura OSS is a local execution ledger for recording, branching, and comparing command runs.</p>
      <nav>
        <a href="/#work">Scheduler</a>
        <a href="/#market">Training and inference</a>
        <a href="/#ocura">V0 simulator</a>
        <a href="/docs">Ocura OSS docs</a>
        <a href="/docs/examples">PyTorch, JAX, and Ray example</a>
        <a href="/onveil">OnVeil</a>
        <a href="/research">Field Notes</a>
      </nav>
      ${extra}`;
}

export function crawlableHtml(route, markdown = "") {
  if (route === "/research") {
    return wrap(
      "Field Notes",
      `<section aria-label="Research notes">
        ${RESEARCH_POSTS.map((post) => `<article>
          <figure><img src="/research/${escapeHtml(RESEARCH_ART[post.art].file)}" width="1536" height="1024" style="max-width:100%;height:auto" alt="${escapeHtml(RESEARCH_ART[post.art].alt)}" /></figure>
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
    <figure><img src="/research/${escapeHtml(illustration.file)}" width="1536" height="1024" style="max-width:100%;height:auto" alt="${escapeHtml(illustration.alt)}" /></figure>
    <nav aria-label="On this page">${researchPost.sections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join(" ")}</nav>
    ${researchPost.sections.map((section) => `<section aria-labelledby="${escapeHtml(section.id)}">
      <h2 id="${escapeHtml(section.id)}" tabindex="-1">${escapeHtml(section.title)}</h2>
      ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n      ")}
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
    return wrap("Ocuna, infrastructure for uncertain computation", landingBody());
  }

  if (route === "/ocura") {
    return wrap(
      "Ocura, Ocuna’s branch-aware AI runtime",
      `
      <p>${pageMeta["/ocura"].description}</p>
      <p>Ocura directs compute across training and inference branches, holds budgets, and keeps every path it took on the record.</p>
      <nav>
        <a href="/ocura#work">Scheduler</a>
        <a href="/ocura#market">Training and inference</a>
        <a href="/ocura#ocura">V0 simulator</a>
        <a href="/docs">Ocura OSS documentation</a>
      </nav>`,
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
      <p>Security reports for Ocura OSS should use <a href="${OCURA_OSS_REPO}/security/advisories/new">GitHub private vulnerability reporting</a>.</p>`,
    );
  }

  if (route === "/onveil") {
    return wrap(
      "Checking what agents are allowed to run",
      `
      <p>More AI agents are online every month. They crawl pages, call APIs, open pull requests, and run commands, usually with someone’s credentials attached. Most services can’t tell a well-behaved agent from a hijacked one until something breaks.</p>
      <p>OnVeil is Ocuna’s research into checking an agent’s authority before it executes anything.</p>
      <h2>Why we’re working on it</h2>
      <p><strong>Agents have real access.</strong> A crawler used to read pages and leave. Agents now log in, fill out forms, merge code, and spend money, often with a long-lived token nobody is watching.</p>
      <p><strong>One bad instruction is enough.</strong> A leaked token, or a prompt hidden in a web page, can turn a helpful agent into a flood of requests. For a small service, that is an outage.</p>
      <p><strong>A check before every action.</strong> OnVeil puts a check between an agent and the thing it wants to do. The agent presents a grant, the check reads it, and only then does the action run. We are also working on how operators review the grants that were used.</p>
      <p><a href="/">More from Ocuna</a> · <a href="/ocura">Ocura</a></p>`,
    );
  }

  if (route === "/critter-acknowledgement") {
    return wrap(
      "Critter acknowledgement",
      `<p>${pageMeta["/critter-acknowledgement"].description}</p>`,
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
