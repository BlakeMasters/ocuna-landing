import { bindingContact, BINDING_ATOMS, BINDING_RESIDUES, BINDING_SITE, proteinCoreFrames, proteinPoint, PROTEIN_RESIDUES, wormholePoint } from "./engravedForms.js";
import { moleculeMesh, moleculePoint } from "./engravedMolecule.js";
import { buildBonsai } from "./engravedBonsai.js";
import { buildHumanoidGeometry } from "./engravedHumanoid.js";

// Geometry for a living copperplate. Coordinates are in a 1400 × 800 plate.
// Every visible mark is a short line; the new sculptural scenes retain depth.
export const PLATE = Object.freeze({ width: 1400, height: 800 });
export const MARK_COUNT = 30000;
export const STRIDE = 16;
const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;

export function random(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ state >>> 15, 1 | state);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

function pen(seed) {
  const marks = [], rng = random(seed);
  function line(x1, y1, x2, y2, opacity = .6, tint = 0, group = 0) {
    opacity = Math.max(0, Math.min(1, opacity));
    const length = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(1, Math.ceil(length / 5));
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      marks.push([
        mix(x1, x2, t), mix(y1, y2, t),
        (x2 - x1) / count * .54, (y2 - y1) / count * .54,
        opacity * (.84 + rng() * .16), tint, group, rng(),
      ]);
    }
  }
  function path(points, opacity = .6, tint = 0, group = 0) {
    for (let i = 1; i < points.length; i++) line(...points[i - 1], ...points[i], opacity, tint, group);
  }
  function curve(fn, steps = 120, opacity = .6, tint = 0, group = 0) {
    let previous = fn(0);
    for (let i = 1; i <= steps; i++) {
      const next = fn(i / steps);
      line(...previous, ...next, opacity, tint, group);
      previous = next;
    }
  }
  function ellipse(x, y, rx, ry, rotation = 0, opacity = .6, tint = 0, group = 0) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    curve(t => {
      const a = t * TAU, u = Math.cos(a) * rx, v = Math.sin(a) * ry;
      return [x + u * c - v * s, y + u * s + v * c];
    }, Math.ceil(Math.max(rx, ry) * 1.4) + 12, opacity, tint, group);
  }
  function line3(a, b, opacity = .6, tint = 0, group = 0) {
    const count = Math.max(1, Math.ceil(Math.hypot(...a.map((v, i) => b[i] - v)) / 5));
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      marks.push([
        700 + mix(a[0], b[0], t), 400 + mix(a[1], b[1], t),
        (b[0] - a[0]) / count * .54, (b[1] - a[1]) / count * .54,
        Math.max(0, Math.min(1, opacity)) * (.9 + rng() * .1), tint, group, rng(),
        mix(a[2], b[2], t), (b[2] - a[2]) / count * .54,
      ]);
    }
  }
  function curve3(fn, steps = 120, opacity = .6, tint = 0, group = 0) {
    let previous = fn(0);
    for (let i = 1; i <= steps; i++) {
      const next = fn(i / steps);
      line3(previous, next, typeof opacity === "function" ? opacity((i - .5) / steps) : opacity, tint, group);
      previous = next;
    }
  }
  function path3(points, opacity = .6, tint = 0, group = 0) {
    for (let i = 1; i < points.length; i++) line3(points[i - 1], points[i], opacity, tint, group);
  }
  function boundLine(fn, a, b, opacity, tint, group) {
    const first = fn(...a), last = fn(...b), count = Math.max(1, Math.ceil(Math.hypot(...first.map((v, axis) => last[axis] - v)) / 4));
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, uv = a.map((v, axis) => mix(v, b[axis], t));
      const point = fn(...uv), delta = b.map((v, axis) => (v - a[axis]) / count * .54);
      const before = fn(...uv.map((v, axis) => v - delta[axis])), after = fn(...uv.map((v, axis) => v + delta[axis]));
      marks.push([700 + point[0], 400 + point[1], (after[0] - before[0]) / 2, (after[1] - before[1]) / 2, opacity * (.92 + rng() * .08), tint, group, rng(), point[2], (after[2] - before[2]) / 2, ...uv, ...delta]);
    }
  }
  function boundCurve(fn, parameters, steps, opacity = .6, tint = 0, group = 0) {
    let previous = parameters(0);
    for (let i = 1; i <= steps; i++) {
      const next = parameters(i / steps);
      boundLine(fn, previous, next, typeof opacity === "function" ? opacity((i - .5) / steps) : opacity, tint, group);
      previous = next;
    }
  }
  return { marks, rng, line, path, curve, ellipse, line3, curve3, path3, boundCurve };
}

