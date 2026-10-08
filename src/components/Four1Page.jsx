import { useEffect, useRef, useState } from "react";
import { asset, pagePath } from "../assets.js";
import { FOUR1 } from "../content/four1.js";
import { COMPACT_CITY_QUERY, createCityAtmosphere } from "./four1/cityAtmosphere.js";
import { createCityPanorama, drawCityPanorama } from "./four1/cityPanorama.js";
import ResearchEnvironmentsScene from "./four1/ResearchEnvironmentsScene.jsx";
import "./Four1Page.css";

function CityScene({ paused, onToggleMotion }) {
  const sceneRef = useRef(null);
  const canvasRef = useRef(null);
  const motionRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    // A development-only, fixed-time view for repeatable visual review.
    // Production always respects the visitor's motion preference.
    const query = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
    const requestedTime = query?.has("cityTime") ? Number(query.get("cityTime")) : NaN;
    const fixedTime = Number.isFinite(requestedTime) ? Math.max(0, Math.min(3600, requestedTime / 1000)) : null;
    const scene = sceneRef.current;
    const image = scene.querySelector("img");
    let disposed = false;
    let motion;
    const start = () => {
      if (disposed) return;
      const panorama = createCityPanorama(image, window.matchMedia(COMPACT_CITY_QUERY).matches);
      motion = createCityAtmosphere(canvasRef.current, scene, { fixedTime, panorama, drawPanorama: drawCityPanorama });
      motionRef.current = motion;
      motion.setPaused(pausedRef.current);
      if (panorama && canvasRef.current.dataset.motion !== "unavailable") scene.dataset.artReady = "true";
    };
    if (image.complete && image.naturalWidth) start();
    else image.addEventListener("load", start, { once: true });
    return () => {
      disposed = true;
      image.removeEventListener("load", start);
      motion?.dispose();
      motionRef.current = null;
      delete scene.dataset.artReady;
    };
  }, []);

  useEffect(() => { pausedRef.current = paused; motionRef.current?.setPaused(paused); }, [paused]);

  return (
    <>
      <div className="four1-city" id="four1-city-animation" ref={sceneRef} aria-hidden="true">
        <img className="four1-city__image" src={asset("four1/city.png")} width="1672" height="941" alt="" fetchPriority="high" />
        <canvas className="four1-city__atmosphere" ref={canvasRef} />
      </div>
      <button className="four1-motion" type="button" aria-pressed={paused}
        aria-label={paused ? "Resume page animations" : "Pause page animations"}
        aria-controls="four1-city-animation four1-research-animation"
        onClick={onToggleMotion}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {paused ? <path d="m5 3 8 5-8 5Z" /> : <path d="M4 3h3v10H4zm5 0h3v10H9z" />}
        </svg>
        {paused ? "Resume motion" : "Pause motion"}
      </button>
    </>
  );
}

function Arrow({ className = "" }) {
  return <svg className={className} viewBox="0 0 32 16" aria-hidden="true"><path d="M1 8h28m-6-6 6 6-6 6" /></svg>;
}

export default function Four1Page({ onNavigate }) {
  const [paused, setPaused] = useState(false);
  function link(href, label, className = "four1-link") {
    return <a className={className} href={pagePath(href)} onClick={(event) => onNavigate(event, href)}>{label}<Arrow /></a>;
  }

  return (
    <main className="four1-page" id="top" tabIndex="-1">
      <section className="four1-hero" aria-labelledby="four1-title">
        <CityScene paused={paused} onToggleMotion={() => setPaused((value) => !value)} />
        <div className="four1-hero__content shell">
          <div className="four1-identity">
            <img src={asset("four1/logo.png")} width="1254" height="1254" alt="" />
            <span>Four1</span>
          </div>
          <h1 id="four1-title">Research across<br />your machines.</h1>
          <p className="four1-hero__definition">{FOUR1.definition}</p>
          <p className="four1-hero__benefit">{FOUR1.heroBenefit}</p>
          <div className="four1-actions">
            {link("/contact", "Discuss Four1", "four1-button")}
          </div>
        </div>
      </section>

      <div className="four1-body shell">
        <section className="four1-native" aria-labelledby="four1-native-title">
          <div className="four1-section-intro">
            <div><h2 id="four1-native-title">{FOUR1.nativeEnvironments.title}</h2>{link("/contact", "Discuss a research workflow")}</div>
            <p>{FOUR1.nativeEnvironments.introduction}</p>
          </div>
          <ResearchEnvironmentsScene paused={paused} />
        </section>
      </div>
    </main>
  );
}
