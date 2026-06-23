import { useEffect, useState } from "react";
import { asset, pagePath, routeFromLocation } from "./assets.js";
import { navItems } from "./content.js";
import BrandShapeTrigger from "./components/BrandShapeTrigger.jsx";
import LandingPage from "./components/LandingPage.jsx";
import CritterPage from "./components/CritterPage.jsx";
import { ParticleProvider } from "./components/particles/ParticleContext.jsx";
import { universeSections } from "./content/nounShapes.js";

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
  const isCritterPage = route === "/critter-acknowledgement";

  useEffect(() => {
    document.title = isCritterPage
      ? "Ocuna | Critter Acknowledgement"
      : "Ocuna | AI Infrastructure";
  }, [isCritterPage]);

  useEffect(() => {
    if (isCritterPage || !window.location.hash) {
      return;
    }

    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, [isCritterPage]);

  function navigate(event, href) {
    if (href.startsWith("#")) {
      if (isCritterPage) {
        return;
      }

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
          <SiteHeader isCritterPage onNavigate={navigate} />
          <CritterPage />
        </>
      ) : (
        <ParticleProvider>
          <SiteHeader isCritterPage={false} onNavigate={navigate} />
          <LandingPage />
        </ParticleProvider>
      )}
      <SiteFooter />
    </>
  );
}

function SiteHeader({ isCritterPage, onNavigate }) {
  return (
    <header className="shell site-header">
      {isCritterPage ? (
        <a className="brand" href={pagePath("")} aria-label="Ocuna home">
          <img src={asset("images/ocuna_title_logo_nobackground.png")} alt="Ocuna" />
        </a>
      ) : (
        <BrandShapeTrigger
          shape="raccoon"
          sectionId={universeSections.hero}
          href={pagePath("")}
          aria-label="Ocuna home"
        >
          <img src={asset("images/ocuna_title_logo_nobackground.png")} alt="Ocuna" />
        </BrandShapeTrigger>
      )}
      <nav className="nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const href = item.href.startsWith("#") && isCritterPage
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

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-layout">
        <a className="footer-logo-link" href="#top" aria-label="Back to top">
          <img src={asset("images/ocuna_logo.png")} alt="" />
        </a>
        <div className="footer-contact">
          <span>Contact</span>
          <a href="mailto:business@ocuna-ai.com">business@ocuna-ai.com</a>
        </div>
      </div>
    </footer>
  );
}
