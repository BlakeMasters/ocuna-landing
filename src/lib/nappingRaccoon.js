import { NAP_CONTOURS } from "./nappingRaccoonArt.js";

const clamp = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { const n = clamp(t); return n * n * (3 - 2 * n); };
const fade = (start, end, value) => smooth((value - start) / (end - start));
const cycle = (time, duration) => ((time % duration) + duration) % duration;
export const NAP_BREATH_MS = 5800;

// One continuous outline keeps the neck and striped tail connected. Each
// vertex participates in the breath, with the lower contour anchored.
const rig = NAP_CONTOURS.map((contour) => contour.map(([x, y]) => ({
  x, y,
  body: 1 - fade(1100, 1440, x),
  lift: clamp((808 - y) / 772),
  head: fade(1100, 1440, x) * (1 - fade(610, 780, y)),
  tail: (1 - fade(900, 1110, x)) * fade(370, 570, y) * clamp((808 - y) / 350),
  ear: Math.exp(-(((x - 1430) / 145) ** 2 + ((y - 195) / 125) ** 2)) * (1 - fade(265, 375, y)),
})));

function breathing(elapsed) {
  const time = cycle(elapsed, NAP_BREATH_MS);
  if (time < 2400) return smooth(time / 2400);
  if (time < 5200) return 1 - smooth((time - 2400) / 2800);
  return 0;
}

export function nappingFrame(elapsed) {
  const twitch = (cycle(elapsed, 14400) - 9100) / 850;
  const ear = twitch > 0 && twitch < 1 ? Math.sin(twitch * Math.PI * 2) * Math.sin(twitch * Math.PI) ** 2 : 0;
  return { breath: breathing(elapsed), head: breathing(elapsed - 180), tail: breathing(elapsed - 320), ear };
}

export function nappingPath(frame) {
  const headAngle = -0.043 * frame.head, tailAngle = 0.012 * frame.tail;
  const hc = Math.cos(headAngle) - 1, hs = Math.sin(headAngle);
  const tc = Math.cos(tailAngle) - 1, ts = Math.sin(tailAngle);
  return rig.map((contour) => contour.map((p, index) => {
    let x = p.x + (p.x - 740) * 0.020 * p.body * p.lift * frame.breath;
    let y = p.y - 18 * p.body * p.lift * frame.breath;
    x += (hc * (p.x - 1500) - hs * (p.y - 760) - 12 * frame.head) * p.head;
    y += (hs * (p.x - 1500) + hc * (p.y - 760) - 4 * frame.head) * p.head;
    x += (tc * (p.x - 900) - ts * (p.y - 823) + 8 * frame.tail) * p.tail;
    y += (ts * (p.x - 900) + tc * (p.y - 823)) * p.tail;
    x += 9 * frame.ear * p.ear;
    y += 3 * frame.ear * p.ear;
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join("") + "Z").join("");
}

export const NAP_REST_PATH = nappingPath(nappingFrame(0));

export function mountNappingRaccoon(host, initiallyPaused = false) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = initiallyPaused, inView = false, disposed = false;
  let request = 0, previous = null, elapsed = 0;
  const outline = host.querySelector("[data-nap-outline]");

  function draw(time) {
    outline.setAttribute("d", nappingPath(nappingFrame(time)));
    host.dataset.time = time.toFixed(0);
  }
  function tick(now) {
    request = 0;
    if (disposed || host.dataset.running !== "true") return;
    if (previous !== null) elapsed += Math.min(100, Math.max(0, now - previous));
    previous = now;
    draw(elapsed);
    request = win.requestAnimationFrame(tick);
  }

  function sync() {
    if (disposed) return;
    const running = !paused && inView && !doc.hidden && !reduced.matches;
    host.dataset.running = String(running);
    previous = null;
    if (!running) { win.cancelAnimationFrame(request); request = 0; }
    if (reduced.matches) { elapsed = 0; draw(0); }
    if (running && !request) request = win.requestAnimationFrame(tick);
  }
  const observer = new win.IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  observer.observe(host);
  reduced.addEventListener("change", sync);
  doc.addEventListener("visibilitychange", sync);
  draw(0);
  sync();

  return {
    setPaused(value) { paused = value; sync(); },
    dispose() {
      disposed = true;
      host.dataset.running = "false";
      win.cancelAnimationFrame(request);
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      doc.removeEventListener("visibilitychange", sync);
    },
  };
}
