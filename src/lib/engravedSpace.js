const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const fract = value => value - Math.floor(value);
const hash = (index, salt = 0) => fract(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123);

// The weak-field Ellis deflection varies as 1 / impact². In Einstein-radius
// units its scalar lens equation is beta = theta - sign(theta) / theta².
// This is a sparse illustrative sky map, not full relativistic ray tracing.
export function lensedStarImages(sourceX, sourceY, einsteinRadius = 275) {
  const distance = Math.hypot(sourceX, sourceY), sourceRadius = Math.max(1e-7, distance);
  const directionX = distance > 1e-7 ? sourceX / distance : 1;
  const directionY = distance > 1e-7 ? sourceY / distance : 0;
  const beta = sourceRadius / einsteinRadius;
  const solve = outer => {
    let low = outer ? 1 : 1e-7, high = outer ? beta + 2 : 1;
    for (let i = 0; i < 32; i++) {
      const radius = (low + high) / 2;
      const value = outer ? radius - 1 / radius ** 2 : 1 / radius ** 2 - radius;
      if (outer ? value < beta : value > beta) low = radius; else high = radius;
    }
    return (low + high) / 2 * einsteinRadius * (outer ? 1 : -1);
  };
  return [true, false].map(outer => {
    const radius = solve(outer), magnification = Math.min(8, Math.abs(radius) / sourceRadius);
    return [directionX * radius, directionY * radius, magnification];
  });
}

// A space engraving is one composition: nearby worlds, bent orbital streams
// and debris moving towards the throat, rather than a static field behind it.
function spacePen(context, opacity, camera) {
  const paths = Array.from({ length: 16 }, () => (context.createInkPath?.() ?? new Path2D()));
  function line(x1, y1, x2, y2, alpha = .2, pale = false) {
    const y = (y1 + y2) / 2;
    const edge = clamp((y - camera.top) / 65) * clamp((camera.bottom - y) / 65);
    const ink = alpha * edge;
    if (ink < .025) return;
    const bucket = Math.min(7, Math.floor(clamp(ink / .48) * 8)) + (pale ? 8 : 0);
    paths[bucket].moveTo(x1, y1); paths[bucket].lineTo(x2, y2);
  }
  function curve(fn, steps, alpha = .2, pale = false, gate = null) {
    let a = fn(0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, b = fn(t);
      if (!gate || gate(a, b, t)) line(a[0], a[1], b[0], b[1], typeof alpha === "function" ? alpha(t) : alpha, pale);
      a = b;
    }
  }
  function ellipse(cx, cy, rx, ry, tilt, alpha = .2, from = 0, to = TAU, gate = null) {
    const c = Math.cos(tilt), s = Math.sin(tilt);
    curve(t => {
      const a = from + t * (to - from), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      return [cx + x * c - y * s, cy + x * s + y * c];
    }, Math.ceil(Math.max(rx, ry) * Math.abs(to - from) / 9) + 12, alpha, false, gate);
  }
  return {
    line, curve, ellipse,
    finish() {
      context.lineCap = "round"; context.lineWidth = 1.65;
      for (let i = 0; i < paths.length; i++) {
        context.strokeStyle = i < 8 ? "#393939" : "#777777";
        context.globalAlpha = opacity * ((i % 8 + .5) / 8) * .48;
        context.stroke(paths[i]);
      }
    },
  };
}