export function packScene(marks, count = MARK_COUNT) {
  if (!marks.length || !Number.isInteger(count) || count < 1) throw new RangeError("A scene needs marks and a positive integer count.");
  const primary = [], secondary = [];
  for (const mark of marks) (mark[4] > .54 ? primary : secondary).push(mark);
  const selected = [];
  function take(source, slots) {
    if (!slots) return;
    const ratio = source.length / slots;
    for (let i = 0; i < slots; i++) {
      const mark = [...source[Math.min(source.length - 1, Math.floor((i + .5) * ratio))]];
      // Preserve connected cuts when reducing a dense field; keep dark outlines.
      mark[2] *= Math.max(1, Math.min(2.4, ratio));
      mark[3] *= Math.max(1, Math.min(2.4, ratio));
      if (mark.length > 8) mark[9] *= Math.max(1, Math.min(2.4, ratio));
      if (mark.length > 10) for (let axis = 13; axis < 16; axis++) mark[axis] *= Math.max(1, Math.min(2.4, ratio));
      mark[4] *= Math.min(1, ratio);
      selected.push(mark);
    }
  }
  if (primary.length < count * .65 && secondary.length) {
    take(primary, primary.length);
    take(secondary, count - primary.length);
  } else take(marks, count);
  // A spiral order carries nearby strokes together through the transformations.
  const keys = Float64Array.from(selected, p => Math.atan2(p[1] - 400, p[0] - 700) + Math.hypot(p[0] - 700, p[1] - 400) * .0007);
  const ordered = selected.map((_, index) => index).sort((a, b) => keys[a] - keys[b]);
  const field = new Float32Array(count * STRIDE);
  for (let i = 0; i < count; i++) {
    field.set(selected[ordered[i]], i * STRIDE);
  }
  return field;
}

function moon() {
  const p = pen(71), cx = 700, cy = 390, radius = 248;
  const craters = Array.from({ length: 78 }, () => {
    const a = p.rng() * TAU, r = Math.sqrt(p.rng()) * radius * .96;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, r: 3 + p.rng() ** 3 * 35 };
  });
  // Irregular horizontal burin cuts carry both light and lunar terrain.
  for (let y = -radius + 2; y < radius; y += 2.65) {
    const extent = Math.sqrt(radius * radius - y * y);
    for (let x = -extent; x < extent; x += 3.7) {
      const z = Math.sqrt(Math.max(0, 1 - (x * x + y * y) / radius ** 2));
      const light = Math.max(0, -.56 * x / radius - .24 * y / radius + .76 * z);
      const maria = Math.sin(x * .026 + Math.sin(y * .023) * 2) * Math.sin(y * .036 - x * .013);
      const grain = Math.sin(x * .14 + y * .07) * Math.cos(y * .094);
      let shade = .10 + (1 - light) * .72 + Math.max(0, maria) * .26 + grain * .09;
      for (const crater of craters) {
        const d = Math.hypot(x - crater.x, y - crater.y) / crater.r;
        if (d < 1.35) shade += Math.exp(-1 * ((d - .94) * 7) ** 2) * .24 - Math.exp(-1 * (d * 1.5) ** 2) * .10;
      }
      if (p.rng() < .10 + light * .18) continue;
      const wobble = Math.sin(x * .055 + y * .13) * .45;
      p.line(cx + x, cy + y + wobble, cx + Math.min(extent, x + 3.2), cy + y - .9 + wobble, Math.min(.95, shade));
      if (shade > .70 && p.rng() < .38) p.line(cx + x, cy + y, cx + x + 1.6, cy + y + 3.6, .27);
    }
  }
  for (const c of craters) {
    const squash = Math.sqrt(Math.max(.05, 1 - (c.x * c.x + c.y * c.y) / radius ** 2));
    p.ellipse(cx + c.x, cy + c.y, c.r, c.r * (.45 + squash * .55), c.x * .002, .38);
    p.ellipse(cx + c.x + 1, cy + c.y + 1.6, c.r * .77, c.r * (.3 + squash * .43), c.x * .002, .22);
  }
  p.ellipse(cx, cy, radius, radius, 0, .80);
  p.ellipse(cx, cy, radius + 3, radius + 3, 0, .17);
  p.ellipse(cx, cy, 335, 285, -.2, .16, 1);
  p.ellipse(cx, cy, 360, 111, -.35, .19, 1);
  for (let i = 0; i < 55; i++) {
    const x = 135 + p.rng() * 1130, y = 85 + p.rng() * 610;
    if (Math.hypot(x - cx, y - cy) < 302) continue;
    const s = 1 + p.rng() * 2;
    p.line(x - s, y, x + s, y, .35);
    p.line(x, y - s, x, y + s, .35);
  }
  return packScene(p.marks);
}

