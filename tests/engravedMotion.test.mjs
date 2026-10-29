import assert from "node:assert/strict";
import test from "node:test";
import { buildMoonScene, buildProceduralScenes, COMPUTE_ROUTES, MARK_COUNT, packScene, PLATE, STRIDE } from "../src/lib/engravedScenes.js";
import { blendMark, CHAPTERS, DURATION, filmFrame, INK_PALETTE, moonFormation, moonRotation, mountEngravedMotion, pointOnRoute, poseMark, sceneStart, sceneDuration, sceneView, TRANSITION_SECONDS } from "../src/lib/engravedMotion.js";
import { bindingContact, BINDING_ATOMS, BINDING_RESIDUES, BINDING_SITE, proteinFrames, PROTEIN_NATIVE, PROTEIN_RESIDUES, wormholePoint } from "../src/lib/engravedForms.js";
import { ROBOT_BASE, ROBOT_MODEL, robotAngles, robotCable, robotDynamics, robotFK, robotIK, robotState, robotTarget } from "../src/lib/engravedRobot.js";
import { BONSAI_LIMBS, BONSAI_ROOTS, bonsaiBirdPoint, bonsaiCenter, bonsaiRootPoint, bonsaiState } from "../src/lib/engravedBonsai.js";
import { PROTEIN_REFERENCE } from "../src/lib/proteinReference.js";
import { HUMANOID, humanoidAnglePoint, humanoidAngles, humanoidFinger, humanoidState } from "../src/lib/engravedHumanoid.js";
import { dissolveMoleculeTriangle, MOLECULE_SHADES, moleculeMesh, moleculeOcclusion } from "../src/lib/engravedMolecule.js";
import { engravedDensity, MAX_ENGRAVED_PIXELS } from "../src/lib/engravedResolution.js";
import { createEngravedEngine } from "../src/lib/engravedEngine.js";
import { crawlableHtml } from "../src/content/crawlable.js";
import { PREPARED_FILM } from "../src/content/preparedFilm.js";

test("the film holds each plate, transforms, and wraps in both directions", () => {
  assert.equal(DURATION, 110);
  assert.equal(CHAPTERS.length, 8);
  assert.equal(TRANSITION_SECONDS * CHAPTERS.length, 24);
  assert.equal(sceneDuration(0) - TRANSITION_SECONDS, 10);
  assert.equal(sceneDuration(7) - TRANSITION_SECONDS, 13);
  for (let scene = 0; scene < CHAPTERS.length; scene++) {
    const start = sceneStart(scene), duration = sceneDuration(scene);
    assert.deepEqual(filmFrame(start), { time: start, scene, next: (scene + 1) % CHAPTERS.length, progress: 0 });
    assert.equal(filmFrame(start + duration - TRANSITION_SECONDS - .01).progress, 0);
    assert.equal(filmFrame(start + duration - TRANSITION_SECONDS / 2).progress, .5);
    assert.ok(filmFrame(start + duration - .001).progress > .9989);
  }
  assert.deepEqual(filmFrame(DURATION), filmFrame(0));
  assert.deepEqual(filmFrame(-1), filmFrame(DURATION - 1));
  assert.deepEqual(filmFrame(NaN), filmFrame(0));
  assert.deepEqual(filmFrame(Infinity), filmFrame(0));
});

test("the moving lines arrive at both exact endpoints without an opacity pop", () => {
  const a = [320, 510, 2, -1, .8, 0], b = [1070, 210, -1, 2, .3, 1];
  const out = new Float64Array(6);
  for (const seed of [0, .5, .99999]) {
    for (const [progress, expected] of [[0, a], [1, b]]) {
      blendMark(a, b, progress, seed, out);
      for (let i = 0; i < 6; i++) assert.ok(Math.abs(out[i] - expected[i]) < 1e-10);
    }
    for (let progress = 0; progress <= 1; progress += .025) {
      blendMark(a, b, progress, seed, out);
      assert.ok(out.every(Number.isFinite));
      assert.ok(out[4] >= 0 && out[4] <= 1);
    }
  }
});

test("procedural engravings are repeatable, bounded, and safe to pair stroke by stroke", () => {
  const scenes = buildProceduralScenes(), repeat = buildProceduralScenes();
  assert.equal(scenes.length, CHAPTERS.length);
  for (let scene = 0; scene < scenes.length; scene++) {
    const field = scenes[scene];
    assert.equal(field.length, MARK_COUNT * STRIDE);
    assert.deepEqual(field, repeat[scene]);
    assert.ok(field.every(Number.isFinite));
    for (let i = 0; i < field.length; i += STRIDE) {
      assert.ok(field[i] >= 0 && field[i] <= PLATE.width);
      assert.ok(field[i + 1] >= 0 && field[i + 1] <= PLATE.height);
      assert.ok(field[i + 4] >= 0 && field[i + 4] <= 1);
    }
  }
});

test("native motion changes the sea and returns the moon seamlessly at the loop", () => {
  const line = new Float32Array([790, 480, 2, -1, .7, 0, 0, .2]);
  const start = new Float64Array(6), end = new Float64Array(6);
  poseMark(line, 0, 0, 0, start);
  poseMark(line, 0, 0, DURATION, end);
  for (let i = 0; i < 6; i++) assert.ok(Math.abs(start[i] - end[i]) < 1e-10);
  poseMark(line, 0, 1, 0, start);
  poseMark(line, 0, 1, 2, end);
  assert.notDeepEqual(start, end);
  assert.ok(end.every(Number.isFinite));
});

