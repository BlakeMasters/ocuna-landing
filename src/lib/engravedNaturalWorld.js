import { DURATION, sceneStart } from "./engravedTimeline.js";

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const hash = n => { const x = Math.sin(n * 127.13 + 41.73) * 43758.5453; return x - Math.floor(x); };

// The scenery shares one camera and clock with its subject. These open paths
// describe places, rather than mounting a second illustration beside the first.
function pen(context, opacity, camera) {
  const levels = [.075, .11, .15, .20, .26, .34, .43, .54];
  const paths = levels.map(() => context.createInkPath?.() ?? new Path2D());
  function line(x1, y1, x2, y2, alpha = .20) {
    const y = (y1 + y2) / 2;
    const edge = clamp((y - camera.top) / 50) * clamp((camera.bottom - y) / 40);
    const ink = alpha * edge;
    if (ink < .035) return;
    const bucket = levels.reduce((best, level, i) => Math.abs(level - ink) < Math.abs(levels[best] - ink) ? i : best, 0);
    paths[bucket].moveTo(x1, y1); paths[bucket].lineTo(x2, y2);
  }
  function curve(fn, steps, alpha = .20, gaps = 0) {
    let a = fn(0);
    for (let i = 1; i <= steps; i++) {
      const b = fn(i / steps);
      if (!gaps || hash(i * 13.1 + gaps) > .12) line(...a, ...b, typeof alpha === "function" ? alpha(i / steps) : alpha);
      a = b;
    }
  }
  function ellipse(x, y, rx, ry, alpha = .20, from = 0, to = TAU) {
    curve(t => { const a = mix(from, to, t); return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; }, Math.max(24, Math.ceil(Math.abs(to - from) * rx / 8)), alpha);
  }
  return { line, curve, ellipse, finish() {
    context.strokeStyle = "#454545"; context.lineCap = "round"; context.lineJoin = "round";
    for (let i = 0; i < paths.length; i++) { context.globalAlpha = opacity * levels[i]; context.lineWidth = i < 3 ? 1.65 : 1.45; context.stroke(paths[i]); }
  } };
}

function mountainShoulders(p, camera, seed, horizon, height) {
  for (const side of [-1, 1]) {
    const outer = side < 0 ? camera.left - 30 : camera.right + 30, inner = 700 + side * 415;
    const profile = t => {
      const x = mix(inner, outer, t), lift = Math.sin(t * Math.PI / 2) ** .72;
      return [x, horizon - lift * height * (.83 + Math.sin(t * 6.2 + seed + side) * .14 + Math.sin(t * 19 + seed) * .035)];
    };
    for (let row = 0; row < 17; row++) p.curve(t => {
      const top = profile(t), d = row / 17;
      return [top[0], mix(top[1], horizon + 12, d) + Math.sin(t * 24 + row * .5) * d * 3];
    }, Math.max(45, Math.ceil(Math.abs(outer - inner) / 15)), .12 + row % 4 * .012, row + seed * 9);
    for (let seam = 0; seam < 35; seam++) {
      const t = .12 + hash(seam + side * 97) * .87, top = profile(t);
      const d = .14 + hash(seam * 23 + seed) * .60;
      const y = mix(top[1], horizon, d), size = 6 + hash(seam * 31) * 24;
      p.line(top[0], y, top[0] + side * size * .34, y + size, .12);
    }
  }
}

function cloudBank(p, camera, seconds, scene) {
  // A long, slowly shearing cloud bank has different speeds at its lower edge.
  // The Moon phase is periodic at the film seam, including its water below.
  const phase = scene === 0 ? seconds / DURATION * TAU : seconds * .095;
  for (const side of [-1, 1]) {
    const near = 700 + side * (scene === 2 ? 465 : 420), far = side < 0 ? camera.left - 100 : camera.right + 100;
    for (let band = 0; band < 6; band++) {
      const shift = Math.sin(phase * (scene === 0 ? 3 : 1) + side * 1.2 + band * .10) * 65;
      p.curve(t => {
        const x = mix(near, far, t) + shift * Math.sin(t * Math.PI);
        return [x, (scene === 2 ? 365 : 180) + band * 9 + Math.sin(t * 5.6 + side) * 24 + Math.sin(t * 15 - phase * 2 + band * .13) * 4];
      }, Math.max(50, Math.ceil(Math.abs(far - near) / 20)), .075 + (band % 3) * .012, band + side * 31);
    }
  }
}

