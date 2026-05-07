import { asset, pagePath } from "../assets.js";
import { heroNotes, onVeilCopy, releasePills, workCards } from "../content.js";

export default function LandingPage() {
  return (
    <main id="top">
      <Hero />
      <WorkSection />
      <MarketSection />
      <OcuraSection />
      <OnVeilSection />
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
            daemon-managed control surface for project deployments and prototyping.
          </p>
          <div className="hero-actions">
            <a className="button" href="#ocura">View Ocura</a>
            <a className="ghost" href="#onveil">View OnVeil</a>
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

function OcuraSection() {
  return (
    <section className="band" id="ocura">
      <div className="shell band-layout">
        <div className="band-copy">
          <p className="eyebrow">First product</p>
          <h2>Ocura is a daemon-managed control surface for project deployments and prototyping.</h2>
          <p>
            Ocura is currently in development as the first Ocuna product. It is built around a
            resident daemon, project control files, durable Den and pathway records, and auditable
            process artifacts exposed through CLI and app surfaces for enterprise prototyping paths.
          </p>
          <div className="pill-row" aria-label="Ocura release direction">
            {releasePills.map((pill) => (
              <span className="pill" key={pill}>{pill}</span>
            ))}
          </div>
        </div>
        <div className="product-mark">
          <img src={asset("images/ocuna_background2c.png")} alt="Ocuna product illustration" />
          <div className="logo-badge" aria-hidden="true">
            <img src={asset("images/ocuna_logo.png")} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}
