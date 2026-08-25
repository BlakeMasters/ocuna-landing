import { useEffect, useState } from "react";
import { asset, pagePath } from "../assets.js";
import { acknowledgementCopy } from "../content.js";
import "./CritterPage.css";

export default function CritterPage() {
  return (
    <main className="critter-page" id="top" tabIndex={-1}>
      <section className="critter-hero" aria-labelledby="critter-title">
        <div className="critter-hero__blooms" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="shell critter-hero__layout">
          <article className="critter-hero__glass">
            <h1 id="critter-title">
              <span>Critter</span>
              <span>acknowledgement</span>
            </h1>
            <p className="critter-hero__copy">
              <AcknowledgementText />
            </p>
            <a className="critter-hero__back" href={pagePath("")}>
              Back to site
            </a>
          </article>

          <div className="critter-hero__art">
            <figure className="critter-cloud">
              <div className="critter-cloud__mask">
                <img
                  alt="Watercolor raccoons exploring an old car beside a garden shed"
                  decoding="async"
                  fetchPriority="high"
                  height="1300"
                  src={asset("images/ocuna_background4c_cloud_masked.webp")}
                  width="1600"
                />
              </div>
            </figure>
            <WalkingSprite />
          </div>
        </div>
      </section>
    </main>
  );
}

function AcknowledgementText() {
  const prefix = "Ocuna recognizes the raccoon (Procyon lotor)";
  const rest = acknowledgementCopy.slice(prefix.length);

  return (
    <>
      Ocuna recognizes the raccoon (<em>Procyon lotor</em>){rest}
    </>
  );
}

function WalkingSprite() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (media.matches) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % 8);
    }, 135);

    return () => window.clearInterval(timer);
  }, []);

  const column = frame % 4;
  const row = Math.floor(frame / 4);
  const x = (column / 3) * 100;
  const y = (row / 2) * 100;

  return (
    <div className="critter-sprite" aria-hidden="true">
      <div className="critter-sprite__viewport">
        <div
          className="critter-sprite__sheet"
          style={{
            backgroundImage: `url(${asset("sprites/walking/raccoon_walking_spritesheet_clean_compact.png")})`,
            backgroundPosition: `${x}% ${y}%`,
          }}
        />
      </div>
    </div>
  );
}
