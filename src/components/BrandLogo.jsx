import { useEffect, useRef } from "react";
import { asset } from "../assets.js";
import { brandWalkFrame, BRAND_WALK_VIEWBOX, createBrandWalkPlayback } from "../lib/brandWalk.js";
import "./BrandLogo.css";

const still = brandWalkFrame(0, 0);

export default function BrandLogo() {
  const host = useRef(null), walker = useRef(null), farLeg = useRef(null), mark = useRef(null);
  useEffect(() => {
    const link = host.current.closest("a");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let visible = true;
    const playback = createBrandWalkPlayback(window, (frame) => {
      farLeg.current.setAttribute("d", frame.paths[0]);
      mark.current.setAttribute("d", frame.paths[1]);
      walker.current.dataset.time = frame.time.toFixed(1);
    });
    const update = () => {
      const active = !reduced.matches && visible && !document.hidden
        && ((hover.matches && link.matches(":hover")) || link.matches(":focus-visible"));
      host.current.dataset.walking = String(active);
      walker.current.dataset.playing = String(active);
      playback.setRunning(active);
    };
    const events = ["pointerenter", "pointerleave", "focus", "blur", "keyup"];
    events.forEach((event) => link.addEventListener(event, update));
    reduced.addEventListener("change", update);
    hover.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(link);
    update();
    return () => {
      playback.dispose();
      observer.disconnect();
      events.forEach((event) => link.removeEventListener(event, update));
      reduced.removeEventListener("change", update);
      hover.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <span className="brand-logo" ref={host}>
      <img src={asset("images/ocuna_title_logo_nobackground.webp")} alt="Ocuna" />
      <svg className="brand-logo__walker" ref={walker} viewBox={BRAND_WALK_VIEWBOX} aria-hidden="true" focusable="false">
        <path ref={farLeg} d={still.paths[0]} />
        <path ref={mark} d={still.paths[1]} fillRule="evenodd" />
      </svg>
    </span>
  );
}
