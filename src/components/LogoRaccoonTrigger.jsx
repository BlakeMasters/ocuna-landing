import { asset } from "../assets.js";
import NounTrigger from "./NounTrigger.jsx";
import "./LogoRaccoonTrigger.css";

const RACCOON_LOGO_SOURCE = "images/ocuna_title_logo_nobackground.webp";

export default function LogoRaccoonTrigger({
  sectionId,
  label = "Ocuna raccoon mark. Focus or hover to preview its particle form.",
  className = "",
  width,
  style,
}) {
  const classes = ["logo-raccoon-trigger", className].filter(Boolean).join(" ");
  const widthValue = typeof width === "number" ? `${width}px` : width;
  const triggerStyle = widthValue
    ? { ...style, "--logo-raccoon-width": widthValue }
    : style;

  return (
    <NounTrigger shape="raccoon" sectionId={sectionId} className={classes}>
      <span className="logo-raccoon-trigger__viewport" style={triggerStyle} aria-hidden="true">
        <img
          className="logo-raccoon-trigger__source"
          src={asset(RACCOON_LOGO_SOURCE)}
          alt=""
          decoding="async"
          draggable="false"
        />
      </span>
      <span className="logo-raccoon-trigger__label">{label}</span>
    </NounTrigger>
  );
}
