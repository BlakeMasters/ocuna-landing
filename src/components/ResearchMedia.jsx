import { asset } from "../assets.js";

function MediaImage({ image, priority = false }) {
  const content = <img src={asset(`research/${image.file}`)} alt={image.alt} width={image.width} height={image.height} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} />;
  return image.href ? <a href={image.href}>{content}</a> : content;
}

export default function ResearchMedia({ media, priority = false }) {
  return <figure className={`field-media field-media-${media.layout}${media.theme ? ` field-media-${media.theme}` : ""}`}>
    {media.layout === "event" ? <div className="field-event-panel">
      <div className="field-event-marks">{media.marks.map((mark) => <div className={`field-event-mark field-event-mark-${mark.kind}`} key={mark.file}><MediaImage image={mark} priority={priority} /></div>)}</div>
      <div className="field-event-art"><MediaImage image={media.image} priority={priority} /></div>
    </div> : <MediaImage image={media.image} />}
    <figcaption>{media.caption}{media.credit && <> <a href={media.credit.href}>{media.credit.label}</a>.</>}</figcaption>
  </figure>;
}
