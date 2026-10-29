import { buildRobotGeometry, minimumJerk } from "./engravedRobot.js";

export const HUMANOID = Object.freeze({ upper: 156.75, forearm: 132, shoulder: 154, shoulderY: -75 });
const mix = (a, b, t) => a + (b - a) * t;
const clamp = n => Math.max(0, Math.min(1, n));
// Hardware differs around a common kinematic skeleton. Joint centres, hands and
// payload contact stay fixed, so the workcells keep their coordinated pickup.
export const HUMANOID_VARIANTS = Object.freeze({
  survey: Object.freeze({ headWidth: 1.20, headHeight: .80, chest: 1.13, arm: 1.18, base: 1.10 }),
  precision: Object.freeze({ headWidth: .82, headHeight: 1.12, chest: .85, arm: .79, base: .88 }),
});
export function humanoidState(time) {
  // Place the inspected cartridge back before opening the hands and retreating.
  // The staggered workcells therefore remain active beyond their first lift.
  const lower = minimumJerk((time - 8.4) / 2.4), release = minimumJerk((time - 11) / .6), retreat = minimumJerk((time - 11.6) / 2);
  const approach = minimumJerk((time - .4) / 1.9) * (1 - retreat), grip = minimumJerk((time - 2.3) / .6) * (1 - release), lift = minimumJerk((time - 2.9) / 2.5) * (1 - lower);
  const object = [0, 173 - lift * 118, 85];
  const arms = [-1, 1].map(side => {
    const base = [side * HUMANOID.shoulder, HUMANOID.shoulderY, 30];
    const wrist = [side * mix(228, 55, approach), mix(90, 155, approach) - lift * 118, mix(40, 85, approach)];
    const dx = wrist[0] - base[0], dy = wrist[1] - base[1], { upper, forearm } = HUMANOID;
    const c = Math.max(-1, Math.min(1, (dx * dx + dy * dy - upper * upper - forearm * forearm) / (2 * upper * forearm)));
    const q2 = side * Math.acos(c), q1 = Math.atan2(dy, dx) - Math.atan2(forearm * Math.sin(q2), upper + forearm * Math.cos(q2));
    const elbow = [base[0] + Math.cos(q1) * upper, base[1] + Math.sin(q1) * upper, 30];
    const anchor = [base[0] + side * 28, base[1] + 30, 15], pivot = [base[0] + Math.cos(q1) * upper * .7, base[1] + Math.sin(q1) * upper * .7, 15];
    return { side, base, elbow, wrist, q: [q1, q2], grip, actuator: { anchor, pivot, length: Math.hypot(pivot[0] - anchor[0], pivot[1] - anchor[1]), angle: Math.atan2(pivot[1] - anchor[1], pivot[0] - anchor[0]) } };
  });
  const blinkTime = ((time - 4.8) % 6 + 6) % 6, blink = 1 - .92 * Math.max(0, 1 - Math.abs(blinkTime - .16) / .16);
  return { arms, object, grip, lift, blink, work: [new Float64Array(3),new Float64Array(3),new Float64Array(3)], gaze: [Math.sin(time * .7) * 2, 2 + approach * 4 - lift * 2] };
}
export function humanoidCable(arm, segment, t, offset, out = new Float64Array(3)) {
  const a = segment < .5 ? arm.base : arm.elbow, b = segment < .5 ? arm.elbow : arm.wrist;
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, u = clamp(t), arch = Math.sin(u * Math.PI) * (segment < .5 ? 25 : 20);
  out[0] = mix(a[0], b[0], u) + arm.side * dy / n * (arch + offset);
  out[1] = mix(a[1], b[1], u) - arm.side * dx / n * (arch + offset);
  out[2] = mix(a[2], b[2], u) - 22;
  return out;
}
export function humanoidFinger(index, encodedFinger, t, state, out = new Float64Array(3)) {
  const arm = state.arms[Math.round(index)], finger = Math.round(encodedFinger), edge = (encodedFinger - finger) / .15;
  const u = clamp(t), thumb = finger === 0, length = thumb ? 22 : 27 + Math.sin(finger / 5 * Math.PI) * 6;
  const curl = arm.grip, inward = thumb ? 6 + u * (3 + curl * 2) + u * u * 2 : 2 + u * 5 + u * u * (2 + curl * 4);
  out[0] = arm.wrist[0] - arm.side * (inward + edge * (1.8 - u * .8));
  out[1] = arm.wrist[1] + (thumb ? 0 : 5) + u * length - curl * u * u * 7;
  out[2] = arm.wrist[2] + (thumb ? 18 - u * 8 : (finger - 2.5) * 7);
  return out;
}
export function humanoidAngles(state) {
  return state.arms.map((arm, i) => ({ center: arm.elbow, start: arm.q[0], end: arm.q[0] + arm.q[1], radius: 39, label: i ? "\u03b8\u1d63" : "\u03b8\u2097" }));
}

