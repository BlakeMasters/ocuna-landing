import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { universeSections } from "../content/nounShapes.js";
import CritterGlassCard from "./CritterGlassCard.jsx";
import LogoRaccoonTrigger from "./LogoRaccoonTrigger.jsx";
import NounTrigger from "./NounTrigger.jsx";
import OcuraSimulator from "./OcuraSimulator.jsx";
import "./HomePage.css";

const ParticleSection = lazy(() => import("./particles/ParticleSection.jsx"));
const LogisticsPrototype = lazy(() => import("./LogisticsPrototype.jsx"));

export default function LandingPage() {
  return (
    <main id="top">
      <ShipHero />
      <RuntimeSection />
      <OcuraSimulator />
      <CritterHomeSection />
    </main>
  );
}

function ShipHero() {
  const userMotionChoice = useRef(false);
  const [motionEnabled, setMotionEnabled] = useState(
    () =>
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !window.matchMedia("(max-width: 619px), (pointer: coarse)").matches
  );

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 619px), (pointer: coarse)");
    function updateMotionDefault() {
      if (!userMotionChoice.current) {
        setMotionEnabled(!motionQuery.matches && !mobileQuery.matches);
      }
    }

    motionQuery.addEventListener("change", updateMotionDefault);
    mobileQuery.addEventListener("change", updateMotionDefault);
    return () => {
      motionQuery.removeEventListener("change", updateMotionDefault);
      mobileQuery.removeEventListener("change", updateMotionDefault);
    };
  }, []);

  function toggleMotion() {
    userMotionChoice.current = true;
    setMotionEnabled((enabled) => !enabled);
  }

  return (
    <section
      className="ship-hero"
      id="particle-logistics"
      aria-labelledby="home-title"
    >
      <Suspense
        fallback={<div className="ship-hero-stage ship-hero-stage--loading" aria-hidden="true" />}
      >
        <LogisticsPrototype motionEnabled={motionEnabled} />
      </Suspense>

      <div className="shell ship-hero-overlay">
        <article className="ship-hero-card">
          <h1 id="home-title">Infrastructure for uncertain computation.</h1>
          <p>
            Ocuna builds the execution layer for AI workloads that branch as they run. One runtime
            governs training and inference from first action to final outcome, and keeps every
            path it took on the record.
          </p>
        </article>

        <div className="ship-hero-actions" aria-label="Particle logistics controls">
          <a href="#work">Explore scheduler</a>
          <button
            type="button"
            aria-label={motionEnabled ? "Pause particle scene" : "Play particle scene"}
            onClick={toggleMotion}
          >
            <span>Particle motion</span>
            <strong aria-live="polite">{motionEnabled ? "Pause" : "Play"}</strong>
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Decorative backing for the runtime cluster. Each lobe is laid out on the same
 * subgrid cell as the panel it sits behind, then inflated past its edges; the
 * goo filters blur the group and re-threshold its alpha, which fuses touching
 * lobes into one organic mass. Nothing here contains text — the copy renders in
 * unfiltered siblings above it so it stays crisp.
 */
function RuntimeMass() {
  return (
    <div className="runtime-ink-mass" aria-hidden="true">
      <svg className="runtime-ink-goo-defs" width="0" height="0" focusable="false">
        <defs>
          <filter
            id="runtime-ink-goo"
            x="-20%"
            y="-14%"
            width="140%"
            height="128%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="soften" />
            <feColorMatrix
              in="soften"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
              result="mass"
            />
            <feMorphology in="mass" operator="erode" radius="2" result="inner" />
            <feComposite in="mass" in2="inner" operator="out" result="edge" />
            <feFlood floodColor="#a8e6ef" floodOpacity="0.5" result="edgeTint" />
            <feComposite in="edgeTint" in2="edge" operator="in" result="rim" />
            <feMerge>
              <feMergeNode in="mass" />
              <feMergeNode in="rim" />
            </feMerge>
          </filter>
          <filter
            id="runtime-ink-goo-halo"
            x="-24%"
            y="-18%"
            width="148%"
            height="136%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="soften" />
            <feColorMatrix
              in="soften"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
            />
          </filter>
        </defs>
      </svg>

      <div className="runtime-ink-mass-layer runtime-ink-mass-layer--halo">
        <span className="runtime-ink-lobe runtime-ink-lobe--scheduler" />
        <span className="runtime-ink-lobe runtime-ink-lobe--heading" />
        <span className="runtime-ink-lobe runtime-ink-lobe--training" />
        <span className="runtime-ink-lobe runtime-ink-lobe--inference" />
        <span className="runtime-ink-lobe runtime-ink-lobe--tail" />
        <span className="runtime-ink-bulge" />
      </div>

      <div className="runtime-ink-mass-layer runtime-ink-mass-layer--core">
        <span className="runtime-ink-lobe runtime-ink-lobe--scheduler" />
        <span className="runtime-ink-lobe runtime-ink-lobe--heading" />
        <span className="runtime-ink-lobe runtime-ink-lobe--training" />
        <span className="runtime-ink-lobe runtime-ink-lobe--inference" />
        <span className="runtime-ink-lobe runtime-ink-lobe--tail" />
        <span className="runtime-ink-bulge" />
      </div>

      <span className="runtime-ink-drop runtime-ink-drop--a" />
      <span className="runtime-ink-drop runtime-ink-drop--b" />
      <span className="runtime-ink-drop runtime-ink-drop--c" />
    </div>
  );
}

function RuntimeSection() {
  const sectionId = universeSections.scheduler;
  const [motionPaused, setMotionPaused] = useState(false);

  return (
    <section className="home-runtime-ink universe-section" id="work">
      <Suspense fallback={null}>
        <ParticleSection sectionId={sectionId} paused={motionPaused} />
      </Suspense>
      <div className="shell runtime-ink-composition">
        <RuntimeMass />
        <button
          className="runtime-ink-pause"
          type="button"
          aria-label={motionPaused ? "Resume scheduler particle field" : "Pause scheduler particle field"}
          aria-pressed={motionPaused}
          onClick={() => setMotionPaused((paused) => !paused)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            {motionPaused ? (
              <path d="M8 5.5v13l10-6.5z" />
            ) : (
              <>
                <rect x="7" y="5.5" width="3.5" height="13" rx="1" />
                <rect x="13.5" y="5.5" width="3.5" height="13" rx="1" />
              </>
            )}
          </svg>
        </button>

        <article className="runtime-ink-region runtime-ink-region--scheduler">
          <h2>
            Ocura directs every unit of compute across the{" "}
            <NounTrigger shape="branch" sectionId={sectionId}>
              execution frontier
            </NounTrigger>
            .
          </h2>
          <p className="runtime-ink-copy">
            The scheduler places work, holds budgets, and reuses results across training and
            inference branches. Teams build their own pipelines on top; Ocura decides what runs,
            what waits, and what continues.
          </p>
          <a className="runtime-ink-link" href="#ocura">
            Run the V0 simulator
          </a>
        </article>

        <section
          className="runtime-ink-lifecycle"
          id="market"
          aria-labelledby="runtime-lifecycle-title"
        >
          <header className="runtime-ink-heading">
            <div className="runtime-ink-heading-copy">
              <h2 id="runtime-lifecycle-title">
                One runtime across the whole model lifecycle.
              </h2>
            </div>
            <LogoRaccoonTrigger sectionId={sectionId} />
          </header>

          <article className="runtime-ink-region runtime-ink-region--training">
            <h3>
              <NounTrigger shape="network" sectionId={sectionId}>
                Training
              </NounTrigger>{" "}
              — govern the search over viable paths.
            </h3>
            <p>
              Spread workers across checkpoint, data, and parameter branches, then concentrate
              compute on the paths with the strongest evidence. Every run stays tied to its budget
              and its continuation decision.
            </p>
          </article>

          <article className="runtime-ink-region runtime-ink-region--inference">
            <h3>
              <NounTrigger shape="chip" sectionId={sectionId}>
                Inference
              </NounTrigger>{" "}
              — coordinate a live execution frontier.
            </h3>
            <p>
              Route serving pools, agent endpoints, and tools under explicit policy and latency
              budgets. Escalation, preemption, and continuation stay traceable across every
              transition.
            </p>
          </article>
        </section>
      </div>
    </section>
  );
}

function CritterHomeSection() {
  return (
    <section className="home-critter" id="critter" aria-label="Critter acknowledgement">
      <div className="shell">
        <CritterGlassCard
          title="A compact model for adaptation under uncertainty."
          description="Ocuna recognizes the raccoon as a model for adaptive, probabilistic problem-solving across changing environments. The acknowledgement connects our systems work to learning, variation, and iterative strategy."
        />
      </div>
    </section>
  );
}

export function OnVeilFlowSection() {
  const sectionRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [pageActive, setPageActive] = useState(
    () => document.visibilityState === "visible" && document.hasFocus()
  );

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function updatePageActivity() {
      setPageActive(
        document.visibilityState === "visible" && document.hasFocus()
      );
    }

    document.addEventListener("visibilitychange", updatePageActivity);
    window.addEventListener("focus", updatePageActivity);
    window.addEventListener("blur", updatePageActivity);
    return () => {
      document.removeEventListener("visibilitychange", updatePageActivity);
      window.removeEventListener("focus", updatePageActivity);
      window.removeEventListener("blur", updatePageActivity);
    };
  }, []);

  const animationActive = isInView && pageActive;

  return (
    <section
      className={`onveil-flow${animationActive ? " is-animation-active" : ""}`}
      aria-label="OnVeil eye supervision animation"
      ref={sectionRef}
    >
      <div className="shell">
        <div className="onveil-flow-frame">
          <svg
            className="onveil-flow-art"
            viewBox="0 0 1200 430"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <filter id="ov-red-glow" x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="ov-contract-gradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#fff8f3" stopOpacity="0.96" />
                <stop offset="1" stopColor="#ff2a3f" stopOpacity="0.28" />
              </linearGradient>
              <clipPath id="ov-stage-clip" clipPathUnits="userSpaceOnUse">
                <rect x="0" y="0" width="1200" height="430" />
              </clipPath>
              <clipPath id="ov-eye-shape-clip" clipPathUnits="userSpaceOnUse">
                <path d="M470 204 C532 106 700 106 784 204 C702 302 532 302 470 204 Z" />
              </clipPath>
              <clipPath id="ov-eye-aperture-clip" clipPathUnits="userSpaceOnUse">
                <rect className="ov-eye-aperture" x="432" y="84" width="386" height="240" rx="34" />
              </clipPath>
            </defs>

            <g className="ov-stage" clipPath="url(#ov-stage-clip)">
              <rect className="ov-field" x="0" y="0" width="1200" height="430" />
              <path className="ov-background-line" d="M32 340 C160 320 260 346 374 318" />
              <path className="ov-background-line ov-background-line-alt" d="M812 92 C928 52 1044 72 1164 40" />

            <g className="ov-network">
              <path className="ov-network-line" d="M164 214 L110 106 L96 300" />
              <path className="ov-network-line" d="M164 214 L64 206" />
              <path className="ov-network-line" d="M164 214 L220 86 L254 318" />
              <circle className="ov-network-node" cx="110" cy="106" r="8" />
              <circle className="ov-network-node" cx="96" cy="300" r="7" />
              <circle className="ov-network-node" cx="64" cy="206" r="6" />
              <circle className="ov-network-node" cx="220" cy="86" r="7" />
              <circle className="ov-network-node" cx="254" cy="318" r="8" />
            </g>

            <g className="ov-chip">
              <rect className="ov-chip-core" x="98" y="142" width="136" height="136" rx="12" />
              <rect className="ov-chip-inner" x="127" y="171" width="78" height="78" rx="8" />
              <path className="ov-chip-trace" d="M143 190 H190 M143 210 H184 M143 230 H176" />
              <path className="ov-chip-pins" d="M116 122 V142 M148 122 V142 M180 122 V142 M212 122 V142" />
              <path className="ov-chip-pins" d="M116 278 V298 M148 278 V298 M180 278 V298 M212 278 V298" />
              <path className="ov-chip-pins" d="M78 162 H98 M78 194 H98 M78 226 H98 M78 258 H98" />
              <path className="ov-chip-pins" d="M234 162 H254 M234 194 H254 M234 226 H254 M234 258 H254" />
            </g>

            <path
              className="ov-route ov-route-chip-eye"
              pathLength="100"
              d="M244 212 C330 154 432 150 514 184"
            />
            <path
              className="ov-route ov-route-eye-browser"
              pathLength="100"
              d="M710 252 C786 248 838 272 892 318"
            />
            <path
              className="ov-route ov-route-browser-eye"
              pathLength="100"
              d="M914 322 C820 380 714 356 652 272"
            />
            <path
              className="ov-route ov-route-eye-chip"
              pathLength="100"
              d="M516 218 C426 260 338 260 244 226"
            />

            <circle className="ov-packet ov-packet-chip-eye" cx="244" cy="212" r="7" />
            <circle className="ov-packet ov-packet-eye-browser" cx="710" cy="252" r="7" />
            <circle className="ov-packet ov-packet-browser-eye" cx="914" cy="322" r="7" />
            <circle className="ov-packet ov-packet-eye-chip" cx="516" cy="218" r="7" />

              <g className="ov-eye">
                <g className="ov-eye-interior" clipPath="url(#ov-eye-shape-clip)">
                  <g clipPath="url(#ov-eye-aperture-clip)">
                    <path className="ov-eye-fill" d="M470 204 C532 106 700 106 784 204 C702 302 532 302 470 204 Z" />
                    <g className="ov-eye-detail">
                      <ellipse className="ov-iris" cx="625" cy="204" rx="34" ry="58" />
                      <ellipse className="ov-pupil" cx="625" cy="204" rx="12" ry="43" />
                      <path className="ov-eye-vein" d="M548 144 C596 178 594 232 548 266" />
                      <path className="ov-eye-vein ov-eye-vein-alt" d="M704 138 C666 182 664 230 706 270" />
                      <path className="ov-scan" d="M588 128 L664 278" />
                    </g>
                  </g>
                </g>
                <path className="ov-eye-top-lid" d="M470 204 C532 106 700 106 784 204" />
                <path className="ov-eye-bottom-lid" d="M470 204 C532 302 702 302 784 204" />
              </g>

            <g className="ov-contract">
              <rect className="ov-contract-page" x="572" y="296" width="148" height="84" rx="8" />
              <path className="ov-contract-fold" d="M692 296 L720 324 H692 Z" />
              <path className="ov-code-line" d="M592 326 H676 M592 344 H704 M592 362 H654" />
              <path className="ov-code-line ov-code-line-red" d="M594 310 H646 M660 310 H684" />
              <circle className="ov-contract-seal" cx="694" cy="356" r="10" />
            </g>

              <g className="ov-browser">
                <rect className="ov-browser-shell" x="880" y="230" width="210" height="138" rx="12" />
                <path className="ov-browser-bar" d="M880 266 H1090" />
                <circle className="ov-browser-dot ov-browser-dot-red" cx="906" cy="248" r="6" />
                <circle className="ov-browser-dot" cx="928" cy="248" r="6" />
                <circle className="ov-browser-dot" cx="950" cy="248" r="6" />
                <path className="ov-browser-glyph" d="M914 298 H1048 M914 324 H1008 M914 344 H1062" />
                <path className="ov-browser-response" d="M1028 292 L1058 312 L1028 332" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
