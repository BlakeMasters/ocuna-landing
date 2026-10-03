import { useEffect, useRef, useState } from "react";
import { HOME } from "../content/home.js";
import TypesetWord, { RecurringTypesetWord } from "./TypesetWord.jsx";
import DistributedComputeDiagram from "./DistributedComputeDiagram.jsx";
import WalkingRaccoon from "./WalkingRaccoon.jsx";
import AdaptiveGrid from "./AdaptiveGrid.jsx";

export function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
}

export default function SystemHero({ motionEnabled, onToggleMotion }) {
  const [isInView, setIsInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");
  const [leadComplete, setLeadComplete] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(sectionRef.current);
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
      <div className="shell system-hero-layout">
        <div className="system-hero-copy">
          <h1 id="home-title" aria-label={HOME.headline}><TypesetWord text={HOME.headlineLead} onComplete={() => setLeadComplete(true)} />{" "}<RecurringTypesetWord text={uncertain} enabled={leadComplete && motionEnabled && isInView && pageVisible} />{" "}{headlineEnd.join(" ")}</h1>
          <p>{HOME.introduction}</p>
        </div>
        <figure className="system-map">
          <div className="system-map-stage">
            <AdaptiveGrid enabled={playing && isInView && pageVisible} />
            <WalkingRaccoon animate={playing && isInView && pageVisible} />
            <DistributedComputeDiagram />
          </div>
        </figure>
        <div className="system-animation-controls">
          <button className="system-motion" type="button" aria-label={playing ? "Pause system animation" : "Play system animation"} aria-pressed={!playing} onClick={onToggleMotion}>
            <svg viewBox="0 0 20 20" aria-hidden="true">{playing ? <path d="M6 4h3v12H6zM12 4h3v12h-3z" /> : <path d="m6 3 10 7-10 7z" />}</svg>
          </button>
        </div>
      </div>
    </section>
  );
}
