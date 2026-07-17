import { useEffect, useState } from "react";
import { asset, pagePath, routeFromLocation } from "./assets.js";
import { navItems, productItems } from "./content.js";
import LandingPage from "./components/LandingPage.jsx";
import CritterPage from "./components/CritterPage.jsx";
import OnVeilPage from "./components/OnVeilPage.jsx";
import { ParticleProvider } from "./components/particles/ParticleContext.jsx";

function useRoute() {
  const [route, setRoute] = useState(() => routeFromLocation());

  useEffect(() => {
    const updateRoute = () => setRoute(routeFromLocation());

    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);

  return [route, setRoute];
}

export default function App() {
  const [route, setRoute] = useRoute();
  const isLandingPage = route === "/";
  const isCritterPage = route === "/critter-acknowledgement";
  const isOnVeilPage = route === "/onveil";

  useEffect(() => {
    const title = isCritterPage
      ? "Ocuna | Critter Acknowledgement"
      : isOnVeilPage
        ? "OnVeil | Authority Research"
        : "Ocuna | Branch-Aware AI Runtime";
    const description = isCritterPage
      ? "Ocuna's acknowledgement of structured stochasticity, adaptation, and the raccoon."
      : isOnVeilPage
        ? "OnVeil explores authority checks and operator controls for software execution."
        : "Ocura is a branch-aware scheduler and evidence engine for AI training and inference workloads.";

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [isCritterPage, isOnVeilPage]);

  useEffect(() => {
    document.body.classList.toggle("onveil-route", isOnVeilPage);
    document.body.classList.toggle("critter-route", isCritterPage);
    return () => {
      document.body.classList.remove("onveil-route");
      document.body.classList.remove("critter-route");
    };
  }, [isCritterPage, isOnVeilPage]);

  useEffect(() => {
    if (!window.location.hash) return;

    let frame;
    let settleTimer;
    let attempts = 0;

    function scrollWhenReady() {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ block: "start" });
        settleTimer = window.setTimeout(() => {
          target.scrollIntoView({ block: "start" });
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
  }, [route]);

  function navigate(event, href) {
    if (href.startsWith("#")) {
      if (isLandingPage) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, "", `${pagePath("")}${href}`);
      setRoute("/");
      return;
    }

    event.preventDefault();
    window.history.pushState({}, "", pagePath(href));
    window.scrollTo({ top: 0 });
    setRoute(routeFromLocation());
  }

  return (
    <>
      {isCritterPage ? (
        <>
          <SiteHeader route={route} onNavigate={navigate} />
          <CritterPage />
        </>
      ) : isOnVeilPage ? (
        <>
          <SiteHeader route={route} onNavigate={navigate} />
          <OnVeilPage />
        </>
      ) : (
        <ParticleProvider>
          <SiteHeader route={route} onNavigate={navigate} />
          <LandingPage />
        </ParticleProvider>
      )}
      <SiteFooter isOnVeilPage={isOnVeilPage} />
    </>
  );
}

function SiteHeader({ route, onNavigate }) {
  const isLandingPage = route === "/";
  const isOnVeilPage = route === "/onveil";

  return (
    <header className={`shell site-header${isOnVeilPage ? " site-header--onveil" : ""}`}>
      <a className="brand" href={pagePath("")} aria-label="Ocuna home">
        <img src={asset("images/ocuna_title_logo_nobackground.webp")} alt="Ocuna" />
      </a>
      <nav className="nav" aria-label="Primary navigation">
        <ProductMenu
          isLandingPage={isLandingPage}
          onNavigate={onNavigate}
          route={route}
        />
        {navItems.map((item) => {
          const href = item.href.startsWith("#") && !isLandingPage
            ? `${pagePath("")}${item.href}`
            : item.href.startsWith("/")
              ? pagePath(item.href)
              : item.href;

          return (
            <a
              href={href}
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

function ProductMenu({ isLandingPage, onNavigate, route }) {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div
      className={`nav-products${isOpen ? " is-open" : ""}`}
      onBlur={closeFromBlur}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => setIsOpen(true)}
      onPointerLeave={() => setIsOpen(false)}
    >
      <button
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
      <div className="nav-products-menu">
        {productItems.map((item) => {
          const href = item.href.startsWith("#") && !isLandingPage
            ? `${pagePath("")}${item.href}`
            : item.href.startsWith("/")
              ? pagePath(item.href)
              : item.href;
          const isCurrent =
            (item.label === "Ocura" && route === "/") ||
            (item.label === "OnVeil" && route === "/onveil");

          return (
            <a
              aria-current={isCurrent ? "page" : undefined}
              href={href}
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

function SiteFooter({ isOnVeilPage }) {
  return (
    <footer className={`site-footer${isOnVeilPage ? " site-footer--onveil" : ""}`}>
      <div className="shell footer-layout">
        <a className="footer-logo-link" href="#top" aria-label="Back to top">
          <img src={asset("images/ocuna_logo.webp")} alt="" />
        </a>
        <div className="footer-contact">
          <span>Contact</span>
          <a href="mailto:business@ocuna-ai.com">business@ocuna-ai.com</a>
        </div>
      </div>
    </footer>
  );
}
