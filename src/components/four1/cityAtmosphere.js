// The source artwork stays in the DOM. These coordinates refer to actual
// rooftop flues in the original 1672 x 941 city, so resizing cannot detach steam.
export const CITY_SIZE = { width: 1672, height: 941 };
export const COMPACT_CITY_QUERY = "(max-width: 900px)";
export const ROOFTOP_FLUES = [
  { x: 208, y: 319, rise: 138, drift: 26, period: 31, phase: 0.17 },
  { x: 330, y: 552, rise: 126, drift: 36, period: 27, phase: 0.61 },
  { x: 444, y: 625, rise: 142, drift: 30, period: 34, phase: 0.38 },
  { x: 989, y: 733, rise: 104, drift: 24, period: 29, phase: 0.83 },
  { x: 1595, y: 535, rise: 164, drift: -42, period: 37, phase: 0.29 },
  { x: 1622, y: 535, rise: 148, drift: -34, period: 32, phase: 0.74 },
];

const TAU = Math.PI * 2;
const clamp = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

export function cityPlacement(width, height, compact = false) {
  const scale = compact
    ? width / CITY_SIZE.width
    : Math.max(width / CITY_SIZE.width, height / CITY_SIZE.height);
  return {
    scale,
    x: (width - CITY_SIZE.width * scale) / 2,
    y: height - CITY_SIZE.height * scale,
  };
}

export function steamAt(flue, time, index, count) {
  const age = ((time / flue.period + flue.phase + index / count) % 1 + 1) % 1;
  const sway = Math.sin(age * TAU + flue.phase * TAU);
  return {
    x: flue.x + flue.drift * age ** 1.25 + sway * age * 13,
    y: flue.y - age * flue.rise,
    radius: 8 + age * 32,
    alpha: 0.15 * smoothstep(0, 0.13, age) * (1 - smoothstep(0.45, 1, age)),
  };
}

function createMistSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 96;
  const context = sprite.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(156, 159, 158, 0.9)");
  gradient.addColorStop(0.25, "rgba(143, 147, 146, 0.5)");
  gradient.addColorStop(0.6, "rgba(129, 134, 132, 0.12)");
  gradient.addColorStop(1, "rgba(129, 134, 132, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  return sprite;
}

export function drawCityAtmosphere(context, sprite, time, width, height, dpr, compact) {
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  const placement = cityPlacement(width, height, compact);
  context.translate(placement.x, placement.y);
  context.scale(placement.scale, placement.scale);

  // Broad low haze has its own slow overlapping cycles. It never transforms
  // the city image or the text, and remains beneath the rooftop steam.
  for (let index = 0; index < 4; index++) {
    const phase = time / (30 + index * 3) * TAU + index * 1.9;
    const x = [180, 480, 1210, 1500][index] + Math.sin(phase) * 44;
    const y = [682, 778, 814, 671][index] + Math.cos(phase * 0.7) * 11;
    context.globalAlpha = 0.095 + Math.sin(phase + 0.5) * 0.025;
    context.drawImage(sprite, x - 260, y - 45, 520, 90);
  }

  const count = compact ? 4 : 7;
  for (const flue of ROOFTOP_FLUES) {
    context.save();
    context.beginPath();
    context.rect(flue.x - 200, 0, 400, flue.y + 1);
    context.clip();
    for (let index = 0; index < count; index++) {
      const puff = steamAt(flue, time, index, count);
      context.globalAlpha = puff.alpha;
      context.drawImage(sprite,
        puff.x - puff.radius, puff.y - puff.radius * 1.9,
        puff.radius * 2, puff.radius * 3.1);
    }
    context.restore();
  }
  context.globalAlpha = 1;
}

export function createCityAtmosphere(canvas, scene, { fixedTime = null, panorama = null, drawPanorama = null } = {}) {
  let context;
  try { context = canvas.getContext("2d", { alpha: true }); }
  catch { /* The unchanged city image is the static fallback. */ }
  if (!context) {
    canvas.dataset.motion = "unavailable";
    return { setPaused() {}, dispose() {} };
  }
  const sprite = createMistSprite();
  if (!sprite) {
    canvas.dataset.motion = "unavailable";
    return { setPaused() {}, dispose() {} };
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia(COMPACT_CITY_QUERY);
  const forcedColors = window.matchMedia("(forced-colors: active)");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let elapsed = 0;
  let previous = null;
  let lastPaint = 0;
  let frame = 0;
  let inView = false;
  let paused = false;
  let disposed = false;

  function state() {
    if (forcedColors.matches) return "static";
    if (reduced.matches) return "reduced";
    if (fixedTime !== null) return "review";
    if (document.visibilityState !== "visible") return "hidden";
    if (!inView) return "offscreen";
    return paused ? "paused" : "running";
  }

  function paint() {
    if (panorama && drawPanorama) {
      drawPanorama(context, panorama, sprite, fixedTime ?? elapsed, width, height, dpr, compact.matches, reduced.matches);
    } else {
      drawCityAtmosphere(context, sprite, (fixedTime ?? elapsed) + 7, width, height, dpr, compact.matches);
    }
  }

  function tick(now) {
    if (disposed || state() !== "running") return;
    if (previous !== null) elapsed += Math.min(100, now - previous) / 1000;
    previous = now;
    if (now - lastPaint >= (compact.matches ? 1000 / 18 : 1000 / 24)) {
      paint();
      lastPaint = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    const motionState = state();
    canvas.dataset.motion = motionState;
    if (motionState === "running") frame = requestAnimationFrame(tick);
    else if (motionState === "reduced" || motionState === "review") paint();
  }

  function resize() {
    if (disposed) return;
    const rect = scene.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    // Compact rendering uses 18 fps and one physical pixel per CSS pixel;
    // desktop is capped at 1.5 DPR and 24 fps. The travelling renderer also
    // culls hidden neighbours and caps steam at 40 / 64 samples respectively.
    dpr = Math.min(window.devicePixelRatio || 1, compact.matches ? 1 : 1.5);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    paint();
    sync();
  }

  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  const size = new ResizeObserver(resize);
  const onPreferenceChange = () => resize();
  reduced.addEventListener("change", onPreferenceChange);
  compact.addEventListener("change", onPreferenceChange);
  forcedColors.addEventListener("change", onPreferenceChange);
  document.addEventListener("visibilitychange", sync);
  visibility.observe(scene);
  size.observe(scene);
  resize();

  return {
    setPaused(value) { paused = value; sync(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      size.disconnect();
      reduced.removeEventListener("change", onPreferenceChange);
      compact.removeEventListener("change", onPreferenceChange);
      forcedColors.removeEventListener("change", onPreferenceChange);
      document.removeEventListener("visibilitychange", sync);
    },
  };
}
