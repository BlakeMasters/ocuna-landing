import { PROTEIN_REFERENCE } from "./proteinReference.js";

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** Near sheet of an Ellis embedding: r² = l² + a², z = a asinh(l/a).
 * Depth is exaggerated for the engraved perspective, rather than ray traced.
 * The zero radial slope at the throat avoids the old pointed, conical funnel.
 */
export function wormholePoint(u, angle, time = 0, out = new Float64Array(3)) {
  const throat = 126, extent = Math.sqrt(310 ** 2 - throat ** 2);
  const proper = Math.max(0, 1 - u) * extent;
  const bend = Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
  const pulse = Math.sin(time * .62), twist = Math.sin(time * .23) * u * .42;
  const radius = Math.hypot(throat, proper) * (1 + pulse * (.028 + bend * .025));
  // An unsteady, curved passage gives the moving material a path through depth;
  // the opening remains open rather than collapsing into a vortex point.
  out[0] = Math.cos(angle + twist) * radius + Math.sin(time * .31) * bend * 38;
  out[1] = Math.sin(angle + twist) * radius + Math.sin(time * .24) * bend * 28;
  out[2] = -405 + 625 * Math.asinh(proper / throat) / Math.asinh(extent / throat) - Math.sin(time * .38) * bend * 36;
  return out;
}

export const PROTEIN_RESIDUES = PROTEIN_REFERENCE.alphaCarbons.length;
const SCALE = 11.5;
const center = [1, 2, 3].map(axis => PROTEIN_REFERENCE.alphaCarbons.reduce((sum, atom) => sum + atom[axis], 0) / PROTEIN_RESIDUES);
export const PROTEIN_NATIVE = PROTEIN_REFERENCE.alphaCarbons.map(atom => [
  (atom[1] - center[0]) * SCALE,
  (atom[3] - center[2]) * SCALE,
  (atom[2] - center[1]) * SCALE,
]);
const BONDS = PROTEIN_NATIVE.slice(1).map((point, i) => Math.hypot(...point.map((v, axis) => v - PROTEIN_NATIVE[i][axis])));
const SAMPLES = 5;
const FRAME_STRIDE = 10;

function widthAt(residue) {
  const number = residue + 1;
  const segment = PROTEIN_REFERENCE.secondary.find(item => number >= item.start && number <= item.end);
  if (!segment) return 4;
  if (segment.kind === "helix") return 11;
  const remaining = segment.end - number;
  return remaining < 1 ? 4 + remaining * 24 : remaining < 2 ? 27 : 15;
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map(value => value / length);
}

function catmull(points, residue) {
  const index = Math.min(points.length - 2, Math.floor(residue)), t = residue - index;
  const a = points[Math.max(0, index - 1)], b = points[index], c = points[index + 1], d = points[Math.min(points.length - 1, index + 2)];
  return [0, 1, 2].map(axis => .5 * ((2 * b[axis]) + (-a[axis] + c[axis]) * t + (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t * t + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t ** 3));
}

/**
 * Illustrative trajectory into a published conformation, with local bond-length
 * relaxation. This is a visual construction, not a molecular-dynamics solver.
 */
export function proteinFrames(time) {
  const progress = .10 + .90 * smooth(time / 7.2);
  const points = PROTEIN_NATIVE.map((native, i) => {
    const s = i / (PROTEIN_RESIDUES - 1), angle = (s - .5) * Math.PI * 1.7, radius = 225 + Math.cos(s * TAU * 4) * 22;
    const loose = [Math.sin(angle) * radius, Math.cos(angle) * radius * .78, 90 * Math.sin(s * TAU * 6)];
    return native.map((value, axis) => mix(loose[axis], value, progress) + Math.sin(i * .61 + time * 1.5 + axis) * (1 - progress) * 1.6);
  });
  // Alternate the traversal to avoid moving one end of the chain preferentially.
  for (let iteration = 0; iteration < 10; iteration++) for (let j = 0; j < BONDS.length; j++) {
    const i = iteration % 2 ? BONDS.length - j - 1 : j;
    const a = points[i], b = points[i + 1], delta = b.map((value, axis) => value - a[axis]);
    const length = Math.hypot(...delta) || 1, correction = (length - BONDS[i]) / length * .42;
    for (let axis = 0; axis < 3; axis++) { a[axis] += delta[axis] * correction; b[axis] -= delta[axis] * correction; }
  }
  const count = (PROTEIN_RESIDUES - 1) * SAMPLES + 1;
  const positions = Array.from({ length: count }, (_, i) => catmull(points, i / SAMPLES));
  const frames = new Float64Array(count * FRAME_STRIDE);
  let normal = [0, 1, 0];
  for (let i = 0; i < count; i++) {
    const before = positions[Math.max(0, i - 1)], after = positions[Math.min(count - 1, i + 1)];
    const tangent = normalize(after.map((value, axis) => value - before[axis]));
    const dot = normal.reduce((sum, value, axis) => sum + value * tangent[axis], 0);
    let candidate = normal.map((value, axis) => value - dot * tangent[axis]);
    if (Math.hypot(...candidate) < .01) candidate = [-tangent[2], 0, tangent[0]];
    normal = normalize(candidate);
    const binormal = [tangent[1] * normal[2] - tangent[2] * normal[1], tangent[2] * normal[0] - tangent[0] * normal[2], tangent[0] * normal[1] - tangent[1] * normal[0]];
    frames.set([...positions[i], ...normal, ...binormal, widthAt(i / SAMPLES)], i * FRAME_STRIDE);
  }
  return { frames, points, progress, time };
}

let cachedCore;
export function proteinCoreFrames() { return cachedCore ??= proteinFrames(9); }

// A visible, illustrative ligand target; this is not an experimentally assigned
// ubiquitin ligand or a docking/affinity prediction.
export const BINDING_SITE = Object.freeze([0, -5, 35]);
export const BINDING_ATOMS = Array.from({ length: 6 }, (_, i) => {
  const a = i / 6 * TAU;
  return [BINDING_SITE[0] + Math.cos(a) * 20, BINDING_SITE[1] + Math.sin(a) * 20, BINDING_SITE[2] + Math.sin(a * 2) * 5];
});
export const BINDING_RESIDUES = [4, 5, 29, 42, 66, 68];
export function bindingContact(residue, atom, along, state, out = new Float64Array(3)) {
  const frames = state.frames, index = Math.round(residue * SAMPLES) * FRAME_STRIDE, target = BINDING_ATOMS[Math.max(0, Math.min(5, Math.round(atom)))];
  for (let axis = 0; axis < 3; axis++) out[axis] = mix(frames[index + axis], target[axis], along);
  return out;
}

export function proteinPoint(residue, across, thickness, state, out = new Float64Array(3)) {
  const sample = Math.max(0, Math.min((PROTEIN_RESIDUES - 1) * SAMPLES, residue * SAMPLES));
  const a = Math.floor(sample) * FRAME_STRIDE, b = Math.min(state.frames.length - FRAME_STRIDE, a + FRAME_STRIDE), t = sample - Math.floor(sample);
  const f = state.frames, width = mix(f[a + 9], f[b + 9], t);
  for (let axis = 0; axis < 3; axis++) out[axis] = mix(f[a + axis], f[b + axis], t) + mix(f[a + 3 + axis], f[b + 3 + axis], t) * across * width + mix(f[a + 6 + axis], f[b + 6 + axis], t) * thickness * 2.8;
  return out;
}
