import { sceneStart } from "./engravedTimeline.js";

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const varied = value => { const n = Math.sin(value * 127.13 + 43.71) * 43758.5453; return n - Math.floor(n); };

// Active supporting subjects share the plate's camera and clock. Cuts are
// batched by shade rather than becoming separate animated DOM objects.
function pen(context, opacity) {
  const levels = [.12, .20, .29, .40, .54, .66];
  const paths = levels.map(() => (context.createInkPath?.() ?? new Path2D()));
  function line(x1, y1, x2, y2, alpha = .29) {
    const bucket = Math.max(0, Math.min(levels.length - 1, Math.round((alpha - .1) / .11)));
    paths[bucket].moveTo(x1, y1); paths[bucket].lineTo(x2, y2);
  }
  function path(points, alpha = .29) {
    for (let i = 1; i < points.length; i++) line(...points[i - 1], ...points[i], alpha);
  }
  function curve(fn, steps = 70, alpha = .29, broken = false) {
    let before = fn(0);
    for (let i = 1; i <= steps; i++) {
      const point = fn(i / steps);
      if (!broken || varied(i * 1.17 + steps) > .08) line(...before, ...point, typeof alpha === "function" ? alpha((i - .5) / steps) : alpha);
      before = point;
    }
  }
  function ellipse(x, y, rx, ry, alpha = .29, angle = 0, start = 0, end = TAU) {
    const c = Math.cos(angle), s = Math.sin(angle);
    curve(t => { const a = mix(start, end, t), u = Math.cos(a) * rx, v = Math.sin(a) * ry; return [x + u * c - v * s, y + u * s + v * c]; }, Math.max(20, Math.ceil(Math.max(rx, ry) * Math.abs(end - start) / 7)), alpha);
  }
  return {
    line, path, curve, ellipse,
    finish() {
      context.strokeStyle = "#454545"; context.lineCap = "round"; context.lineJoin = "round";
      paths.forEach((path, index) => { context.globalAlpha = opacity * levels[index]; context.lineWidth = index > 3 ? 1.45 : 1.25; context.stroke(path); });
    },
  };
}

function pine(p, x, ground, height, id, time) {
  const growth = ease((time + 3 - id * .11) / (4.5 + varied(id + 8) * .8));
  const lean = (varied(id + 3) - .5) * height * .18;
  const center = u => [x + lean * u + Math.sin(u * 3.4 + id) * height * .035 * u + Math.sin(time * .42 + id * 1.4) * u * u * 3.3, ground - height * u];
  for (const cut of [-1, 0, 1]) p.curve(t => {
    const u = growth * t, point = center(u), width = (1 - u) * height * .014;
    return [point[0] + cut * width, point[1]];
  }, 45, cut === 0 ? .40 : .20, true);
  const levels = 4 + Math.round(varied(id + 4) * 2);
  for (let level = 0; level < levels; level++) {
    const station = .20 + level / levels * .70;
    const progress = ease((growth - station) / .15);
    if (!progress) continue;
    const root = center(station);
    for (const side of [-1, 1]) {
      const width = height * (.29 - station * .19) * (.82 + varied(id * 13 + level * 4 + side) * .36);
      const tip = [root[0] + side * width, root[1] - height * (.018 + varied(id * 7 + level) * .025)];
      const branch = t => [mix(root[0], tip[0], t), mix(root[1], tip[1], t) + Math.sin(t * Math.PI) * height * .035];
      p.curve(t => branch(t * progress), 22, .29);
      const needles = ease((progress - .38) / .62);
      if (!needles) continue;
      for (let tuft = 0; tuft < 10; tuft++) {
        const t = .12 + tuft / 10 * .86, at = branch(t), size = (5 + varied(id * 37 + tuft + level * 11) * 7) * needles;
        for (let fan = 0; fan < 5; fan++) {
          const angle = -Math.PI * .88 + fan / 4 * Math.PI * .80 + Math.sin(t * 5 + time * .25 + id) * .06;
          p.line(...at, at[0] + Math.cos(angle) * size, at[1] + Math.sin(angle) * size, .15 + needles * .10);
        }
      }
    }
  }
  // A few root/ground cuts anchor each unpotted tree to the same terrace.
  for (let cut = 0; cut < 4; cut++) p.line(x - 15 + cut * 9, ground + 2, x - 12 + cut * 9, ground + 4, .16);
}

function grove(p, time, camera) {
  for (const side of [-1, 1]) {
    const low = side < 0 ? camera.left + 70 : 1120, high = side < 0 ? 280 : camera.right - 70;
    for (let tree = 0; tree < 3; tree++) {
      const id = tree + (side > 0 ? 3 : 0), fraction = [ .10, .49, .88 ][tree];
      const x = mix(low, high, fraction), height = [190, 280, 225, 250, 175, 300][id];
      pine(p, x, 744 + Math.sin(id * 2.1) * 22, height, id, time);
    }
  }
}