// Annotation strokes share the arm's kinematics and the film's particle morph.
export function humanoidAnglePoint(index, encodedKind, along, state, labelScale = 1, out = new Float64Array(3)) {
  const arm = state.arms[Math.round(index)], kind = Math.round(encodedKind), u = clamp(along);
  const start = arm.q[0], end = start + arm.q[1], radius = 39;
  let x, y;
  if (kind <= 2) {
    const angle = kind === 0 ? mix(start, end, u) : kind === 1 ? start : end;
    const r = kind === 0 ? radius : mix(radius * .72, radius + (kind === 1 ? 22 : 10), u);
    x = arm.elbow[0] + Math.cos(angle) * r; y = arm.elbow[1] + Math.sin(angle) * r;
  } else if (kind <= 4) {
    const tipX = arm.elbow[0] + Math.cos(end) * radius, tipY = arm.elbow[1] + Math.sin(end) * radius;
    const tangent = end + Math.sign(end - start) * Math.PI / 2, arrow = tangent + (kind === 3 ? -.42 : .42), length = Math.max(5, labelScale * 3);
    x = tipX - Math.cos(arrow) * length * u; y = tipY - Math.sin(arrow) * length * u;
  } else {
    const mid = (start + end) / 2, distance = radius + Math.max(20, labelScale * 12);
    let a, b;
    if (kind === 5) { a = Math.cos(u * Math.PI * 2) * 4; b = Math.sin(u * Math.PI * 2) * 7; }
    else if (kind === 6) { a = mix(-4, 4, u); b = 0; }
    else {
      const points = index < .5 ? [[6, 5], [6, 10], [9, 10]] : [[6, 10], [6, 5], [8, 5], [10, 6.5]];
      const segment = Math.min(points.length - 2, Math.floor(u * (points.length - 1))), t = u * (points.length - 1) - segment;
      a = mix(points[segment][0], points[segment + 1][0], t); b = mix(points[segment][1], points[segment + 1][1], t);
    }
    x = arm.elbow[0] + Math.cos(mid) * distance + (a + (encodedKind - kind) * 5) * labelScale;
    y = arm.elbow[1] + Math.sin(mid) * distance + b * labelScale;
  }
  out[0] = x; out[1] = y; out[2] = 38; return out;
}