test("the opening moon assembles before holding and returns continuously through the loop", () => {
  assert.equal(moonFormation(0), 0);
  assert.ok(moonFormation(.8) < moonFormation(2));
  assert.equal(moonFormation(3.4), 1);
  assert.equal(moonFormation(DURATION - .01), 1);
  const field = buildProceduralScenes()[0], out = new Float64Array(6);
  const ink = [0, .8, 2, 3.4].map(time => {
    let total = 0; const view = sceneView(0, time);
    for (let i = 0; i < field.length; i += STRIDE * 17) { poseMark(field, i, 0, time, out, view); total += out[4]; }
    return total;
  });
  assert.equal(ink[0], 0);
  assert.ok(ink[1] > ink[0] && ink[2] > ink[1] && ink[3] > ink[2]);
});

test("the completed moon rotates its ink and returns to the same pose at the loop seam", () => {
  const line = new Float32Array([820, 450, 2, -1, .7, 0, 0, .2]);
  const pose = time => {
    const out = new Float64Array(6), view = { ...sceneView(0, time), moon: 1 };
    poseMark(line, 0, 0, time, out, view); return out;
  };
  const a = pose(0), b = pose(10), end = pose(DURATION);
  assert.ok(moonRotation(10) > .12 && moonRotation(10) < .16);
  assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 15);
  assert.notDeepEqual(a.slice(2, 4), b.slice(2, 4), "stroke directions rotate with the drawing");
  assert.ok(Math.abs(Math.hypot(a[2], a[3]) - Math.hypot(b[2], b[3])) < 1e-10);
  assert.equal(a[4], b[4]);
  for (let i = 0; i < 6; i++) assert.ok(Math.abs(a[i] - end[i]) < 1e-10);
});

test("work packets follow the compute rails at a constant ground distance", () => {
  const route = [[0, 0, 0], [10, 0, 0], [10, 30, 0]];
  assert.deepEqual(pointOnRoute(route, 0), route[0]);
  assert.deepEqual(pointOnRoute(route, .25), route[1]);
  assert.deepEqual(pointOnRoute(route, .5), [10, 10, 0]);
  assert.deepEqual(pointOnRoute(route, 1), route[2]);
  assert.deepEqual(pointOnRoute([[1, 2, 3], [1, 2, 3]], .5), [1, 2, 3]);
  for (const time of [0, 1.5, 5.9].map(t => sceneStart(5) + t)) {
    const view = sceneView(5, time);
    assert.equal(view.packets.length, COMPUTE_ROUTES.length);
    for (const [i, packet] of view.packets.entries()) {
      const point = packet.slice(0, 3).map((value, axis) => value + COMPUTE_ROUTES[i][0][axis]);
      const rail = COMPUTE_ROUTES[i];
      assert.ok(rail.slice(1).some((end, j) => {
        const a = rail[j], vector = end.map((value, axis) => value - a[axis]);
        const length2 = vector.reduce((sum, value) => sum + value ** 2, 0);
        const t = vector.reduce((sum, value, axis) => sum + (point[axis] - a[axis]) * value, 0) / length2;
        const distance = Math.hypot(...point.map((value, axis) => value - a[axis] - Math.max(0, Math.min(1, t)) * vector[axis]));
        return distance < 1e-8;
      }));
      assert.ok(packet[3] >= 0 && packet[3] <= 1);
    }
  }
  assert.throws(() => packScene([]), RangeError);
});

test("rotating volumes retain depth, stay in the plate, and morph safely to flat scenes", () => {
  const scenes = buildProceduralScenes(), a = new Float64Array(6), b = new Float64Array(6), out = new Float64Array(6);
  for (let scene = 0; scene < scenes.length; scene++) {
    const field = scenes[scene], next = (scene + 1) % scenes.length;
    if (scene >= 4) assert.ok(field.some((value, i) => i % STRIDE === 8 && Math.abs(value) > 10));
    for (const local of [0, 3, sceneDuration(scene) - TRANSITION_SECONDS - .01, sceneDuration(scene) - TRANSITION_SECONDS / 2, sceneDuration(scene) - .01]) {
      const time = sceneStart(scene) + local, view = sceneView(scene, time), nextView = sceneView(next, time);
      for (let i = 0; i < field.length; i += STRIDE * 53) {
        poseMark(field, i, scene, time, a, view);
        assert.ok(a.every(Number.isFinite));
        assert.ok(a[0] >= 0 && a[0] <= PLATE.width && a[1] >= 0 && a[1] <= PLATE.height);
        poseMark(scenes[next], i, next, time, b, nextView);
        blendMark(a, b, filmFrame(time).progress, field[i + 7], out);
        assert.ok(out.every(Number.isFinite));
        assert.ok(out[4] >= 0 && out[4] <= 1);
      }
    }
  }
  const point = wormholePoint(.25, .7);
  const line = new Float32Array([700 + point[0], 400 + point[1], 2, -1, .7, 0, 1, .2, point[2], 0, .25, .7, 0, 0, .02, 0]);
  poseMark(line, 0, 4, sceneStart(4), a);
  poseMark(line, 0, 4, sceneStart(4) + 3, b);
  assert.notDeepEqual(a.slice(0, 4), b.slice(0, 4));
});

test("the wormhole narrows continuously into depth and its rings move inward", () => {
  let previousRadius = Infinity, previousDepth = Infinity;
  for (let u = 0; u <= 1.001; u += .05) {
    const point = wormholePoint(u, .8), radius = Math.hypot(point[0], point[1]);
    assert.ok(point.every(Number.isFinite));
    assert.ok(radius < previousRadius);
    assert.ok(point[2] < previousDepth);
    previousRadius = radius; previousDepth = point[2];
  }
  assert.ok(previousRadius > 120 && previousRadius < 145, "the far sky remains a readable open throat");
  assert.ok(previousDepth < -390);
});