export function moonWaterPoint(x, depth, seconds, bottom = 925) {
  const v = clamp(depth), phase = seconds / DURATION * TAU;
  return [x, 692 + v ** 1.45 * (bottom - 692)
    + Math.sin(x * .018 - phase * 19 + v * 8) * (1.4 + v * 5)
    + Math.sin(x * .049 + phase * 31 - v * 11) * (.7 + v * 2.5)];
}

function moonShore(p, seconds, camera) {
  mountainShoulders(p, camera, 2.7, 694, 260);
  cloudBank(p, camera, seconds, 0);
  const phase = seconds / DURATION * TAU, bottom = Math.max(930, camera.bottom + 25);
  const span = camera.right - camera.left;
  // Short water cuts open towards the viewer. The reflected path widens from
  // the Moon's line of sight instead of decorating the water with random rings.
  for (let row = 0; row < 26; row++) {
    const v = row / 25, count = Math.ceil(span / (45 + v * 75));
    for (let cut = 0; cut < count; cut++) {
      const spacing = span / count;
      const drift = Math.sin(phase * 11 + row * .51) * (4 + v * 16);
      const x = camera.left + (cut + hash(row * 713 + cut * 11) * .70) * spacing + drift;
      const length = spacing * (.46 + hash(row * 997 + cut * 31) * .44);
      const center = 700 + Math.sin(phase) * 4, width = 30 + v ** .8 * 330;
      const reflection = Math.exp(-(((x - center) / width) ** 2));
      const shimmer = .65 + Math.sin(x * .071 + phase * 23 + row) * .35;
      const alpha = .075 + reflection * shimmer * (.19 + v * .05);
      p.curve(t => moonWaterPoint(x + t * length, v, seconds, bottom), 4, alpha);
    }
  }
  // Low broken shore contours anchor the valley but leave a clear centre.
  for (let row = 0; row < 5; row++) for (const side of [-1, 1]) {
    const inner = 700 + side * 350, outer = side < 0 ? camera.left : camera.right;
    p.curve(t => [mix(inner, outer, t), 691 + row * 6 + Math.sin(t * 8 + row * .3) * 4], Math.max(40, Math.ceil(Math.abs(outer - inner) / 18)), .14 + row % 2 * .035, row + 91);
  }
  const stars = Math.ceil(span / 52);
  for (let star = 0; star < stars; star++) {
    const x = camera.left + hash(star * 31) * span, y = camera.top + 55 + hash(star * 43) * 420;
    if (Math.abs(x - 700) < 420) continue;
    const size = 1.4 + hash(star * 47) ** 3 * 3.4, twinkle = .16 + Math.sin(phase * 13 + star * 1.7) * .035;
    p.line(x - size, y, x + size, y, twinkle);
    if (star % 6 === 0) p.line(x, y - size, x, y + size, twinkle);
  }
}

function pine(p, x, ground, height, id, seconds) {
  const center = u => [x + Math.sin(u * 3 + id) * height * .042 * u + Math.sin(seconds * .72 - x * .002 + u) * u * u * 13,
    ground - u * height];
  for (const side of [-1, 1]) p.curve(t => {
    const point = center(t); return [point[0] + side * (1 - t) * height * .012, point[1]];
  }, 40, .24);
  const levels = 5 + Math.floor(hash(id * 23 + 7) * 3);
  for (let level = 0; level < levels; level++) {
    const u = .16 + ((level + hash(id * 53 + level * 17) * .32) / levels) ** .86 * .78;
    const spread = height * (.28 - u * .18);
    for (const side of [-1, 1]) {
      const root = center(u + side * .018 * hash(id * 31 + level));
      const length = spread * (.76 + hash(id * 43 + level * 11 + side) * .5);
      const branch = t => [root[0] + side * length * t, root[1] + Math.sin(t * Math.PI) * height * .035 - t * height * .035];
      p.curve(branch, 17, .21);
      for (let tuft = 0; tuft < 9; tuft++) {
        const at = branch(.12 + tuft / 9 * .86), size = height * (.026 + hash(tuft * 31 + id + level) * .021);
        const gust = Math.sin(seconds * 1.05 - x * .003 + tuft * .17 + level * .4) * .11;
        for (let needle = 0; needle < 5; needle++) {
          const a = -Math.PI * .86 + needle / 4 * Math.PI * .73 + gust;
          p.line(...at, at[0] + Math.cos(a) * size, at[1] + Math.sin(a) * size, .13 + hash(tuft + level * 71) * .065);
        }
      }
    }
  }
}