export function poseHumanoid(field, offset, state, out, labelScale = 1) {
  let x = field[offset] - 700, y = field[offset + 1] - 400, z = field[offset + 8];
  let dx = field[offset + 2], dy = field[offset + 3], dz = field[offset + 9];
  const group = Math.round(field[offset + 6]);
  const hardware = HUMANOID_VARIANTS[state.variant];
  if (group === 60) {
    const index = field[offset + 10], kind = field[offset + 11], t = field[offset + 12], dt = field[offset + 15];
    const a = humanoidAnglePoint(index, kind, t, state, labelScale, state.work[0]);
    const b = humanoidAnglePoint(index, kind, t - dt, state, labelScale, state.work[1]), c = humanoidAnglePoint(index, kind, t + dt, state, labelScale, state.work[2]);
    x = a[0]; y = a[1]; z = a[2]; dx = (c[0] - b[0]) / 2; dy = (c[1] - b[1]) / 2; dz = 0;
  } else if (group >= 100) {
    const index = group >= 200 ? 1 : 0, arm = state.arms[index], part = group % 100;
    if (part === 18 || part === 19) {
      const u = field[offset + 10], v = field[offset + 11], w = field[offset + 12], dv = field[offset + 14], dw = field[offset + 15];
      const point = part === 18 ? (a, b, c, target) => humanoidCable(arm, a, b, c, target) : (a, b, c, target) => humanoidFinger(a, b, c, state, target);
      const a = point(u, v, w, state.work[0]), b = point(u, v - dv, w - dw, state.work[1]), c = point(u, v + dv, w + dw, state.work[2]);
      x = a[0]; y = a[1]; z = a[2]; dx = (c[0] - b[0]) / 2; dy = (c[1] - b[1]) / 2; dz = (c[2] - b[2]) / 2;
    } else {
      if (hardware && (part === 10 || part === 11 || part === 16)) {
        // A casing's cross-section changes about its shaft, never along the
        // shaft. The revolute centres and telescoping stroke are identical.
        y *= hardware.arm; dy *= hardware.arm;
        z *= hardware.arm; dz *= hardware.arm;
      }
      const actuator = part === 16 || part === 17;
      const origin = actuator ? arm.actuator.anchor : part === 10 ? arm.base : part === 11 ? arm.elbow : arm.wrist;
      const angle = actuator ? arm.actuator.angle : part === 10 ? arm.q[0] : part === 11 ? arm.q[0] + arm.q[1] : 0, c = Math.cos(angle), s = Math.sin(angle);
      const stretch = part === 17 ? (arm.actuator.length - 55) / 44 : 1, along = (part === 17 ? 55 : 0) + x * stretch;
      x = origin[0] + along * c - y * s; y = origin[1] + along * s + y * c; z += origin[2];
      const previous = dx * stretch; dx = previous * c - dy * s; dy = previous * s + dy * c;
      if (part === 11) { const slope = (arm.wrist[2] - arm.elbow[2]) / HUMANOID.forearm; z += field[offset] - 700 > 0 ? (field[offset] - 700) * slope : 0; dz += field[offset + 2] * slope; }
    }
  } else if (group === 30) { x += state.object[0]; y += state.object[1]; z += state.object[2]; }
  else if (group === 40 || group === 41) { y = -231 + (y + 231) * state.blink + state.gaze[1]; x += state.gaze[0]; dy *= state.blink; }
  if (hardware && group < 100 && group !== 30 && group !== 60) {
    if (group === 40 || group === 41 || group === 42) {
      if (group === 40 || group === 41) {
        const side = group === 40 ? -1 : 1;
        const eyeX = side * 32 + state.gaze[0], eyeY = -231 + state.gaze[1];
        const wide = state.variant === "survey" ? 1.18 : side < 0 ? .78 : 1.04;
        const tall = state.variant === "survey" ? .56 : side < 0 ? 1.24 : .58;
        x = eyeX + (x - eyeX) * wide; dx *= wide;
        y = eyeY + (y - eyeY) * tall; dy *= tall;
      }
      x *= hardware.headWidth; dx *= hardware.headWidth;
      y = -176 + (y + 176) * hardware.headHeight; dy *= hardware.headHeight;
    } else if (group === 0 && y <= 129 && Math.abs(x) < 140) {
      // The edge tends back to the original shoulder bracket, while the lower
      // chest gets a broader utility shell or a slender precision shell.
      const taper = clamp((140 - Math.abs(x)) / 45) * clamp((y + 125) / 130);
      const scale = 1 + (hardware.chest - 1) * taper;
      const derivative = Math.abs(x) > 95 ? -(hardware.chest - 1) * Math.sign(x) / 45 * clamp((y + 125) / 130) : 0;
      dx = dx * (scale + x * derivative) + x * (hardware.chest - 1) * clamp((140 - Math.abs(x)) / 45) * (y > -125 && y < 5 ? dy / 130 : 0);
      x *= scale;
    } else if (group === 0 && y > 130 && z < 35) {
      x *= hardware.base; dx *= hardware.base;
    }
  }
  out.set([x, y, z, dx, dy, dz]); return out;
}