test("the protein animation reaches the structural reference with a connected, finite ribbon", () => {
  assert.equal(PROTEIN_REFERENCE.pdbId, "1UBQ");
  assert.equal(PROTEIN_RESIDUES, 76);
  assert.equal(PROTEIN_REFERENCE.alphaCarbons.length, 76);
  const nativeCopy = PROTEIN_NATIVE.map(point => [...point]);
  const loose = proteinFrames(0), middle = proteinFrames(3.6), folded = proteinFrames(9);
  assert.ok(loose.progress < middle.progress && middle.progress < folded.progress);
  assert.equal(folded.progress, 1);
  for (let i = 0; i < PROTEIN_RESIDUES; i++) {
    for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(folded.points[i][axis] - PROTEIN_NATIVE[i][axis]) < 1e-8);
  }
  assert.notDeepEqual(loose.points, folded.points);
  for (const state of [loose, middle, folded]) {
    assert.ok(state.frames.every(Number.isFinite));
    let relativeError = 0;
    for (let i = 1; i < PROTEIN_RESIDUES; i++) {
      const target = Math.hypot(...PROTEIN_NATIVE[i].map((value, axis) => value - PROTEIN_NATIVE[i - 1][axis]));
      const actual = Math.hypot(...state.points[i].map((value, axis) => value - state.points[i - 1][axis]));
      relativeError += Math.abs(actual - target) / target;
    }
    assert.ok(relativeError / (PROTEIN_RESIDUES - 1) < .03);
  }
  assert.deepEqual(PROTEIN_NATIVE, nativeCopy);
});

test("the bonsai grows from pot and trunk to fine needle clusters", () => {
  const field = buildProceduralScenes()[2], out = new Float64Array(6);
  const totals = [-TRANSITION_SECONDS + .05, -TRANSITION_SECONDS / 2, 0, 2.7].map(time => {
    let ink = 0;
    const view = sceneView(2, sceneStart(2) + time);
    for (let i = 0; i < field.length; i += STRIDE * 13) { poseMark(field, i, 2, sceneStart(2) + time, out, view); ink += out[4]; }
    return ink;
  });
  assert.ok(totals[0] > 0, "a faint pot remains visible at the paused starting frame");
  assert.ok(totals[0] < totals[1] && totals[1] < totals[2] && totals[2] < totals[3]);
  let full = 0; for (let i = 0; i < field.length; i += STRIDE * 13) full += field[i + 4];
  assert.ok(totals[3] > full * .99);
});

test("each bonsai branch waits for its parent growth front to reach its junction", () => {
  for (let id = 1; id < BONSAI_LIMBS.length; id++) {
    const limb = BONSAI_LIMBS[id], before = bonsaiState(limb.start - .001), growing = bonsaiState(limb.start + .2);
    assert.deepEqual(bonsaiCenter(id, 0), bonsaiCenter(limb.parent, limb.at));
    assert.equal(before[id], 0);
    assert.ok(before[limb.parent] >= limb.at);
    assert.ok(growing[id] > 0 && growing[id] < 1);
  }
  const field = buildProceduralScenes()[2], out = new Float64Array(6);
  for (const local of [.5, 2.5, 5, 7.5]) {
    const view = sceneView(2, sceneStart(2) + local);
    for (let i = 0; i < field.length; i += STRIDE * 7) {
      const group = field[i + 6], id = Math.round(field[i + 10]), station = field[i + 11];
      poseMark(field, i, 2, sceneStart(2) + local, out, view);
      if (group && station > view.bonsai[id]) assert.equal(out[4], 0, "no mark appears beyond a growing branch tip");
    }
  }
});

test("bonsai growth begins in the incoming transition and finishes early in its own scene", () => {
  assert.equal(sceneDuration(2), 13);
  const incoming = sceneView(2, sceneStart(2) - TRANSITION_SECONDS / 2), arrived = sceneView(2, sceneStart(2)), complete = sceneView(2, sceneStart(2) + 2.7);
  assert.ok(incoming.bonsai[0] > 0);
  assert.ok(arrived.bonsai[0] > .98);
  assert.ok(complete.bonsai.every(front => front === 1));
});

test("the bonsai surface roots join the trunk, taper into the soil and appear with its first growth", () => {
  const collar = bonsaiCenter(0, 0);
  for (let root = 0; root < BONSAI_ROOTS.length; root++) {
    const from = bonsaiRootPoint(root, 0), to = bonsaiRootPoint(root, 1);
    assert.ok(Math.hypot(from[0] - collar[0], from[1] - collar[1]) < 15);
    assert.ok(Math.hypot(to[0] - from[0], to[1] - from[1]) > 30);
    assert.deepEqual(bonsaiRootPoint(root, 1, -.65), bonsaiRootPoint(root, 1, .65));
  }
  const field = buildProceduralScenes()[2], out = new Float64Array(6);
  const offset = field.findIndex((value, i) => i % STRIDE === 6 && value === 4) - 6;
  assert.ok(offset >= 0, "surface-root ink is included in the prepared scene");
  const before = sceneStart(2) - TRANSITION_SECONDS;
  poseMark(field, offset, 2, before, out); assert.equal(out[4], 0);
  poseMark(field, offset, 2, before + .7, out); assert.ok(out[4] > field[offset + 4] * .95);
});

