import { COMPUTE_ROUTES } from "./engravedScenes.js";
import { bindingContact, proteinCoreFrames, proteinFrames, proteinPoint, wormholePoint } from "./engravedForms.js";
import { moleculeMesh, moleculeOcclusion, moleculePoint, prepareMolecule } from "./engravedMolecule.js";
import { humanoidState, poseHumanoid } from "./engravedHumanoid.js";
import { bonsaiBirdPoint, bonsaiPoint, bonsaiState, bonsaiWind } from "./engravedBonsai.js";

import { blendMark } from "./engravedTransition.js";
export { blendMark } from "./engravedTransition.js";

import { DURATION, sceneStart, sceneDuration, TRANSITION_SECONDS } from "./engravedTimeline.js";
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

export { INK_PALETTE } from "./engravedDrawing.js";

export function pointOnRoute(route, progress) {
  const lengths = route.slice(1).map((b, i) => Math.hypot(...b.map((value, axis) => value - route[i][axis])));
  let distance = clamp(progress) * lengths.reduce((sum, length) => sum + length, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) return route[i].map((value, axis) => mix(value, route[i + 1][axis], lengths[i] ? distance / lengths[i] : 0));
    distance -= lengths[i];
  }
  return [...route[0]];
}

// Camera trigonometry and packet positions are shared by all marks in a frame.
export function moonFormation(seconds) {
  const time = ((seconds % DURATION) + DURATION) % DURATION;
  return time >= DURATION - TRANSITION_SECONDS ? 1 : ease(clamp(time / 3.4));
}

export const moonRotation = seconds => .26 * Math.sin(seconds / DURATION * Math.PI * 2);

export function sceneView(scene, seconds) {
  if (scene === 0) return { moon: moonFormation(seconds), rotation: moonRotation(seconds) };
  if (scene === 2) {
    const local = seconds - sceneStart(2);
    // Compress the incoming growth clock while preserving the established reveal.
    const age = local < 0 ? Math.max(0, 1 + local / TRANSITION_SECONDS) * 3 : local + 3;
    return { birdTime: local + 3, bonsai: bonsaiState(age), work: [new Float64Array(3), new Float64Array(3), new Float64Array(3)] };
  }
  if (scene < 4) return null;
  const time = seconds - sceneStart(scene);
  let yaw, tilt;
  if (scene === 4) { yaw = .36 + Math.sin(time * .24) * .17; tilt = .13 + Math.sin(time * .19) * .07; }
  if (scene === 5) { yaw = -.68 + Math.sin(time * .2) * .24; tilt = .58; }
  if (scene === 6) { yaw = -.12; tilt = .13; }
  if (scene === 7) { yaw = -.22 + Math.sin(time * .16) * .20; tilt = .20; }
  const packets = scene === 5 ? COMPUTE_ROUTES.map((route, i) => {
    const fraction = ((time * .16 + i * .137) % 1 + 1) % 1;
    const point = pointOnRoute(route, fraction);
    return [...point.map((value, axis) => value - route[0][axis]), Math.min(1, fraction * 12, (1 - fraction) * 12)];
  }) : null;
  const protein = scene === 7 ? proteinFrames(time) : null;
  const view = {
    time, cy: Math.cos(yaw), sy: Math.sin(yaw), ct: Math.cos(tilt), st: Math.sin(tilt), packets,
    zoom: scene === 4 ? .89 + Math.sin(time * .31) * .035 : scene === 6 ? 1.0 : scene === 7 ? 1.26 + protein.progress * .35 : 1,
    offsetY: scene === 7 ? -40 : 0,
    robot: scene === 6 ? humanoidState(time) : null,
    protein, robotWork: new Float64Array(6),
    work: [new Float64Array(3), new Float64Array(3), new Float64Array(3)],
  };
  if (protein) { protein.core = proteinCoreFrames(); protein.surface = prepareMolecule(protein, view); protein.surface.dissolve = clamp((time - sceneDuration(scene) + TRANSITION_SECONDS) / TRANSITION_SECONDS); }
  return view;
}

