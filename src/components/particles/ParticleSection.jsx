import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParticleContext } from "./ParticleContext.jsx";
import ParticleField from "./ParticleField.jsx";

function getParticleCount() {
  const width = window.innerWidth;
  if (width < 480) return 1200;
  if (width < 768) return 1800;
  if (width < 1200) return 2800;
  return 3600;
}

function getDpr() {
  return Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.5);
}

function getShapeOffsetX() {
  if (window.innerWidth < 620) return 0;
  if (window.innerWidth < 1000) return 0.68;
  return 1.45;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Scene({ sectionId, particleCount, reducedMotion, isVisible, shapeOffsetX }) {
  const { activeShape } = useParticleContext();

  return (
    <>
      <color attach="background" args={["#000002"]} />
      <fog attach="fog" args={["#000002", 3, 12]} />
      <ambientLight intensity={0.15} />
      <ParticleField
        particleCount={particleCount}
        activeShape={activeShape}
        sectionId={sectionId}
        reducedMotion={reducedMotion}
        isVisible={isVisible}
        shapeOffsetX={shapeOffsetX}
      />
    </>
  );
}

export default function ParticleSection({ sectionId, paused = false }) {
  const containerRef = useRef(null);
  const [particleCount, setParticleCount] = useState(getParticleCount);
  const [dpr, setDpr] = useState(getDpr);
  const [shapeOffsetX, setShapeOffsetX] = useState(getShapeOffsetX);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [isVisible, setIsVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => document.visibilityState === "visible"
  );
  const [windowFocused, setWindowFocused] = useState(() => document.hasFocus());

  useEffect(() => {
    function onResize() {
      setParticleCount(getParticleCount());
      setDpr(getDpr());
      setShapeOffsetX(getShapeOffsetX());
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onMotionChange(event) {
      setReducedMotion(event.matches);
    }

    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", onMotionChange);
    return () => {
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  useEffect(() => {
    function updatePageActivity() {
      setPageVisible(document.visibilityState === "visible");
      setWindowFocused(document.hasFocus());
    }

    document.addEventListener("visibilitychange", updatePageActivity);
    window.addEventListener("focus", updatePageActivity);
    window.addEventListener("blur", updatePageActivity);
    return () => {
      document.removeEventListener("visibilitychange", updatePageActivity);
      window.removeEventListener("focus", updatePageActivity);
      window.removeEventListener("blur", updatePageActivity);
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldAnimate =
    isVisible && pageVisible && windowFocused && !reducedMotion && !paused;

  return (
    <div
      className="particle-section"
      data-motion-paused={paused ? "true" : "false"}
      ref={containerRef}
      aria-hidden="true"
    >
      <Canvas
        dpr={dpr}
        frameloop={shouldAnimate ? "always" : "demand"}
        camera={{ position: [0, 0, 4.5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene
            sectionId={sectionId}
            particleCount={particleCount}
            reducedMotion={reducedMotion}
            isVisible={shouldAnimate}
            shapeOffsetX={shapeOffsetX}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
