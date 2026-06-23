import { createContext, useContext, useMemo, useState } from "react";

const ParticleContext = createContext(null);

export function ParticleProvider({ children }) {
  const [activeShape, setActiveShape] = useState(null);

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
