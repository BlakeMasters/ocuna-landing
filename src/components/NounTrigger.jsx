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
  const { setActiveShape } = useParticleContext();

  function onEnter() {
    setActiveShape({ shapeKey: shape, sectionId });
  }

  function onLeave(event) {
    if (isShapeTrigger(event.relatedTarget)) {
      return;
    }
    setActiveShape(null);
  }

  function onBlur(event) {
    if (isShapeTrigger(event.relatedTarget)) {
      return;
    }
    setActiveShape(null);
  }

  return (
    <span
      className={`noun-trigger ${className}`.trim()}
      data-shape={shape}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onBlur}
      tabIndex={0}
    >
      {children}
    </span>
  );
}
