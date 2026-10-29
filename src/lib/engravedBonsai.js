const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
// A coherent gust reaches every cut at the same spatial position. Roots stay
// planted while branches, needles and nearby birds share the garden's wind.
export function bonsaiWind(x, y, seconds) {
  const height = clamp((612 - y) / 520);
  if (!height) return 0;
  return height ** 1.45 * (Math.sin(seconds * .82 - x * .0028 + height * 1.2) * 9
    + Math.sin(seconds * 1.67 - x * .004 + height * 2.3) * 2.4);
}
function inverseSmooth(value) { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (smooth(m) < value) a = m; else b = m; } return (a + b) / 2; }
function cubic(p, t) { const s = 1 - t; return [0, 1].map(a => s ** 3 * p[0][a] + 3 * s * s * t * p[1][a] + 3 * s * t * t * p[2][a] + t ** 3 * p[3][a]); }
const trunk = [
  [[650, 612], [597, 541], [735, 483], [685, 408]],
  [[685, 408], [640, 340], [604, 280], [661, 214]],
  [[661, 214], [701, 178], [660, 149], [666, 116]],
];
export const BONSAI_LIMBS = [{ parent: -1, at: 0, start: 0, duration: 3.2, wide: 23, narrow: 2.2, curves: trunk }];
export function bonsaiCenter(id, t) {
  const curves = BONSAI_LIMBS[id].curves, u = clamp(t) * curves.length;
  return cubic(curves[Math.min(curves.length - 1, Math.floor(u))], u === curves.length ? 1 : u % 1);
}
function attach(parent, at, a, b, end, wide, duration = 1.05) {
  const base = BONSAI_LIMBS[parent];
  BONSAI_LIMBS.push({ parent, at, start: base.start + inverseSmooth(at) * base.duration + .025, duration, wide, narrow: .5, curves: [[bonsaiCenter(parent, at), a, b, end]] });
  return BONSAI_LIMBS.length - 1;
}
const crowns = [
  [attach(0, .20, [742, 483], [824, 447], [930, 426], 8), 905, 415, 131, 68],
  [attach(0, .40, [580, 397], [510, 365], [424, 345], 7), 437, 344, 130, 65],
  [attach(0, .58, [704, 306], [806, 284], [890, 275], 5), 848, 279, 134, 62],
  [attach(0, .73, [575, 249], [522, 226], [478, 214], 4), 505, 226, 118, 60],
  [attach(0, .88, [731, 196], [789, 192], [816, 178], 3), 779, 179, 112, 57],
  [0, 656, 119, 102, 68],
];
let seed = 712;
const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const sprays = [];
for (const [parent, x, y, rx, ry] of crowns) for (let i = 0; i < 45; i++) {
  const u = (i + random() * .8) / 45, at = parent ? .43 + random() * .55 : .90 + random() * .095;
  const root = bonsaiCenter(parent, at), ex = x + (u * 2 - 1) * rx;
  const ey = y + (random() - .5) * ry * .46 - Math.sqrt(1 - (u * 2 - 1) ** 2) * ry * (.38 + random() * .68);
  const id = attach(parent, at, [root[0] + (ex - root[0]) * .38, root[1] - 4 - random() * 8], [ex - (ex - root[0]) * .13, ey + 8], [ex, ey], .7 + random() * .6, .65 + random() * .30);
  sprays.push(id);
}
export function bonsaiState(time) {
  const fronts = BONSAI_LIMBS.map(limb => smooth((time - limb.start) / limb.duration));
  fronts.settle = BONSAI_LIMBS.map(limb => .16 * smooth((time - limb.start - limb.duration) / .28));
  return fronts;
}
export function bonsaiPoint(id, t, across, fronts = null, out = new Float64Array(3)) {
  id = Math.max(0, Math.min(BONSAI_LIMBS.length - 1, Math.round(id)));
  const front = fronts ? fronts[id] : 1, curves = BONSAI_LIMBS[id].curves, u = clamp(t) * curves.length;
  const curve = curves[Math.min(curves.length - 1, Math.floor(u))], v = u === curves.length ? 1 : u % 1, w = 1 - v;
  const x = w ** 3 * curve[0][0] + 3 * w * w * v * curve[1][0] + 3 * w * v * v * curve[2][0] + v ** 3 * curve[3][0];
  const y = w ** 3 * curve[0][1] + 3 * w * w * v * curve[1][1] + 3 * w * v * v * curve[2][1] + v ** 3 * curve[3][1];
  const dx = 3 * w * w * (curve[1][0] - curve[0][0]) + 6 * w * v * (curve[2][0] - curve[1][0]) + 3 * v * v * (curve[3][0] - curve[2][0]);
  const dy = 3 * w * w * (curve[1][1] - curve[0][1]) + 6 * w * v * (curve[2][1] - curve[1][1]) + 3 * v * v * (curve[3][1] - curve[2][1]);
  const length = Math.hypot(dx, dy) || 1;
  const limb = BONSAI_LIMBS[id], maturity = fronts ? smooth((front + fronts.settle[id] - t) / .10) : 1;
  const radius = (limb.narrow + (limb.wide - limb.narrow) * (1 - clamp(t)) ** 1.18) * (.12 + .88 * maturity);
  const cut = across * radius + Math.sin(t * 31 + across * 4) * radius * .02;
  out[0] = x - dy / length * cut - 700;
  out[1] = y + dx / length * cut - 400;
  out[2] = 0;
  return out;
}
// Two strokes per bird: a moving shallow M, with no face or mascot detail.
export function bonsaiBirdPoint(index, wing, along, time = 0, out = new Float64Array(3)) {
  const id = Math.max(0, Math.min(2, Math.round(index))), phase = time * .38 + [.15, 2.4, 4.2][id];
  const size = [1, .82, .66][id], flap = Math.sin(time * 6.4 + id * 1.7), u = clamp(along);
  const span = (14 + flap * 1.5) * size, lift = (4 + flap * 8) * size;
  const x = wing * span * u, y = -lift * (2 * u - u * u) - Math.sin(u * Math.PI) * 2 * size;
  const bank = Math.sin(phase) * .24, c = Math.cos(bank), s = Math.sin(bank);
  out[0] = 390 * Math.cos(phase) + x * c - y * s;
  out[1] = 270 + 240 * Math.sin(phase) + x * s + y * c - 400;
  out[2] = 0;
  return out;
}

