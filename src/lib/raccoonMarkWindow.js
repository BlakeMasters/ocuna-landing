import { buildMarkField, drawMarkField } from "./imageMarks.js";

const PAPER = "#f8f7f4";
const FPS = 12;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Keep both halves of the window on the artwork, including at either edge.
export function markWindowBounds(position, share = .38) {
  const width = clamp(Number.isFinite(share) ? share : .38, 0, 1);
  const fraction = clamp(Number.isFinite(position) ? position : .45, 0, 1);
  const left = fraction * (1 - width);
  return { left, middle: left + width / 2, right: left + width };
}

/** A cached image field: cursor movement changes CSS clipping, never pixel reads. */
export function mountRaccoonMarkWindow(host, { image, artwork, pointerTarget = host, animate = true }) {
  const canvases = [...host.querySelectorAll("canvas")];
  const contexts = canvases.map((canvas) => canvas.getContext("2d"));
  const input = host.querySelector("input");
  const source = document.createElement("canvas");
  const sourceContext = source.getContext("2d");
  const sample = document.createElement("canvas");
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (contexts.some((context) => !context) || !sourceContext || !sampleContext) return { setAnimating() {}, dispose() {} };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let fields = [];
  let width = 0, height = 0;
  let timer, pointerFrame;
  let disposed = false, onscreen = false;
  let elapsed = 0, lastTick;
  let position = .45, targetPosition = .45;

  function setClipping(value) {
    const bounds = markWindowBounds(value);
    for (const key of ["left", "middle", "right"]) host.style.setProperty(`--mark-${key}`, `${(bounds[key] * 100).toFixed(3)}%`);
    input.value = String(Math.round(value * 100));
    input.setAttribute("aria-valuetext", `${Math.round(value * 100)}% across the artwork`);
  }

  function followPointer() {
    pointerFrame = undefined;
    if (disposed || document.hidden || !onscreen) return;
    position += (targetPosition - position) * .2;
    if (Math.abs(targetPosition - position) < .001) position = targetPosition;
    setClipping(position);
    if (position !== targetPosition) pointerFrame = requestAnimationFrame(followPointer);
  }

  function move(value, immediate = false) {
    if (disposed || !Number.isFinite(value)) return;
    targetPosition = clamp(value, 0, 1);
    if (immediate || reduced.matches || !animate) {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = undefined;
      position = targetPosition;
      setClipping(position);
    } else if (pointerFrame === undefined) pointerFrame = requestAnimationFrame(followPointer);
  }

  function onPointer(event) {
    if (!onscreen || document.hidden || event.pointerType === "touch") return;
    const bounds = pointerTarget.getBoundingClientRect();
    if (bounds.width) move((event.clientX - bounds.left) / bounds.width);
  }
  const onInput = () => move(Number(input.value) / 100, true);

  function paint() {
    if (!fields.length || disposed) return;
    const started = import.meta.env?.DEV ? performance.now() : 0;
    contexts.forEach((context, index) => {
      context.globalAlpha = 1;
      context.fillStyle = PAPER;
      context.fillRect(0, 0, width, height);
      context.globalAlpha = .16;
      context.drawImage(source, 0, 0, width, height);
      context.globalAlpha = 1;
      drawMarkField(context, fields[index], { time: elapsed / 1000, animate: !reduced.matches });
    });
    if (import.meta.env?.DEV) {
      host.dataset.paintMs = (performance.now() - started).toFixed(2);
      host.dataset.paintCount = String((Number(host.dataset.paintCount) || 0) + 1);
    }
  }

  function active() { return animate && !reduced.matches && onscreen && !document.hidden && fields.length > 0; }
  function tick() {
    timer = undefined;
    if (disposed || !active()) { lastTick = undefined; return; }
    const now = performance.now();
    if (lastTick !== undefined) elapsed += Math.min(now - lastTick, 150);
    lastTick = now;
    paint();
    timer = setTimeout(tick, 1000 / FPS);
  }
  function refresh() {
    clearTimeout(timer);
    timer = undefined;
    lastTick = undefined;
    const playing = active();
    host.dataset.playback = playing ? "playing" : "paused";
    host.style.setProperty("--mark-play-state", playing ? "running" : "paused");
    if (document.hidden || !onscreen) {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = undefined;
      return;
    }
    if (reduced.matches || !animate) {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = undefined;
      position = targetPosition;
      setClipping(position);
    }
    paint();
    if (playing) timer = setTimeout(tick, 1000 / FPS);
  }

  function resize() {
    const bounds = host.getBoundingClientRect();
    const nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
    if (nextWidth <= 0 || nextHeight <= 0 || (width === nextWidth && height === nextHeight)) return;
    width = nextWidth; height = nextHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvases.forEach((canvas, index) => {
      canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
      contexts[index].setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    });
    source.width = width; source.height = height;
    const { crop } = artwork;
    sourceContext.filter = artwork.filter;
    // Draw the entire responsive image into the same destination rectangle as
    // the CSS original. Avoid source-pixel coordinates: srcset density can
    // make naturalWidth differ from the decoded bitmap's actual pixel width.
    sourceContext.drawImage(image,
      -crop.x / crop.width * width, -crop.y / crop.height * height,
      artwork.width / crop.width * width, artwork.height / crop.height * height);
    sourceContext.filter = "none";
    try {
      fields = ["ascii", "hatch"].map((mode) => {
        const cellSize = mode === "ascii" ? 6 : 5;
        // Cap sampling independently of viewport size or device pixel ratio.
        const columns = Math.ceil(width / cellSize);
        const rows = Math.ceil(height / (cellSize * (mode === "ascii" ? 1.65 : 1.4)));
        const scale = Math.min(1, Math.sqrt(8000 / (columns * rows)));
        sample.width = Math.max(1, Math.floor(columns * scale));
        sample.height = Math.max(1, Math.min(Math.floor(rows * scale), Math.floor(8000 / sample.width)));
        sampleContext.drawImage(source, 0, 0, sample.width, sample.height);
        const field = buildMarkField(sampleContext.getImageData(0, 0, sample.width, sample.height), { width, height, mode, tone: "paper", cellSize });
        // The engraving is monochrome. Use a consistent ink so its palest
        // pencil details still read as characters and strokes at this scale.
        for (const cell of field.cells) {
          cell.color = "#424a46";
          cell.opacity = .28 + cell.intensity * .66;
        }
        return field;
      });
      host.dataset.state = "ready";
      if (import.meta.env?.DEV) {
        host.dataset.sampleRevision = String((Number(host.dataset.sampleRevision) || 0) + 1);
        host.dataset.cellCount = String(fields.reduce((sum, field) => sum + field.cells.length, 0));
      }
    } catch {
      fields = [];
      host.dataset.state = "original";
    }
    refresh();
  }

  // A responsive image may finish selecting a sharper source after a resize.
  function sourceLoaded() { width = 0; resize(); }

  const resizeObserver = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; refresh(); });
  resizeObserver.observe(host);
  intersection.observe(host);
  pointerTarget.addEventListener("pointermove", onPointer, { passive: true });
  input.addEventListener("input", onInput);
  image.addEventListener?.("load", sourceLoaded);
  reduced.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  setClipping(position);
  resize();

  return {
    setAnimating(value) { animate = Boolean(value); refresh(); },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      cancelAnimationFrame(pointerFrame);
      resizeObserver.disconnect(); intersection.disconnect();
      pointerTarget.removeEventListener("pointermove", onPointer);
      input.removeEventListener("input", onInput);
      image.removeEventListener?.("load", sourceLoaded);
      reduced.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    },
  };
}
