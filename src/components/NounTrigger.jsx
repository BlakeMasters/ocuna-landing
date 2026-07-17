import { useCallback, useEffect } from "react";
import { useParticleContext } from "./particles/ParticleContext.jsx";

function isShapeTrigger(element) {
  return element?.closest?.(".noun-trigger, .brand-shape-trigger");
}

export default function NounTrigger({
  shape,
  sectionId,
  className = "",
  children,
}) {
  const { activeShape, setActiveShape } = useParticleContext();
  const ownsActiveShape =
    activeShape?.shapeKey === shape && activeShape?.sectionId === sectionId;

  function onEnter() {
    setActiveShape({ shapeKey: shape, sectionId });
  }

  const clearIfOwned = useCallback(() => {
    setActiveShape((current) =>
      current?.shapeKey === shape && current?.sectionId === sectionId
        ? null
        : current
    );
  }, [sectionId, setActiveShape, shape]);

  function onLeave(event) {
    if (isShapeTrigger(event.relatedTarget)) {
      return;
    }
    clearIfOwned();
  }

  function onBlur(event) {
    if (isShapeTrigger(event.relatedTarget)) {
      return;
    }
    clearIfOwned();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      clearIfOwned();
      event.currentTarget.blur();
    }
  }

  useEffect(
    () => () => {
      clearIfOwned();
    },
    [clearIfOwned]
  );

  return (
    <button
      type="button"
      className={`noun-trigger ${className}`.trim()}
      data-shape={shape}
      aria-pressed={ownsActiveShape}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerCancel={clearIfOwned}
      onFocus={onEnter}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      {children}
    </button>
  );
}