test("the minimal birds share wing roots and move and flap within the plate", () => {
  for (let bird = 0; bird < 3; bird++) {
    const first = [...bonsaiBirdPoint(bird, 1, 0, 0)], later = [...bonsaiBirdPoint(bird, 1, 0, 2)];
    assert.ok(Math.hypot(...first.map((v, axis) => later[axis] - v)) > 50);
    const wingAt = time => { const root = bonsaiBirdPoint(bird, 1, 0, time), tip = bonsaiBirdPoint(bird, 1, 1, time); return [...tip].map((v, axis) => v - root[axis]); };
    assert.notDeepEqual(wingAt(0), wingAt(.3));
    for (let time = 0; time < 12; time += .2) {
      assert.deepEqual(bonsaiBirdPoint(bird, -1, 0, time), bonsaiBirdPoint(bird, 1, 0, time));
      for (const wing of [-1, 1]) for (const t of [0, .5, 1]) {
        const point = bonsaiBirdPoint(bird, wing, t, time);
        assert.ok(point.every(Number.isFinite));
        assert.ok(point[0] + 700 > 0 && point[0] + 700 < PLATE.width && point[1] + 400 > 0 && point[1] + 400 < PLATE.height);
      }
    }
  }
});

test("the protein closes around a fixed binding target with correctly attached contacts", () => {
  const open = proteinFrames(0), closed = proteinFrames(9);
  const distance = state => BINDING_RESIDUES.reduce((sum, residue) => sum + Math.hypot(...state.points[residue].map((v, axis) => v - BINDING_SITE[axis])), 0) / BINDING_RESIDUES.length;
  assert.ok(distance(closed) < distance(open) * .65);
  for (const state of [open, proteinFrames(3.6), closed]) for (let i = 0; i < BINDING_RESIDUES.length; i++) {
    const a = bindingContact(BINDING_RESIDUES[i], i, 0, state), b = bindingContact(BINDING_RESIDUES[i], i, 1, state);
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(Math.abs(a[axis] - state.points[BINDING_RESIDUES[i]][axis]) < 1e-8);
      assert.ok(Math.abs(b[axis] - BINDING_ATOMS[i][axis]) < 1e-8);
    }
  }
});

test("robot inverse kinematics reaches the pickup path with smooth segment boundaries", () => {
  for (let t = 0; t < 9; t += .037) {
    const target = robotTarget(t), actual = robotFK(robotIK(target)), state = robotState(t);
    assert.ok(Math.hypot(...target.map((v, axis) => v - actual[axis])) < 1e-10);
    assert.ok([...state.q, ...state.velocity, ...state.acceleration, ...state.dynamics.torque].every(Number.isFinite));
  }
  for (const t of [.6, 2.3, 2.9, 5.3]) {
    const state = robotState(t);
    assert.ok(Math.hypot(...state.velocity) < .0001);
    assert.ok(Math.hypot(...state.acceleration) < .03);
  }
});

test("robot torques obey gravity and the kinetic-energy identity of the model", () => {
  const { l1, l2, m1, m2, g } = ROBOT_MODEL, payload = ROBOT_MODEL.payload;
  const potential = q => g * ((m1 * l1 / 2 + m2 * l1 + payload * l1) * Math.sin(q[0]) + (m2 * l2 / 2 + payload * l2) * Math.sin(q[0] + q[1]));
  for (const q of [[.7, -.9], [1.8, -1.6]]) {
    const zero = robotDynamics(q, [0, 0], [0, 0], payload), e = .000001;
    assert.ok(zero.mass[0] > 0 && zero.mass[0] * zero.mass[2] - zero.mass[1] ** 2 > 0);
    for (let axis = 0; axis < 2; axis++) {
      const a = [...q], b = [...q]; a[axis] -= e; b[axis] += e;
      assert.ok(Math.abs((potential(b) - potential(a)) / (2 * e) - zero.torque[axis]) < 1e-7);
    }
    const v = [.6, -.4], moving = robotDynamics(q, v, [0, 0], payload);
    const before = robotDynamics(q.map((x, i) => x - v[i] * e), v, [0, 0], payload).mass;
    const after = robotDynamics(q.map((x, i) => x + v[i] * e), v, [0, 0], payload).mass;
    const derivative = after.map((x, i) => (x - before[i]) / (2 * e));
    const power = v.reduce((sum, x, i) => sum + x * (moving.torque[i] - moving.gravity[i]), 0);
    const kineticRate = .5 * (derivative[0] * v[0] ** 2 + 2 * derivative[1] * v[0] * v[1] + derivative[2] * v[1] ** 2);
    assert.ok(Math.abs(power - kineticRate) < 1e-7);
  }
});

test("the payload stays on the table until grasped, then follows the gripper without a jump", () => {
  const first = robotState(0), contact = robotState(2.9), before = robotState(2.8999), lift = robotState(5.5);
  assert.deepEqual(first.object, before.object);
  assert.ok(Math.hypot(...contact.object.map((v, i) => v - before.object[i])) < 1e-8);
  assert.equal(contact.grip, 1);
  assert.equal(contact.payload, ROBOT_MODEL.payload);
  assert.equal(first.object[1] + 21, 214);
  assert.ok(contact.wrist[1] + 48 < 214, "the fingertips clear the table during the grasp");
  assert.ok(lift.object[1] < first.object[1] - 250);
  assert.deepEqual(lift.object, [lift.wrist[0], lift.wrist[1] + 28, 0]);
  assert.ok(ROBOT_BASE.every(Number.isFinite));
});