// Surface roots radiate from the trunk collar, tapering into the soil.
export const BONSAI_ROOTS = [
  { curve: [[643, 606], [625, 615], [579, 605], [549, 620]], width: 8 },
  { curve: [[646, 609], [632, 628], [599, 626], [581, 638]], width: 10 },
  { curve: [[651, 610], [645, 630], [625, 633], [622, 644]], width: 11 },
  { curve: [[655, 610], [667, 623], [667, 636], [677, 643]], width: 10 },
  { curve: [[659, 607], [680, 621], [712, 623], [741, 631]], width: 8 },
  { curve: [[660, 604], [694, 607], [733, 601], [768, 614]], width: 6 },
  { curve: [[648, 605], [634, 592], [603, 602], [586, 607]], width: 5 },
  { curve: [[657, 604], [680, 590], [709, 602], [722, 608]], width: 5 },
];
export function bonsaiRootPoint(index, t, across = 0) {
  const root = BONSAI_ROOTS[index], center = cubic(root.curve, t);
  const a = cubic(root.curve, Math.max(0, t - .005)), b = cubic(root.curve, Math.min(1, t + .005));
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy) || 1;
  const radius = root.width * (1 - t) ** 1.4;
  return [center[0] - dy / length * radius * across, center[1] + dx / length * radius * across];
}
function buildBonsaiBase(p) {
  // A shallow oval ceramic pot: separate back rim, soil, front lip and belly.
  p.ellipse(658, 626, 175, 25, 0, .21);
  p.ellipse(658, 624, 165, 19, 0, .12);
  p.curve(t => [658 - Math.cos(t * Math.PI) * 175, 626 + Math.sin(t * Math.PI) * 25], 150, .30);
  p.curve(t => [658 - Math.cos(t * Math.PI) * 171, 630 + Math.sin(t * Math.PI) * 25], 140, .14);
  const left = [[491, 631], [498, 655], [511, 674], [528, 676]];
  const right = left.map(([x, y]) => [1316 - x, y]);
  for (const side of [left, right]) p.curve(t => cubic(side, t), 55, .24);
  p.curve(t => [528 + t * 260, 676 + Math.sin(t * Math.PI) * 13], 140, .22);
  p.curve(t => [533 + t * 250, 674 + Math.sin(t * Math.PI) * 11], 130, .10);
  for (let x = 516; x <= 800; x += 9) {
    const u = (x - 658) / 170, top = 631 + Math.sqrt(Math.max(0, 1 - u * u)) * 25;
    const bottom = 675 + Math.sqrt(Math.max(0, 1 - ((x - 658) / 143) ** 2)) * 12;
    const bend = (658 - x) * .07;
    // Short broken cuts suggest the ceramic's curvature without a filled face.
    for (const [a, b] of [[.13, .40], [.57, .82]]) p.curve(t => {
      const v = a + t * (b - a); return [x + bend * v, top + (bottom - top) * v];
    }, 6, .065 + (x % 4) * .012);
  }
  for (const x of [555, 744]) {
    p.path([[x - 11, 685], [x - 15, 700], [x + 12, 700], [x + 17, 687]], .18);
    for (let cut = 0; cut < 5; cut++) p.line(x - 9 + cut * 4, 690, x - 11 + cut * 4, 698, .09);
  }
  // Irregular gravel and small engraved soil cuts remain airy around the roots.
  for (let i = 0; i < 175; i++) {
    const a = p.rng() * Math.PI * 2, r = Math.sqrt(p.rng());
    const x = 658 + Math.cos(a) * r * 155, y = 624 + Math.sin(a) * r * 16;
    p.curve(t => [x + t * 3, y - Math.sin(t * Math.PI) * 1.1], 4, .09 + p.rng() * .10);
  }
  for (let i = 0; i < 46; i++) {
    const x = 479 + i * 7.5, d = Math.abs(x - 658) / 180;
    p.line(x, 709 + Math.sin(i * 1.7) * 1.4, x + 3 + (1 - d) * 5, 709 + Math.sin(i * 1.7) * 1.4, .045 + (1 - d) * .05);
  }
  for (const mark of p.marks) { while (mark.length < 16) mark.push(0); mark[6] = 0; }
  const from = p.marks.length;
  BONSAI_ROOTS.forEach((root, index) => {
    for (const across of [-.65, -.25, .2, .65]) for (let run = 0; run < 7; run++) {
      const start = run / 7, end = Math.min(1, start + .105 + p.rng() * .02);
      p.curve(t => bonsaiRootPoint(index, start + (end - start) * t, across), 9, .19 + p.rng() * .15, 0, 4);
    }
  });
  for (let i = from; i < p.marks.length; i++) { const mark = p.marks[i]; while (mark.length < 16) mark.push(0); mark[6] = 4; }
}

