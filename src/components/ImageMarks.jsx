import { useEffect, useRef, useState } from "react";
import { buildMarkField, drawMarkField } from "../lib/imageMarks.js";
import "./ImageMarks.css";

const BACKGROUNDS = { dark: "#080c0c", paper: "#f5f0e5" };

// Pixel reads happen only when the source, grid, tone, or display size changes.
// Playback paints cached cells, without re-reading or re-decoding the image.
export default function ImageMarks({
  src, alt, mode = "hatch", tone = "dark", cellSize = 7,
  underlay = 0.16, exposure = 1.8, glow = true, animate = true, split = 40,
  onSplitChange, onStatus, outputRef, interactive = true, showLabels = true, showHandle = true, reveal = false, className = "",
  imageWidth, imageHeight, loading = "eager", fetchPriority, canvasId,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const optionsRef = useRef({});
  const [loadedImage, setLoadedImage] = useState(null);
  const [state, setState] = useState("loading");
  optionsRef.current = { underlay, exposure, glow, animate, onStatus };

  useEffect(() => {
    let active = true;
    setLoadedImage(null);
    setState("loading");
    optionsRef.current.onStatus?.({ state: "loading" });
    const image = new Image();
    image.decoding = "async";
    function open() {
      image.src = src;
      image.decode().then(() => {
        if (active) setLoadedImage(image);
      }).catch(() => {
        if (!active) return;
        setState("error");
        optionsRef.current.onStatus?.({ state: "error", message: "This image could not be opened. Try a PNG, JPEG, WebP, or SVG." });
      });
    }
    let observer;
    if (loading === "lazy") {
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        open();
      }, { rootMargin: "200px" });
      observer.observe(hostRef.current);
    } else open();
    return () => { active = false; observer?.disconnect(); };
  }, [src, loading]);

  useEffect(() => {
    if (!loadedImage) return undefined;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setState("error");
      optionsRef.current.onStatus?.({ state: "error", message: "Canvas rendering is unavailable. The original image is shown." });
      return undefined;
    }
    const sourceCanvas = document.createElement("canvas");
    const sampleCanvas = document.createElement("canvas");
    const marksCanvas = document.createElement("canvas");
    const sourceContext = sourceCanvas.getContext("2d");
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const marksContext = marksCanvas.getContext("2d");
    if (!sourceContext || !sampleContext || !marksContext) {
      setState("error");
      optionsRef.current.onStatus?.({ state: "error", message: "Canvas rendering is unavailable. The original image is shown." });
      return undefined;
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let field;
    let width = 0;
    let height = 0;
    let frame;
    let lastPaint = -Infinity;
    let elapsed = 0;
    let previousTime;
    let onscreen = true;
    let disposed = false;
    let cachedUnderlay;

    function moving() {
      return optionsRef.current.animate && !motion.matches;
    }

    function paint() {
      if (!field || disposed) return;
      const paintStarted = import.meta.env.DEV ? performance.now() : 0;
      const { underlay: mix, exposure: brightness, glow: bloom } = optionsRef.current;
      marksContext.clearRect(0, 0, width, height);
      // Pausing holds the current glyph/line phase. Reduced motion uses a still.
      drawMarkField(marksContext, field, { time: elapsed / 1000, animate: !motion.matches });
      context.globalAlpha = 1;
      context.filter = "none";
      if (cachedUnderlay !== mix) {
        // Sampling has finished: reuse its source canvas for the static backdrop.
        // Only resize or a changed underlay needs another blur of the source.
        sourceContext.globalAlpha = 1;
        sourceContext.filter = "none";
        sourceContext.fillStyle = BACKGROUNDS[tone];
        sourceContext.fillRect(0, 0, width, height);
        if (mix > 0) {
          const scale = Math.min(width / loadedImage.width, height / loadedImage.height);
          const imageWidth = loadedImage.width * scale;
          const imageHeight = loadedImage.height * scale;
          sourceContext.globalAlpha = mix;
          sourceContext.filter = mode === "ascii" ? "blur(3px)" : "blur(1px)";
          sourceContext.drawImage(loadedImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
          sourceContext.globalAlpha = 1;
          sourceContext.filter = "none";
        }
        cachedUnderlay = mix;
      }
      context.drawImage(sourceCanvas, 0, 0, width, height);
      if (bloom && tone === "dark") {
        context.globalAlpha = 0.55;
        context.filter = `blur(3px) brightness(${brightness})`;
        context.drawImage(marksCanvas, 0, 0, width, height);
        context.filter = "none";
      }
      context.globalAlpha = 1;
      context.filter = tone === "dark" ? `brightness(${brightness})` : "none";
      context.drawImage(marksCanvas, 0, 0, width, height);
      context.filter = "none";
      canvas.dataset.renderTime = String(Math.round(elapsed));
      if (import.meta.env.DEV) {
        const paintMs = performance.now() - paintStarted;
        canvas.dataset.paintMs = paintMs.toFixed(2);
        canvas.dataset.maxPaintMs = Math.max(paintMs, Number(canvas.dataset.maxPaintMs) || 0).toFixed(2);
      }
    }

    function tick(timestamp) {
      frame = undefined;
      if (disposed || document.hidden || !onscreen || !moving()) {
        previousTime = undefined;
        return;
      }
      if (previousTime !== undefined) elapsed += Math.min(timestamp - previousTime, 100);
      previousTime = timestamp;
      // Retain smooth timing while limiting the actual canvas work to 15 fps.
      if (timestamp - lastPaint >= 1000 / 15) {
        paint();
        lastPaint = timestamp;
      }
      frame = requestAnimationFrame(tick);
    }

    function refresh() {
      cancelAnimationFrame(frame);
      frame = undefined;
      previousTime = undefined;
      paint();
      const active = moving() && !document.hidden && onscreen;
      host.style.setProperty("--image-play-state", active ? "running" : "paused");
      canvas.dataset.playback = active ? "playing" : "paused";
      if (active && field) frame = requestAnimationFrame(tick);
    }

    function resize() {
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = Math.round(bounds.width);
      height = Math.round(bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const target of [canvas, sourceCanvas, marksCanvas]) {
        target.width = Math.ceil(width * dpr);
        target.height = Math.ceil(height * dpr);
      }
      for (const ctx of [context, sourceContext, marksContext]) {
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      }
      cachedUnderlay = undefined;
      // Match object-fit: contain exactly on both sides of the comparison.
      const scale = Math.min(width / loadedImage.width, height / loadedImage.height);
      const imageWidth = loadedImage.width * scale;
      const imageHeight = loadedImage.height * scale;
      try {
        sourceContext.drawImage(loadedImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
        sampleCanvas.width = Math.max(1, Math.ceil(width / cellSize));
        sampleCanvas.height = Math.max(1, Math.ceil(height / (cellSize * (mode === "ascii" ? 1.65 : 1.4))));
        sampleContext.drawImage(sourceCanvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
        field = buildMarkField(sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height), { width, height, cellSize, mode, tone });
        canvas.dataset.cellCount = String(field.cells.length);
        if (import.meta.env.DEV) canvas.dataset.sampleRevision = String((Number(canvas.dataset.sampleRevision) || 0) + 1);
        setState("ready");
        optionsRef.current.onStatus?.({ state: "ready", cells: field.cells.length });
        refresh();
      } catch {
        field = null;
        setState("error");
        optionsRef.current.onStatus?.({ state: "error", message: "This image cannot be sampled. Try a local PNG or JPEG." });
      }
    }

    const observer = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; refresh(); });
    observer.observe(host);
    intersection.observe(host);
    motion.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    controllerRef.current = refresh;
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
      controllerRef.current = null;
    };
  }, [loadedImage, mode, tone, cellSize]);

  useEffect(() => { controllerRef.current?.(); }, [underlay, exposure, glow, animate]);
  useEffect(() => {
    if (outputRef) outputRef.current = canvasRef.current;
    return () => { if (outputRef) outputRef.current = null; };
  }, [outputRef]);

  return (
    <div className={`image-marks${interactive ? (showHandle ? "" : " image-marks--quiet") : " image-marks--fixed"}${reveal ? " image-marks--reveal" : ""}${className ? ` ${className}` : ""}`} ref={hostRef} data-state={state} data-tone={tone} style={{ "--split": `${split}%`, backgroundColor: BACKGROUNDS[tone] }}>
      <img className="image-marks__source" src={src} alt={alt} width={imageWidth} height={imageHeight} loading={loading} fetchPriority={fetchPriority} decoding="async" />
      <canvas id={canvasId} ref={canvasRef} className="image-marks__canvas" aria-hidden="true" style={{ clipPath: `inset(0 0 0 ${split}%)`, visibility: state === "ready" ? "visible" : "hidden" }} />
      {interactive && <>
      {showLabels && <div className="image-marks__labels" aria-hidden="true"><span>Original</span><span>{mode === "ascii" ? "Colored ASCII" : "Diagonal hatching"}</span></div>}
      {showLabels && state === "loading" && <span className="image-marks__loading" role="status">Opening image…</span>}
      <input className="image-marks__comparison" type="range" min="0" max="100" value={split} onChange={(event) => onSplitChange?.(Number(event.target.value))} aria-label="Original image share" aria-valuetext={`${split}% original, ${100 - split}% effect`} />
      {showHandle && <div className="image-marks__divider" aria-hidden="true"><span>‹<span>›</span></span></div>}
      </>}
    </div>
  );
}
