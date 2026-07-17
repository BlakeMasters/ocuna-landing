import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import LogisticsParticleScene from "./particles/LogisticsParticleScene.jsx";

const DENSITY_TIERS = {
  compact: {
    key: "compact",
    ambient: 2000,
    ship: 9000,
    cargo: 0,
    reserve: 12000,
    trail: 3000,
    pointSize: 0.82,
  },
  medium: {
    key: "medium",
    ambient: 3000,
    ship: 15000,
    cargo: 0,
    reserve: 20000,
    trail: 5000,
    pointSize: 0.76,
  },
  full: {
    key: "full",
    ambient: 4000,
    ship: 23000,
    cargo: 0,
    reserve: 30000,
    trail: 6000,
    pointSize: 0.72,
  },
};

function getDensityTier() {
  if (window.innerWidth < 620) return DENSITY_TIERS.compact;
  if (window.innerWidth < 1000) return DENSITY_TIERS.medium;
  return DENSITY_TIERS.full;
}

function getDpr() {
  const cap = window.innerWidth < 620 ? 1.2 : 1.5;
  return Math.min(window.devicePixelRatio || 1, cap);
}

function getDebugTime() {
  if (!import.meta.env.DEV) return null;
  const rawValue = new URLSearchParams(window.location.search).get("logisticsTime");
  if (rawValue === null || rawValue.trim() === "") return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function getDebugBoat() {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get("logisticsBoat");
  return value === "alpha" || value === "bravo" ? value : null;
}

function getDebugLayer() {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get("logisticsLayer");
  return value === "structure" || value === "dynamic" ? value : null;
}

export default function LogisticsPrototype({ motionEnabled = true }) {
  const debugTime = getDebugTime();
  const debugBoat = getDebugBoat();
  const debugLayer = getDebugLayer();
  const frameRef = useRef(null);
  // Treat the opening frame as scene setup, not live control state. Recomputing
  // it when the pause button changes would rebuild both high-density particle
  // geometries and make a simple pause/resume visibly hitch.
  const initialSceneTimeRef = useRef(debugTime ?? (motionEnabled ? 0 : 26));
  const [density, setDensity] = useState(getDensityTier);
  const [dpr, setDpr] = useState(getDpr);
  const [pageActive, setPageActive] = useState(
    () => document.visibilityState === "visible" && document.hasFocus()
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function onResize() {
      const nextDensity = getDensityTier();
      setDensity((current) =>
        current.key === nextDensity.key ? current : nextDensity
      );
      setDpr(getDpr());
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function updatePageActivity() {
      setPageActive(
        document.visibilityState === "visible" && document.hasFocus()
      );
    }

    updatePageActivity();
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
    const node = frameRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.04 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldAnimate =
    debugTime === null &&
    motionEnabled &&
    pageActive &&
    isVisible;
  const sceneDensity = debugLayer === "structure"
    ? { ...density, ambient: 0, reserve: 0 }
    : debugLayer === "dynamic"
      ? { ...density, ambient: 0 }
    : density;

  return (
    <div
      className="ship-hero-stage"
      data-motion-active={shouldAnimate ? "true" : "false"}
      ref={frameRef}
    >
      <div className="logistics-canvas" aria-hidden="true">
        <Canvas
          dpr={dpr}
          frameloop={shouldAnimate ? "always" : "demand"}
          camera={{ position: [0, 0, 7], fov: 45 }}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <LogisticsParticleScene
            key={`${density.key}-${debugTime ?? "live"}-${debugBoat ?? "all"}-${debugLayer ?? "all"}`}
            density={sceneDensity}
            shouldAnimate={shouldAnimate}
            initialTime={initialSceneTimeRef.current}
            debugBoat={debugBoat}
          />
        </Canvas>
      </div>
      <div className="shell logistics-stage-key" aria-hidden="true">
        <span>01 · emerge</span>
        <span>02 · berth</span>
        <span>03 · transfer</span>
        <span>04 · disperse</span>
      </div>
    </div>
  );
}
