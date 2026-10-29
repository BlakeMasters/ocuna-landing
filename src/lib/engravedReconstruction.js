const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const identity = () => [1, 0, 0, 1, 0, 0];
const point = (matrix, x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];

// A tiny Canvas-compatible line sink lets the moving scenery use exactly the
// same drawing functions for its held engraving and its reconstruction cuts.
// Paths contain geometry only; the current context supplies ink and transform.
export function createStrokeCapture() {
  const strokes = [], stack = [];
  let matrix = identity(), current;
  const createInkPath = () => {
    const segments = [];
    let cursor, first;
    return {
      segments,
      moveTo(x, y) { cursor = [x, y]; first = cursor; },
      lineTo(x, y) { if (cursor) segments.push([...cursor, x, y]); cursor = [x, y]; },
      closePath() { if (cursor && first) segments.push([...cursor, ...first]); cursor = first; },
    };
  };
  const context = {
    globalAlpha: 1, lineWidth: 1, strokeStyle: "#000000", lineCap: "butt", lineJoin: "miter",
    createInkPath,
    beginPath() { current = createInkPath(); },
    moveTo(x, y) { (current ??= createInkPath()).moveTo(x, y); },
    lineTo(x, y) { (current ??= createInkPath()).lineTo(x, y); },
    closePath() { current?.closePath(); },
    save() {
      stack.push({ matrix: matrix.slice(), globalAlpha: this.globalAlpha, lineWidth: this.lineWidth,
        strokeStyle: this.strokeStyle, lineCap: this.lineCap, lineJoin: this.lineJoin });
    },
    restore() {
      const saved = stack.pop();
      if (!saved) return;
      matrix = saved.matrix;
      for (const name of ["globalAlpha", "lineWidth", "strokeStyle", "lineCap", "lineJoin"]) this[name] = saved[name];
    },
    setTransform(a, b, c, d, e, f) {
      matrix = typeof a === "object" ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f];
    },
    resetTransform() { matrix = identity(); },
    transform(a, b, c, d, e, f) {
      const previous = matrix;
      matrix = [previous[0] * a + previous[2] * b, previous[1] * a + previous[3] * b,
        previous[0] * c + previous[2] * d, previous[1] * c + previous[3] * d,
        previous[0] * e + previous[2] * f + previous[4], previous[1] * e + previous[3] * f + previous[5]];
    },
    translate(x, y) { this.transform(1, 0, 0, 1, x, y); },
    scale(x, y = x) { this.transform(x, 0, 0, y, 0, 0); },
    rotate(angle) { const c = Math.cos(angle), s = Math.sin(angle); this.transform(c, s, -s, c, 0, 0); },
    stroke(path = current) {
      if (!path?.segments || this.globalAlpha <= 0) return;
      const widthScale = Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
      for (const segment of path.segments) {
        const a = point(matrix, segment[0], segment[1]), b = point(matrix, segment[2], segment[3]);
        if (![...a, ...b].every(Number.isFinite)) continue;
        strokes.push([...a, ...b, clamp(this.globalAlpha), this.lineWidth * widthScale, this.strokeStyle]);
      }
    },
  };
  return { context, strokes };
}

const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Alpha-weighted cell centroids retain fine engraved cuts and the filled
// molecular envelope. Every part of the picture enters the same particle set.
export function sampleCompositionParticles(data, width, height) {
  const particles = [];
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    let mass = 0, cx = 0, cy = 0, gx = 0, gy = 0;
    for (let yy = y; yy < Math.min(y + 2, height); yy++) for (let xx = x; xx < Math.min(x + 2, width); xx++) {
      const i = (yy * width + xx) * 4;
      const ink = data[i + 3] / 255 * (1 - (data[i] + data[i + 1] + data[i + 2]) / 765);
      mass += ink; cx += (xx + .5) * ink; cy += (yy + .5) * ink;
      gx += (xx - x ? 1 : -1) * ink; gy += (yy - y ? 1 : -1) * ink;
    }
    if (mass < .009) continue;
    const length = Math.hypot(gx, gy), angle = (x * .754877666 + y * .569840296) % (Math.PI * 2);
    const dx = length > .003 ? -gy / length * .48 : Math.cos(angle) * .48;
    const dy = length > .003 ? gx / length * .48 : Math.sin(angle) * .48;
    particles.push([cx / mass, cy / mass, dx, dy, Math.min(.94, mass * .9), 53]);
  }
  return particles;
}

