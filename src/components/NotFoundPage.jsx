import { useEffect, useRef, useState } from "react";
import { asset, pagePath } from "../assets.js";
import { galleryImagePath, NOT_FOUND, RACCOON_GALLERY } from "../content/raccoonGallery.js";
import "./NotFoundPage.css";

function GalleryArtwork({ art, featured = false, onEnlarge }) {
  const ArtTitle = featured ? "h2" : "h3";
  return (
    <figure className={`not-found-art${featured ? " not-found-art--featured" : ""}`}>
      <time className="not-found-art__year" dateTime={String(art.year)}>{art.year}</time>
      <button
        className="not-found-art__image"
        type="button"
        aria-label={`Enlarge ${art.title}, ${art.year}`}
        aria-haspopup="dialog"
        aria-controls="raccoon-art-viewer"
        onClick={() => onEnlarge(art)}
      >
        <img src={asset(galleryImagePath(art, !featured))} alt={art.alt} width={art.width} height={art.height} loading={featured ? "eager" : "lazy"} fetchPriority={featured ? "high" : "auto"} decoding="async" />
        <span className="not-found-art__enlarge" aria-hidden="true">View artwork <span>↗</span></span>
      </button>
      <figcaption>
        <ArtTitle>{art.title}</ArtTitle>
        <p className="not-found-art__credit">{art.credit}</p>
        <p className="not-found-art__description">{art.description}</p>
        <a className="not-found-art__source" href={art.sourceHref}>View source <span aria-hidden="true">↗</span><span className="not-found-sr-only"> for {art.title}, {art.year}</span></a>
      </figcaption>
    </figure>
  );
}

export default function NotFoundPage() {
  const [selectedArt, setSelectedArt] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!selectedArt) return undefined;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [selectedArt]);

  return (
    <main className="not-found-page" id="top" tabIndex={-1}>
      <div className="not-found-shell">
        <section className="not-found-hero" aria-labelledby="not-found-title">
          <div className="not-found-hero__copy">
            <p className="not-found-code" aria-label="Error 404">404</p>
            <h1 id="not-found-title">{NOT_FOUND.title}</h1>
            <p className="not-found-message">{NOT_FOUND.message}</p>
            <nav className="not-found-actions" aria-label="Find your way back">
              {NOT_FOUND.actions.map((action, index) => (
                <a className={index === 0 ? "not-found-home" : "not-found-text-link"} href={pagePath(action.href)} key={action.href}>
                  {index === 0 && <span aria-hidden="true">←</span>}
                  {action.label}
                  {index !== 0 && <span aria-hidden="true">↗</span>}
                </a>
              ))}
            </nav>
          </div>
          <GalleryArtwork art={RACCOON_GALLERY[0]} featured onEnlarge={setSelectedArt} />
        </section>

        <section className="not-found-gallery" aria-labelledby="raccoon-gallery-title">
          <div className="not-found-gallery__heading">
            <h2 id="raccoon-gallery-title">{NOT_FOUND.galleryTitle}</h2>
            <p>{RACCOON_GALLERY[0].year}–{RACCOON_GALLERY.at(-1).year}</p>
          </div>
          <ol className="not-found-gallery__list" start={2} aria-label="Later raccoon artwork in chronological order">
            {RACCOON_GALLERY.slice(1).map((art) => (
              <li key={art.id}>
                <GalleryArtwork art={art} onEnlarge={setSelectedArt} />
              </li>
            ))}
          </ol>
        </section>
      </div>

      <dialog className="not-found-viewer" id="raccoon-art-viewer" aria-labelledby="raccoon-art-title" ref={dialogRef} onClose={() => setSelectedArt(null)} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        {selectedArt && (
          <div className="not-found-viewer__layout">
            <button className="not-found-viewer__close" type="button" onClick={() => dialogRef.current.close()} autoFocus>Close <span aria-hidden="true">×</span></button>
            <div className="not-found-viewer__image">
              <img src={asset(galleryImagePath(selectedArt))} alt={selectedArt.alt} width={selectedArt.width} height={selectedArt.height} />
            </div>
            <div className="not-found-viewer__caption">
              <time className="not-found-art__year" dateTime={String(selectedArt.year)}>{selectedArt.year}</time>
              <h2 id="raccoon-art-title">{selectedArt.title}</h2>
              <p className="not-found-art__credit">{selectedArt.credit}</p>
              <p>{selectedArt.description}</p>
              <p>{selectedArt.dateNote}</p>
              <p className="not-found-viewer__sources">Image from <a href={selectedArt.sourceHref}>{selectedArt.sourceName}</a>. <a href={selectedArt.rightsHref}>{selectedArt.rights}</a>.</p>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
