import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { asset, pagePath, routeFromLocation } from "./assets.js";
import "./components/CritterPage.css";
import "./components/PaperPage.css";
import {
  CONTACT_EMAIL,
  companyNavItems,
  footerNavItems,
  pageMeta,
  productItems,
  SITE_ORIGIN,
} from "./content.js";
import ContactPage from "./components/ContactPage.jsx";
import CritterPage from "./components/CritterPage.jsx";
import DocsPage from "./components/DocsPage.jsx";
import LandingPage from "./components/LandingPage.jsx";
import NotFoundPage from "./components/NotFoundPage.jsx";
import OnVeilPage from "./components/OnVeilPage.jsx";
import { ParticleProvider } from "./components/particles/ParticleContext.jsx";
import { jsonLdGraph } from "./content/jsonld.js";
import { isDocRoute } from "./content/docPages.js";
import { RESEARCH_ROUTES } from "./content/research.js";

const LANDING_KINDS = new Set(["home", "ocuna", "ocura"]);
const PAPER_KINDS = new Set(["contact", "notfound"]);
const RESEARCH_ROUTE_SET = new Set(RESEARCH_ROUTES);
const ResearchPage = lazy(() => import("./components/ResearchPage.jsx"));

function useRoute() {
  const [route, setRoute] = useState(() => routeFromLocation());

  useEffect(() => {
    const updateRoute = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);

  return [route, setRoute];
}

function pageKind(route) {
  if (route === "/") return "home";
  if (route === "/ocuna") return "ocuna";
  if (route === "/ocura") return "ocura";
  if (route === "/onveil") return "onveil";
  if (route === "/critter-acknowledgement") return "critter";
  if (isDocRoute(route)) return "docs";
  if (RESEARCH_ROUTE_SET.has(route)) return "research";
  if (route === "/contact") return "contact";
  return "notfound";
}

function canonicalPath(route) {
  return route === "/ocuna" ? "/" : route;
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) return false;
  target.tabIndex = -1;
  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
  return true;
}

export default function App() {
  const [route, setRoute] = useRoute();
  const kind = pageKind(route);
  const isLandingPage = LANDING_KINDS.has(kind);
  const isOnVeilPage = kind === "onveil";
  const isCritterPage = kind === "critter";
  const isDocsPage = kind === "docs";
  const isResearchPage = kind === "research";
  const isPaperPage = PAPER_KINDS.has(kind);
  const meta = pageMeta[kind === "notfound" ? "/404" : route] ?? pageMeta["/404"];
  const moveFocusToMain = useRef(false);

  useEffect(() => {
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
    document.querySelector('meta[property="og:type"]')?.setAttribute("content", meta.type ?? "website");
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", `${SITE_ORIGIN}${meta.image ?? "/images/ocuna_logo.png"}`);

    let robots = document.querySelector('meta[name="robots"]');
    if (kind === "notfound") {
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.append(robots);
      }
      robots.setAttribute("content", "noindex");
    } else {
      robots?.remove();
    }

    if (kind === "notfound") {
      document.querySelector('meta[property="og:url"]')?.remove();
      document.querySelector('link[rel="canonical"]')?.remove();
      return;
    }

    const canonical = `https://ocuna-ai.com${canonicalPath(route) === "/" ? "/" : canonicalPath(route)}`;

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.append(ogUrl);
    }
    ogUrl.setAttribute("content", canonical);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.append(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonical);
  }, [kind, meta.description, meta.title, route]);

  useEffect(() => {
    let script = document.getElementById("ocuna-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.id = "ocuna-jsonld";
      script.type = "application/ld+json";
      document.head.append(script);
    }
    script.textContent = JSON.stringify(jsonLdGraph());
  }, []);

  useEffect(() => {
    document.body.classList.toggle("onveil-route", isOnVeilPage);
    document.body.classList.toggle("critter-route", isCritterPage);
    document.body.classList.toggle("landing-route", isLandingPage);
    document.body.classList.toggle("docs-route", isDocsPage);
    document.body.classList.toggle("research-route", isResearchPage);
    document.body.classList.toggle("paper-route", isPaperPage);
    return () => {
      document.body.classList.remove("onveil-route");
      document.body.classList.remove("critter-route");
      document.body.classList.remove("landing-route");
      document.body.classList.remove("docs-route");
      document.body.classList.remove("research-route");
      document.body.classList.remove("paper-route");
    };
  }, [isCritterPage, isDocsPage, isLandingPage, isOnVeilPage, isPaperPage, isResearchPage]);

  useEffect(() => {
    if (!moveFocusToMain.current) return;
    let observer;
    function focusWhenReady() {
      const target = document.getElementById("top");
      if (target) {
        target.focus({ preventScroll: true });
        moveFocusToMain.current = false;
        observer?.disconnect();
        return true;
      }
      return false;
    }
    if (!focusWhenReady()) {
      observer = new MutationObserver(focusWhenReady);
      observer.observe(document.getElementById("root"), { childList: true, subtree: true });
    }
    return () => observer?.disconnect();
  }, [route]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const targetId = hash || (kind === "ocura" ? "ocura" : null);
    if (!targetId) return undefined;

    let frame;
    let settleTimer;
    let attempts = 0;

    function scrollWhenReady() {
      if (scrollToId(targetId)) {
        settleTimer = window.setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ block: "start" });
        }, 240);
        return;
      }
      if (attempts++ < 60) {
        frame = window.requestAnimationFrame(scrollWhenReady);
      }
    }

    frame = window.requestAnimationFrame(scrollWhenReady);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [kind, route]);

  function navigate(event, href) {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.shiftKey || event.altKey ||
      event.currentTarget.target === "_blank"
    ) return;

    if (href.startsWith("#")) {
      if (isLandingPage) {
        return;
      }
      event.preventDefault();
      window.history.pushState({}, "", `${pagePath("")}${href}`);
      window.scrollTo({ top: 0 });
      moveFocusToMain.current = true;
      setRoute("/");
      return;
    }

    event.preventDefault();
    window.history.pushState({}, "", pagePath(href));
    if (href !== "/ocura") {
      window.scrollTo({ top: 0 });
    }
    moveFocusToMain.current = true;
    setRoute(routeFromLocation());
  }

  const header = <SiteHeader route={route} kind={kind} onNavigate={navigate} />;
  const footer = <SiteFooter isOnVeilPage={isOnVeilPage} onNavigate={navigate} />;

  let page = <NotFoundPage />;
  if (isLandingPage) page = <LandingPage />;
  if (kind === "docs") page = <DocsPage route={route} />;
  if (kind === "contact") page = <ContactPage />;
  if (kind === "critter") page = <CritterPage />;
  if (kind === "onveil") page = <OnVeilPage />;
  if (kind === "research") {
    page = (
      <Suspense fallback={<div className="shell" role="status">Loading field notes…</div>}>
        <ResearchPage route={route} onNavigate={navigate} />
      </Suspense>
    );
  }

  const shell = (
    <>
      <a className="skip-link" href="#top">Skip to content</a>
      {header}
      {page}
      {footer}
    </>
  );

  if (isLandingPage) {
    return <ParticleProvider>{shell}</ParticleProvider>;
  }

  return shell;
}