export function buildBonsai(p, pack) {
  buildBonsaiBase(p);
  const point = (id, t, across) => bonsaiPoint(id, t, across);
  BONSAI_LIMBS.forEach((limb, id) => {
    const cuts = id < 6 ? (id ? 6 : 9) : 1;
    for (let cut = 0; cut < cuts; cut++) {
      const across = cuts === 1 ? 0 : -1 + cut / (cuts - 1) * 2;
      if (id < 6) {
        // Broken, meandering grain replaces the continuous tube-like outline.
        const runs = id ? 9 : 24;
        for (let run = 0; run < runs; run++) {
          const start = (run + p.rng() * .35) / runs, end = Math.min(1, start + (.65 + p.rng() * .3) / runs);
          p.boundCurve(point, t => [id, start + t * (end - start), across + Math.sin((start + t * (end - start)) * 39 + cut) * .045], 10, .22 + p.rng() * .18, 0, 1);
        }
      } else p.boundCurve(point, t => [id, t, 0], 60, .13 + p.rng() * .10, 0, 1);
    }
  });
  for (const id of sprays) for (let needle = 0; needle < 15; needle++) {
    const t = .12 + (needle + p.rng() * .7) / 15 * .87, center = bonsaiCenter(id, t), a = bonsaiCenter(id, t - .01), b = bonsaiCenter(id, t + .01);
    const tangent = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const side of [-1, 1]) for (let fan = 0; fan < 4; fan++) {
      const angle = tangent + side * (.30 + fan * .29 + p.rng() * .25), length = 3 + p.rng() * 7.5;
      const from = p.marks.length;
      p.line(center[0], center[1], center[0] + Math.cos(angle) * length, center[1] + Math.sin(angle) * length, .085 + p.rng() * .13, 0, 2);
      for (let i = from; i < p.marks.length; i++) { const mark = p.marks[i]; while (mark.length < 16) mark.push(0); mark[10] = id; mark[11] = t; }
    }
  }
  for (let bird = 0; bird < 3; bird++) for (const wing of [-1, 1]) {
    p.boundCurve((id, side, t) => bonsaiBirdPoint(id, side, t), t => [bird, wing, t], 10, .63, 0, 3);
  }
  return pack(p.marks);
}