function tide() {
  const p = pen(119);
  // Contour lines in a broad sea, with a rising wave cut through the plate.
  for (let row = 0; row < 77; row++) {
    const v = row / 76;
    p.curve(u => {
      const x = 50 + u * 1300;
      const envelope = Math.exp(-1 * ((x - 850) / (160 + v * 125)) ** 2);
      const rise = (1 - v) ** 1.7 * 235 * envelope;
      const ripple = Math.sin(u * 34 + v * 21) * (3 + v * 5) + Math.sin(u * 83 - v * 14) * 2.4;
      return [x, 420 + v * 270 - rise + ripple];
    }, 220, .28 + v * .32);
  }
  // The overhanging lip turns each engraved ribbon back on itself.
  for (let i = 0; i < 40; i++) {
    const v = i / 39, radius = 122 + v * 63;
    p.curve(u => {
      const angle = mix(-2.72, 1.35, u);
      const taper = .68 + u * .32;
      return [864 + Math.cos(angle) * radius * taper, 335 + Math.sin(angle) * radius * (.86 + v * .12) + v * 12];
    }, 140, .34 + v * .25);
  }
  for (let i = 0; i < 140; i++) {
    const a = -2.55 + p.rng() * 2.9, r = 165 + p.rng() * 45;
    const x = 864 + Math.cos(a) * r, y = 335 + Math.sin(a) * r * .92;
    const size = 1.6 + p.rng() * 6;
    p.ellipse(x, y, size, size * .68, a, .32);
  }
  for (let i = 0; i < 45; i++) {
    const x = 100 + p.rng() * 1190, y = 470 + p.rng() * 200;
    p.curve(u => [x + u * 40, y + Math.sin(u * Math.PI) * -5], 12, .48);
  }
  // A low sun and fine horizon keep the scene an illustration, not a plot.
  p.ellipse(388, 242, 59, 59, 0, .38, 1);
  for (let y = -54; y < 55; y += 4) {
    const x = Math.sqrt(59 ** 2 - y ** 2);
    p.line(388 - x, 242 + y, 388 + x, 242 + y, .16, 1);
  }
  for (let i = 0; i < 11; i++) p.line(75 + i * 8, 408 + i * 2, 590 - i * 9, 408 + i * 2, .12);
  return packScene(p.marks);
}

function branches() {
  return buildBonsai(pen(222), packScene);
}

