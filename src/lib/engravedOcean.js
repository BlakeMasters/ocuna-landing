const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const fract = n => n - Math.floor(n);
const hash = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

// The crests have individual lengths, heights and phases. They inhabit one
// continuous water surface rather than repeated tiles of the central artwork.
const CRESTS = [
  { x: -1470, rise: 166, spread: 222, radius: 114, y: 389, phase: 2.4, lean: -.12, speed: 17 },
  { x: -440, rise: 114, spread: 280, radius: 0, y: 415, phase: .8, lean: 0, speed: 24 },
  { x: 854, rise: 235, spread: 164, radius: 180, y: 335, phase: 0, lean: 0, speed: 21 },
  { x: 1910, rise: 150, spread: 300, radius: 0, y: 397, phase: 3.1, lean: 0, speed: 16 },
  { x: 2835, rise: 194, spread: 235, radius: 142, y: 370, phase: 1.7, lean: .17, speed: 19 },
];

export function oceanCrests(seconds) {
  return CRESTS.map(crest => {
    const phase = seconds * .59 + crest.phase, breaker = Math.sin(phase);
    return {
      ...crest,
      x: crest.x + seconds * crest.speed + Math.sin(seconds * .31 + crest.phase) * 35,
      rise: crest.rise * (1 + breaker * .11),
      radius: crest.radius * (1 + Math.sin(phase - .45) * .105),
      y: crest.y + Math.sin(phase + .65) * 11,
      roll: crest.lean + Math.sin(phase - .25) * .105,
      tip: Math.sin(phase + .6) * .26,
    };
  });
}

// A breaker unrolls from the water into a tightening lip. Its shape changes as
// it advances, rather than translating an otherwise rigid engraved curl.
export function oceanCurlPoint(crest, depth, u, central = false) {
  const radius = crest.radius * (.67 + depth * .35);
  const angle = mix(-2.72, (central ? 1.35 : 1.13) + crest.tip, u);
  const taper = .68 + u * .32, bend = Math.sin(u * Math.PI) * crest.tip * radius * .12;
  const px = Math.cos(angle) * radius * taper + bend;
  const py = Math.sin(angle) * radius * (.86 + depth * .12) + depth * 12;
  return [crest.x + px * Math.cos(crest.roll) - py * Math.sin(crest.roll),
    crest.y + px * Math.sin(crest.roll) + py * Math.cos(crest.roll)];
}

export function oceanSurfacePoint(x, depth, seconds, crests = oceanCrests(seconds), bottom = 925) {
  const v = clamp(depth), near = (1 - v) ** 1.7;
  let lift = 0;
  for (const crest of crests) {
    const distance = (x - crest.x) / (crest.spread + v * 145);
    lift += crest.rise * Math.exp(-distance * distance) * near;
  }
  const ripple = Math.sin(x * .025 - seconds * 1.35 + v * 21) * (3 + v * 8)
    + Math.sin(x * .062 - seconds * 2.1 - v * 14) * (1.3 + v * 1.7);
  const swell = Math.sin(x * .0038 - seconds * .43 + v * 4.6) * (9 + v * 17);
  const orbit = Math.sin(x * .014 - seconds * 1.05 + v * 6) * v * (4 + v * 7);
  return [x + orbit, 425 + v ** 1.3 * (bottom - 425) - lift + ripple + swell];
}