// Return both the center and half-vector of a line, without per-mark allocations.
export function poseMark(field, offset, scene, seconds, out, view = sceneView(scene, seconds)) {
  let x = field[offset], y = field[offset + 1];
  let dx = field[offset + 2], dy = field[offset + 3];
  const group = field[offset + 6];
  let opacity = field[offset + 4];
  if (scene === 0) {
    const u = x - 700, v = y - 390, r = Math.hypot(u, v);
    const station = field[offset + 7] * .63 + clamp(r / 248) * .24;
    const arrival = ease(clamp((view.moon - station) / .13)), drift = r < 260 ? 1 - arrival : 0;
    const angle = drift * .48, c = Math.cos(angle), s = Math.sin(angle);
    x = 700 + (u * c - v * s) * (1 + drift * .18);
    y = 390 + (u * s + v * c) * (1 + drift * .18);
    opacity *= arrival;
    const turn = view.rotation ?? moonRotation(seconds), rc = Math.cos(turn), rs = Math.sin(turn);
    const rx = x - 700, ry = y - 390, oldDx = dx;
    x = 700 + rx * rc - ry * rs; y = 390 + rx * rs + ry * rc;
    dx = dx * rc - dy * rs; dy = oldDx * rs + dy * rc;
    x += Math.sin(seconds / DURATION * Math.PI * 2) * 4;
    y += Math.cos(seconds / DURATION * Math.PI * 4) * 1.8;
  } else if (scene === 2) {
    const id = Math.round(field[offset + 10]), t = field[offset + 11], front = view.bonsai[id] + view.bonsai.settle[id];
    if (group === 3) {
      const wing = field[offset + 11], u = field[offset + 12], du = field[offset + 15];
      const center = bonsaiBirdPoint(id, wing, u, view.birdTime, view.work[0]);
      const before = bonsaiBirdPoint(id, wing, u - du, view.birdTime, view.work[1]), after = bonsaiBirdPoint(id, wing, u + du, view.birdTime, view.work[2]);
      x = 700 + center[0]; y = 400 + center[1]; dx = (after[0] - before[0]) / 2; dy = (after[1] - before[1]) / 2;
    } else if (group === 1) {
      opacity *= ease(clamp((front - t) / .035));
      if (opacity > 0) {
        const across = field[offset + 12], dt = field[offset + 14], da = field[offset + 15];
        const center = bonsaiPoint(id, t, across, view.bonsai, view.work[0]);
        const before = bonsaiPoint(id, Math.max(0, t - dt), across - da, view.bonsai, view.work[1]);
        const after = bonsaiPoint(id, Math.min(front, t + dt), across + da, view.bonsai, view.work[2]);
        x = 700 + center[0]; y = 400 + center[1]; dx = (after[0] - before[0]) / 2; dy = (after[1] - before[1]) / 2;
      }
    } else if (group === 4) {
      opacity *= ease(clamp(view.bonsai[0] / .08));
    } else if (group === 2) {
      const unfurl = ease(clamp((front - t) / .15));
      opacity *= unfurl;
      x += (unfurl - 1) * dx; y += (unfurl - 1) * dy;
      dx *= unfurl; dy *= unfurl;
    }
    x += bonsaiWind(x, y, seconds - sceneStart(2));
  } else if (view) {
    let z = field[offset + 8];
    let dz = field[offset + 9];
    if (scene === 4 && [0, 1, 2, 5, 6].includes(group)) {
      const moving = group === 1 || group === 5 || group === 6;
      const advance = moving ? view.time * (group === 6 ? .17 : .145) : 0;
      const station = field[offset + 10] + advance;
      const u = moving ? ((station % 1) + 1) % 1 : station;
      const angle = field[offset + 11] + view.time * .23 + Math.max(0, u) * .72;
      const du = field[offset + 13], dv = field[offset + 14];
      const center = wormholePoint(u, angle, view.time, view.work[0]);
      const twist = u > 0 ? du * .72 : 0;
      const before = wormholePoint(u - du, angle - dv - twist, view.time, view.work[1]), after = wormholePoint(u + du, angle + dv + twist, view.time, view.work[2]);
      x = 700 + center[0]; y = 400 + center[1]; z = center[2];
      dx = (after[0] - before[0]) / 2; dy = (after[1] - before[1]) / 2; dz = (after[2] - before[2]) / 2;
      opacity *= moving ? Math.min(1, u / .055, (1 - u) / .08) : .85;
    } else if (scene === 5) {
      if (group >= 20) {
        const packet = view.packets[group - 20];
        x += packet[0]; y += packet[1]; z += packet[2]; opacity *= packet[3];
      } else if (group > 0) y += Math.sin(view.time * .7 - group * .4) * 3;
    } else if (scene === 6) {
      const point = poseHumanoid(field, offset, view.robot, view.robotWork, view.labelScale || 1);
      x = 700 + point[0]; y = 400 + point[1]; z = point[2]; dx = point[3]; dy = point[4]; dz = point[5];
      if (group === 60) { const kind = Math.round(field[offset + 11]); opacity *= kind === 1 ? .5 : kind === 2 ? .45 : kind < 5 ? .85 : 1; }
    } else if (scene === 7 && (group === 1 || group === 4 || group === 5 || group === 6)) {
      const s = field[offset + 10], v = field[offset + 11], w = field[offset + 12];
      const ds = field[offset + 13], dv = field[offset + 14], dw = field[offset + 15];
      const point = group === 5 ? moleculePoint : group === 4 ? bindingContact : proteinPoint;
      const scaffold = group === 6 ? view.protein.core : view.protein;
      const center = point(s, v, w, scaffold, view.work[0]);
      const before = point(s - ds, v - dv, w - dw, scaffold, view.work[1]);
      const after = point(s + ds, v + dv, w + dw, scaffold, view.work[2]);
      x = 700 + center[0]; y = 400 + center[1]; z = center[2];
      dx = (after[0] - before[0]) / 2; dy = (after[1] - before[1]) / 2; dz = (after[2] - before[2]) / 2;
      if (group === 4) opacity *= view.protein.progress ** 2;
      if (group === 6) opacity *= (1 - view.protein.progress) * .8;
      if (group === 5) {
        const edge = moleculeMesh().edges[Math.round(s)], surface = view.protein.surface;
        opacity *= surface.opacity * (edge.faces.some(face => surface.visible[face]) ? 1 : 0);
      }
    }
    const u = x - 700, v = y - 400;
    const rx = u * view.cy + z * view.sy, rz = -u * view.sy + z * view.cy;
    const ry = v * view.ct - rz * view.st, depth = v * view.st + rz * view.ct;
    const vx = dx * view.cy + dz * view.sy, vz = -dx * view.sy + dz * view.cy;
    const vy = dy * view.ct - vz * view.st, vd = dy * view.st + vz * view.ct;
    const perspective = 1600 / (1600 - depth);
    x = 700 + rx * perspective * view.zoom; y = 400 + ry * perspective * view.zoom + (view.offsetY || 0);
    dx = (vx * perspective + rx * perspective ** 2 * vd / 1600) * view.zoom;
    dy = (vy * perspective + ry * perspective ** 2 * vd / 1600) * view.zoom;
    opacity *= .55 + .45 * clamp((depth + 420) / 840);
    if (scene === 7) opacity *= moleculeOcclusion(view.protein.surface, x, y, depth);

  } else if (scene === 1) {
    // Let the original wave's local sea merge into the panoramic water field.
    opacity *= ease(clamp((x - 50) / 165)) * ease(clamp((1350 - x) / 165));
    opacity *= 1 - ease(clamp((y - 620) / 90));
    const depth = clamp((y - 160) / 530);
    x += Math.sin(seconds * .65 + y * .018) * (2 + depth * 6);
    y += Math.sin(x * .018 - seconds * 1.15 + y * .027) * (1 + depth * 4);
    dy += Math.cos(x * .018 - seconds * 1.15 + y * .027) * dx * .06;
  } else if (scene === 3 && group > 0) {
    const angle = seconds * .035 * (group === 2 ? -1 : 1);
    const c = Math.cos(angle), s = Math.sin(angle), u = x - 700, v = y - 395;
    x = 700 + u * c - v * s;
    y = 395 + u * s + v * c;
    const oldDx = dx;
    dx = dx * c - dy * s;
    dy = oldDx * s + dy * c;
  }
  out[0] = x; out[1] = y; out[2] = dx; out[3] = dy;
  out[4] = opacity; out[5] = field[offset + 5];
  return out;
}