function mechanism() {
  const p = pen(52), cx = 700, cy = 395;
  // The central globe is suspended in armillary rings.
  for (let j = 0; j < 22; j++) {
    const a = j / 22 * Math.PI;
    p.ellipse(cx, cy, 139 * Math.abs(Math.cos(a)), 139, 0, .23);
  }
  for (let j = -9; j <= 9; j++) {
    const y = j * 13.6, r = Math.sqrt(Math.max(0, 139 ** 2 - y ** 2));
    p.ellipse(cx, cy + y, r, r * .14, 0, .27);
  }
  p.ellipse(cx, cy, 141, 141, 0, .73);
  for (let ring = 0; ring < 3; ring++) {
    const angle = -.62 + ring * .65;
    for (let edge = 0; edge < 3; edge++) p.ellipse(cx, cy, 310 + ring * 31 + edge * 3, 82 + ring * 22 + edge * 2, angle, edge === 1 ? .64 : .25, ring === 1 ? 1 : 0, ring + 1);
    for (let tick = 0; tick < 120; tick++) {
      const a = tick / 120 * TAU, r = 310 + ring * 31, h = tick % 10 === 0 ? 13 : 5;
      const c = Math.cos(angle), s = Math.sin(angle);
      const point = (rr, ry) => [cx + Math.cos(a) * rr * c - Math.sin(a) * ry * s, cy + Math.cos(a) * rr * s + Math.sin(a) * ry * c];
      p.line(...point(r - h, 82 + ring * 22 - h * .35), ...point(r, 82 + ring * 22), .42, ring === 1 ? 1 : 0, ring + 1);
    }
  }
  // Exploded gear plates, with machined teeth and hatching on their rims.
  for (let side = -1; side <= 1; side += 2) {
    const x = cx + side * 401, y = cy - side * 12, r = side < 0 ? 125 : 168;
    p.line(cx + side * 147, cy, x, y, .55);
    for (let edge = 0; edge < 5; edge++) p.ellipse(x + edge * 2.1, y, r * .26, r, -.12, edge % 2 ? .24 : .51);
    for (let ring = .3; ring < .9; ring += .13) p.ellipse(x, y, r * .26 * ring, r * ring, -.12, .39);
    for (let tooth = 0; tooth < 76; tooth++) {
      const a = tooth / 76 * TAU;
      const x1 = x + Math.cos(a) * r * .26, y1 = y + Math.sin(a) * r;
      p.line(x1, y1, x1 + Math.cos(a) * 6 + 8, y1 + Math.sin(a) * 7, .62);
      if (tooth % 6 === 0) p.line(x + Math.cos(a) * r * .26 * .35, y + Math.sin(a) * r * .35, x + Math.cos(a) * r * .26 * .82, y + Math.sin(a) * r * .82, .48);
    }
    p.ellipse(x, y, 7, 22, -.12, .69);
  }
  // A fine pedestal and compass, in the same plate rather than UI ornaments.
  p.path([[681, 541], [673, 602], [642, 645], [756, 645], [727, 602], [720, 541]], .58);
  p.ellipse(cx, 654, 101, 20, 0, .57);
  p.ellipse(cx, 661, 103, 20, 0, .32);
  for (let i = 0; i < 29; i++) p.line(648 + i * 3.7, 647, 646 + i * 3.9, 661, .24);
  for (let i = 0; i < 40; i++) {
    const x = 620 + p.rng() * 160, y = 570 + p.rng() * 60;
    if (Math.abs(x - 700) < 25 + (y - 570) * .6) p.line(x, y, x - 5, y + 5, .18);
  }
  return packScene(p.marks);
}

function wormhole() {
  const p = pen(631);
  // Sparse meridians braid through a curved passage. Unequal ring phases and
  // travelling partial arcs make transport visible without darkening the grid.
  for (let meridian = 0; meridian < 48; meridian++) {
    const angle = meridian / 48 * TAU;
    p.boundCurve(wormholePoint, t => [t, angle, 0], 170, .19, 0, 0);
  }
  for (let ring = 0; ring < 43; ring++) {
    const u = (ring + .19 * Math.sin(ring * 2.399)) / 43;
    p.boundCurve(wormholePoint, t => [u, t * TAU, 0], 160, .17 + (ring % 7 === 0 ? .11 : 0) + u * .045, 0, 1);
  }
  for (let arc = 0; arc < 23; arc++) {
    const u = (arc * .381966) % 1, angle = arc * 2.39996, length = .18 + p.rng() * .35;
    p.boundCurve(wormholePoint, t => [u, angle + t * length, 0], 35, .46, 0, 5);
    p.boundCurve(wormholePoint, t => [u + t * .035, angle + length, 0], 12, .30, 0, 6);
  }
  // The front sheet joins the same breathing geometry, rather than leaving a
  // rigid outer disc behind while the interior moves.
  for (let ring = 1; ring <= 7; ring++) {
    const u = -ring * .014;
    p.boundCurve(wormholePoint, t => [u, t * TAU, 0], 190, .14 * (1 - ring / 8), 1, 2);
  }
  for (let ray = 0; ray < 48; ray++) {
    const a = ray / 48 * TAU;
    p.boundCurve(wormholePoint, t => [-t * .10, a, 0], 30, t => .15 * (1 - t) ** 1.4, 1, 2);
  }
  // A traversable throat reveals another sky; it is not a filled black hole.
  // Small distant star cuts and a compressed galactic band give it depth.
  for (let star = 0; star < 132; star++) {
    const angle = p.rng() * TAU, radius = Math.sqrt(p.rng()) * 122;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    const size = 1.2 + p.rng() * 2.0;
    p.line3([x - size, y, -410], [x + size, y, -410], .35 + p.rng() * .2, 0, 4);
    if (star % 9 === 0) p.line3([x, y - size, -410], [x, y + size, -410], .4, 0, 4);
  }
  for (let band = 0; band < 15; band++) {
    p.curve3(t => { const x = -110 + t * 220, y = Math.sin(t * Math.PI) * 20 + x * .28 + (band - 7) * 1.5; return [x, y, -411]; }, 80, .13, 1, 4);
  }
  return packScene(p.marks);
}

