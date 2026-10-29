const clamp = t => Math.max(0, Math.min(1, t));
const mix = (a, b, t) => a + (b - a) * t;
export const ROBOT_MODEL = Object.freeze({ l1: .38, l2: .32, m1: 1.6, m2: 1.1, payload: .18, g: 9.81, scale: 750 });
export const ROBOT_BASE = Object.freeze([-230, 135, 0]);
const PICK = [.48, -.04], READY = [.34, .30], LIFT = [.16, .42];

export function minimumJerk(t) { const u = clamp(t); return clamp(u ** 3 * (10 - 15 * u + 6 * u * u)); }
export function robotTarget(time) {
  const phase = time < .6 ? 0 : time < 2.3 ? minimumJerk((time - .6) / 1.7) : time < 2.9 ? 1 : 1 - minimumJerk((time - 2.9) / 2.4);
  if (time < 2.9) return READY.map((v, i) => mix(v, PICK[i], phase));
  return PICK.map((v, i) => mix(v, LIFT[i], 1 - phase));
}
export function robotIK([x, y]) {
  const { l1, l2 } = ROBOT_MODEL;
  const c2 = Math.max(-1, Math.min(1, (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2)));
  const q2 = -Math.acos(c2), q1 = Math.atan2(y, x) - Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));
  return [q1, q2];
}
export function robotFK([q1, q2]) {
  return [ROBOT_MODEL.l1 * Math.cos(q1) + ROBOT_MODEL.l2 * Math.cos(q1 + q2), ROBOT_MODEL.l1 * Math.sin(q1) + ROBOT_MODEL.l2 * Math.sin(q1 + q2)];
}
export function robotDynamics(q, velocity, acceleration, payload) {
  const { l1, l2, m1, m2, g } = ROBOT_MODEL, a = l1 / 2, b = l2 / 2;
  const i1 = m1 * l1 * l1 / 12, i2 = m2 * l2 * l2 / 12, c = Math.cos(q[1]);
  const m11 = i1 + i2 + m1 * a * a + m2 * (l1 * l1 + b * b + 2 * l1 * b * c) + payload * (l1 * l1 + l2 * l2 + 2 * l1 * l2 * c);
  const m12 = i2 + m2 * (b * b + l1 * b * c) + payload * (l2 * l2 + l1 * l2 * c);
  const m22 = i2 + m2 * b * b + payload * l2 * l2;
  const h = (m2 * l1 * b + payload * l1 * l2) * Math.sin(q[1]);
  const gravity = [g * ((m1 * a + m2 * l1 + payload * l1) * Math.cos(q[0]) + (m2 * b + payload * l2) * Math.cos(q[0] + q[1])), g * (m2 * b + payload * l2) * Math.cos(q[0] + q[1])];
  return {
    mass: [m11, m12, m22], gravity,
    torque: [m11 * acceleration[0] + m12 * acceleration[1] - h * (2 * velocity[0] * velocity[1] + velocity[1] ** 2) + gravity[0], m12 * acceleration[0] + m22 * acceleration[1] + h * velocity[0] ** 2 + gravity[1]],
  };
}
export function robotState(time) {
  const q = robotIK(robotTarget(time)), e = .001, before = robotIK(robotTarget(time - e)), after = robotIK(robotTarget(time + e));
  const velocity = q.map((v, i) => (after[i] - before[i]) / (2 * e));
  const acceleration = q.map((v, i) => (after[i] - 2 * v + before[i]) / (e * e));
  const tool = robotFK(q), p0 = robotTarget(time - e), p1 = robotTarget(time + e);
  const speed = Math.hypot(...p1.map((v, i) => (v - p0[i]) / (2 * e)));
  const linearAcceleration = Math.hypot(...p1.map((v, i) => (v - 2 * tool[i] + p0[i]) / (e * e)));
  const grip = minimumJerk((time - 2.3) / .6), payload = ROBOT_MODEL.payload * minimumJerk((time - 2.5) / .4);
  const dynamics = robotDynamics(q, velocity, acceleration, payload), s = ROBOT_MODEL.scale;
  const elbow = [ROBOT_BASE[0] + Math.cos(q[0]) * ROBOT_MODEL.l1 * s, ROBOT_BASE[1] - Math.sin(q[0]) * ROBOT_MODEL.l1 * s, 0];
  const wrist = [ROBOT_BASE[0] + tool[0] * s, ROBOT_BASE[1] - tool[1] * s, 0];
  const object = time < 2.9 ? [ROBOT_BASE[0] + PICK[0] * s, ROBOT_BASE[1] - PICK[1] * s + 28, 0] : [wrist[0], wrist[1] + 28, 0];
  const anchor = [ROBOT_BASE[0] - 40, ROBOT_BASE[1] + 35, -20];
  const pivot = [ROBOT_BASE[0] + Math.cos(q[0]) * ROBOT_MODEL.l1 * s * .60, ROBOT_BASE[1] - Math.sin(q[0]) * ROBOT_MODEL.l1 * s * .60, -20];
  const actuator = { anchor, pivot, angle: Math.atan2(pivot[1] - anchor[1], pivot[0] - anchor[0]), length: Math.hypot(pivot[0] - anchor[0], pivot[1] - anchor[1]) };
  return { q, velocity, acceleration, tool, speed, linearAcceleration, grip, payload, elbow, wrist, object, dynamics, actuator, phase: time < .6 ? "Ready" : time < 2.3 ? "Approach" : time < 2.9 ? "Grip" : time < 5.3 ? "Lift" : "Hold" };
}

