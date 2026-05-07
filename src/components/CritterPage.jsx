import { useEffect, useState } from "react";
import { asset, pagePath } from "../assets.js";
import { acknowledgementCopy } from "../content.js";

export default function CritterPage() {
  return (
    <main id="top">
      <section
        className="acknowledgement"
        style={{ "--ack-bg": `url(${asset("images/ocuna_background4c.png")})` }}
      >
        <div className="shell acknowledgement-shell">
          <div className="acknowledgement-layout">
            <div>
              <p className="eyebrow">Critter Acknowledgement</p>
              <h1>Structured stochasticity in motion.</h1>
              <p className="acknowledgement-copy">
                <AcknowledgementText />
              </p>
              <a className="back-link inline-back" href={pagePath("")}>Back to site</a>
            </div>

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
    <div className="sprite-panel" aria-hidden="true">
      <div className="sprite-viewport">
        <div
          className="sprite walking"
          style={{
            backgroundImage: `url(${asset("sprites/walking/raccoon_walking_spritesheet_clean_compact.png")})`,
            backgroundPosition: `${x}% ${y}%`,
          }}
        />
      </div>
    </div>
  );
}
