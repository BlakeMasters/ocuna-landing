import { useEffect, useRef, useState } from "react";
import { asset, pagePath } from "../assets.js";
import { OCURA_OSS_PYPI, OCURA_OSS_REPO, OCURA_OSS_VERSION } from "../content.js";
import { HOME } from "../content/home.js";
import { FOUR1 } from "../content/four1.js";
import { RESEARCH_ART, RESEARCH_POSTS } from "../content/research.js";
import ExecutionGraphDisplay from "./ExecutionGraphDisplay.jsx";
import SystemHero, { ArrowIcon } from "./SystemHero.jsx";
import "./SystemHomePage.css";

const products = [
  { name: "Ocura", description: "Branch-aware AI runtime", href: "#work" },
  { name: "Ocura OSS", description: "Local execution ledger", href: "#ocura-oss" },
  { name: "Four1", description: "Distributed agentic research", href: "/four1" },
];

function CapabilityArt({ kind }) {
  return (
    <svg viewBox="0 0 360 158" aria-hidden="true" className={`capability-art capability-art--${kind}`} fill="none">
      {kind === "training" ? <>
        <path className="capability-wire" d="M50 79h57M107 79V37h56M107 79h56M107 79v42h56M196 37h53M196 79h53M196 121h53" />
        <rect x="24" y="62" width="34" height="34" />
        {[20, 62, 104].map((y) => <g key={y}><rect x="163" y={y} width="34" height="34" /><rect className="capability-end" x="249" y={y} width="62" height="34" /><path d={`M261 ${y + 17}h38`} /></g>)}
        <path className="capability-selected" d="M58 79h105M197 79h52" />
      </> : kind === "inference" ? <>
        <path className="capability-wire" d="M33 31h71l38 48h74l38-48h73M33 79h109M33 127h71l38-48M216 79h111M216 79l38 48h73" />
        <rect className="capability-chip" x="142" y="42" width="74" height="74" />
        <rect x="160" y="60" width="38" height="38" />
        <path d="M155 30v12M179 30v12M203 30v12M155 116v12M179 116v12M203 116v12" />
        <path className="capability-selected" d="M33 79h109M216 79h111" />
        {[31, 79, 127].map((y) => <g key={y}><rect className="capability-port" x="25" y={y - 5} width="10" height="10" /><rect className="capability-port" x="326" y={y - 5} width="10" height="10" /></g>)}
      </> : <>
        <path className="capability-wire" d="M41 83h72M113 83v-38h44M113 83v38h44M227 45h78M227 121h78" />
        <rect x="22" y="64" width="38" height="38" />
        <rect x="157" y="21" width="70" height="48" /><rect x="157" y="97" width="70" height="48" />
        <path className="capability-record" d="M170 35h44M170 46h44M170 57h26M170 111h44M170 122h44M170 133h26" />
        <path className="capability-selected" d="M60 83h53v38h44" />
        <path className="capability-check" d="m292 40 7 7 13-14m-20 84 7 7 13-14" />
      </>}
    </svg>
  );
}

function RuntimePanels() {
  return (
    <section className="system-runtime-section" id="work" aria-labelledby="system-runtime-title">
      <div className="shell">
        <header className="system-section-heading">
          <h2 id="system-runtime-title">{HOME.runtimeTitle}</h2>
          <p>{HOME.runtimeIntroduction}</p>
        </header>
        <div className="system-capabilities" id="market">
          {HOME.capabilities.map((capability) => (
            <article className="system-capability" key={capability.id}>
              <div className="system-capability-visual"><h3>{capability.title}</h3><CapabilityArt kind={capability.id} /></div>
              <div className="system-capability-copy">
                <h4>{capability.heading}</h4>
                <p>{capability.description}</p>
                <a className="system-text-link" href={capability.href.startsWith("#") ? capability.href : pagePath(capability.href)}>{capability.action} <ArrowIcon /></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OssPanel() {
  return (
    <section className="system-oss-section" id="ocura-oss" aria-labelledby="system-oss-title">
      <div className="shell system-oss-panel">
        <div className="system-oss-copy">
          <h2 id="system-oss-title">Record, branch,<br />and compare.</h2>
          <p>Ocura OSS {OCURA_OSS_VERSION} is the part you can run on your own machine today. Keep a baseline, branch from it with a reason, and connect each result to the original run through the JSON CLI, the Python API, or an AI agent.</p>
          <a className="system-text-link" href={pagePath("docs/examples")}>Try the training example <ArrowIcon /></a>
        </div>
        <div className="system-install-panel">
          <h3>Start with Ocura OSS</h3>
          <pre><code>python -m pip install ocura-oss</code></pre>
          <nav className="system-install-links" aria-label="Ocura OSS resources">
            <a href={pagePath("docs")}>Documentation <ArrowIcon /></a>
            <a href={OCURA_OSS_PYPI}>PyPI <ArrowIcon /></a>
            <a href={OCURA_OSS_REPO}>GitHub <ArrowIcon /></a>
          </nav>
        </div>
      </div>
    </section>
  );
}

function ResearchPanels() {
  const latest = RESEARCH_POSTS[0];
  const art = RESEARCH_ART[latest.art];
  return (
    <section className="system-research-section" aria-labelledby="system-research-title">
      <div className="shell">
        <header className="system-section-heading"><h2 id="system-research-title">More from Ocuna.</h2><a className="system-text-link" href={pagePath("research")}>All field notes <ArrowIcon /></a></header>
        <div className="system-research-grid">
          <a className="system-research-card system-research-card--four1" href={pagePath("four1")}>
            <div className="system-research-art system-research-art--four1" aria-hidden="true">
              <img className="system-four1-city" src={asset("four1/city.png")} alt="" width="1672" height="941" loading="lazy" />
              <img className="system-four1-mark" src={asset("four1/logo.png")} alt="" width="1254" height="1254" loading="lazy" />
            </div>
            <div className="system-research-copy"><h3>Four1 <ArrowIcon /></h3><p>{FOUR1.definition}</p></div>
          </a>
          <a className="system-research-card" href={pagePath(`research/${latest.slug}`)}>
            <div className="system-research-art"><img src={asset(`research/${art.file}`)} alt="" width={art.width ?? 1536} height={art.height ?? 1024} loading="lazy" /></div>
            <div className="system-research-copy"><p className="system-article-meta">{latest.category} · {latest.dateLabel}</p><h3>{latest.title} <ArrowIcon /></h3></div>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function SystemHomePage() {
  const [motionEnabled, setMotionEnabled] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const userMotionChoice = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (!userMotionChoice.current) setMotionEnabled(!query.matches); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const toggleMotion = () => { userMotionChoice.current = true; setMotionEnabled((enabled) => !enabled); };
  return (
    <main className="system-home" id="top" tabIndex={-1}>
      <SystemHero motionEnabled={motionEnabled} onToggleMotion={toggleMotion} />
      <nav className="shell system-product-strip" aria-label="Ocuna systems">
        {products.map((product) => <a href={product.href.startsWith("#") ? product.href : pagePath(product.href)} key={product.name}><div><strong>{product.name}</strong><span>{product.description}</span></div><ArrowIcon /></a>)}
      </nav>
      <RuntimePanels />
      <ExecutionGraphDisplay animate={motionEnabled} />
      <OssPanel />
      <ResearchPanels />
      <div className="shell system-acknowledgement" id="critter"><a className="system-text-link" href={pagePath("critter-acknowledgement")}>Critter acknowledgement <ArrowIcon /></a></div>
    </main>
  );
}