function SiteHeader({ route, kind, onNavigate }) {
  const isOnVeilPage = kind === "onveil";

  return (
    <header className={`shell site-header${isOnVeilPage ? " site-header--onveil" : ""}`}>
      <a
        className="brand"
        href={pagePath("")}
        aria-current={route === "/" || route === "/ocuna" ? "page" : undefined}
        aria-label="Ocuna home"
        onClick={(event) => onNavigate(event, "/")}
      >
        <img src={asset("images/ocuna_title_logo_nobackground.webp")} alt="Ocuna" />
      </a>
      <nav className="nav" aria-label="Primary navigation">
        <ProductMenu onNavigate={onNavigate} route={route} />
        {companyNavItems.map((item) => {
          const isCurrent = route === item.href || route.startsWith(`${item.href}/`);

          return (
            <a
              aria-current={isCurrent ? "page" : undefined}
              href={pagePath(item.href)}
              key={item.label}
              onClick={(event) => onNavigate(event, item.href)}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

function ProductMenu({ onNavigate, route }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeFromOutsidePointer(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeFromOutsidePointer);
  }, [isOpen]);

  function closeFromBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      event.currentTarget.querySelector(".nav-products-trigger")?.focus();
    }
  }

  function openFromMouse(event) {
    if (event.pointerType === "mouse") {
      setIsOpen(true);
    }
  }

  function closeFromMouse(event) {
    if (event.pointerType === "mouse") {
      setIsOpen(false);
    }
  }

  return (
    <div
      className={`nav-products${isOpen ? " is-open" : ""}`}
      onBlur={closeFromBlur}
      onKeyDown={handleKeyDown}
      onPointerEnter={openFromMouse}
      onPointerLeave={closeFromMouse}
      ref={menuRef}
    >
      <button
        aria-controls="products-menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="nav-products-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        Products
        <svg aria-hidden="true" viewBox="0 0 12 8">
          <path d="M1 1.5 6 6.5l5-5" />
        </svg>
      </button>
      <div className="nav-products-menu" id="products-menu">
        {productItems.map((item) => {
          const isCurrent =
            (item.label === "Ocura" && item.href === "/ocura" && route === "/ocura") ||
            (item.label === "OnVeil" && route === "/onveil");

          return (
            <a
              aria-current={isCurrent ? "page" : undefined}
              href={pagePath(item.href)}
              key={item.label}
              onClick={(event) => {
                setIsOpen(false);
                onNavigate(event, item.href);
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function SiteFooter({ isOnVeilPage, onNavigate }) {
  return (
    <footer className={`site-footer${isOnVeilPage ? " site-footer--onveil" : ""}`}>
      <div className="shell footer-layout">
        <a className="footer-logo-link" href="#top" aria-label="Back to top">
          <img src={asset("images/ocuna_logo.webp")} alt="" />
        </a>
        <nav className="footer-contact" aria-label="Footer">
          {footerNavItems.map((item) => (
            <a
              href={pagePath(item.href)}
              key={item.label}
              onClick={(event) => onNavigate(event, item.href)}
            >
              {item.label}
            </a>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </nav>
      </div>
    </footer>
  );
}