// context already has the shared world camera. One small set of batched paths
// carries the entire moving ocean, including the portions outside the old plate.
export function drawEngravedOcean(context, seconds, camera, opacity = 1) {
  if (opacity <= 0) return;
  const crests = oceanCrests(seconds), span = camera.right - camera.left;
  const left = camera.left - 35, right = camera.right + 35;
  const bottom = Math.max(860, camera.bottom + 45);
  const steps = Math.max(75, Math.min(210, Math.ceil(span / 31)));
  const paths = Array.from({ length: 7 }, () => (context.createInkPath?.() ?? new Path2D()));
  const cut = (path, x1, y1, x2, y2) => { path.moveTo(x1, y1); path.lineTo(x2, y2); };

  // Closely spaced far water opens into longer, irregular foreground cuts.
  for (let row = 0; row < 41; row++) {
    const v = row / 40, path = paths[row % 5];
    let previous = oceanSurfacePoint(left, v, seconds, crests, bottom);
    for (let step = 1; step <= steps; step++) {
      const x = mix(left, right, step / steps);
      const point = oceanSurfacePoint(x, v, seconds, crests, bottom);
      if (hash(row * 1013 + step * 7) > .045) cut(path, ...previous, ...point);
      previous = point;
    }
  }

  // Rolled lips join the same moving crests. Only three crests break; the others
  // remain low traveling swells so the panorama has a readable rhythm.
  for (let id = 0; id < crests.length; id++) {
    const crest = crests[id];
    if (!crest.radius || crest.x + crest.radius * 1.4 < left || crest.x - crest.radius * 1.4 > right) continue;
    const central = id === 2, ribbons = central ? 25 : 16;
    for (let ribbon = 0; ribbon < ribbons; ribbon++) {
      const v = ribbon / (ribbons - 1);
      const path = paths[central ? 6 : 5], points = central ? 58 : 43;
      const at = u => oceanCurlPoint(crest, v, u, central);
      let previous = at(0);
      for (let step = 1; step <= points; step++) {
        const point = at(step / points);
        if (hash(step * 13 + ribbon * 199 + id * 71) > .025) cut(path, ...previous, ...point);
        previous = point;
      }
    }
    // Spray peels from the moving crown, rises, then falls. The cut contracts
    // to zero at either end of its flight, so its periodic reset is invisible.
    const spray = paths[5];
    for (let fleck = 0; fleck < (central ? 58 : 29); fleck++) {
      const age = fract(seconds * (.31 + hash(fleck * 17 + id) * .14) + hash(fleck * 29 + id * 7));
      const source = oceanCurlPoint(crest, .78 + hash(fleck * 13) * .22, .10 + hash(fleck * 31) * .36, central);
      const speed = 34 + hash(fleck * 37 + id) * 67;
      const x = source[0] + age * speed;
      const y = source[1] - age * (44 + hash(fleck * 41) * 76) + age * age * 130;
      const size = (1.4 + hash(fleck * 43 + id) * 3.8) * Math.sin(age * Math.PI);
      const slope = -.7 + age * 1.8;
      cut(spray, x - size, y - size * slope, x + size * .65, y + size * .65 * slope);
    }
    // Broken foam cuts run down the curl as water turns over the crest. These
    // stay few and pale: they give the large contour motion an internal flow.
    for (let foam = 0; foam < (central ? 34 : 20); foam++) {
      const u = fract(seconds * (.16 + hash(foam * 67 + id) * .055) + hash(foam * 23 + id));
      const v = .10 + hash(foam * 41 + id) * .82;
      const extent = (.012 + hash(foam * 19) * .014) * Math.sin(u * Math.PI);
      const a = oceanCurlPoint(crest, v, Math.max(0, u - extent), central);
      const b = oceanCurlPoint(crest, v, Math.min(1, u + extent), central);
      cut(spray, ...a, ...b);
    }
  }

  // Short bright-water cuts move with the current instead of forming a static
  // floor grid. Their spacing and length vary from bank to bank.
  for (let i = 0; i < 110; i++) {
    const drift = seconds * (15 + hash(i * 41) * 18);
    const x = left + ((hash(i * 23) * (span + 70) + drift) % (span + 70));
    const v = .20 + hash(i * 59) * .72;
    const point = oceanSurfacePoint(x, v, seconds, crests, bottom);
    const length = 8 + hash(i * 37) * 31;
    cut(paths[5], point[0], point[1] - 2, point[0] + length, point[1] - 3.5);
  }

  context.save();
  context.strokeStyle = "#414141"; context.lineCap = "round"; context.lineJoin = "round";
  for (let bucket = 0; bucket < paths.length; bucket++) {
    context.lineWidth = bucket >= 5 ? 1.25 : 1.55;
    context.globalAlpha = opacity * [ .22, .255, .29, .325, .36, .31, .48 ][bucket];
    context.stroke(paths[bucket]);
  }

  // The original low sun remains part of the sea composition, with a fine wash
  // of engraved latitude cuts instead of a filled disc.
  const sunX = 288, sunY = 234, radius = 51, sun = (context.createInkPath?.() ?? new Path2D());
  for (let step = 0; step <= 64; step++) {
    const a = step / 64 * TAU, x = sunX + Math.cos(a) * radius, y = sunY + Math.sin(a) * radius;
    if (step) sun.lineTo(x, y); else sun.moveTo(x, y);
  }
  for (let y = -46; y <= 46; y += 5) {
    const extent = Math.sqrt(radius * radius - y * y);
    cut(sun, sunX - extent, sunY + y, sunX + extent, sunY + y);
  }
  context.globalAlpha = opacity * .22; context.lineWidth = 1.1; context.stroke(sun);
  context.restore();
}
