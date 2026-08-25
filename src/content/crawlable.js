import {
  CONTACT_EMAIL,
  OCURA_OSS_REPO,
  pageMeta,
} from "../content.js";
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
    <a href="/contact">Contact</a>
  </nav>
</header>`;
}

function footerHtml() {
  return `
<footer>
  <a href="/docs">Docs</a>
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
      <p>Ocuna builds the execution layer for AI workloads that branch as they run. Ocura is the runtime. Ocura OSS is the public research package.</p>
      <nav>
        <a href="/#work">Scheduler</a>
        <a href="/#market">Training and inference</a>
        <a href="/ocura">Ocura</a>
        <a href="/docs">Ocura OSS docs</a>
      </nav>
      ${extra}`;
}

export function crawlableHtml(route, markdown = "") {
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

  if (route === "/docs" || route === "/docs/cli" || route === "/docs/api") {
    const toc = extractHeadings(markdown)
      .map((heading) => `<a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`)
      .join(" ");
    const body = renderMarkdown(markdown);
    return `${navHtml()}
<main>
  <aside>
    <nav aria-label="Documentation sections">
      <a href="/docs">Overview</a>
      <a href="/docs/cli">CLI reference</a>
      <a href="/docs/api">Python API</a>
    </nav>
  </aside>
  <article>
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
      "OnVeil, authority research",
      `
      <p>${pageMeta["/onveil"].description}</p>
      <p><a href="/">View Ocuna</a> · <a href="/ocura">Ocura</a></p>`,
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
