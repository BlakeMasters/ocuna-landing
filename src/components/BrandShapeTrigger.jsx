import { useParticleContext } from "./particles/ParticleContext.jsx";

function isShapeTrigger(element) {
  return element?.closest?.(".noun-trigger, .brand-shape-trigger");
}

export default function BrandShapeTrigger({
  shape,
  sectionId,
  href,
  className = "",
  children,
  ...props
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
    <a
      className={`brand brand-shape-trigger ${className}`.trim()}
      href={href}
      title="Hover to reveal"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onBlur}
      {...props}
    >
      {children}
    </a>
  );
}
