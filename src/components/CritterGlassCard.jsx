import { useId } from "react";
import { pagePath } from "../assets.js";
import "./CritterGlassCard.css";

const DEFAULT_DESCRIPTION =
  "Ocuna recognizes the raccoon as a compact model for adaptive, probabilistic problem-solving in changing environments.";

export default function CritterGlassCard({
  eyebrow = "Critter acknowledgement",
  title = "A note on stochastic behavior, learning, and adaptation.",
  description = DEFAULT_DESCRIPTION,
  href = pagePath("critter-acknowledgement/"),
  actionLabel = "Read acknowledgement",
  className = "",
  style,
}) {
  const titleId = useId();
  const classes = ["critter-glass-card", className].filter(Boolean).join(" ");

  return (
    <aside className={classes} style={style} aria-labelledby={titleId}>
      <span className="critter-glass-card__refraction" aria-hidden="true" />
      <span className="critter-glass-card__edge-light" aria-hidden="true" />

      <div className="critter-glass-card__body">
        <div className="critter-glass-card__heading">
          <span className="critter-glass-card__glyph" aria-hidden="true">
            <span />
            <span />
          </span>
          <p className="critter-glass-card__eyebrow">{eyebrow}</p>
        </div>

        <h2 className="critter-glass-card__title" id={titleId}>
          {title}
        </h2>
        <p className="critter-glass-card__description">{description}</p>
      </div>

      {href ? (
        <a className="critter-glass-card__action" href={href}>
          <span>{actionLabel}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            width="20"
            height="20"
            fill="none"
          >
            <path d="M4 10h11M11 6l4 4-4 4" />
          </svg>
        </a>
      ) : null}
    </aside>
  );
}
