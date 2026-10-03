import { useEffect, useRef } from "react";

export default function AdaptiveGrid({ enabled }) {
  const layer = useRef(null);
  useEffect(() => {
    const grid = layer.current;
    if (!enabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const hero = grid.closest(".system-hero");
    let request = 0, position;
    const clear = () => {
      window.cancelAnimationFrame(request); request = 0;
      grid.dataset.active = "false";
    };
    const move = (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      const bounds = grid.getBoundingClientRect();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      if (x < 0 || x > bounds.width || y < 0 || y > bounds.height) { clear(); return; }
      position = [x, y];
      if (!request) request = window.requestAnimationFrame(() => {
        request = 0;
        grid.style.setProperty("--cursor-x", `${position[0]}px`);
        grid.style.setProperty("--cursor-y", `${position[1]}px`);
        grid.dataset.active = "true";
      });
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", clear);
    return () => { clear(); hero.removeEventListener("pointermove", move); hero.removeEventListener("pointerleave", clear); };
  }, [enabled]);
  return <div className="system-cursor-grid" ref={layer} aria-hidden="true" />;
}