function cog(p, cx, cy, radius, angle, id) {
  const teeth = Math.round(radius / 3.6);
  const outer = [];
  for (let tooth = 0; tooth < teeth; tooth++) for (const [phase, r] of [[.02, radius - 5], [.20, radius + 3], [.70, radius + 3], [.90, radius - 5]]) {
    const a = angle + (tooth + phase) / teeth * TAU;
    outer.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  outer.push(outer[0]);
  p.path(outer, .40);
  p.ellipse(cx, cy, radius - 10, radius - 10, .29);
  p.ellipse(cx, cy, radius - 15, radius - 15, .16);
  p.ellipse(cx, cy, radius * .73, radius * .73, .29);
  for (let spoke = 0; spoke < 6; spoke++) {
    const a = angle + spoke / 6 * TAU, c = Math.cos(a), s = Math.sin(a), n = radius * .045;
    for (const side of [-1, 1]) p.line(cx + c * 16 - s * n * side, cy + s * 16 + c * n * side, cx + c * radius * .70 - s * n * side, cy + s * radius * .70 + c * n * side, .29);
    const bolt = radius * .84;
    p.ellipse(cx + c * bolt, cy + s * bolt, 2.5, 2.5, .29);
  }
  for (let cut = 0; cut < 38; cut++) {
    const a = angle + cut / 38 * TAU, r = radius * (.80 + varied(cut + id * 13) * .08);
    p.line(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a + .023) * (radius - 15), cy + Math.sin(a + .023) * (radius - 15), .16);
  }
  p.ellipse(cx, cy, 14, 14, .40); p.ellipse(cx, cy, 6, 6, .40);
  p.line(cx - 3, cy - 1, cx + 4, cy + 2, .54);
}

function gearTrain(p, time, camera) {
  for (const side of [-1, 1]) {
    let previous = { x: 700 + side * 412, y: 408, r: 33 };
    for (let i = 0; i < 5; i++) {
      const x = 700 + side * [560, 1240, 1880, 2420, 2850][i], y = [554, 606, 524, 582, 548][i] + side * 11;
      const r = [85, 124, 108, 139, 95][i];
      if (x + r < camera.left - 60 || x - r > camera.right + 60) continue;
      const dx = x - previous.x, dy = y - previous.y, length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
      for (const edge of [-1, 1]) {
        p.line(previous.x + nx * previous.r * edge, previous.y + ny * previous.r * edge, x - nx * r * edge, y - ny * r * edge, .20);
        p.line(previous.x + nx * (previous.r - 3) * edge, previous.y + ny * (previous.r - 3) * edge, x - nx * (r - 3) * edge, y - ny * (r - 3) * edge, .12);
      }
      const direction = i % 2 ? -side : side;
      cog(p, x, y, r, time * .23 * 85 / r * direction + i * .31, i + (side > 0 ? 10 : 0));
      // A short upright and bearing carry the weight of each wheel.
      p.path([[x - 12, y + 13], [x - 20, 716], [x + 20, 716], [x + 12, y + 13]], .16);
      p.line(x - 31, 720, x + 31, 720, .20);
      previous = { x, y, r };
    }
  }
}

function pointOnPath(points, fraction) {
  const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]));
  let distance = clamp(fraction) * lengths.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const t = distance / lengths[i];
      return [mix(points[i][0], points[i + 1][0], t), mix(points[i][1], points[i + 1][1], t), Math.atan2(points[i + 1][1] - points[i][1], points[i + 1][0] - points[i][0])];
    }
    distance -= lengths[i];
  }
  return [...points[0], 0];
}

function packet(p, x, y, size, alpha) {
  p.path([[x, y - size], [x + size, y - size * .45], [x, y + size * .12], [x - size, y - size * .45], [x, y - size]], alpha);
  p.path([[x - size, y - size * .45], [x - size, y + size * .55], [x, y + size * 1.10], [x + size, y + size * .55], [x + size, y - size * .45]], alpha);
  p.line(x, y + size * .12, x, y + size * 1.10, alpha);
}