function gardenRock(p, x, y, width, height, id) {
  const crown = t => [x + (t * 2 - 1) * width, y - Math.sin(t * Math.PI) ** .65 * height * (.88 + Math.sin(t * 8 + id) * .12)];
  p.curve(crown, 45, .21, id * 3);
  for (let cut = 0; cut < 12; cut++) p.curve(t => {
    const point = crown(t), d = cut / 12;
    return [point[0] + Math.sin(t * 12 + cut) * 2, mix(point[1], y, d)];
  }, 36, .11 + cut % 3 * .015, cut + id * 41);
  p.ellipse(x, y + 3, width * 1.1, height * .12, .10, .05, Math.PI - .05);
}

function stoneGarden(p, seconds, camera) {
  const time = seconds - sceneStart(2), span = camera.right - camera.left;
  mountainShoulders(p, camera, 5.3, 650, 175);
  cloudBank(p, camera, time, 2);
  // Distant staggered pines sit in the valley instead of repeating the bonsai.
  for (const side of [-1, 1]) {
    const inner = 700 + side * 465, outer = side < 0 ? camera.left + 65 : camera.right - 65;
    const count = span < 2200 ? 2 : 4;
    for (let tree = 0; tree < count; tree++) {
      const fraction = count === 2 ? [.20, .78][tree] : [.13, .25, .62, .86][tree];
      const x = mix(inner, outer, fraction), id = tree + (side > 0 ? 7 : 0);
      const height = [190, 285, 230, 340, 210, 270, 220, 260, 180, 305, 250][id];
      pine(p, x, 706 + Math.sin(id * 2.1) * 28, height, id, time);
    }
  }
  // The rake follows contour arcs around the raised pot terrace. Variable gaps
  // keep this ground quiet; it is not the rectangular equipment floor.
  const bottom = Math.max(camera.bottom + 40, 920);
  for (let edge = 0; edge < 3; edge++) p.curve(t => [410 + t * 500, 713 + Math.sin(t * Math.PI) * (13 + edge * 3) + Math.sin(t * 19) * .9 + edge * 2], 85, .16 - edge * .025, edge * 37);
  for (let row = 0; row < 27; row++) {
    const d = row / 26, y = 726 + d ** 1.5 * (bottom - 726);
    p.curve(t => {
      const x = mix(camera.left - 20, camera.right + 20, t);
      const around = Math.exp(-(((x - 658) / (280 + d * 420)) ** 2));
      return [x, y + around * (19 + d * 32) + Math.sin(x * .004 + row * .2) * 3];
    }, Math.max(80, Math.ceil(span / 24)), .10 + row % 3 * .012, row * 3.7);
  }
  for (const side of [-1, 1]) {
    const x = 700 + side * Math.min(span * .39, 1610), ground = 752 + (side > 0 ? 28 : 0);
    gardenRock(p, x, ground, side < 0 ? 105 : 155, side < 0 ? 51 : 72, side + 4);
    for (let clump = 0; clump < 6; clump++) {
      const bx = x + side * (145 + clump * 30), by = ground + 8 + Math.sin(clump) * 12;
      for (let blade = 0; blade < 7; blade++) {
        const height = 23 + hash(clump * 97 + blade * 23) * 40;
        const lean = (blade - 3) * 5 + Math.sin(time * 1.1 - bx * .003 + blade * .14) * 12;
        p.curve(t => [bx + blade * 1.8 + lean * t * t, by - height * t], 12, .19 + blade % 3 * .025);
      }
    }
  }
}

function offshoreWeather(p, seconds, camera) {
  cloudBank(p, camera, seconds - sceneStart(1), 1);
  // Far headlands are low and offset from the principal crest and low sun.
  for (const side of [-1, 1]) {
    const edge = side < 0 ? camera.left - 20 : camera.right + 20;
    const inner = side < 0 ? Math.min(120, edge + 460) : Math.max(1470, edge - 610);
    for (let row = 0; row < 8; row++) p.curve(t => [mix(edge, inner, t), 418 - (1 - t) ** .7 * (58 - row * 5) + Math.sin(t * 14 + side) * (1 - t) * 4], 80, .10 + row % 3 * .01, row + side * 43);
  }
}

export function drawEngravedNaturalWorld(context, scene, seconds, camera, opacity = 1) {
  if (opacity <= 0 || scene < 0 || scene > 2) return;
  context.save();
  const p = pen(context, clamp(opacity), camera);
  if (scene === 0) moonShore(p, seconds, camera);
  if (scene === 1) offshoreWeather(p, seconds, camera);
  if (scene === 2) stoneGarden(p, seconds, camera);
  p.finish(); context.restore();
}
