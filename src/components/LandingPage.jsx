import { asset, pagePath } from "../assets.js";
import { heroNotes, releasePills, workCards } from "../content.js";

export default function LandingPage() {
  return (
    <main id="top">
      <Hero />
      <WorkSection />
      <MarketSection />
      <CritterCallout />
      <OcuraSection />
      <LaunchSection />
    </main>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-layout">
        <div className="hero-content">
          <p className="eyebrow">Applied AI infrastructure</p>
          <h1>Ocuna builds tools for monitored model work.</h1>
          <p className="summary">
            Ocuna is developing infrastructure for teams that need clearer control over AI workloads.
            Its first product, Ocura, is being shaped as a service with a public Python package path.
          </p>
          <div className="hero-actions">
            <a className="button" href="#ocura">View Ocura</a>
            <a className="ghost" href="#launch">Local launch</a>
          </div>
          <div className="hero-notes" aria-label="Ocuna launch notes">
            {heroNotes.map((note) => (
              <div className="note" key={note.title}>
                <strong>{note.title}</strong>
                <span>{note.copy}</span>
              </div>
            ))}
          </div>
        </div>
        <figure className="hero-art">
          <img src={asset("ocuna_background1c.png")} alt="Ocuna illustrated background artwork" />
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
          The public story is deliberately simple: Ocuna builds operational software for AI teams.
          More product depth will be disclosed as Ocura approaches pilot readiness.
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
            Many evolving areas of compute needs and infrastructure are increasingly indeterministic.
            Ocuna aims to create and provide infrastructure that serves stochastic development cycles
            across foundational machine learning, finance, and speculative biotechnology.
          </p>
        </div>
        <figure className="market-art">
          <img src={asset("ocuna_background3c.png")} alt="Ocuna abstract infrastructure artwork" />
        </figure>
      </div>
    </section>
  );
}

function CritterCallout() {
  return (
    <section className="critter-cta" id="critter">
      <a className="shell critter-link" href={pagePath("critter-acknowledgement")}>
        <span>
          <span className="eyebrow">Critter Acknowledgement</span>
          <h2>A note on stochastic behavior, learning, and adaptation.</h2>
          <p>
            Ocuna recognizes the raccoon as a compact model for adaptive, probabilistic problem solving
            in changing environments.
          </p>
        </span>
        <span className="critter-action">Read acknowledgement</span>
      </a>
    </section>
  );
}

function OcuraSection() {
  return (
    <section className="band" id="ocura">
      <div className="shell band-layout">
        <div className="band-copy">
          <p className="eyebrow">First product</p>
          <h2>Ocura is a control surface for model runs.</h2>
          <p>
            Ocura is currently in development as the first Ocuna product. The project supports local
            execution today and is being prepared for a service-oriented release model.
          </p>
          <div className="pill-row" aria-label="Ocura release direction">
            {releasePills.map((pill) => (
              <span className="pill" key={pill}>{pill}</span>
            ))}
          </div>
        </div>
        <div className="product-mark">
          <img src={asset("ocuna_background2c.png")} alt="Ocuna product illustration" />
          <div className="logo-badge" aria-hidden="true">
            <img src={asset("ocuna_logo.png")} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LaunchSection() {
  return (
    <section className="shell launch" id="launch">
      <div className="launch-copy">
        <p className="eyebrow">Launch prep</p>
        <h2>Static by default, Pages-ready when the domain is ready.</h2>
        <p>
          This React site builds to static files. GitHub Pages can serve the compiled
          output from the Pages workflow, including direct links through the generated fallback.
        </p>
        <ul className="status-list">
          <li><span>Main app entry is served from <strong>index.html</strong>.</span></li>
          <li><span>Vite compiles the React app into <strong>dist</strong> for Pages.</span></li>
          <li><span>GitHub Actions deploys the artifact after pushes to the configured branch.</span></li>
        </ul>
      </div>
      <pre className="code-block"><code>{`npm install
npm run dev

# Build locally:
npm run build
npm run preview`}</code></pre>
    </section>
  );
}
