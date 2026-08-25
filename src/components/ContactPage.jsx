import { asset } from "../assets.js";
import PaperShell from "./PaperShell.jsx";

function ContactArt() {
  return (
    <div className="paper-page__art">
      <figure className="critter-cloud paper-page__scene">
        <div className="critter-cloud__mask">
          <img
            alt=""
            decoding="async"
            fetchPriority="high"
            src={asset("images/ocuna_background1c.webp")}
          />
        </div>
      </figure>
    </div>
  );
}

export default function ContactPage() {
  return (
    <PaperShell
      className="paper-page--contact"
      kicker="Ocuna / contact"
      titleLines={["Write", "to Ocuna"]}
      lede="There is no signup form on this site. Use email for product, research, partnership, or documentation questions."
      extra={<ContactArt />}
    >
      <div className="paper-prose">
        <p>
          Company email:{" "}
          <a href="mailto:business@ocuna-ai.com">business@ocuna-ai.com</a>
        </p>
        <p>
          For Ocura OSS security issues, use GitHub private vulnerability reporting
          on the{" "}
          <a href="https://github.com/BlakeMasters/ocura-oss/security/advisories/new">
            ocura-oss repository
          </a>
          . Do not include exploitable details in a public issue.
        </p>
      </div>
      <div className="paper-page__actions">
        <a className="paper-page__button" href="mailto:business@ocuna-ai.com">
          Email Ocuna
        </a>
      </div>
    </PaperShell>
  );
}