function ringedWorld(p, cx, cy, radius, seconds) {
  const tilt = -.32 + Math.sin(seconds * .028) * .035;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const outside = (a, b) => Math.hypot((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy) > radius * 1.015;
  // The positive local-y half is nearer to the viewer. Its annular band
  // occludes the globe's hatch cuts and limb, not the other way around.
  // Removing those hidden cuts also preserves depth when ink is shade-batched.
  const inFrontRing = (x, y) => {
    const dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c;
    return v > 0 && (u / (radius * 1.46)) ** 2 + (v / (radius * .27)) ** 2 >= 1
      && (u / (radius * 1.96)) ** 2 + (v / (radius * .39)) ** 2 <= 1;
  };
  const exposed = (a, b) => !inFrontRing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  const ringBand = (rx, ry, alpha) => {
    // Rear ribbon vanishes at the globe. Near ribbon continues across its face.
    p.ellipse(cx, cy, radius * rx, radius * ry, tilt, alpha, Math.PI, TAU, outside);
    p.ellipse(cx, cy, radius * rx, radius * ry, tilt, alpha, 0, Math.PI);
  };
  for (let band = 0; band < 10; band++) ringBand(1.48 + band * .047, .27 + band * .012, band % 3 === 0 ? .33 : .16);
  const spin = seconds * .045;
  for (let y = -radius + 2; y < radius; y += 4.6) {
    const span = Math.sqrt(Math.max(0, radius * radius - y * y));
    for (let x = -span; x < span; x += 9) {
      const longitude = Math.atan2(x, Math.sqrt(Math.max(0, radius * radius - x * x - y * y)));
      const z = Math.sqrt(Math.max(0, 1 - (x * x + y * y) / radius ** 2));
      const light = clamp(x / radius * .57 - y / radius * .16 + z * .70);
      const belt = Math.sin(y / radius * 27 + Math.sin(longitude * 3 + spin) * .48);
      const shade = .14 + (1 - light) * .20 + belt * .055;
      if (hash(Math.round(y * 4 + x), 3) < .10) continue;
      const wobble = Math.sin(longitude * 4 + spin) * 2.2;
      const a = [cx + x, cy + y + wobble], b = [cx + Math.min(span, x + 7.3), cy + y + wobble - .8];
      if (exposed(a, b)) p.line(...a, ...b, shade);
    }
  }
  p.ellipse(cx, cy, radius, radius, 0, .31, 0, TAU, exposed);
  p.ellipse(cx, cy, radius + 3, radius + 3, 0, .10, 0, TAU, exposed);
  // A few stronger ring edges hold the wide silhouette at small display sizes.
  ringBand(1.96, .39, .34);
  ringBand(1.46, .27, .27);
}

function crescentWorld(p, cx, cy, radius, seconds) {
  const phase = .35 + Math.sin(seconds * .023) * .07;
  for (let y = -radius + 3; y < radius; y += 4.2) {
    const span = Math.sqrt(Math.max(0, radius * radius - y * y)), terminator = -span * phase;
    for (let x = -span; x < span; x += 8.5) {
      const lit = x < terminator;
      if (!lit && hash(x * 2 + y, 7) < .77) continue;
      const texture = Math.sin(x * .047 + y * .027 + seconds * .015) * Math.cos(y * .057);
      const alpha = lit ? .20 + texture * .065 + (-x / radius) * .085 : .075;
      p.line(cx + x, cy + y, cx + Math.min(span, x + 6.5), cy + y - 1, alpha, !lit);
    }
  }
  p.ellipse(cx, cy, radius, radius, 0, .17);
  p.curve(t => {
    const a = -Math.PI / 2 + t * Math.PI;
    return [cx - Math.cos(a) * radius * phase, cy + Math.sin(a) * radius];
  }, 100, .27);
  // Irregular crater rims live only on the lit crescent, not as floating dots.
  for (let crater = 0; crater < 23; crater++) {
    const a = hash(crater, 13) * TAU, r = Math.sqrt(hash(crater, 17)) * radius * .86;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const span = Math.sqrt(Math.max(0, radius * radius - y * y));
    if (x > -span * phase - 7) continue;
    const size = 4 + hash(crater, 19) ** 2 * 16, squash = Math.max(.28, Math.sqrt(Math.max(0, 1 - r * r / radius ** 2)));
    p.ellipse(cx + x, cy + y, size * squash, size, -.2, .31);
    p.ellipse(cx + x + 1, cy + y + 1, size * squash * .7, size * .7, -.2, .16);
  }
}

function stellarFlow(p, seconds, camera) {
  const centre = [700, 400], span = camera.right - camera.left;
  const route = (side, lane, u) => {
    // A hyperbolic flyby bends around the mouth instead of terminating in the
    // middle. A traversable wormhole need not behave like an accretion drain.
    const distance = (u * 2 - 1) * span * .56;
    const impact = 288 + lane * 32;
    const bend = Math.sqrt(impact * impact + distance * distance * .035);
    return [centre[0] + distance, centre[1] + side * (bend - 36)];
  };
  for (const side of [-1, 1]) for (let lane = 0; lane < 3; lane++) {
    p.curve(t => route(side, lane, t), Math.ceil(span / 40), t => .055 + Math.sin(t * Math.PI) * .045, true);
    for (let packet = 0; packet < 3; packet++) {
      const u = fract(seconds * (.048 + lane * .003) * side + packet / 3 + lane * .081);
      const tail = Math.max(0, u - .017), lead = Math.min(1, u + .006);
      p.curve(t => route(side, lane, tail + (lead - tail) * t), 6, t => (.10 + t * .14) * Math.min(1, u * 12, (1 - u) * 12));
    }
  }
  // Sparse bodies drift on separate wide flybys, with no fast inward suction.
  for (const side of [-1, 1]) for (let rock = 0; rock < 6; rock++) {
    const lane = side < 0 ? 0 : 1;
    const u = fract(seconds * .023 * side + rock / 6 + (side > 0 ? .031 : .19));
    const point = route(side, lane, u), size = (7 + hash(rock, side + 4) * 17) * (.40 + .8 * (1 - u));
    const turn = seconds * (.11 + hash(rock, 3) * .09) * side + rock;
    const alpha = .26 * Math.min(1, u * 12, (1 - u) * 12);
    p.curve(t => {
      const a = t * TAU + turn, rough = .78 + hash(Math.floor(t * 7) + rock * 8, side) * .22;
      return [point[0] + Math.cos(a) * size * rough, point[1] + Math.sin(a) * size * .64 * rough];
    }, 14, alpha);
    p.line(point[0] - size * .4, point[1] - size * .2, point[0] + size * .4, point[1] + size * .1, alpha * .6);
  }
}

function lensedSky(p, seconds) {
  const centre = [700, 400], ring = 275;
  // Background sources pass behind the mouth. Their paired images move along
  // opposite arcs and stretch near alignment, making the lens itself legible.
  for (let star = 0; star < 56; star++) {
    const a = hash(star, 83) * TAU;
    const radius = 30 + hash(star, 89) ** 1.5 * 480;
    const sx = Math.cos(a) * radius + Math.sin(seconds * .15) * 155;
    const sy = Math.sin(a) * radius * .78 + Math.cos(seconds * .12) * 65;
    for (const [index, image] of lensedStarImages(sx, sy, ring).entries()) {
      const [x, y, stretch] = image, r = Math.hypot(x, y), angle = Math.atan2(y, x);
      const halfArc = Math.min(.05, (.9 + hash(star, 97) * 1.4) * stretch / r);
      const alpha = (index ? .18 : .25) * (.65 + hash(star, 101) * .35);
      p.curve(t => {
        const phi = angle + (t * 2 - 1) * halfArc;
        return [centre[0] + Math.cos(phi) * r, centre[1] + Math.sin(phi) * r];
      }, 5, alpha);
    }
  }
  // An extended, tilted galactic source becomes a pair of long image arcs.
  // Separate faint cuts preserve the paper showing through the Einstein ring.
  for (let band = 0; band < 7; band++) for (const image of [0, 1]) {
    p.curve(t => {
      const sourceX = (t * 2 - 1) * 320 + Math.sin(seconds * .15) * 155;
      const sourceY = 26 + band * 3 + sourceX * .16 + Math.sin(seconds * .23) * 24;
      const point = lensedStarImages(sourceX, sourceY, ring)[image];
      return [centre[0] + point[0], centre[1] + point[1]];
    }, 120, .11 + (band % 3) * .025, true);
  }
}

function starField(p, seconds, camera) {
  const span = camera.right - camera.left, count = Math.min(280, Math.ceil(span / 17));
  for (let star = 0; star < count; star++) {
    const depth = hash(star, 47), drift = seconds * (3 + depth ** 2 * 22);
    const fraction = fract(hash(star, 31) + drift / span);
    const x = camera.left + fraction * span;
    const y = camera.top + 45 + hash(star, 37) * (camera.bottom - camera.top - 90) + Math.cos(seconds * .09 + star * .7) * 5 * depth;
    const distance = Math.hypot((x - 700) * .95, y - 420);
    if (distance < 340) continue;
    const visibility = clamp((distance - 340) / 85) * Math.min(1, fraction * 30, (1 - fraction) * 30);
    const brightness = (.13 + hash(star, 41) * .17) * visibility, size = 1.6 + hash(star, 43) ** 4 * 5;
    const twinkle = .84 + Math.sin(seconds * .55 + star * 3) * .16;
    p.line(x - size, y, x + size, y, brightness * twinkle);
    if (star % 7 === 0) p.line(x, y - size, x, y + size, brightness * twinkle);
    if (depth > .82) p.line(x - size - depth * 10, y + 1, x - size - 2, y + 1, brightness * .46);
  }
  // The distant star swath bends towards the portal rather than making a grid.
  for (let star = 0; star < 110; star++) {
    const x = camera.left + hash(star, 53) * span;
    const y = 250 + Math.sin((x - 700) / span * Math.PI * 1.7) * 190 + (hash(star, 59) - .5) * 100;
    if (Math.abs(x - 700) < 370) continue;
    const drift = Math.sin(seconds * .018 + star) * 2, length = 1 + hash(star, 61) * 2;
    p.line(x + drift, y, x + drift + length, y - .6, .10 + hash(star, 67) * .14, true);
  }
}

function galacticFilament(p, seconds, camera) {
  const span = camera.right - camera.left;
  const at = (x, cross) => {
    const dx = x - 700;
    const y = 390 + Math.sin(dx * .0012 + .55 + seconds * .045) * 150 + cross;
    const dy = y - 400, lens = 1 + 275 ** 2 / (dx * dx + dy * dy + 210 ** 2);
    return [700 + dx * (1 + (lens - 1) * .08), 400 + dy * lens];
  };
  // A distant, broken stellar band supplies a continuous spatial scale behind
  // the worlds. Its centre bows around the lens; no rectangular sky wash is used.
  for (let cut = 0; cut < 490; cut++) {
    const x = camera.left + hash(cut, 131) * span;
    const cross = (hash(cut, 137) - .5) * 87;
    const point = at(x, cross), next = at(x + 3 + hash(cut, 139) * 12, cross - 1.3);
    const density = (1 - Math.abs(cross) / 65) * (.07 + hash(cut, 149) * .065);
    p.line(...point, ...next, density, true);
  }
}

export function drawEngravedSpace(context, seconds, camera, opacity = 1) {
  if (opacity <= 0) return;
  context.save();
  const p = spacePen(context, clamp(opacity), camera), span = camera.right - camera.left;
  galacticFilament(p, seconds, camera);
  starField(p, seconds, camera);
  stellarFlow(p, seconds, camera);
  lensedSky(p, seconds);
  const leftDistance = Math.min(1370, span * .43), rightDistance = Math.min(1600, span * .44);
  const leftRadius = Math.min(170, span * .087), rightRadius = Math.min(196, span * .092);
  ringedWorld(p, 700 - leftDistance + Math.sin(seconds * .022) * 17, 215 + Math.sin(seconds * .033) * 12, leftRadius, seconds);
  crescentWorld(p, 700 + rightDistance + Math.cos(seconds * .017) * 21, 605 + Math.sin(seconds * .026) * 14, rightRadius, seconds);
  p.finish();
  context.restore();
}
