import { buildMarkField, drawMarkField } from "./imageMarks.js";

const PAPER = "#f8f7f4";
const FPS = 12;
const ASCII_SPEED = 1.75;
const WINDOW_SHARE = .38;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Both ends travel completely clear of the image, rather than sticking to it.
export function markWindowBounds(position, share = WINDOW_SHARE) {
  const height = clamp(Number.isFinite(share) ? share : WINDOW_SHARE, 0, 1);
  const fraction = clamp(Number.isFinite(position) ? position : .45, 0, 1);
  const top = fraction === 1 ? 1 : fraction * (1 + height) - height;
  return { top, middle: top + height / 2, bottom: fraction === 0 ? 0 : top + height };
}

// Cap travel speed and acceleration; the exit fade uses fast critical damping.
export function stepMarkSpring(value, velocity, target, seconds, { maxSpeed = .88 } = {}) {
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .05);
  if (maxSpeed !== Infinity) {
    // Scale the complete travel response to 55% of its previous pace.
    const response = 9.9, acceleration = 3.63;
    const steps = Math.max(1, Math.ceil(dt * 120));
    const step = dt / steps;
    for (let index = 0; index < steps; index += 1) {
      const distance = target - value;
      const desiredSpeed = Math.sign(distance) * Math.min(maxSpeed, Math.abs(distance) * response, Math.sqrt(2 * acceleration * Math.abs(distance)));
      const nextVelocity = velocity + clamp((desiredSpeed - velocity) * (1 - Math.exp(-response * step)), -acceleration * step, acceleration * step);
      const nextValue = value + (velocity + nextVelocity) * step / 2;
      if (distance * (target - nextValue) <= 0) return { value: target, velocity: 0 };
      value = clamp(nextValue, 0, 1);
      velocity = clamp(nextVelocity, -maxSpeed, maxSpeed);
    }
    if (Math.abs(target - value) < .0005 && Math.abs(velocity) < .005) return { value: target, velocity: 0 };
    return { value, velocity };
  }
  const response = 28;
  const error = value - target;
  const impulse = velocity + response * error;
  const decay = Math.exp(-response * dt);
  const next = target + (error + impulse * dt) * decay;
  const speed = (velocity - response * impulse * dt) * decay;
  if (Math.abs(target - next) < .0005 && Math.abs(speed) < .005) return { value: target, velocity: 0 };
  if (next < 0 || next > 1) return { value: clamp(next, 0, 1), velocity: 0 };
  return { value: next, velocity: speed };
}

function asciiCell(cell) {
  let seed = Math.imul(cell.column + 1, 1597334677) ^ Math.imul(cell.row + 1, 3812015801);
  seed ^= seed >>> 16;
  return (seed >>> 0) % 100 < 55;
}

// One shared grid, one mark per cell: characters and strokes are interleaved.
export function buildMixedMarkFields(samples, { width, height, cellSize = 6 }) {
  return ["ascii", "hatch"].map((mode) => {
    const field = buildMarkField(samples, { width, height, mode, tone: "paper", cellSize });
    field.cells = field.cells.filter(cell => asciiCell(cell) === (mode === "ascii"));
    for (const cell of field.cells) {
      cell.color = "#424a46";
      cell.opacity = .28 + cell.intensity * .66;
    }
    return field;
  });
}