// Flexible cable endpoints stay attached to the moving link housings.
export function robotCable(segment, t, offset, robot, out = new Float64Array(3)) {
  const a = segment < .5 ? [ROBOT_BASE[0] - 18, ROBOT_BASE[1] - 16, -38] : [robot.elbow[0] - 12, robot.elbow[1] - 10, -38];
  const b = segment < .5 ? [robot.elbow[0] + 5, robot.elbow[1] - 6, -38] : [robot.wrist[0] - 8, robot.wrist[1] - 8, -32];
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
  const nx = dy / n, ny = -dx / n, arch = segment < .5 ? 54 : 43;
  const u = Math.max(0, Math.min(1, t)), v = 1 - u;
  for (let axis = 0; axis < 3; axis++) {
    const normal = axis === 0 ? nx : axis === 1 ? ny : 0;
    const c = a[axis] + (b[axis] - a[axis]) * .24 + normal * arch;
    const d = a[axis] + (b[axis] - a[axis]) * .76 + normal * arch;
    out[axis] = v ** 3 * a[axis] + 3 * v * v * u * c + 3 * v * u * u * d + u ** 3 * b[axis] + normal * offset;
  }
  return out;
}

// Signed joint angles measured from each parent link.
export function robotAngles(robot) {
  return [
    { center: ROBOT_BASE, start: 0, end: -robot.q[0], radius: 66, label: "θ₁" },
    { center: robot.elbow, start: -robot.q[0], end: -robot.q[0] - robot.q[1], radius: 55, label: "θ₂" },
  ];
}

