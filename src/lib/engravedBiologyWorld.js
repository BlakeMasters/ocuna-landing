import { sceneStart } from "./engravedTimeline.js";

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const hash = n => { const a = Math.sin(n * 127.1 + 81.7) * 43758.5453; return a - Math.floor(a); };

// Organic contours and flexible fibrils give the binding scene a surrounding
// medium. They use the same scene clock and whole-composition particle plate.
function ink(context, opacity, camera) {
  const levels = [.10, .16, .23, .31, .41, .52];
  const paths = levels.map(() => context.createInkPath?.() ?? new Path2D());
  function line(a, b, strength = .23) {
    const y = (a[1] + b[1]) / 2;
    const fade = clamp((y - camera.top) / 75) * clamp((camera.bottom - y) / 65);
    const alpha = strength * fade;
    if (alpha < .045) return;
    const bucket = Math.min(levels.length - 1, Math.max(0, Math.round((alpha - .1) / .08)));
    paths[bucket].moveTo(a[0], a[1]); paths[bucket].lineTo(b[0], b[1]);
  }
  function curve(fn, steps = 120, strength = .23, broken = false) {
    let before = fn(0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, after = fn(t);
      if (!broken || hash(i * 17 + steps) > .08) line(before, after, typeof strength === "function" ? strength(t) : strength);
      before = after;
    }
  }
  return { line, curve, finish() {
    context.strokeStyle = "#494949"; context.lineCap = "round"; context.lineJoin = "round";
    paths.forEach((path, i) => { context.lineWidth = i > 3 ? 1.45 : 1.35; context.globalAlpha = opacity * levels[i]; context.stroke(path); });
  } };
}

export function membranePoint(x, layer, seconds, camera) {
  const span = camera.right - camera.left;
  const relative = (x - 700) / span;
  const breathing = Math.sin(x * .003 - seconds * .29) * 19 + Math.sin(x * .008 + seconds * .43) * 6;
  const basin = Math.exp(-(((x - 700) / 610) ** 2)) * 90;
  const bank = Math.sin(relative * Math.PI * 1.7 - .4) * 52;
  return [x, 688 + basin + bank + breathing + layer * (17 + Math.sin(x * .004 + seconds * .2) * 2)];
}

function membrane(p, time, camera) {
  const left = camera.left - 45, right = camera.right + 45, span = right - left;
  const steps = Math.max(110, Math.ceil(span / 13));
  for (const layer of [-1, -.7, .7, 1]) p.curve(t => membranePoint(mix(left, right, t), layer, time, camera), steps, Math.abs(layer) === 1 ? .25 : .12, true);
  // Paired lipid heads follow the moving sheet, with short tails meeting inside.
  const count = Math.ceil(span / 32);
  for (let i = 0; i <= count; i++) {
    const x = mix(left, right, i / count);
    const before = membranePoint(x - 1, 0, time, camera), after = membranePoint(x + 1, 0, time, camera);
    const slope = (after[1] - before[1]) / 2;
    const normal = [-slope, 1], length = Math.hypot(...normal);
    normal[0] /= length; normal[1] /= length;
    for (const side of [-1, 1]) {
      const at = membranePoint(x, side, time, camera), r = 3.2 + hash(i * 13) * 1.4;
      p.curve(t => [at[0] + Math.cos(t * TAU) * r, at[1] + Math.sin(t * TAU) * r * .72], 10, .23);
      for (const offset of [-1.7, 1.7]) p.curve(t => [at[0] + offset - normal[0] * side * t * 14 + Math.sin(t * 5 + i) * 1.3,
        at[1] - normal[1] * side * (4 + t * 10)], 8, .16);
    }
  }
  // Distant lamellae bend around the main protein, without a rectangular frame.
  for (const side of [-1, 1]) for (let fold = 0; fold < 5; fold++) p.curve(t => {
    const x = mix(left, right, t);
    return [x, side < 0 ? 45 + fold * 8 + Math.sin(t * 8 + time * .13) * 34
      : 865 + fold * 8 + Math.sin(t * 10 - time * .16) * 27];
  }, steps, fold === 0 ? .16 : .10, true);
}