test("joint arcs measure the link angles while cables and actuator follow their attachments", () => {
  for (const time of [0, 1.4, 2.6, 3.8, 5.5]) {
    const state = robotState(time), arcs = robotAngles(state), actuator = state.actuator;
    assert.deepEqual(arcs[0].center, ROBOT_BASE);
    assert.deepEqual(arcs[1].center, state.elbow);
    assert.ok(Math.abs(arcs[0].end - arcs[0].start + state.q[0]) < 1e-10);
    assert.ok(Math.abs(arcs[1].end - arcs[1].start + state.q[1]) < 1e-10);
    const a = [Math.cos(arcs[0].end), Math.sin(arcs[0].end)], b = [Math.cos(arcs[1].end), Math.sin(arcs[1].end)];
    assert.ok(Math.abs((state.elbow[0] - ROBOT_BASE[0]) * a[1] - (state.elbow[1] - ROBOT_BASE[1]) * a[0]) < 1e-8);
    assert.ok(Math.abs((state.wrist[0] - state.elbow[0]) * b[1] - (state.wrist[1] - state.elbow[1]) * b[0]) < 1e-8);
    assert.ok(actuator.length > 100);
    for (let axis = 0; axis < 2; axis++) {
      const direction = axis ? Math.sin(actuator.angle) : Math.cos(actuator.angle);
      assert.ok(Math.abs(actuator.anchor[axis] + direction * actuator.length - actuator.pivot[axis]) < 1e-8);
    }
    assert.deepEqual([...robotCable(0, 0, 0, state)], [ROBOT_BASE[0] - 18, ROBOT_BASE[1] - 16, -38]);
    assert.deepEqual([...robotCable(0, 1, 0, state)], [state.elbow[0] + 5, state.elbow[1] - 6, -38]);
    assert.deepEqual([...robotCable(1, 1, 0, state)], [state.wrist[0] - 8, state.wrist[1] - 8, -32]);
  }
});

test("the humanoid arms reach symmetrically and lift the shared object without a jump", () => {
  for (let time = 0; time < 9; time += .13) {
    const state = humanoidState(time), [left, right] = state.arms;
    assert.ok(Math.abs(left.wrist[0] + right.wrist[0]) < 1e-9);
    assert.equal(left.wrist[1], right.wrist[1]);
    for (const arm of state.arms) {
      const x = arm.base[0] + Math.cos(arm.q[0]) * HUMANOID.upper + Math.cos(arm.q[0] + arm.q[1]) * HUMANOID.forearm;
      const y = arm.base[1] + Math.sin(arm.q[0]) * HUMANOID.upper + Math.sin(arm.q[0] + arm.q[1]) * HUMANOID.forearm;
      assert.ok(Math.hypot(x - arm.wrist[0], y - arm.wrist[1]) < 1e-8);
      assert.ok(arm.actuator.length > 55);
    }
    if (time >= 2.9) {
      assert.equal(state.grip, 1);
      assert.ok(Math.abs(state.object[1] - left.wrist[1] - 18) < 1e-8);
      for (const index of [0, 1]) for (let finger = 0; finger < 5; finger++) {
        const tip = humanoidFinger(index, finger, 1, state);
        assert.ok(Math.abs(Math.abs(tip[0]) - 42) < 1e-8, "fingertips meet the cartridge side");
      }
    }
    const angles = humanoidAngles(state);
    for (let i = 0; i < 2; i++) assert.ok(Math.abs(angles[i].end - angles[i].start - state.arms[i].q[1]) < 1e-10);
  }
  assert.deepEqual(humanoidState(2.899).object, humanoidState(2.9).object);
  assert.ok(humanoidState(5.5).object[1] < humanoidState(0).object[1] - 110);
  assert.ok(humanoidState(4.96).blink < .1 && humanoidState(4.5).blink === 1);
});

test("the molecular envelope is closed and retains the structural reference", () => {
  const mesh = moleculeMesh();
  assert.ok(mesh.vertices.length > 1000);
  assert.ok(mesh.edges.every(edge => edge.faces.length === 2), "the Gaussian envelope is watertight before its display cutaway");
  const view = sceneView(7, sceneStart(7) + 8), surface = view.protein.surface;
  assert.equal(surface.opacity, 1);
  assert.ok(surface.positions.every(Number.isFinite));
  mesh.vertices.forEach((point, i) => point.forEach((value, axis) => assert.ok(Math.abs(surface.positions[i * 3 + axis] - value) < 1e-8)));
  const pixel = surface.depth.findIndex(Number.isFinite), depth = surface.depth[pixel], x = pixel % 140 * 10 + 5, y = Math.floor(pixel / 140) * 10 + 5;
  assert.ok(pixel >= 0);
  assert.ok(moleculeOcclusion(surface, x, y, depth - 20) < .1);
  assert.equal(moleculeOcclusion(surface, x, y, depth + 20), 1);
});

test("the structured core is visible at entry while the surrounding chain folds", () => {
  const entry = sceneView(7, sceneStart(7)), middle = sceneView(7, sceneStart(7) + 3.6), incoming = sceneView(7, sceneStart(7) - 2);
  for (const view of [incoming, entry, middle]) {
    assert.equal(view.protein.surface.opacity, 1);
    assert.ok(view.protein.surface.visible.reduce((sum, v) => sum + v, 0) > 300);
    assert.ok(view.protein.surface.positions.every(Number.isFinite));
  }
  assert.deepEqual(entry.protein.core.points, middle.protein.core.points);
  assert.notDeepEqual(entry.protein.points, middle.protein.points);
  for (let i = 0; i < entry.protein.surface.positions.length; i++) assert.ok(Math.abs(entry.protein.surface.positions[i] - middle.protein.surface.positions[i]) < 2);
  const field = buildProceduralScenes()[7], out = new Float64Array(6);
  let detail = 0;
  for (let i = 0; i < field.length; i += STRIDE) if (field[i + 6] === 6) { poseMark(field, i, 7, sceneStart(7), out, entry); detail += out[4]; }
  assert.ok(detail > 5, "the opening includes internal ribbon detail in its cutaway");
});

