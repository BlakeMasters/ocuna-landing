import { useEffect, useRef } from "react";
import { mountNappingRaccoon } from "../lib/nappingRaccoon.js";
import "./NappingRaccoon.css";

export default function NappingRaccoon({ paused = false }) {
  const hostRef = useRef(null);
  const motionRef = useRef(null);
  const pausedRef = useRef(paused);
  useEffect(() => {
    const motion = mountNappingRaccoon(hostRef.current, pausedRef.current);
    motionRef.current = motion;
    return () => { motion.dispose(); motionRef.current = null; };
  }, []);
  useEffect(() => {
    pausedRef.current = paused;
    motionRef.current?.setPaused(paused);
  }, [paused]);

  return <span className="field-napping-raccoon" id="field-napping-raccoon" ref={hostRef}
    aria-hidden="true">
    <img className="field-napping-raccoon__art" src="/research/sleeping-raccoon.png"
      width="1859" height="846" alt="" decoding="async" draggable="false" />
  </span>;
}
