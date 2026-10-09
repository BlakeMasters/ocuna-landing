import { useEffect, useRef } from "react";
import { createResearchJungle } from "../lib/researchJungle.js";
import "./FieldNotesJungle.css";

export default function FieldNotesJungle({ paused }) {
  const canvasRef = useRef(null);
  const motionRef = useRef(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    const motion = createResearchJungle(canvasRef.current, canvasRef.current.parentElement);
    motionRef.current = motion;
    motion.setPaused(pausedRef.current);
    return () => { motion.dispose(); motionRef.current = null; };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    motionRef.current?.setPaused(paused);
  }, [paused]);

  return <canvas className="field-jungle" id="field-jungle" ref={canvasRef} aria-hidden="true" />;
}
