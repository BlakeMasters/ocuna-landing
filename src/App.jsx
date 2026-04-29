import { useEffect, useState } from "react";
import { asset, pagePath, routeFromLocation } from "./assets.js";
import { navItems } from "./content.js";
import LandingPage from "./components/LandingPage.jsx";
import CritterPage from "./components/CritterPage.jsx";

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
      <SiteHeader
        isCritterPage={isCritterPage}
        onNavigate={navigate}
      />
      {isCritterPage ? <CritterPage /> : <LandingPage />}
      <SiteFooter />
    </>
  );
}

function SiteHeader({ isCritterPage, onNavigate }) {
  return (
    <header className="shell site-header">
      <a className="brand" href={pagePath("")} aria-label="Ocuna home">
        <img src={asset("ocuna_logo.png")} alt="" />
        <span>Ocuna</span>
      </a>
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
        <span>Ocuna AI Infrastructure</span>
        <span>ocuna-ai.com</span>
      </div>
    </footer>
  );
}