export function buildHumanoidGeometry(p, pack, box) {
  buildRobotGeometry(p, marks => marks, box);
  const source = p.marks.splice(0);
  // Reuse the machined link details, scaled to human arm proportions.
  for (const index of [0, 1]) for (const sourceMark of source) {
    const part = sourceMark[6];
    if (![10, 11, 16, 17].includes(part)) continue;
    const mark = [...sourceMark]; mark[0] = 700 + (mark[0] - 700) * .55; mark[1] = 400 + (mark[1] - 400) * .55;
    mark[2] *= .55; mark[3] *= .55; mark[8] *= .55; mark[9] *= .55; mark[6] = (index + 1) * 100 + part;
    p.marks.push(mark);
  }
  const curve = (fn, alpha = .3, tint = 0, group = 0, steps = 100) => p.curve3(fn, steps, alpha, tint, group);
  const ring = (x, y, z, rx, ry, alpha, group = 0, tint = 0) => curve(t => [x + Math.cos(t * Math.PI * 2) * rx, y + Math.sin(t * Math.PI * 2) * ry, z], alpha, tint, group);
  const outline = [[-104,-125],[-136,-93],[-119,42],[-80,129],[80,129],[119,42],[136,-93],[104,-125],[-104,-125]];
  for (const z of [-28, 30]) p.path3(outline.map(([x,y]) => [x,y,z]), z > 0 ? .38 : .17);
  p.path3([[-102,-106,32],[-110,-72,35],[-91,33,42],[-59,104,36],[59,104,36],[91,33,42],[110,-72,35],[102,-106,32]], .25);
  for (let x = -91; x <= 91; x += 7) curve(t => [x * (1 - .26 * t), -106 + t * 205, 31 + Math.sin(t * Math.PI) * 15], .11, 0, 0, 45);
  for (const y of [-80,-63,-46,-29]) p.line3([-53,y,47],[53,y,47],.18);
  for (const side of [-1,1]) {
    p.path3([[side*105,-104,14],[side*155,-88,16],[side*155,-65,16],[side*120,-54,16]],.27);
    for (let y=29;y<99;y+=9) p.line3([side*72,y,44],[side*52,y+4,44],.20);
    for (const y of [-101,12,104]) ring(side*(y>50?64:98),y,37,3,3,.32);
  }
  // Neck gimbal and a chamfered screen housing.
  for (const y of [-165,-154,-143,-133]) curve(t => [Math.cos(t*Math.PI*2)*25,y,Math.sin(t*Math.PI*2)*20],.29);
  for(const x of [-19,19])p.line3([x,-176,0],[x,-133,0],.25);
  const headStart = p.marks.length;
  const head=[[-66,-289],[66,-289],[85,-272],[85,-193],[67,-176],[-67,-176],[-85,-193],[-85,-272],[-66,-289]];
  for (const z of [-23,44,51]) p.path3(head.map(([x,y])=>[x,y,z]),z===51?.40:.22);
  for (const i of [0,2,4,6]) p.line3([...head[i],-23],[...head[i],51],.21);
  const screen=[[-58,-276],[58,-276],[71,-263],[71,-203],[58,-190],[-58,-190],[-71,-203],[-71,-263],[-58,-276]];
  p.path3(screen.map(([x,y])=>[x,y,53]),.38);
  for(let y=-268;y<-198;y+=7) p.line3([-63,y,53],[63,y,53],.055);
  for(const side of [-1,1]) {
    for(const z of [-16,-8,0,8,16]) curve(t=>[side*90, -233+Math.cos(t*Math.PI*2)*23, z+Math.sin(t*Math.PI*2)*8],.16);
    const group=side<0?40:41;
    for(let y=-8;y<=8;y+=1.5) { const extent=Math.sqrt(1-(y/9)**2)*14; p.line3([side*32-extent,-231+y,56],[side*32+extent,-231+y,56],.48,1,group); }
    ring(side*32,-231,56,16,11,.44,group,1);
  }
  for (let i = headStart; i < p.marks.length; i++) if (p.marks[i][6] === 0) p.marks[i][6] = 42;
  // Waist support, ribs and a low base keep the silhouette a humanoid bust.
  for(const y of [133,142,151,160,169]) curve(t=>[Math.cos(t*Math.PI*2)*58,y,Math.sin(t*Math.PI*2)*35],.20);
  const baseStart=p.marks.length; box(p,0,234,-24,81,53,23); for(let i=baseStart;i<p.marks.length;i++) p.marks[i][4]*=.4;
  for(const side of [-1,1]) p.path3([[side*47,171,-19],[side*43,224,-21],[side*67,235,-21]],.32);
  // A small foreground workbench and a shared cartridge.
  for(const z of [40,120]) p.path3([[-120,203,z],[120,203,z],[120,211,z],[-120,211,z]],.17);
  for(const x of [-108,108]) p.path3([[x,211,105],[x,264,100],[x+Math.sign(x)*7,264,100]],.17);
  const first=p.marks.length; box(p,0,-30,0,42,25,60,30); for(let i=first;i<p.marks.length;i++)p.marks[i][4]*=.5;
  for(let x=-32;x<=32;x+=8)p.line3([x,-30,26],[x,30,26],.15,1,30);
  const rest=humanoidState(0);
  for(const index of [0,1]) {
    const group=(index+1)*100;
    const begin=p.marks.length;box(p,0,-7,0,10,17,22,group+12);for(let i=begin;i<p.marks.length;i++)p.marks[i][4]*=.42;
    for(const segment of [0,1])for(const offset of [-2,0,2])p.boundCurve((a,t,d)=>humanoidCable(rest.arms[index],a,t,d),t=>[segment,t,offset],90,.23,0,group+18);
    for(let finger=0;finger<5;finger++)for(const edge of [-1,0,1])p.boundCurve((a,b,t)=>humanoidFinger(a,b,t,rest),t=>[index,finger+edge*.15,t],30,.29,0,group+19);
  }
  for (const index of [0, 1]) {
    const annotation = (id, kind, t) => humanoidAnglePoint(id, kind, t, rest);
    for (const kind of [0, 2, 3, 4]) p.boundCurve(annotation, t => [index, kind, t], kind === 0 ? 48 : 8, .64, 1, 60);
    for (let dash = 0; dash < 8; dash += 2) p.boundCurve(annotation, t => [index, 1, (dash + t) / 8], 3, .64, 1, 60);
    for (const kind of [5, 6, 7]) for (const edge of [-.04, 0, .04]) p.boundCurve(annotation, t => [index, kind + edge, t], kind === 5 ? 32 : 12, .64, 1, 60);
  }
  for(const mark of p.marks)mark[4]=Math.min(.68,mark[4]*1.22);
  return pack(p.marks);
}