/** Only local pointer movement drives the band; idle artwork schedules no work. */
export function mountRaccoonMarkWindow(host, { image, artwork, animate = true }) {
  const canvases = [...host.querySelectorAll("canvas")];
  const contexts = canvases.map((canvas) => canvas.getContext("2d"));
  const source = document.createElement("canvas");
  const sourceContext = source.getContext("2d");
  const sample = document.createElement("canvas");
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (contexts.some((context) => !context) || !sourceContext || !sampleContext) return { setAnimating() {}, dispose() {} };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let fields = [];
  let width = 0, height = 0;
  let timer, motionFrame;
  let disposed = false, onscreen = false;
  let elapsed = 0, lastTick;
  let inside = false, pendingPointer = null, lastMotion;
  let position = { value: 0, velocity: 0 }, opacity = { value: 0, velocity: 0 };
  let targetPosition = 0, targetOpacity = 0;

  function writePose() {
    host.style.setProperty("--mark-y", `${(markWindowBounds(position.value).top * height).toFixed(2)}px`);
    host.style.setProperty("--mark-opacity", opacity.value.toFixed(4));
    host.dataset.effectActive = String(targetOpacity > 0 || opacity.value > 0);
  }

  function motionAllowed() { return animate && !reduced.matches; }

  function readPointer() {
    if (!pendingPointer) return;
    const pointer = pendingPointer;
    pendingPointer = null;
    // Pointer events are coalesced, with one bounds read before transform writes.
    const bounds = host.getBoundingClientRect();
    if (!bounds.height || pointer.x < bounds.left || pointer.x > bounds.right
      || pointer.y < bounds.top || pointer.y > bounds.bottom) {
      inside = false;
      targetOpacity = 0;
      if (pointer.y <= bounds.top) targetPosition = 0;
      else if (pointer.y >= bounds.bottom) targetPosition = 1;
      return;
    }
    targetPosition = clamp((pointer.y - bounds.top) / bounds.height, 0, 1);
    // Enter at the pointer's height, rather than sweeping across the whole image.
    if (opacity.value === 0) position = { value: targetPosition, velocity: 0 };
    targetOpacity = 1;
  }

  function followPointer(timestamp) {
    motionFrame = undefined;
    if (disposed || document.hidden || !onscreen) return;
    readPointer();
    const dt = lastMotion === undefined ? 1 / 60 : (timestamp - lastMotion) / 1000;
    lastMotion = timestamp;
    position = stepMarkSpring(position.value, position.velocity, targetPosition, dt);
    opacity = stepMarkSpring(opacity.value, opacity.velocity, targetOpacity, dt, { maxSpeed: Infinity });
    writePose();
    syncPlayback();
    if (position.value !== targetPosition || opacity.value !== targetOpacity
      || position.velocity !== 0 || opacity.velocity !== 0) motionFrame = requestAnimationFrame(followPointer);
    else lastMotion = undefined;
  }

  function queueMotion() {
    if (disposed || !onscreen || document.hidden || !fields.length) return;
    if (!motionAllowed()) {
      cancelAnimationFrame(motionFrame);
      motionFrame = undefined;
      lastMotion = undefined;
      readPointer();
      position = { value: targetPosition, velocity: 0 };
      opacity = { value: targetOpacity, velocity: 0 };
      writePose();
      syncPlayback();
    } else if (motionFrame === undefined) motionFrame = requestAnimationFrame(followPointer);
  }

  function onPointer(event) {
    if (event.pointerType === "touch") return;
    inside = true;
    pendingPointer = { x: event.clientX, y: event.clientY };
    queueMotion();
  }

  function onLeave(event) {
    inside = false;
    pendingPointer = null;
    targetOpacity = 0;
    if (Number.isFinite(event?.clientY)) {
      const bounds = host.getBoundingClientRect();
      if (event.clientY <= bounds.top) targetPosition = 0;
      else if (event.clientY >= bounds.bottom) targetPosition = 1;
    }
    // Freeze the cached glyph frame immediately; only the cheap fade continues.
    syncPlayback();
    queueMotion();
  }

  function hideImmediately() {
    inside = false;
    pendingPointer = null;
    targetOpacity = 0;
    opacity = { value: 0, velocity: 0 };
    position.velocity = 0;
    targetPosition = position.value;
    cancelAnimationFrame(motionFrame);
    motionFrame = undefined;
    lastMotion = undefined;
    writePose();
    syncPlayback();
  }

  function paint() {
    if (!fields.length || disposed) return;
    const started = import.meta.env?.DEV ? performance.now() : 0;
    contexts.forEach((context) => {
      context.globalAlpha = 1;
      context.fillStyle = PAPER;
      context.fillRect(0, 0, width, height);
      context.globalAlpha = .16;
      context.drawImage(source, 0, 0, width, height);
      context.globalAlpha = 1;
      for (const field of fields) {
        drawMarkField(context, field, { time: elapsed / 1000 * (field.mode === "ascii" ? ASCII_SPEED : 1), animate: !reduced.matches });
      }
    });
    if (import.meta.env?.DEV) {
      host.dataset.paintMs = (performance.now() - started).toFixed(2);
      host.dataset.paintCount = String((Number(host.dataset.paintCount) || 0) + 1);
    }
  }

  function active() {
    const bounds = markWindowBounds(position.value);
    return !disposed && motionAllowed() && inside && onscreen && !document.hidden
      && fields.length > 0 && opacity.value > .01 && bounds.bottom > 0 && bounds.top < 1;
  }

  function syncPlayback() {
    const playing = active();
    host.dataset.playback = playing ? "playing" : "paused";
    if (!playing) {
      clearTimeout(timer);
      timer = undefined;
      lastTick = undefined;
    } else if (timer === undefined) {
      lastTick = performance.now();
      timer = setTimeout(tick, 1000 / FPS);
    }
  }
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
    if (disposed) return;
    if (document.hidden || !onscreen) { hideImmediately(); return; }
    if (inside || opacity.value > 0) queueMotion();
    if (inside && reduced.matches) paint();
    syncPlayback();
  }

  function resize() {
    const bounds = host.getBoundingClientRect();
    const nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
    if (nextWidth <= 0 || nextHeight <= 0 || (width === nextWidth && height === nextHeight)) return;
    width = nextWidth; height = nextHeight;
    host.style.setProperty("--mark-height", `${height}px`);
    host.style.setProperty("--mark-band-height", `${height * WINDOW_SHARE}px`);
    writePose();
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
      const cellSize = 6;
      const columns = Math.ceil(width / cellSize), rows = Math.ceil(height / (cellSize * 1.65));
      const scale = Math.min(1, Math.sqrt(8000 / (columns * rows)));
      sample.width = Math.max(1, Math.floor(columns * scale));
      sample.height = Math.max(1, Math.min(Math.floor(rows * scale), Math.floor(8000 / sample.width)));
      sampleContext.drawImage(source, 0, 0, sample.width, sample.height);
      fields = buildMixedMarkFields(sampleContext.getImageData(0, 0, sample.width, sample.height), { width, height, cellSize });
      host.dataset.state = "ready";
      if (import.meta.env?.DEV) {
        host.dataset.sampleRevision = String((Number(host.dataset.sampleRevision) || 0) + 1);
        host.dataset.cellCount = String(fields.reduce((sum, field) => sum + field.cells.length, 0));
      }
    } catch {
      fields = [];
      host.dataset.state = "original";
    }
    paint();
    refresh();
  }

  // A responsive image may finish selecting a sharper source after a resize.
  function sourceLoaded() { width = 0; resize(); }

  const resizeObserver = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; refresh(); });
  resizeObserver.observe(host);
  intersection.observe(host);
  host.addEventListener("pointerenter", onPointer, { passive: true });
  host.addEventListener("pointermove", onPointer, { passive: true });
  host.addEventListener("pointerleave", onLeave, { passive: true });
  host.addEventListener("pointercancel", onLeave, { passive: true });
  window.addEventListener("blur", onLeave);
  image.addEventListener?.("load", sourceLoaded);
  reduced.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  resize();

  return {
    setAnimating(value) { animate = Boolean(value); refresh(); },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      cancelAnimationFrame(motionFrame);
      resizeObserver.disconnect(); intersection.disconnect();
      host.removeEventListener("pointerenter", onPointer);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("blur", onLeave);
      image.removeEventListener?.("load", sourceLoaded);
      reduced.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    },
  };
}