export const COMPUTE_ROUTES = Object.freeze([
  [[-110, 40, -58], [-205, 40, -58], [-205, 40, -185], [-310, 40, -185]],
  [[-110, 99, 60], [-198, 99, 60], [-198, 99, 183], [-310, 99, 183]],
  [[110, -18, -58], [204, -18, -58], [204, -18, -182], [310, -18, -182]],
  [[110, 100, 60], [210, 100, 60], [210, 100, 180], [310, 100, 180]],
  [[266, -18, -182], [266, -18, -270], [145, -18, -270], [145, -18, -320]],
  [[310, -18, -228], [390, -18, -228], [390, -18, -315], [290, -18, -315]],
]);

function box(p, x, y, z, halfX, halfZ, height, group = 0, circuits = false) {
  const v = (sx, sy, sz) => [x + sx * halfX, y + sy * height, z + sz * halfZ];
  for (const sy of [0, 1]) p.path3([v(-1, sy, -1), v(1, sy, -1), v(1, sy, 1), v(-1, sy, 1), v(-1, sy, -1)], .82, 0, group);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.line3(v(sx, 0, sz), v(sx, 1, sz), .76, 0, group);
  for (let i = -halfX + 3; i < halfX; i += 4) p.line3([x + i, y + 1, z + halfZ], [x + i, y + height, z + halfZ], .36, 0, group);
  for (let i = -halfZ + 3; i < halfZ; i += 4) p.line3([x + halfX, y, z + i], [x + halfX, y + height, z + i], .30, 0, group);
  if (circuits) {
    for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) {
      const px = x + row * halfX * .51, pz = z + col * halfZ * .51, s = halfX * .15;
      p.path3([[px - s, y - .6, pz - s], [px + s, y - .6, pz - s], [px + s, y - .6, pz + s], [px - s, y - .6, pz + s], [px - s, y - .6, pz - s]], .73, 0, group);
      for (let cut = -s + 2; cut < s; cut += 3) p.line3([px + cut, y - .6, pz - s], [px + cut, y - .6, pz + s], .26, 0, group);
    }
    for (let pin = -halfX + 12; pin < halfX; pin += 17) {
      p.line3([x + pin, y, z - halfZ], [x + pin, y, z - halfZ - 9], .61, 0, group);
      p.line3([x + pin, y, z + halfZ], [x + pin, y, z + halfZ + 9], .61, 0, group);
    }
  }
}

