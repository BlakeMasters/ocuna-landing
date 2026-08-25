import { useId } from "react";
import "./PaperPage.css";

export default function PaperShell({
  kicker,
  titleLines,
  lede,
  children,
  extra = null,
  className = "",
}) {
  const [first, ...rest] = titleLines;
  const titleId = useId();

  return (
    <main className={`paper-page ${className}`.trim()} id="top" tabIndex={-1}>
      <div className="paper-page__blooms" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className="paper-page__hero" aria-labelledby={titleId}>
        <div className="shell paper-page__layout">
          <article className="paper-page__glass">
            {kicker ? <p className="paper-page__kicker">{kicker}</p> : null}
            <h1 id={titleId}>
              <span>{first}</span>
              {rest.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            {lede ? <p className="paper-page__lede">{lede}</p> : null}
            {children}
          </article>
          {extra}
        </div>
      </section>
    </main>
  );
}
