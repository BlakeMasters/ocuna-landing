import { raccoonContours } from "./lectpy-raccoon/raccoon_walk.js";

export const BRAND_STRIDE_MS = 800;
// The tail completes one sway over two strides.
export const BRAND_WALK_LOOP_MS = BRAND_STRIDE_MS * 2;
export const BRAND_WALK_VIEWBOX = "-50 -20 960 440";
const smooth = (t) => t * t * (3 - 2 * t);

export function brandWalkPose(elapsed, strength = 1) {
  const time = ((elapsed % BRAND_WALK_LOOP_MS) + BRAND_WALK_LOOP_MS) % BRAND_WALK_LOOP_MS;
  const phase = time / BRAND_STRIDE_MS * Math.PI * 2;
  const walk = Math.max(0, Math.min(1, strength));
  return {
    t: time / 1000, phase, walk, profile: "startle-sniff",
    bob: -1.5 * Math.cos(phase * 2) * walk,
    pitch: 0, down: 0, startle: 0, turn: 0, back: 0, blink: 0,
  };
}

function curve(points) {
  const f = (n) => n.toFixed(2);
  const middle = (a, b) => `${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2)}`;
  return `M${middle(points.at(-1), points[0])}` + points.map((point, i) =>
    `Q${f(point[0])} ${f(point[1])} ${middle(point, points[(i + 1) % points.length])}`).join("") + "Z";
}

export function brandWalkFrame(elapsed, strength = 1) {
  const pose = brandWalkPose(elapsed, strength);
  const contours = raccoonContours(pose).map(curve);
  return { time: pose.t * 1000, paths: [contours[0], contours.slice(1).join("")] };
}

export function createBrandWalkPlayback(win, onFrame) {
  let elapsed = 0, previous = null, request = 0, running = false, disposed = false;
  function tick(now) {
    request = 0;
    if (!running || disposed) return;
    if (previous !== null) elapsed += Math.min(50, Math.max(0, now - previous));
    previous = now;
    onFrame(brandWalkFrame(elapsed, smooth(Math.min(1, elapsed / 140))));
    request = win.requestAnimationFrame(tick);
  }
  return {
    setRunning(next) {
      if (disposed || running === next) return;
      running = next;
      elapsed = 0;
      previous = null;
      win.cancelAnimationFrame(request);
      request = 0;
      onFrame(brandWalkFrame(0, 0));
      if (running) request = win.requestAnimationFrame(tick);
    },
    dispose() { disposed = true; win.cancelAnimationFrame(request); request = 0; },
  };
}
