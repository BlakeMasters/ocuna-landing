import { createContext, useContext, useEffect, useRef, useState } from "react";

const PageMotion = createContext({ motionEnabled: true, toggleMotion() {} });
export const usePageMotion = () => useContext(PageMotion);

export function PageMotionProvider({ active, children }) {
  const [motionEnabled, setMotionEnabled] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const userChoice = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (!userChoice.current) setMotionEnabled(!query.matches); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const toggleMotion = () => { userChoice.current = true; setMotionEnabled(value => !value); };
  return <PageMotion.Provider value={{ motionEnabled: active ? motionEnabled : true, toggleMotion }}>{children}</PageMotion.Provider>;
}