function rails(p, time, camera) {
  for (const side of [-1, 1]) for (let lane = 0; lane < 4; lane++) {
    const far = side < 0 ? camera.left - 40 : camera.right + 40, y = 658 + lane * 21;
    const extent = Math.abs(far - 700), scale = Math.min(1, (extent - 280) / 1920);
    const x = offset => 700 + side * (240 + (offset - 240) * scale);
    const points = [[x(240 + lane * 18), 618 + lane * 12], [x(520), y], [x(990), y], [x(1120), y - 48], [x(1540), y - 48], [x(1740), y + 34], [far, y + 34]];
    p.path(points, lane === 1 ? .29 : .16);
    p.path(points.map(([x, yy]) => [x, yy + 4]), .12);
    for (const index of [1, 3, 4]) p.ellipse(points[index][0], points[index][1] + 2, 6, 4, .20);
    for (let item = 0; item < 4; item++) {
      const fraction = ((time * .073 + item / 4 + lane * .093 + (side > 0 ? .19 : 0)) % 1 + 1) % 1;
      const point = pointOnPath(points, lane % 2 ? 1 - fraction : fraction);
      const intensity = Math.min(1, fraction * 12, (1 - fraction) * 12);
      packet(p, point[0], point[1] - 3, 8 + lane % 2 * 2, .29 + intensity * .25);
      p.line(point[0] - Math.cos(point[2]) * 26, point[1] - Math.sin(point[2]) * 26 + 2, point[0] - Math.cos(point[2]) * 10, point[1] - Math.sin(point[2]) * 10 + 2, .16);
    }
  }
}

function ribbon(p, cx, cy, size, id, time) {
  const fold = ease((time + 2 - id * .17) / 10), yaw = time * .075 + id * .83;
  const c = Math.cos(yaw), s = Math.sin(yaw), turns = 3.2 + id % 3 * .55;
  function center(u) {
    const a = u * TAU * turns + id * .7;
    const openX = (u - .5) * 330 * size, openY = Math.sin(u * 8 + id) * 38 * size;
    const x = Math.cos(a) * 71 * size, z = Math.sin(a) * 71 * size;
    const closedX = x * c + z * s, closedY = (u - .5) * 277 * size + z * .18;
    const px = mix(openX, closedX, fold), py = mix(openY, closedY, fold);
    const bank = .32 + Math.sin(time * .12 + id) * .18, bc = Math.cos(bank), bs = Math.sin(bank);
    return [cx + px * bc - py * bs, cy + px * bs + py * bc, z];
  }
  function point(u, across = 0) {
    const at = center(u), before = center(Math.max(0, u - .002)), after = center(Math.min(1, u + .002));
    const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
    const width = 10 * size * Math.sin(Math.PI * u) * across;
    return [at[0] - dy / length * width, at[1] + dx / length * width, at[2]];
  }
  for (const across of [-1, 1]) p.curve(u => point(u, across).slice(0, 2), 140, u => .29 + (center(u)[2] / (142 * size) + .5) * .20);
  for (let cut = 0; cut <= 70; cut++) {
    const u = cut / 70;
    p.line(...point(u, -1).slice(0, 2), ...point(u, 1).slice(0, 2), .16);
  }
  // Flexible tails keep each coil a connected molecular ribbon.
  for (const end of [0, 1]) {
    const root = point(end), sign = end ? 1 : -1;
    p.curve(t => [root[0] + sign * t * size * 88 + Math.sin(t * 6 + time * .3 + id) * size * t * 15, root[1] + sign * t * size * 22 + Math.sin(t * Math.PI) * 18 * size], 36, .20, true);
  }
}

function molecularField(p, time, camera) {
  let id = 0;
  for (const side of [-1, 1]) {
    const low = side < 0 ? camera.left + 100 : 1130, high = side < 0 ? 270 : camera.right - 100;
    const count = high - low > 950 ? 3 : 1;
    for (let item = 0; item < count; item++) {
      const fraction = count === 1 ? .5 : [.12, .51, .89][item];
      ribbon(p, mix(low, high, fraction), 420 + Math.sin(id * 2.3) * 82, [.85, 1.12, .73, 1.06, .77, .95][id % 6], id, time);
      id++;
    }
    for (let strand = 0; strand < 4; strand++) p.curve(t => {
      const x = mix(low - 120, high + 120, t);
      return [x, 660 + Math.sin(t * 8 + time * .17 + side * .6) * 39 + strand * 7 + Math.sin(t * 23 - time * .12) * 7];
    }, 140, .12, strand % 2 === 0);
  }
}

export function drawEngravedContinuum(context, scene, seconds, camera, opacity = 1) {
  if (opacity <= 0 || ![2, 3, 5, 7].includes(scene)) return;
  const time = seconds - sceneStart(scene), p = pen(context, clamp(opacity));
  context.save();
  if (scene === 2) grove(p, time, camera);
  if (scene === 3) gearTrain(p, time, camera);
  if (scene === 5) rails(p, time, camera);
  if (scene === 7) molecularField(p, time, camera);
  p.finish(); context.restore();
}