test("joint annotations are articulated ink strokes in the shared morph field", () => {
  for (const time of [0, 1.3, 3.9, 5.5]) {
    const state = humanoidState(time);
    for (const index of [0, 1]) {
      const arm = state.arms[index];
      for (const [t, angle] of [[0, arm.q[0]], [1, arm.q[0] + arm.q[1]]]) {
        const point = humanoidAnglePoint(index, 0, t, state);
        assert.ok(Math.abs(point[0] - arm.elbow[0] - Math.cos(angle) * 39) < 1e-8);
        assert.ok(Math.abs(point[1] - arm.elbow[1] - Math.sin(angle) * 39) < 1e-8);
      }
    }
  }
  const fields = buildProceduralScenes(), field = fields[6], out = new Float64Array(6), next = new Float64Array(6), blended = new Float64Array(6);
  const offset = field.findIndex((value, i) => i % STRIDE === 6 && value === 60) - 6;
  assert.ok(offset >= 0);
  const time = sceneStart(7) - 1.5;
  poseMark(field, offset, 6, time, out);
  poseMark(fields[7], offset, 7, time, next);
  blendMark(out, next, .5, field[offset + 7], blended);
  assert.ok(blended.every(Number.isFinite));
  assert.notDeepEqual([...blended.slice(0, 2)], [...out.slice(0, 2)]);
  blendMark(out, next, 1, field[offset + 7], blended);
  for (let i = 0; i < 6; i++) assert.ok(Math.abs(blended[i] - next[i]) < 1e-8);
});

test("scene inks and every molecular shade are greyscale", () => {
  for (const ink of INK_PALETTE) {
    const channels = [1, 3, 5].map(i => parseInt(ink.slice(i, i + 2), 16));
    assert.equal(channels[0], channels[1]); assert.equal(channels[1], channels[2]);
  }
  for (const shade of MOLECULE_SHADES) {
    const channels = shade.match(/[\d.]+/g).map(Number);
    assert.equal(channels[0], channels[1]); assert.equal(channels[1], channels[2]);
  }
});

test("the outer cell breaks into moving fragments and releases its depth mask into the moon", () => {
  const surface = sceneView(7, sceneStart(7) + 8).protein.surface, face = surface.visible.findIndex(Boolean);
  const target = { field: buildMoonScene(), stride: STRIDE }, triangle = surface.mesh.triangles[face];
  const start = dissolveMoleculeTriangle(surface, face, 0, target), middle = dissolveMoleculeTriangle(surface, face, .5, target), end = dissolveMoleculeTriangle(surface, face, 1, target);
  for (let i = 0; i < 3; i++) for (let axis = 0; axis < 2; axis++) assert.ok(Math.abs(start[i * 2 + axis] - surface.projected[triangle[i] * 3 + axis]) < 1e-8);
  assert.notDeepEqual(middle, start);
  const area = p => Math.abs((p[2] - p[0]) * (p[5] - p[1]) - (p[3] - p[1]) * (p[4] - p[0]));
  assert.ok(area(middle) < area(start));
  const offset = ((face * 73) % (target.field.length / STRIDE)) * STRIDE;
  for (let i = 0; i < 3; i++) for (let axis = 0; axis < 2; axis++) assert.ok(Math.abs(end[i * 2 + axis] - target.field[offset + axis]) < 1e-8);
  const pixel = surface.depth.findIndex(Number.isFinite), depth = surface.depth[pixel], x = pixel % 140 * 10 + 5, y = Math.floor(pixel / 140) * 10 + 5;
  assert.ok(moleculeOcclusion(surface, x, y, depth - 20) < .1);
  assert.equal(moleculeOcclusion({ ...surface, dissolve: 1 }, x, y, depth - 20), 1);
  assert.equal(sceneView(0, DURATION - .01).moon, 1);
});

test("homepage fallback leads with the engraving before lettering, raccoon and lower content", () => {
  for (const route of ["/", "/ocuna", "/ocura"]) {
    const html = crawlableHtml(route);
    const heading = html.indexOf("<h1"), raccoon = html.indexOf('aria-label="Ocuna raccoon"'), engraving = html.indexOf('id="home-engraving"'), partners = html.indexOf('aria-labelledby="system-partners-title"');
    assert.ok(engraving >= 0 && engraving < heading && heading < raccoon && raccoon < partners);
    assert.ok(html.includes(`src="/${PREPARED_FILM.variants.desktop.poster}"`));
    assert.ok(html.includes(`srcset="/${PREPARED_FILM.variants.mobile.poster}"`));
  }
});

