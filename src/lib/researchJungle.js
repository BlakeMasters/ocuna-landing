const PAPER = "244, 238, 223";
const GROWTH_END = 14;
const progress = (time, start, duration) => Math.max(0, Math.min(1, (time - start) / duration));
const unfurl = (time, start, duration = 1.4) => {
  const t = progress(time, start, duration);
  return t * t * (3 - 2 * t);
};

function leaf(context, x, y, length, width, angle, color, split = false, opened = 1) {
  if (opened <= 0) return;
  context.save();
  context.translate(x, y);
  context.rotate(angle + (1 - opened) * 0.35);
  context.scale(opened * opened, opened);
  context.fillStyle = color;
  context.strokeStyle = "#4e714b";
  context.lineWidth = 0.65;
  context.beginPath();
  context.moveTo(0, 0);
  if (split) {
    context.bezierCurveTo(-width * 0.48, -length * 0.05, -width * 0.67, -length * 0.35, -width * 0.43, -length * 0.64);
    context.lineTo(-width * 0.11, -length * 0.42);
    context.quadraticCurveTo(-width * 0.44, -length * 0.77, -width * 0.24, -length * 0.88);
    context.lineTo(-width * 0.04, -length * 0.67);
    context.quadraticCurveTo(-width * 0.12, -length * 0.98, 0, -length);
    context.quadraticCurveTo(width * 0.32, -length * 0.83, width * 0.4, -length * 0.65);
    context.lineTo(width * 0.12, -length * 0.43);
    context.quadraticCurveTo(width * 0.67, -length * 0.56, width * 0.48, -length * 0.23);
    context.quadraticCurveTo(width * 0.38, -length * 0.02, 0, 0);
  } else {
    context.bezierCurveTo(-width * 0.6, -length * 0.18, -width * 0.55, -length * 0.74, 0, -length);
    context.bezierCurveTo(width * 0.56, -length * 0.76, width * 0.5, -length * 0.16, 0, 0);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(-width * 0.06, -length * 0.55, 0, -length * 0.94);
  for (let index = 1; index <= 5; index++) {
    const t = index / 7;
    const span = Math.sin(t * Math.PI) * width * 0.32;
    context.moveTo(0, -length * t);
    context.quadraticCurveTo(-span * 0.6, -length * t - length * 0.07, -span, -length * t - length * 0.12);
    context.moveTo(0, -length * t);
    context.quadraticCurveTo(span * 0.6, -length * t - length * 0.06, span, -length * t - length * 0.11);
  }
  context.strokeStyle = "#3c6547";
  context.lineWidth = 0.55;
  context.stroke();
  context.restore();
}

// Trace the existing curve from its root, keeping every leaf's attachment fixed.
function traceQuadratic(context, x, y, cx, cy, endX, endY, grown) {
  if (grown <= 0) return;
  context.beginPath();
  context.moveTo(x, y);
  const u = 1 - grown;
  context.quadraticCurveTo(
    x + (cx - x) * grown, y + (cy - y) * grown,
    u * u * x + 2 * u * grown * cx + grown * grown * endX,
    u * u * y + 2 * u * grown * cy + grown * grown * endY,
  );
  context.stroke();
}

function frond(context, x, y, length, angle, time, phase, compact, color, start) {
  const duration = 2.6;
  const grown = progress(time, start, duration);
  if (grown <= 0) return;
  context.save();
  context.translate(x, y);
  context.rotate(angle + Math.sin(time * 0.43 + phase) * 0.026);
  context.strokeStyle = "#5b794a";
  context.lineWidth = 1.25;
  traceQuadratic(context, 0, 0, length * 0.2, -length * 0.58, length * 0.34, -length, grown);
  const pairs = compact ? 11 : 16;
  for (let index = 0; index < pairs; index++) {
    const t = (index + 1) / (pairs + 1);
    if (t > grown) break;
    const opened = unfurl(time, start + t * duration + 0.1);
    const lx = length * (0.4 * t - 0.06 * t * t);
    const ly = -length * (1.16 * t - 0.16 * t * t);
    const size = length * (0.11 + Math.sin(t * Math.PI) * 0.16) * (1 - t * 0.36);
    leaf(context, lx, ly, size, size * 0.18, -1.04 - t * 0.24, color, false, opened);
    leaf(context, lx, ly, size * 0.92, size * 0.16, 1.12 + t * 0.15, color, false, unfurl(time, start + t * duration + 0.25));
  }
  context.restore();
}

function palm(context, baseX, baseY, crownX, crownY, radius, time, compact, start) {
  const grown = progress(time, start, 2.2);
  if (grown <= 0) return;
  context.save();
  context.strokeStyle = "#a2946d";
  context.lineWidth = 9;
  context.lineCap = "round";
  const cx = baseX + (crownX - baseX) * 0.16;
  const cy = baseY - (baseY - crownY) * 0.56;
  traceQuadratic(context, baseX, baseY, cx, cy, crownX, crownY, grown);
  context.strokeStyle = "#63734a";
  context.lineWidth = 1;
  traceQuadratic(context, baseX, baseY, cx, cy, crownX, crownY, grown);
  for (let index = 0; index < 7; index++) {
    frond(context, crownX, crownY, radius * (0.76 + (index % 3) * 0.13), -1.52 + index * 0.53, time, index * 1.7, compact, index % 2 ? "#8da35d" : "#4f805b", start + 2.2 + index * 0.1);
  }
  context.restore();
}

function broadLeaves(context, baseX, baseY, spread, time, phase, start) {
  for (let index = 0; index < 7; index++) {
    const angle = -1.05 + index * 0.33;
    const stemStart = start + index * 0.14;
    const grown = progress(time, stemStart, 1.6);
    if (grown <= 0) continue;
    const reach = spread * (0.52 + (index % 3) * 0.18);
    const tipX = baseX + Math.sin(angle) * reach;
    const tipY = baseY - Math.cos(angle) * reach;
    context.strokeStyle = "#637c48";
    context.lineWidth = 1.5;
    traceQuadratic(context, baseX, baseY, baseX + (tipX - baseX) * 0.3, tipY + reach * 0.3, tipX, tipY, grown);
    leaf(context, tipX, tipY, reach * 0.58, reach * (index % 2 ? 0.42 : 0.34), angle + Math.sin(time * 0.36 + index + phase) * 0.04, index % 2 ? "#92ab61" : "#487c57", index % 3 === 0, unfurl(time, stemStart + 1.6, 1.8));
  }
}

function makePath(root, curves) {
  const points = [{ x: root[0], y: root[1], distance: 0 }];
  let origin = root;
  for (const curve of curves) {
    for (let step = 1; step <= 32; step++) {
      const t = step / 32, u = 1 - t;
      const x = u ** 3 * origin[0] + 3 * u * u * t * curve[0] + 3 * u * t * t * curve[2] + t ** 3 * curve[4];
      const y = u ** 3 * origin[1] + 3 * u * u * t * curve[1] + 3 * u * t * t * curve[3] + t ** 3 * curve[5];
      const previous = points[points.length - 1];
      points.push({ x, y, distance: previous.distance + Math.hypot(x - previous.x, y - previous.y) });
    }
    origin = curve.slice(4);
  }
  return { points, length: points[points.length - 1].distance };
}

function pointAt(path, position) {
  const distance = Math.max(0, Math.min(1, position)) * path.length;
  let low = 1, high = path.points.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (path.points[middle].distance < distance) low = middle + 1;
    else high = middle;
  }
  const a = path.points[low - 1], b = path.points[low];
  const t = (distance - a.distance) / (b.distance - a.distance || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

function tracePath(context, path, grown) {
  const distance = path.length * grown;
  context.beginPath();
  context.moveTo(path.points[0].x, path.points[0].y);
  for (let index = 1; index < path.points.length && path.points[index].distance < distance; index++) {
    context.lineTo(path.points[index].x, path.points[index].y);
  }
  const tip = pointAt(path, grown);
  context.lineTo(tip.x, tip.y);
  context.stroke();
}

function createVines(width, height, scale, compact) {
  const vines = [];
  const add = (root, curves, start, duration, phase, small = false) => {
    const path = makePath(root, curves);
    const count = Math.max(5, Math.min(compact ? 21 : 27, Math.floor(path.length / (small ? 32 : 42) / scale)));
    const leaves = Array.from({ length: count }, (_, index) => {
      const position = (index + 0.8) / (count + 0.9);
      return { ...pointAt(path, position), position, size: (small ? 27 : 39) * scale * (0.85 + index % 3 * 0.18) };
    });
    const vine = { path, leaves, start, duration, phase, small };
    vines.push(vine);
    return vine;
  };
  for (let side = 0; side < 2; side++) {
    const x = (value) => side ? width - value * scale : value * scale;
    const main = add([x(-12), -24], [
      [x(70), height * 0.06, x(-16), height * 0.18, x(42), height * 0.28],
      [x(146), height * 0.38, x(-65), height * 0.44, x(30), height * 0.57],
      [x(132), height * 0.67, x(-12), height * 0.74, x(102), height * 0.88],
    ], side * 0.35, 6.8 + side * 0.3, side * 2);
    for (let index = 0; index < 5; index++) {
      const position = 0.13 + index * 0.16;
      const root = pointAt(main.path, position);
      const inward = side ? -1 : 1;
      const reach = (110 + index % 3 * 40) * scale;
      const rise = (index % 2 ? 75 : -95) * scale;
      add([root.x, root.y], [
        [root.x + inward * reach * 0.32, root.y + rise * 0.6,
          root.x + inward * reach * 0.8, root.y + rise * 1.3,
          root.x + inward * reach, root.y + rise * 0.6],
        [root.x + inward * reach * 1.25, root.y + rise * 0.15,
          root.x + inward * reach * 0.94, root.y - rise * 0.38,
          root.x + inward * reach * 0.8, root.y - rise * 0.2],
      ], main.start + position * main.duration + 0.15, 2.1 + index % 2 * 0.4, index + side * 3, true);
    }
    add([x(-18), height + 12], [
      [x(62), height - 160 * scale, x(158), height + 10, x(240), height - 110 * scale],
      [x(335), height - 235 * scale, width * (side ? 0.63 : 0.37), height - 140 * scale,
        width * (side ? 0.56 : 0.44), height - 195 * scale],
    ], 1.3 + side * 0.45, 5.6, 5 + side);
  }
  // An airy trailing branch spreads across the upper-right canopy.
  add([width + 16, 14], [
    [width - 110 * scale, -25, width - 125 * scale, 125 * scale, width - 244 * scale, 78 * scale],
    [width - 355 * scale, 28 * scale, width - 380 * scale, 128 * scale, width - 437 * scale, 94 * scale],
  ], 0.15, 5.2, 8, true);
  return vines;
}

function vine(context, plant, time, scale) {
  const grown = progress(time, plant.start, plant.duration);
  if (grown <= 0) return;
  context.strokeStyle = plant.small ? "#77914c" : "#567745";
  context.lineWidth = plant.small ? 1 : 1.8;
  context.lineCap = "round";
  tracePath(context, plant.path, grown);
  for (let index = 0; index < plant.leaves.length; index++) {
    const node = plant.leaves[index];
    if (node.position > grown) break;
    const opened = unfurl(time, plant.start + node.position * plant.duration + 0.18);
    const sway = Math.sin(time * 0.48 + index * 1.4 + plant.phase) * 0.035;
    const angle = node.angle + Math.PI / 2 + (index % 2 ? 1 : -1) * 0.95 + sway;
    leaf(context, node.x, node.y, node.size, node.size * 0.68, angle, index % 2 ? "#8ca45e" : "#638c53", false, opened);
  }
  // Fine curled tendrils follow the tip instead of appearing ahead of the stem.
  const curled = progress(time, plant.start + plant.duration, 1.1);
  if (curled <= 0) return;
  const tip = pointAt(plant.path, 1);
  context.save();
  context.translate(tip.x, tip.y);
  context.rotate(tip.angle + Math.PI / 2 + Math.sin(time * 0.4 + plant.phase) * 0.025);
  context.lineWidth = 0.85;
  context.beginPath();
  context.moveTo(0, 0);
  for (let index = 1; index <= Math.ceil(curled * 36); index++) {
    const t = Math.min(curled, index / 36), angle = 1.1 - t * Math.PI * 2.1;
    const radius = 14 * scale * (1 - t * 0.76);
    context.lineTo(Math.cos(angle) * radius - Math.cos(1.1) * 14 * scale,
      Math.sin(angle) * radius - Math.sin(1.1) * 14 * scale - t * 16 * scale);
  }
  context.stroke();
  context.restore();
}

export function drawResearchJungle(context, width, height, time, compact = false, vines) {
  context.clearRect(0, 0, width, height);
  const scale = compact ? 0.56 : Math.min(1.15, width / 1200);
  const floor = height + 28;
  context.save();
  context.globalAlpha = 0.3;
  palm(context, -42 * scale, floor, -28 * scale, compact ? 350 : 450, 270 * scale, time, compact, 0.25);
  palm(context, width + 30 * scale, floor, width * 0.94, 105, 330 * scale, time, compact, 0.05);
  context.globalAlpha = 0.52;
  for (const plant of vines ?? createVines(width, height, scale, compact)) vine(context, plant, time, scale);
  context.globalAlpha = 0.5;
  broadLeaves(context, -30 * scale, height * 0.79, 330 * scale, time, 0, 1.8);
  broadLeaves(context, width + 12 * scale, height * 0.7, 380 * scale, time, 2, 2.3);
  context.globalAlpha = 0.58;
  broadLeaves(context, width * 0.94, floor, 300 * scale, time, 4, 2.7);
  for (let side = 0; side < 2; side++) {
    const x = side ? width * 0.98 : width * 0.015;
    for (let index = 0; index < 6; index++) {
      frond(context, x, floor, (230 + index % 3 * 38) * scale, (side ? -1 : 1) * (-1.12 + index * 0.36), time, index + side * 2, compact, index % 2 ? "#3f7655" : "#7f9d54", 2.9 + index * 0.12 + side * 0.2);
    }
  }

  // A paper wash keeps the reading column quiet and leaves color at the edges.
  context.save();
  const verticalScale = Math.max(1, height / width * 0.95);
  context.translate(width / 2, height * 0.54);
  context.scale(1, verticalScale);
  const wash = context.createRadialGradient(0, 0, 0, 0, 0, width * 0.64);
  wash.addColorStop(0, `rgba(${PAPER}, 0.99)`);
  wash.addColorStop(0.55, `rgba(${PAPER}, 0.95)`);
  wash.addColorStop(1, `rgba(${PAPER}, 0)`);
  context.globalAlpha = 1;
  context.fillStyle = wash;
  context.fillRect(-width / 2, -height * 0.54 / verticalScale, width, height / verticalScale);
  context.restore();
  context.restore();
}

export function createResearchJungle(canvas, scene) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return { setPaused() {}, dispose() {} };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 700px)");
  const forced = window.matchMedia("(forced-colors: active)");
  let width = 0, height = 0, dpr = 1, elapsed = 0;
  let vines = [];
  let previous = null, lastPaint = 0, frame = 0;
  let paused = false, inView = false, disposed = false;

  function state() {
    if (reduced.matches || forced.matches) return "reduced";
    if (document.hidden) return "hidden";
    if (!inView) return "offscreen";
    return paused ? "paused" : "running";
  }

  function paint() {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawResearchJungle(context, width, height, reduced.matches || forced.matches ? GROWTH_END : elapsed, compact.matches, vines);
    canvas.dataset.growth = progress(elapsed, 0, GROWTH_END).toFixed(3);
  }

  function tick(timestamp) {
    if (disposed || state() !== "running") return;
    if (previous !== null) elapsed += Math.min(100, timestamp - previous) / 1000;
    previous = timestamp;
    if (timestamp - lastPaint >= 1000 / (compact.matches ? 18 : 24)) {
      paint();
      lastPaint = timestamp;
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    previous = null;
    canvas.dataset.motion = state();
    if (state() === "running") frame = requestAnimationFrame(tick);
    else if (state() === "reduced") paint();
  }

  function resize() {
    if (disposed) return;
    const rect = scene.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    // A static-motion preference shows the mature scene without replaying growth.
    if (reduced.matches || forced.matches) elapsed = Math.max(elapsed, GROWTH_END);
    const scale = compact.matches ? 0.56 : Math.min(1.15, width / 1200);
    vines = createVines(width, height, scale, compact.matches);
    dpr = Math.min(window.devicePixelRatio || 1, compact.matches ? 1 : 1.25);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    paint();
    sync();
  }

  const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
  const size = new ResizeObserver(resize);
  visibility.observe(scene);
  size.observe(scene);
  for (const query of [reduced, compact, forced]) query.addEventListener("change", resize);
  document.addEventListener("visibilitychange", sync);
  resize();

  return {
    setPaused(value) { paused = value; sync(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      size.disconnect();
      for (const query of [reduced, compact, forced]) query.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", sync);
    },
  };
}
