import { asset } from "../assets.js";
import { TENANTS_PLATE, TENANTS_PLATE_STYLE } from "../content/illustrations.js";
import PaperShell from "./PaperShell.jsx";
import "./ContactPage.css";

function ContactArt() {
  return (
    <div className="paper-page__art">
      <figure className="contact-plate" style={TENANTS_PLATE_STYLE}>
        <div className="contact-plate__paper">
          <div className="contact-plate__window">
            <img
              alt={TENANTS_PLATE.alt}
              decoding="async"
              fetchPriority="high"
              src={asset(TENANTS_PLATE.file)}
              width={TENANTS_PLATE.width}
              height={TENANTS_PLATE.height}
            />
          </div>
        </div>
        <figcaption>
          <a href={TENANTS_PLATE.sourceHref}><cite>{TENANTS_PLATE.title}</cite></a>
          {" · "}{TENANTS_PLATE.illustrator}, {TENANTS_PLATE.year}
        </figcaption>
      </figure>
    </div>
  );
}

export default function ContactPage() {
  return (
    <PaperShell
      className="paper-page--contact"
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