function compute() {
  const p = pen(307);
  // Reconstruct the home-page diagram as a copperplate cutaway: layered
  // processors, neighbouring workloads, research devices and recorded results.
  for (const level of [0, 1, 2, 3]) box(p, 0, -118 + level * 59, 0, 108 + level * 5, 108 + level * 5, 19, level + 1, level === 0);
  for (const [x, y, z, hx, hz, h] of [[-310, 8, -185, 53, 53, 59], [-310, 99, 183, 60, 60, 14], [310, -45, -182, 47, 47, 48], [310, 100, 180, 62, 62, 11]]) {
    box(p, x, y, z, hx, hz, h, 0, true);
    if (y > 90) for (const depth of [24, 48]) box(p, x, y + depth, z, hx, hz, h);
  }
  box(p, 145, -48, -320, 28, 28, 32, 0, true);
  box(p, 290, -48, -315, 28, 28, 32, 0, true);
  for (let i = -4; i <= 4; i++) {
    p.line3([-415, 196, i * 85], [415, 196, i * 85], .10);
    p.line3([i * 96, 196, -350], [i * 96, 196, 350], .10);
  }
  COMPUTE_ROUTES.forEach((route, index) => {
    for (const offset of [-3, 0, 3]) p.path3(route.map(([x, y, z]) => [x, y, z + offset]), offset ? .18 : .64);
    const [x, y, z] = route[0];
    // These small engraved cubes travel along the same rails during playback.
    box(p, x, y - 5, z, 5, 5, 9, 20 + index);
    p.line3([x - 5, y - 6, z], [x + 5, y - 6, z], .96, 1, 20 + index);
  });
  return packScene(p.marks);
}

function robotics() {
  return buildHumanoidGeometry(pen(854), packScene, box);
}

function protein() {
  const p = pen(927);
  const folded = proteinCoreFrames(), last = PROTEIN_RESIDUES - 1;
  const ribbon = (s, v, w) => proteinPoint(s, v, w, folded);
  const contact = (a, b, t) => bindingContact(a, b, t, folded);
  const envelope = (edge, t, w) => moleculePoint(edge, t, w, folded), mesh = moleculeMesh();
  for (let edge = 0; edge < mesh.edges.length; edge += 2) p.boundCurve(envelope, t => [edge, t, 0], 1, .17, 2, 5);
  // A resolved internal scaffold is already present when the incoming scene arrives.
  for (const across of [-1, 0, 1]) p.boundCurve(ribbon, t => [t * last, across, 0], 850, .40, 0, 6);
  for (let residue = 0; residue < last; residue += .6) p.boundCurve(ribbon, t => [residue, t * 2 - 1, 0], 10, .28, 0, 6);
  for (let across = -1; across <= 1.001; across += .22) p.boundCurve(ribbon, t => [t * last, across, 0], 750, .36, 1, 1);
  for (let residue = 0; residue < last; residue += .25) p.boundCurve(ribbon, t => [residue, t * 2 - 1, 0], 12, .25, 1, 1);
  for (const edge of [-1, 1]) for (const thickness of [-.65, .65]) p.boundCurve(ribbon, t => [t * last, edge, thickness], 900, .62, 1, 1);
  p.boundCurve(ribbon, t => [t * last, 0, 0], 900, .38, 1, 1);
  for (let residue = 0; residue <= last; residue += 3) p.boundCurve(ribbon, t => [residue, Math.cos(t * TAU) * .19, Math.sin(t * TAU) * .65], 24, .35, 1, 1);
  for (let i = 0; i < BINDING_ATOMS.length; i++) {
    const atom = BINDING_ATOMS[i], next = BINDING_ATOMS[(i + 1) % 6];
    p.line3(atom, next, .95, 1, 3);
    for (const tilt of [0, Math.PI / 2]) p.curve3(t => [atom[0] + Math.cos(t * TAU) * 5, atom[1] + Math.sin(t * TAU) * 5 * Math.cos(tilt), atom[2] + Math.sin(t * TAU) * 5 * Math.sin(tilt)], 30, .96, 1, 3);
    for (let dash = 0; dash < 12; dash += 2) p.boundCurve(contact, t => [BINDING_RESIDUES[i], i, (dash + t) / 12], 6, .64, 1, 4);
  }
  p.curve3(t => [BINDING_SITE[0] + Math.cos(t * TAU) * 40, BINDING_SITE[1] + Math.sin(t * TAU) * 40, BINDING_SITE[2]], 120, .24, 1, 3);
  return packScene(p.marks);
}

export function buildMoonScene() { return moon(); }

const sceneBuilders = [moon, tide, branches, mechanism, wormhole, compute, robotics, protein];
export function buildProceduralScene(index) { return sceneBuilders[index](); }
export function buildProceduralScenes() { return sceneBuilders.map(build => build()); }
