import { useEffect, useMemo, useState } from "react";
import { pagePath } from "../assets.js";
import {
  OCURA_OSS_PYPI,
  OCURA_OSS_REPO,
  OCURA_OSS_SOURCE_REF,
  OCURA_OSS_VERSION,
} from "../content.js";
import apiMarkdown from "../content/docs/api.md?raw";
import cliMarkdown from "../content/docs/cli.md?raw";
import ocuraOssMarkdown from "../content/docs/ocura-oss.md?raw";
import automationMarkdown from "../content/docs/automation.md?raw";
import examplesMarkdown from "../content/docs/examples.md?raw";
import stateMarkdown from "../content/docs/state.md?raw";
import { DOC_PAGES } from "../content/docPages.js";
import { extractHeadings, renderMarkdown } from "../lib/markdown.js";
import "./DocsPage.css";

const FONT_SIZE_STEPS = [14, 16, 18, 20, 22];
const FONT_SIZE_STORAGE_KEY = "ocura-oss-docs-font-size";
const LEGACY_SCALE_STEPS = [0.875, 1, 1.125, 1.25, 1.375];

function readStoredFontSize() {
  try {
    const stored = Number(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
    if (FONT_SIZE_STEPS.includes(stored)) return stored;
    const legacyIndex = LEGACY_SCALE_STEPS.indexOf(stored);
    if (legacyIndex !== -1) return FONT_SIZE_STEPS[legacyIndex];
  } catch {
    /* localStorage unavailable */
  }
  return 16;
}

const markdownByFile = {
  "ocura-oss.md": ocuraOssMarkdown,
  "cli.md": cliMarkdown,
  "api.md": apiMarkdown,
  "automation.md": automationMarkdown,
  "examples.md": examplesMarkdown,
  "state.md": stateMarkdown,
};

export default function DocsPage({ route }) {
  const page = DOC_PAGES.find((item) => item.route === route) ?? DOC_PAGES[0];
  const markdown = markdownByFile[page.file];
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  const [fontSizePx, setFontSizePx] = useState(readStoredFontSize);
  const fontSizeIndex = FONT_SIZE_STEPS.indexOf(fontSizePx);

  useEffect(() => {
    const sidebarBody = document.querySelector("#docs-sidebar .docs-sidebar-body");
    if (sidebarBody) sidebarBody.scrollTop = 0;
  }, [route]);

  useEffect(() => {
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSizePx));
    } catch {
      /* localStorage unavailable */
    }
  }, [fontSizePx]);

  function isPlainClick(event) {
    return !event.defaultPrevented && event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  function handleTocClick(event, headingId) {
    if (!isPlainClick(event)) return;
    const target = document.getElementById(headingId);
    if (!target) return;
    event.preventDefault();
    target.tabIndex = -1;
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
    window.history.replaceState({}, "", "#" + headingId);
  }

  function handleProseClick(event) {
    const link = event.target.closest("a[href]");
    if (!link || !isPlainClick(event)) return;
    const href = link.getAttribute("href");
    if (!href?.startsWith("/") || href.startsWith("//")) return;
    const target = new URL(href, window.location.origin);
    if (target.pathname === window.location.pathname && target.hash) {
      handleTocClick(event, decodeURIComponent(target.hash.slice(1)));
      return;
    }
    event.preventDefault();
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0 });
  }

  function handlePageClick(event, href) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    window.history.pushState({}, "", pagePath(href));
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="docs-page" id="top" tabIndex={-1}>
      <div className="shell docs-layout">
        <aside className="docs-sidebar" id="docs-sidebar" aria-label="Documentation navigation">
          <div className="docs-sidebar-header">
            <p>Ocura OSS <span>v{OCURA_OSS_VERSION}</span></p>
          </div>

          <div className="docs-sidebar-body">
            <div className="docs-sidebar-group">
              <nav aria-label="Documentation sections">
                {DOC_PAGES.map((item) => (
                  <a
                    aria-current={item.route === page.route ? "page" : undefined}
                    className={item.route === page.route ? "is-current" : undefined}
                    href={pagePath(item.route)}
                    key={item.route}
                    onClick={(event) => handlePageClick(event, item.route)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            {headings.length > 0 && (
              <div className="docs-sidebar-group">
                <p>On this page</p>
                <nav aria-label="On this page">
                  {headings.map((heading) => (
                    <a
                      className={heading.level > 2 ? "is-sub" : undefined}
                      href={"#" + heading.id}
                      key={heading.id}
                      onClick={(event) => handleTocClick(event, heading.id)}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <div className="docs-sidebar-group">
              <p>Project</p>
              <nav aria-label="Project links">
                <a href={OCURA_OSS_PYPI}>PyPI</a>
                <a href={OCURA_OSS_REPO + "/tree/" + OCURA_OSS_SOURCE_REF}>Source code</a>
                <a href={OCURA_OSS_REPO + "/blob/" + OCURA_OSS_SOURCE_REF + "/CHANGELOG.md"}>Changelog</a>
                <a href={OCURA_OSS_REPO + "/blob/" + OCURA_OSS_SOURCE_REF + "/CONTRIBUTING.md"}>Contributing</a>
              </nav>
            </div>
          </div>

          <div className="docs-sidebar-footer">
            <div className="docs-text-size" role="group" aria-label="Text size">
              <button
                type="button"
                className="docs-text-size-btn"
                aria-label="Smaller text"
                disabled={fontSizeIndex <= 0}
                onClick={() => setFontSizePx(FONT_SIZE_STEPS[fontSizeIndex - 1])}
              >
                A−
              </button>
              <span className="docs-text-size-label" aria-live="polite">{fontSizePx}px</span>
              <button
                type="button"
                className="docs-text-size-btn"
                aria-label="Larger text"
                disabled={fontSizeIndex >= FONT_SIZE_STEPS.length - 1}
                onClick={() => setFontSizePx(FONT_SIZE_STEPS[fontSizeIndex + 1])}
              >
                A+
              </button>
            </div>
          </div>
        </aside>

        <article className="docs-main" style={{ "--docs-font-size": fontSizePx + "px" }}>
          <nav className="docs-source-links" aria-label="Alternative documentation formats">
            <a href={pagePath("docs/" + page.file)}>Read Markdown</a>
            <a href={OCURA_OSS_REPO + "/blob/" + OCURA_OSS_SOURCE_REF + "/" + page.repositoryPath}>Read on GitHub</a>
          </nav>
          <div className="docs-prose" dangerouslySetInnerHTML={{ __html: html }} onClick={handleProseClick} />
        </article>
      </div>
    </main>
  );
}
