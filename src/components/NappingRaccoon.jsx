import { useEffect, useRef } from "react";
import { asset } from "../assets.js";
import { mountNappingRaccoon, NAP_REST_PATH } from "../lib/nappingRaccoon.js";
import { NAP_INK } from "../lib/nappingRaccoonArt.js";
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
    <svg className="field-napping-raccoon__art field-napping-raccoon__motion" viewBox="0 0 1859 846" width="1859" height="846" focusable="false">
      <path d={NAP_REST_PATH} data-nap-outline="" fill={NAP_INK} fillRule="evenodd" />
    </svg>
    <img className="field-napping-raccoon__art field-napping-raccoon__still" src={asset("research/sleeping-raccoon.png")}
      width="1859" height="846" alt="" />
  </span>;
}
