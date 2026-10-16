import assert from "node:assert/strict";
import { test } from "node:test";
import { brandWalkPose, brandWalkFrame, createBrandWalkPlayback, BRAND_STRIDE_MS, BRAND_WALK_LOOP_MS } from "../src/lib/brandWalk.js";
import { raccoonContours } from "../src/lib/lectpy-raccoon/raccoon_walk.js";
import { RACCOON_CONTOURS } from "../src/lib/lectpy-raccoon/raccoon_art.js";

test("a planted paw retracts along the floor, lifts, and returns forward", () => {
  const toe = RACCOON_CONTOURS[1].findIndex(([x, y]) => x === 224.06 && y === 386.49);
  assert.ok(toe >= 0);
  const at = (cycle) => raccoonContours(brandWalkPose(cycle * BRAND_STRIDE_MS))[1][toe];
  let previous = at(0);
  for (let cycle = .02; cycle < .62; cycle += .02) {
    const point = at(cycle);
    assert.ok(point[0] < previous[0], "Planted feet must sweep backward, not jitter between poses");
    assert.ok(Math.abs(point[1] - 386.49) < 1e-8, "A planted paw must stay on the floor");
    previous = point;
  }
  assert.ok(at(.81)[1] < 386.49 - 25, "The return arc must lift the paw off the floor");
  assert.ok(at(.9)[0] > at(.7)[0], "A lifted paw must return forward");
  assert.ok(Math.hypot(...at(1).map((v, i) => v - at(0)[i])) < 1e-8);
});

test("the complete gait and tail close continuously and retain the logo's face", () => {
  const contours = (time) => raccoonContours(brandWalkPose(time));
  const start = contours(0), end = contours(BRAND_WALK_LOOP_MS - .001);
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let time = 0; time < BRAND_WALK_LOOP_MS; time += 4) {
    const points = contours(time);
    assert.ok(points.flat(2).every(Number.isFinite));
    assert.ok(points.flat().every(([x, y]) => x > -50 && x < 910 && y > -20 && y < 420));
    for (const [a, b] of [[0, 4], [4, 9], [9, 14], [14, 19]]) {
      assert.ok(Math.abs(distance(points[1][a], points[1][b]) - distance(RACCOON_CONTOURS[1][a], RACCOON_CONTOURS[1][b])) < 1e-6);
    }
  }
  start.forEach((contour, i) => contour.forEach((point, j) => assert.ok(distance(point, end[i][j]) < .01)));
  assert.deepEqual(brandWalkFrame(0).paths, brandWalkFrame(BRAND_WALK_LOOP_MS).paths);
});

test("hover exit cancels work and the next hover eases from the original still", () => {
  let serial = 0, now = 0;
  const pending = new Map(), frames = [];
  const playback = createBrandWalkPlayback({
    requestAnimationFrame: (fn) => { pending.set(++serial, fn); return serial; },
    cancelAnimationFrame: (id) => pending.delete(id),
  }, (frame) => frames.push(frame));
  const tick = () => { now += 20; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(now)); };
  assert.equal(pending.size, 0);
  playback.setRunning(true);
  assert.deepEqual(frames.at(-1).paths, brandWalkFrame(0, 0).paths);
  for (let i = 0; i < 20; i++) tick();
  assert.notDeepEqual(frames.at(-1).paths, brandWalkFrame(0, 0).paths);
  playback.setRunning(false);
  assert.equal(pending.size, 0);
  assert.deepEqual(frames.at(-1).paths, brandWalkFrame(0, 0).paths);
  const count = frames.length;
  tick(); assert.equal(frames.length, count);
  playback.setRunning(true); tick();
  assert.deepEqual(frames.at(-1).paths, brandWalkFrame(0, 0).paths);
  playback.dispose(); assert.equal(pending.size, 0);
});
