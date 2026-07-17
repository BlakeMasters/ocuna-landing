import { asset, pagePath } from "../assets.js";
import CritterGlassCard from "./CritterGlassCard.jsx";
import { OnVeilFlowSection } from "./LandingPage.jsx";
import "./OnVeilPage.css";

export default function OnVeilPage() {
  return (
    <main className="ov-page" id="top">
      <div className="ov-page__grid" aria-hidden="true" />
      <div className="ov-page__system-line" aria-hidden="true" />

      <section className="ov-page__hero" aria-labelledby="onveil-title">
        <div className="shell ov-page__hero-layout">
          <div className="ov-page__hero-copy">
            <p className="ov-page__kicker">OnVeil / authority research</p>
            <h1 className="ov-page__hero-title" id="onveil-title">
              Authority controls for software execution.
            </h1>
            <p className="ov-page__hero-summary">
              OnVeil explores authority checks and operator controls for software execution.
            </p>

            <div className="ov-page__actions">
              <a className="ov-page__action ov-page__action--primary" href="#eye">
                See the eye
              </a>
              <a className="ov-page__action" href={`${pagePath("")}#work`}>
                View Ocura
              </a>
            </div>
          </div>

          <div className="ov-page__watch" aria-hidden="true">
            <div className="ov-page__emblem">
              <span className="ov-page__reticle ov-page__reticle--left" />
              <img src={asset("images/OnVeil.webp")} alt="" />
              <span className="ov-page__reticle ov-page__reticle--right" />
            </div>
          </div>
        </div>
      </section>

      <section
        className="ov-page__signal"
        id="eye"
        aria-labelledby="supervision-title"
      >
        <div className="shell ov-page__signal-heading">
          <h2 id="supervision-title">Eye. See. You.</h2>
        </div>

        <div className="ov-page__flow-stage">
          <OnVeilFlowSection />
        </div>
      </section>

      <section className="ov-page__critter" id="critter">
        <div className="shell">
          <CritterGlassCard
            eyebrow="Critter acknowledgement"
            title="Natural Instinct"
            description="The raccoon motif references behavioral variation, learning, and adaptation."
          />
        </div>
      </section>
    </main>
  );
}