export function fibrilPoint(u, across, id, seconds, camera) {
  const span = camera.right - camera.left, scale = span < 2200 ? .72 : 1;
  const phase = seconds * .46 + id * 1.3;
  const anchors = [[camera.left - span * .05, camera.left + span * .40],
    [camera.left + span * .05, camera.left + span * .30],
    [camera.right + span * .08, camera.right - span * .42],
    [camera.right - span * .06, camera.right - span * .32]];
  const root = membranePoint(anchors[id][0], -1, seconds, camera);
  const end = membranePoint(anchors[id][1], -1, seconds, camera);
  const center = t => {
    const envelope = Math.sin(t * Math.PI), twist = t * TAU * (id % 2 ? 1.8 : 2.5) - phase;
    return [mix(root[0], end[0], t) + Math.cos(twist) * envelope * 22 * scale,
      mix(root[1], end[1], t) - envelope * [184, 108, 215, 143][id] * scale
        + Math.sin(twist) * envelope * (id % 2 ? 28 : 44) * scale,
      Math.cos(twist) * envelope * 40];
  };
  const at = center(u), before = center(Math.max(0, u - .001)), after = center(Math.min(1, u + .001));
  const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
  const width = (id % 2 ? 8 : 13) * scale * across * Math.sin(u * Math.PI) ** .45;
  return [at[0] - dy / length * width, at[1] + dx / length * width, at[2]];
}

function fibrils(p, time, camera) {
  for (let id = 0; id < 4; id++) {
    for (const across of [-1, -.36, .36, 1]) p.curve(u => fibrilPoint(u, across, id, time, camera), 140,
      u => .20 + (fibrilPoint(u, 0, id, time, camera)[2] + 40) / 80 * (Math.abs(across) === 1 ? .15 : .03));
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      p.line(fibrilPoint(u, -1, id, time, camera), fibrilPoint(u, 1, id, time, camera), .13);
    }
    // A few attached domains travel with the folding scaffold, never loose dots.
    for (let node = 0; node < 3; node++) {
      const u = .19 + node * .29, at = fibrilPoint(u, 0, id, time, camera);
      const radius = 12 + hash(id * 19 + node) * 10;
      for (let cut = 0; cut < 5; cut++) {
        const y = (cut - 2) / 2 * radius * .78, width = Math.sqrt(Math.max(0, radius * radius - y * y));
        p.curve(t => [at[0] + (t * 2 - 1) * width, at[1] + y + Math.sin(t * Math.PI) * 3], 15, .18, cut % 2 === 0);
      }
    }
  }
}

export function vesicleState(id, seconds, camera) {
  const at = fibrilPoint(id % 2 ? .62 : .30, 0, id, seconds, camera);
  return {
    x: at[0], y: at[1],
    radius: [94, 57, 118, 76][id], rotation: seconds * .06 + id * .7,
  };
}

function vesicles(p, time, camera) {
  for (let id = 0; id < 4; id++) {
    const state = vesicleState(id, time, camera);
    const point = (a, level = 1) => {
      const lobe = 1 + Math.sin(a * 3 + time * .2 + id) * .10 + Math.sin(a * 5 - time * .13) * .035;
      return [state.x + Math.cos(a + state.rotation) * state.radius * 1.18 * lobe * level,
        state.y + Math.sin(a + state.rotation) * state.radius * .40 * lobe * level];
    };
    for (const level of [.88, .94, 1]) p.curve(t => point(t * TAU, level), 90, level === 1 ? .31 : .16, true);
    for (let cut = 0; cut < 12; cut++) {
      const y = -1 + (cut + .5) / 6, length = Math.sqrt(Math.max(0, 1 - y * y));
      p.curve(t => [state.x + (t * 2 - 1) * state.radius * length * .88,
        state.y + y * state.radius * .34 + Math.sin(t * Math.PI) * 4], 30, .11, true);
    }
    // Short radial cuts establish membrane thickness rather than flat circles.
    for (let i = 0; i < 25; i++) { const a = i / 25 * TAU; p.line(point(a, .9), point(a, 1), .18); }
  }
}

export function drawEngravedBiologyWorld(context, seconds, camera, opacity = 1) {
  if (opacity <= 0) return;
  const time = seconds - sceneStart(7);
  context.save();
  const p = ink(context, clamp(opacity), camera);
  membrane(p, time, camera); fibrils(p, time, camera); vesicles(p, time, camera);
  p.finish(); context.restore();
}
