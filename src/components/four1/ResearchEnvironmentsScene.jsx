import { useEffect, useId, useMemo, useRef, useState } from "react";
import { researchStageSvg } from "./researchStageArt.js";
import { createResearchStageMotion } from "./researchStageMotion.js";
import { asset } from "../../assets.js";
import "./ResearchEnvironmentsScene.css";

export default function ResearchEnvironmentsScene({ paused = false }) {
  const stageRef = useRef(null);
  const motionRef = useRef(null);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const artwork = useMemo(() => researchStageSvg(`four1-stage-${id}`, asset("four1/logo.png")), [id]);
  // Keep the animated SVG nodes mounted when visibility or pause state changes.
  const markup = useMemo(() => ({ __html: artwork }), [artwork]);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const running = !paused && visible && pageVisible && !reducedMotion;

  useEffect(() => {
    const motion = createResearchStageMotion(stageRef.current);
    motionRef.current = motion;
    return () => {
      motion.destroy();
      motionRef.current = null;
    };
  }, [artwork]);

  useEffect(() => {
    motionRef.current?.setRunning(running);
  }, [running, artwork]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    query.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(stageRef.current);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return (
    <figure className="research-stage" id="four1-research-animation" ref={stageRef}
      data-running={running}
      data-reduced-motion={reducedMotion}>
      <div className="research-stage__art" dangerouslySetInnerHTML={markup} />
    </figure>
  );
}
