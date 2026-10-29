import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { HOME } from "../content/home.js";
import TypesetWord, { RecurringTypesetWord } from "./TypesetWord.jsx";
import DistributedComputeDiagram from "./DistributedComputeDiagram.jsx";
import WalkingRaccoon from "./WalkingRaccoon.jsx";
import AdaptiveGrid from "./AdaptiveGrid.jsx";

const PreparedEngraving = lazy(() => import("./PreparedEngraving.jsx"));

export function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
}

export default function SystemHero({ motionEnabled, onToggleMotion }) {
  const [isInView, setIsInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");
  const [leadComplete, setLeadComplete] = useState(false);
  const sectionRef = useRef(null), mapRef = useRef(null), copyRef = useRef(null);
  const [mapInView, setMapInView] = useState(false);
  const [copyInView, setCopyInView] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === mapRef.current) setMapInView(entry.isIntersecting);
        else if (entry.target === copyRef.current) setCopyInView(entry.isIntersecting);
        else setIsInView(entry.isIntersecting);
      }
    }, { threshold: 0.02 });
    observer.observe(sectionRef.current); observer.observe(mapRef.current); observer.observe(copyRef.current);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const playing = motionEnabled;
  const headlineTail = HOME.headline.slice(HOME.headlineLead.length).trimStart();
  const [uncertain, ...headlineEnd] = headlineTail.split(" ");

  return (
    <section className={`system-hero${playing && isInView && pageVisible ? " is-animating" : ""}`} aria-labelledby="home-title" ref={sectionRef}>
      <div className="system-hero-layout">
        <div className="system-home-engraving" id="home-engraving">
          <Suspense fallback={<div className="system-home-engraving-placeholder" aria-hidden="true" />}>
            <PreparedEngraving playing={motionEnabled} />
          </Suspense>
        </div>
        <div className="shell system-hero-copy" ref={copyRef}>
          <h1 id="home-title" aria-label={HOME.headline}><TypesetWord enabled={motionEnabled && copyInView && pageVisible} text={HOME.headlineLead} onComplete={() => setLeadComplete(true)} />{" "}<RecurringTypesetWord text={uncertain} enabled={leadComplete && motionEnabled && copyInView && pageVisible} />{" "}{headlineEnd.join(" ")}</h1>
          <p>{HOME.introduction}</p>
          <div className="system-animation-controls">
            <button className="system-motion" type="button" onClick={onToggleMotion} aria-label={motionEnabled ? "Pause all page animations" : "Resume all page animations"}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{motionEnabled ? <path d="M7 5h4v14H7zm6 0h4v14h-4z" /> : <path d="m8 5 11 7-11 7z" />}</svg>
              {motionEnabled ? "Pause animations" : "Resume animations"}
            </button>
          </div>
        </div>
        <div className="shell system-hero-walk"><WalkingRaccoon animate={playing && isInView && pageVisible} /></div>
        <figure className={`shell system-map${playing && mapInView && pageVisible ? " is-animating" : ""}`} ref={mapRef}>
          <div className="system-map-stage">
            <AdaptiveGrid enabled={playing && mapInView && pageVisible} />
            <DistributedComputeDiagram />
          </div>
        </figure>
      </div>
    </section>
  );
}
