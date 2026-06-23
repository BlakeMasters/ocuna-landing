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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Scene({ sectionId, particleCount, reducedMotion, isVisible }) {
  const { activeShape } = useParticleContext();

  return (
    <>
      <color attach="background" args={["#04060c"]} />
      <fog attach="fog" args={["#04060c", 3, 12]} />
      <ambientLight intensity={0.15} />
      <ParticleField
        particleCount={particleCount}
        activeShape={activeShape}
        sectionId={sectionId}
        reducedMotion={reducedMotion}
        isVisible={isVisible}
      />
    </>
  );
}

export default function ParticleSection({ sectionId }) {
  const containerRef = useRef(null);
  const [particleCount, setParticleCount] = useState(getParticleCount);
  const [dpr, setDpr] = useState(getDpr);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [isVisible, setIsVisible] = useState(true);
  const [frameloop, setFrameloop] = useState("always");

  useEffect(() => {
    function onResize() {
      setParticleCount(getParticleCount());
      setDpr(getDpr());
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
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        setFrameloop(visible ? "always" : "demand");
      },
      { threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="particle-section" ref={containerRef} aria-hidden="true">
      <Canvas
        dpr={dpr}
        frameloop={frameloop}
        camera={{ position: [0, 0, 4.5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene
            sectionId={sectionId}
            particleCount={particleCount}
            reducedMotion={reducedMotion}
            isVisible={isVisible}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
