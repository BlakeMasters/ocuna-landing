import { useRef } from "react";
import { asset, pagePath } from "../assets.js";
import { CRITTER } from "../content/critter.js";
import RaccoonDiffusion from "./RaccoonDiffusion.jsx";
import CritterTypewriter, { quoteTypingDuration } from "./CritterTypewriter.jsx";
import "./CritterPage.css";

export default function CritterPage() {
  const sourceRef = useRef(null);
  const { illustration, book } = CRITTER;

  return (
    <main className="critter-page" id="top" tabIndex={-1}>
      <div className="critter-woodland" aria-hidden="true">
        <img src={asset(CRITTER.woodland)} alt="" decoding="async" />
      </div>
      <section className="critter-hero critter-shell" aria-labelledby="critter-title">
        <div className="critter-hero__copy">
          <h1 id="critter-title">
            <span>Critter</span>{" "}
            <span>acknowledgement</span>
          </h1>
          <p className="critter-hero__recognition">
            {CRITTER.recognition}<br />
            (<em>{CRITTER.species}</em>).
          </p>
          <div className="critter-quotes">
            {CRITTER.quotes.map((quote, index) => (
              <BookQuote key={quote.id} quote={quote} book={book} delay={700 + CRITTER.quotes.slice(0, index).reduce((time, previous) => time + quoteTypingDuration(`“${previous.text}”`) + 420, 0)} />
            ))}
          </div>
        </div>

        <figure className="critter-drawing">
          <RaccoonDiffusion illustration={illustration} />
          <figcaption className="critter-drawing__caption">
            <cite>{illustration.title}</cite>, {illustration.year}
          </figcaption>
        </figure>
      </section>

      <div className="critter-page-links critter-shell">
        <a className="critter-text-link" href={pagePath("")}>
          <span aria-hidden="true">←</span> Back to site
        </a>
        <button
          className="critter-text-link critter-source-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-controls="critter-sources"
          onClick={() => sourceRef.current?.showModal()}
        >
          About the illustration
        </button>
      </div>

      <dialog className="critter-source-dialog" id="critter-sources" aria-labelledby="critter-illustration-title" ref={sourceRef}>
        <button className="critter-text-link critter-source-dialog__close" type="button" onClick={() => sourceRef.current?.close()}>
          Close
        </button>
        <section className="critter-source" aria-labelledby="critter-illustration-title">
          <div className="critter-source__book">
            <h2 id="critter-illustration-title"><cite>{illustration.title}</cite></h2>
            <p>{illustration.volume}<br />{illustration.author}, {illustration.year}</p>
          </div>
          <div className="critter-source__detail">
            <p>{illustration.context}</p>
            <p className="critter-source__credit">
              Original illustration in the <a href={illustration.licenseHref}>public domain</a>.{" "}
              Image from <a href={illustration.sourceHref}>{illustration.source}</a>.
            </p>
            <p className="critter-source__credit">
              Quotations from <cite>{book.title}</cite> by {book.author} ({book.year}), pages 62 and 40.
            </p>
            <nav className="critter-source__links" aria-label="Illustration sources">
              <a className="critter-text-link" href={book.href}>
                Read {book.title} <span aria-hidden="true">↗</span>
              </a>
              <a className="critter-text-link" href={illustration.originalHref}>
                View the original drawing <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </div>
        </section>
      </dialog>
    </main>
  );
}

function BookQuote({ quote, book, delay }) {
  return (
    <figure className="critter-quote">
      <blockquote>
        <p className="critter-quote__words"><CritterTypewriter text={`“${quote.text}”`} delay={delay} /></p>
      </blockquote>
      <figcaption className="critter-quote__source">
        {book.author}, <cite>{book.title}</cite>,{" "}
        <a href={quote.href}>p. {quote.page}</a>
      </figcaption>
    </figure>
  );
}