test("pausing, visibility changes, seeking, and disposal control the rendering clock", async () => {
  const saved = new Map(), callbacks = new Map(), listeners = new Map();
  let nextId = 0, draws = 0, segments = 0, surfaceFills = 0, images = 0, hidden = false;
  const context = new Proxy({}, { get: (_, name) => {
    if (name === "createRadialGradient") return () => ({ addColorStop() {} });
    if (name === "getImageData") return (x, y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) });
    if (name === "stroke") return () => { draws++; };
    if (name === "fill") return () => { surfaceFills++; };
    if (name === "drawImage") return () => { images++; };
    if (name === "fillText") return () => { throw new Error("Angle labels must dissolve as ink strokes, without a text overlay."); };
    return () => {};
  } });
  const canvas = { dataset: {}, getContext: () => context, getBoundingClientRect: () => ({ width: 1000, height: 600 }), addEventListener() {}, removeEventListener() {} };
  function replace(name, value) { saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, configurable: true, writable: true }); }
  let player;
  try {
    replace("document", { get hidden() { return hidden; }, createElement: () => ({ getContext: () => context }), addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) });
    replace("window", { devicePixelRatio: 1 });
    replace("Path2D", class { moveTo() {} lineTo() { segments++; } });
    replace("ResizeObserver", class { observe() {} disconnect() {} });
    replace("IntersectionObserver", class { observe() {} disconnect() {} });
    replace("Image", class { constructor() { throw new Error("The film should not request raster artwork."); } });
    replace("requestAnimationFrame", callback => { callbacks.set(++nextId, callback); return nextId; });
    replace("cancelAnimationFrame", id => callbacks.delete(id));
    const step = timestamp => { const pending = [...callbacks.values()]; callbacks.clear(); for (const callback of pending) callback(timestamp); };
    let ready;
    const prepared = new Promise(resolve => { ready = resolve; });
    player = mountEngravedMotion(canvas, { playing: false, onReady: ready, onError: error => { throw error; } });
    await prepared;
    assert.equal(callbacks.size, 0);
    assert.ok(draws > 0, "reduced-motion/default pause still paints an illustration");
    assert.ok(segments > 1000, "reduced-motion startup shows the completed moon rather than its empty opening frame");
    player.seek(sceneStart(7) - 1.5);
    assert.equal(canvas.dataset.scene, "Robotics");
    player.seek(sceneStart(7) + 8);
    assert.equal(canvas.dataset.scene, "Protein");
    assert.ok(surfaceFills > 0, "the molecular wash paints through the same paused player");
    player.seek(4);
    const moonSegments = segments, moonImages = images;
    player.seek(5);
    assert.ok(segments > moonSegments, "water and clouds move around the completed Moon");
    assert.equal(images, moonImages + 2, "paper and the completed Moon reuse their two cached images");
    player.seek(sceneStart(3));
    const mechanismSegments = segments;
    player.seek(sceneStart(3) + .5);
    assert.ok(segments > mechanismSegments, "the connected gear trains animate across the scene");
    assert.equal(canvas.dataset.cachedArtwork, "true", "the central mechanism keeps its cached engraving");
    player.seek(sceneStart(2));
    assert.equal(canvas.dataset.scene, "Bonsai");
    assert.equal(callbacks.size, 0, "seeking a paused film does not start playback");
    player.setPlaying(true);
    step(1000); step(1100); step(1200); step(1300);
    assert.ok(Number(canvas.dataset.time) > sceneStart(2));
    player.setPlaying(false);
    const pausedTime = canvas.dataset.time, pausedDraws = draws;
    step(9000);
    assert.equal(draws, pausedDraws);
    player.setPlaying(true);
    step(10000);
    assert.equal(canvas.dataset.time, pausedTime, "resume does not catch up through the pause");
    hidden = true; listeners.get("visibilitychange")();
    assert.equal(callbacks.size, 0);
    hidden = false; listeners.get("visibilitychange")();
    assert.equal(callbacks.size, 1);
    player.dispose(); player = null;
    assert.equal(callbacks.size, 0);
    assert.equal(listeners.size, 0);

    let loopReady;
    const loopPrepared = new Promise(resolve => { loopReady = resolve; });
    player = mountEngravedMotion(canvas, { playing: true, onReady: loopReady, onError: error => { throw error; } });
    await loopPrepared;
    assert.equal(canvas.dataset.moonFormation, "0", "first playback keeps the opening assembly");
    player.seek(DURATION - .02);
    step(20000); step(20040);
    assert.equal(canvas.dataset.scene, "Moon");
    assert.equal(canvas.dataset.cycle, "1");
    assert.equal(canvas.dataset.moonFormation, "1", "the loop retains the moon assembled from the cell");
    player.setPlaying(false); player.seek(0);
    assert.equal(canvas.dataset.cycle, "0");
    assert.equal(canvas.dataset.moonFormation, "0", "restart replays the opening assembly");
  } finally {
    player?.dispose();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});


