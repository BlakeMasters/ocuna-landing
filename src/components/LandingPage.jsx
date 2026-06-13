import { asset, pagePath } from "../assets.js";
import { onVeilCopy, workCards } from "../content.js";
import OcuraSimulator from "./OcuraSimulator.jsx";

export default function LandingPage() {
  return (
    <main id="top">
      <Hero />
      <OcuraSimulator />
      <WorkSection />
      <MarketSection />
      <OnVeilSection />
      <OnVeilFlowSection />
      <CritterCallout />
    </main>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-layout">
        <div className="hero-content">
          <p className="eyebrow">AI runtime infrastructure</p>
          <h1>Ocuna builds control systems for stochastic execution.</h1>
          <p className="summary">
            Ocuna is developing infrastructure for teams that need bounded, observable, and
            branchable ways to run AI-adjacent workloads. Its first product, Ocura, is a
            graph-based control surface for project deployments and prototyping.
          </p>
          <div className="hero-actions">
            <a className="button" href="#ocura">View Ocura</a>
            <a className="ghost" href="#onveil">View OnVeil</a>
          </div>
        </div>
        <figure className="hero-art">
          <img src={asset("images/ocuna_background1c.png")} alt="Ocuna illustrated background artwork" />
        </figure>
      </div>
    </section>
  );
}

function WorkSection() {
  return (
    <section className="shell" id="work">
      <div className="section-head">
        <h2>Quiet infrastructure for serious AI workflows.</h2>
        <p>
          The public story stays intentionally abstract: Ocuna builds operational software for
          constrained model work, runtime supervision, durable execution records, and controlled
          decision points. More implementation depth will be disclosed as Ocura approaches release
          readiness.
        </p>
      </div>
      <div className="grid">
        {workCards.map((card) => (
          <article className="card" key={card.tag}>
            <span className="tag">{card.tag}</span>
            <strong>{card.title}</strong>
            <p>{card.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MarketSection() {
  return (
    <section className="market" id="market">
      <div className="shell market-layout">
        <div className="market-copy">
          <p className="eyebrow">Broad-market infrastructure</p>
          <h2>Built for stochastic development cycles.</h2>
          <p>
            Many high-leverage compute domains now produce iterative, uncertain, evidence-heavy
            development loops. Ocuna is designed for workflows where deployments and prototypes need
            constraints, inspection, artifact trails, and branchable decision history across
            foundational machine learning, finance, and speculative biotechnology.
          </p>
        </div>
        <figure className="market-art">
          <img src={asset("images/ocuna_background3c.png")} alt="Ocuna abstract infrastructure artwork" />
        </figure>
      </div>
    </section>
  );
}

function OnVeilSection() {
  return (
    <section className="onveil" id="onveil">
      <div className="shell onveil-layout">
        <div className="onveil-mark" aria-hidden="true">
          <img src={asset("images/OnVeil.png")} alt="" />
        </div>
        <div className="onveil-copy">
          <p className="eyebrow">OnVeil</p>
          <h2>Machine-native trust for agentic systems.</h2>
          <p>{onVeilCopy}</p>
        </div>
      </div>
    </section>
  );
}

function OnVeilFlowSection() {
  return (
    <section className="onveil-flow" aria-label="OnVeil signal supervision concept">
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
              <clipPath id="ov-eye-clip" clipPathUnits="userSpaceOnUse">
                <rect className="ov-eye-aperture" x="432" y="84" width="386" height="240" rx="34" />
              </clipPath>
            </defs>

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
              <g className="ov-eye-interior" clipPath="url(#ov-eye-clip)">
                <path className="ov-eye-fill" d="M470 204 C532 106 700 106 784 204 C702 302 532 302 470 204 Z" />
                <g className="ov-eye-detail">
                  <ellipse className="ov-iris" cx="625" cy="204" rx="34" ry="58" />
                  <ellipse className="ov-pupil" cx="625" cy="204" rx="12" ry="43" />
                  <path className="ov-eye-vein" d="M548 144 C596 178 594 232 548 266" />
                  <path className="ov-eye-vein ov-eye-vein-alt" d="M704 138 C666 182 664 230 706 270" />
                  <path className="ov-scan" d="M588 128 L664 278" />
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
          </svg>
        </div>
      </div>
    </section>
  );
}

function CritterCallout() {
  return (
    <section className="critter-cta" id="critter">
      <a className="shell critter-link" href={pagePath("critter-acknowledgement/")}>
        <span>
          <span className="eyebrow">Critter Acknowledgement</span>
          <h2>A note on stochastic behavior, learning, and adaptation.</h2>
          <p>
            Ocuna recognizes the raccoon as a compact model for adaptive, probabilistic
            problem-solving in changing environments.
          </p>
        </span>
        <span className="critter-action">Read acknowledgement</span>
      </a>
    </section>
  );
}
