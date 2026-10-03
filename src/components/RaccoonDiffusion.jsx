import { useEffect, useId, useRef, useState } from "react";
import { asset } from "../assets.js";
import { DIFFUSION_DURATION, brushDiffusion, drawBrushDiffusion, engravingInk } from "../lib/critterDiffusion.js";

export default function RaccoonDiffusion({ illustration }) {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const filterId = useId();
  const [state, setState] = useState("loading");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active = true;
    let frame;

    function finish() {
      cancelAnimationFrame(frame);
      if (active) setState("complete");
    }

    function motionChanged() {
      if (motion.matches) finish();
    }

    function visibilityChanged() {
      if (document.hidden) finish();
    }

    async function start() {
      if (motion.matches || document.hidden) return finish();
      try {
        await imageRef.current.decode();
        if (!active) return;
        if (motion.matches || document.hidden) return finish();

        const { width, height } = illustration;
        const canvas = canvasRef.current;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        const context = canvas.getContext("2d");
        if (!context) return finish();
        context.scale(canvas.width / width, canvas.height / height);
        const ink = engravingInk(imageRef.current, width, height);
        const painting = brushDiffusion(ink);
        let began;
        let currentStep = 0;
        setState("diffusing");

        function draw(timestamp) {
          if (!active || motion.matches || document.hidden) return finish();
          began ??= timestamp;
          const elapsed = timestamp - began;
          const nextStep = drawBrushDiffusion(context, painting, elapsed, width, height);
          if (nextStep !== currentStep) {
            currentStep = nextStep;
            setStep(nextStep);
          }
          if (elapsed >= DIFFUSION_DURATION) finish();
          else frame = requestAnimationFrame(draw);
        }
        frame = requestAnimationFrame(draw);
      } catch {
        finish();
      }
    }

    setState("loading");
    setStep(0);
    motion.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [illustration]);

  return (
    <div className="critter-diffusion" data-diffusion-state={state} data-diffusion-step={step}>
      <svg className="critter-diffusion__filter" aria-hidden="true" width="0" height="0">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.333333 -0.333333 -0.333333 1 0" />
          </filter>
        </defs>
      </svg>
      <img
        className="critter-diffusion__image"
        style={{ filter: `url(#${filterId})` }}
        ref={imageRef}
        src={asset(illustration.file)}
        width={illustration.width}
        height={illustration.height}
        alt={illustration.alt}
        decoding="async"
        fetchPriority="high"
      />
      <canvas className="critter-diffusion__canvas" ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
