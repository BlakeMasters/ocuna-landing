import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ParticleContext = createContext(null);

export function ParticleProvider({ children }) {
  const [activeShape, setActiveShape] = useState(null);

  useEffect(() => {
    function clearActiveShape() {
      setActiveShape(null);
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") {
        clearActiveShape();
      }
    }

    function onPointerOut(event) {
      if (!event.relatedTarget) {
        clearActiveShape();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", clearActiveShape);
    window.addEventListener("pointercancel", clearActiveShape);
    window.addEventListener("pointerout", onPointerOut);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", clearActiveShape);
      window.removeEventListener("pointercancel", clearActiveShape);
      window.removeEventListener("pointerout", onPointerOut);
    };
  }, []);

  const value = useMemo(
    () => ({
      activeShape,
      setActiveShape,
    }),
    [activeShape]
  );

  return (
    <ParticleContext.Provider value={value}>{children}</ParticleContext.Provider>
  );
}

export function useParticleContext() {
  const context = useContext(ParticleContext);
  if (!context) {
    throw new Error("useParticleContext must be used within ParticleProvider");
  }
  return context;
}