// The outgoing picture breaks into independently moving cuts before fading;
// incoming cuts become visible while dispersed and then settle into the moving
// picture. One clock covers the whole scene, without a gathering point.
export const particleHandoff = progress => ease((progress - .28) / .44);

export function inPlaceParticleMark(particle, progress, incoming, width, height, out = new Float64Array(6), connected = true) {
  const raw = incoming ? (progress - .38) / .62 : progress / .56;
  const stage = ease(raw), scatter = incoming ? 1 - stage : stage;
  const cellX = Math.floor(particle[0] / 2), cellY = Math.floor(particle[1] / 2);
  let seed = (Math.imul(cellX + 17, 73856093) ^ Math.imul(cellY + 113, 19349663)) >>> 0;
  const random = () => {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909) >>> 0;
    return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
  };
  const rx = random() * 2 - 1, ry = random() * 2 - 1, angle = random() * Math.PI * 2;
  const cut = .65 + random() * .70, phase = progress * Math.PI * 1.7 + angle;
  const maxX = Math.min(width * .07, height * .24), maxY = Math.min(width * .045, height * .20);
  const sign = incoming ? -1 : 1;
  out[0] = particle[0] + (rx * .84 + Math.sin(phase) * .16) * maxX * scatter * sign;
  out[1] = particle[1] + (ry * .84 + Math.cos(phase) * .16) * maxY * scatter * sign;
  out[2] = mix(particle[2], Math.cos(angle + stage * .6) * cut, scatter);
  out[3] = mix(particle[3], Math.sin(angle + stage * .6) * cut, scatter);
  // The old and new loose fields share one continuous ink budget. In the
  // middle, outgoing cuts are still present when the incoming cuts arrive;
  // neither complete image is drawn and the particle field never resets.
  const transfer = particleHandoff(progress);
  const visibility = connected ? (incoming ? transfer : 1 - transfer)
    : incoming ? ease(stage / .28) : 1 - ease((stage - .55) / .45);
  out[4] = Math.min(1, particle[4] * visibility * (1 + scatter * .22));
  out[5] = 53;
  return out;
}

const particleCache = new WeakMap();
export function invalidateCompositionParticles(image) { particleCache.delete(image); }
function inkParticles(image, width, height) {
  if (!image) return [];
  if (!particleCache.has(image)) particleCache.set(image, sampleCompositionParticles(image.getContext("2d").getImageData(0, 0, width, height).data, width, height));
  return particleCache.get(image);
}

export function drawReconstructedComposition(context, from, to, progress, width, height, opacity = 1) {
  if (opacity <= 0 || (!from && !to)) return;
  const p = clamp(progress);
  const before = inkParticles(from, width, height), after = inkParticles(to, width, height);
  const outgoingPaint = from ? 1 - ease(p / .14) : 0;
  const incomingPaint = to ? ease((p - .84) / .16) : 0;
  context.save();
  // Painted holds only meet the particle system at the two ends; there is no
  // full-picture crossfade beneath the loose cuts in the middle.
  if (from && outgoingPaint > 0) { context.globalAlpha = opacity * outgoingPaint; context.drawImage(from, 0, 0); }
  if (to && incomingPaint > 0) { context.globalAlpha = opacity * incomingPaint; context.drawImage(to, 0, 0); }
  if (before.length || after.length) {
    const paths = Array.from({ length: 64 }, () => new Path2D()), point = new Float64Array(6);
    for (const [particles, incoming] of [[before, false], [after, true]]) {
      const strength = incoming ? 1 - incomingPaint : 1 - outgoingPaint;
      if (strength <= 0) continue;
      // A standalone opening starts forming immediately rather than waiting
      // for the outgoing chapter's breakup interval.
      const phase = !from ? .38 + p * .62 : !to ? p * .56 : p;
      for (const particle of particles) {
        inPlaceParticleMark(particle, phase, incoming, width, height, point, Boolean(from && to));
        const alpha = point[4] * strength; if (alpha < .007) continue;
        const bucket = Math.max(0, Math.min(63, Math.round(alpha * 64) - 1));
        paths[bucket].moveTo(point[0] - point[2], point[1] - point[3]);
        paths[bucket].lineTo(point[0] + point[2], point[1] + point[3]);
      }
    }
    context.strokeStyle = "#353535"; context.lineWidth = .82; context.lineCap = "round";
    paths.forEach((path, index) => { context.globalAlpha = opacity * (index + 1) / 64; context.stroke(path); });
  }
  context.restore();
}