export function buildRobotGeometry(p, pack, box) {
  const arc = (x, y, r, z, opacity, group, a = 0, b = Math.PI * 2) => p.curve3(t => [x + Math.cos(a + t * (b - a)) * r, y + Math.sin(a + t * (b - a)) * r, z], Math.ceil(Math.abs(b - a) * r / 2.7), opacity, 0, group);
  const bolt = (x, y, z, group, r = 3.2) => {
    p.path3(Array.from({ length: 7 }, (_, i) => [x + Math.cos(i / 6 * Math.PI * 2) * r, y + Math.sin(i / 6 * Math.PI * 2) * r, z]), .28, 0, group);
    p.line3([x - r * .45, y, z], [x + r * .45, y, z], .16, 0, group);
  };
  const lightBox = (...args) => { const begin = p.marks.length; box(p, ...args); for (let i = begin; i < p.marks.length; i++) p.marks[i][4] *= .43; };
  const hub = (x, y, r, group) => {
    // Open rear arcs and section cuts reveal depth without stacked outlines.
    arc(x, y, r, -24, .18, group, .1, Math.PI * 1.2);
    for (const [radius, z, alpha] of [[r, 25, .39], [r * .84, 26, .24], [r * .46, 28, .32], [r * .22, 29, .25]]) arc(x, y, radius, z, alpha, group);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; bolt(x + Math.cos(a) * r * .66, y + Math.sin(a) * r * .66, 28, group, 2.4); }
    for (let i = 0; i < 35; i++) { const a = i / 35 * Math.PI * 2; p.line3([x + Math.cos(a) * r * .89, y + Math.sin(a) * r * .89, 26], [x + Math.cos(a) * r * .96, y + Math.sin(a) * r * .96, 26], .20, 0, group); }
    for (let i = 0; i < 12; i++) { const a = .15 + i / 11 * Math.PI * .8; p.line3([x + Math.cos(a) * r, y + Math.sin(a) * r, -24], [x + Math.cos(a) * r, y + Math.sin(a) * r, 24], .12, 0, group); }
  };
  lightBox(-230, 191, 0, 76, 64, 23);
  lightBox(-230, 159, 0, 42, 38, 32);
  for (let x = -264; x <= -196; x += 7) p.line3([x, 161, 39], [x, 188, 39], .15);
  for (const x of [-290, -170]) for (const z of [-47, 47]) p.curve3(t => [x + Math.cos(t * Math.PI * 2) * 5, 190, z + Math.sin(t * Math.PI * 2) * 5], 15, .27);
  for (const [length, radius, group] of [[ROBOT_MODEL.l1 * 750, 25, 10], [ROBOT_MODEL.l2 * 750, 20, 11]]) {
    const end = length - 24;
    for (const z of [-17, 17]) {
      p.path3([[25, -radius * .72, z], [48, -radius, z], [end - 12, -radius * .67, z], [end, -9, z], [end, 9, z], [end - 12, radius * .67, z], [48, radius, z], [25, radius * .72, z]], z > 0 ? .36 : .20, 0, group);
      p.path3([[53, -radius * .56, z], [end - 16, -radius * .34, z], [end - 16, radius * .34, z], [53, radius * .56, z], [53, -radius * .56, z]], .22, 0, group);
      for (let k = 0; k < 3; k++) { const x = 57 + k * (end - 76) / 3; p.path3([[x, radius * .45, z], [x + (end - 76) / 6, -radius * .4, z], [x + (end - 76) / 3, radius * .40, z]], .17, 0, group); }
    }
    for (let x = 60; x < end - 5; x += 10) p.line3([x, -radius * .9, -15], [x + 1.5, -radius * .9, 15], .13, 0, group);
    for (const x of [45, end - 10]) for (const sign of [-1, 1]) bolt(x, sign * radius * .7, 18, group, 2.6);
    for (let y = -radius * .32; y <= radius * .32; y += 4) p.line3([63, y, 18], [end - 24, y * .67, 18], .09, 0, group);
    for (let k = 0; k < 8; k++) { const x = 62 + k * 6; p.line3([x, radius * .65, 19], [x + 2, radius * .9, 19], .21, 0, group); }
    hub(0, 0, group === 10 ? 43 : 35, group);
    arc(length, 0, radius * .66, 19, .29, group);
  }
  // Fixed barrel and sliding piston follow the shoulder attachment.
  const ringX = (x, r, group, alpha) => p.curve3(t => [x, Math.cos(t * Math.PI * 2) * r, Math.sin(t * Math.PI * 2) * r], 28, alpha, 0, group);
  for (const x of [0, 8, 90, 100]) ringX(x, 9, 16, .27);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; p.line3([8, Math.cos(a) * 9, Math.sin(a) * 9], [90, Math.cos(a) * 9, Math.sin(a) * 9], .16, 0, 16); }
  for (const z of [-3, 3]) p.line3([0, 0, z], [80, 0, z], .29, 0, 17);
  ringX(80, 7, 17, .28);
  // Wrist bearing, slide rails, lead screw and parallel gripper.
  hub(0, -12, 22, 12);
  lightBox(0, -5, 0, 39, 20, 13, 12);
  for (const y of [-2, 5]) p.line3([-35, y, 23], [35, y, 23], .32, 0, 12);
  for (let x = -32; x <= 32; x += 4) p.line3([x, 0, 24], [x + 2, 4, 24], .19, 0, 12);
  for (const group of [13, 14]) {
    lightBox(0, 8, 0, 5, 16, 40, group);
    p.path3([[-3, 14, 17], [-3, 37, 17], [3, 37, 17], [3, 14, 17]], .26, 0, group);
    for (let y = 39; y < 48; y += 2.1) p.line3([-5, y, 17], [5, y + .8, 17], .21, 0, group);
    bolt(0, 12, 18, group, 2);
  }
  lightBox(0, -21, 0, 21, 20, 42, 15);
  for (let x = -16; x <= 16; x += 6) p.line3([x, -21, -18], [x, -21, 18], .17, 1, 15);
  const rest = robotState(0);
  for (const segment of [0, 1]) for (const offset of [-3, 0, 3]) p.boundCurve((s, t, d) => robotCable(s, t, d, rest), t => [segment, t, offset], 110, .21, 0, 18);
  p.path3([[-410, 214, -95], [340, 214, -95], [340, 214, 95], [-410, 214, 95]], .16);
  for (let line = -3; line <= 3; line++) p.line3([-410, 214, line * 27], [340, 214, line * 27], .08);
  for (const mark of p.marks) mark[4] = Math.min(.58, mark[4] * 1.5);
  return pack(p.marks);
}