test("worker transport keeps drawing off the page and releases its observers and worker", () => {
  const saved = new Map(), messages = [], observers = [], listeners = new Map();
  let instance, geometry, ready = 0, hidden = false;
  const terminated = new Set(), canvasEvents = new Map(), pointerFrames = new Map();
  let nextPointerId = 0;
  function replace(name, value) { saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, configurable: true, writable: true }); }
  const surface = {}, canvas = { dataset: {}, getContext() { throw new Error("The page must not draw when the worker is available."); }, transferControlToOffscreen: () => surface, getBoundingClientRect: () => ({ width: 800, height: 500, left: 0, top: 0 }), addEventListener: (key, value) => canvasEvents.set(key, value), removeEventListener: key => canvasEvents.delete(key) };
  let player;
  try {
    replace("window", { devicePixelRatio: 2 });
    replace("requestAnimationFrame", fn => { pointerFrames.set(++nextPointerId, fn); return nextPointerId; });
    replace("cancelAnimationFrame", id => pointerFrames.delete(id));
    replace("document", { get hidden() { return hidden; }, addEventListener: (key, value) => listeners.set(key, value), removeEventListener: key => listeners.delete(key) });
    replace("ResizeObserver", class { observe() {} disconnect() {} });
    replace("IntersectionObserver", class { constructor(callback) { observers.push(callback); } observe() {} disconnect() {} });
    replace("Worker", class {
      constructor(url, options) {
        assert.equal(options.type, "module");
        this.kind = url.pathname.endsWith("engravedGeometry.worker.js") ? "geometry" : "renderer";
        if (this.kind === "geometry") geometry = this; else instance = this;
      }
      postMessage(message, transfer) { messages.push({ kind: this.kind, message, transfer }); }
      terminate() { terminated.add(this.kind); }
    });
    player = mountEngravedMotion(canvas, { onReady: () => ready++ });
    assert.equal(messages[0].message.type, "init");
    assert.deepEqual(messages[0].transfer, [surface]);
    assert.deepEqual(messages[0].message.size, [800, 500, 2]);
    instance.onmessage({ data: { type: "sceneRequest", index: 2 } });
    assert.equal(messages.at(-1).kind, "geometry"); assert.equal(messages.at(-1).message.index, 2);
    const field = new Float32Array(16);
    const bitmap = { close() {} };
    geometry.onmessage({ data: { index: 2, field, stamps: [{ group: 0, image: bitmap }], buildMs: 600 } });
    assert.equal(messages.at(-1).kind, "renderer"); assert.equal(messages.at(-1).message.type, "scene");
    assert.deepEqual(messages.at(-1).transfer, [field.buffer, bitmap]);
    instance.onmessage({ data: { type: "ready" } }); assert.equal(ready, 1);
    instance.onmessage({ data: { type: "metrics", values: { renderThread: "worker", scene: "Moon" } } });
    assert.equal(canvas.dataset.renderThread, "worker");
    const beforePointer = messages.length;
    for (let i = 0; i < 20; i++) canvasEvents.get("pointermove")({ pointerType: "mouse", clientX: 200 + i, clientY: 200 });
    assert.equal(messages.length, beforePointer); assert.equal(pointerFrames.size, 1, "high-rate mouse input is coalesced");
    for (const fn of pointerFrames.values()) fn(); pointerFrames.clear();
    assert.equal(messages.length, beforePointer + 1); assert.equal(messages.at(-1).message.type, "pointer");
    canvasEvents.get("pointermove")({ pointerType: "mouse", clientX: 250, clientY: 250 });
    player.setPlaying(false); assert.equal(pointerFrames.size, 0); assert.equal(messages.at(-1).message.playing, false);
    player.seek(61.5); assert.equal(messages.at(-1).message.seconds, 61.5);
    observers[0]([{ isIntersecting: false }]); assert.equal(messages.at(-1).message.visible, false);
    observers[0]([{ isIntersecting: true }]); hidden = true; listeners.get("visibilitychange")();
    assert.equal(messages.at(-1).message.visible, false);
    player.dispose(); assert.deepEqual([...terminated].sort(), ["geometry", "renderer"]); assert.equal(listeners.size, 0);
    instance.onmessage({ data: { type: "ready" } }); assert.equal(ready, 1, "late worker replies are ignored after unmount");
  } finally {
    player?.dispose();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
});


test("high-DPI surfaces stay within the raster budget without changing stroke geometry", () => {
  assert.equal(engravedDensity(390, 360, 2), 2);
  assert.equal(engravedDensity(1280, 640, 1), 1);
  for (const [width, height, ratio] of [[1280, 640, 2], [2560, 640, 2], [3840, 2160, 3]]) {
    const density = engravedDensity(width, height, ratio);
    assert.ok(width * height * density * density <= MAX_ENGRAVED_PIXELS + .001);
    assert.ok(density <= ratio && density > 0);
  }
  assert.equal(engravedDensity(390, 360, NaN), 1);
});

test("pending geometry never blocks painting the current scene, and late results stay disposed", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Path2D");
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: class { moveTo() {} lineTo() {} } });
  const callbacks = new Map(), requests = new Map();
  let nextId = 0, paints = 0, ready, engine;
  const context = new Proxy({}, { get: (_, name) => name === "getImageData" ? (x, y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) : name === "fillRect" ? () => paints++ : () => {} });
  const canvas = { getContext: () => context };
  const field = buildMoonScene();
  const prepared = new Promise(resolve => { ready = resolve; });
  const step = timestamp => { const jobs = [...callbacks.values()]; callbacks.clear(); for (const job of jobs) job(timestamp); };
  try {
    engine = createEngravedEngine(canvas, {
      paper: false, onReady: ready,
      createCanvas: () => ({ getContext: () => context }),
      schedule: fn => { callbacks.set(++nextId, fn); return nextId; }, cancel: id => callbacks.delete(id),
      loadScene: index => index === 0 ? Promise.resolve({ field, buildMs: 50 }) : new Promise(resolve => requests.set(index, resolve)),
    });
    engine.resize(1000, 600); await prepared;
    await new Promise(resolve => setTimeout(resolve, 230));
    assert.ok(requests.has(1), "the next scene is prepared independently during the hold");
    const before = paints; step(1000); step(1040); step(1080);
    assert.ok(paints > before, "the current scene keeps painting while its successor is unresolved");
    engine.dispose(); callbacks.clear();
    const disposedPaints = paints;
    requests.get(1)({ field, buildMs: 600 }); await new Promise(resolve => queueMicrotask(resolve));
    assert.equal(paints, disposedPaints); assert.equal(callbacks.size, 0);
  } finally {
    engine?.dispose();
    if (descriptor) Object.defineProperty(globalThis, "Path2D", descriptor); else delete globalThis.Path2D;
  }
});
