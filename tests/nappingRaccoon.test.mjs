import assert from "node:assert/strict";
import { test } from "node:test";
import { NAP_CONTOURS } from "../src/lib/nappingRaccoonArt.js";
import { mountNappingRaccoon, nappingFrame, nappingPath, NAP_BREATH_MS, NAP_REST_PATH } from "../src/lib/nappingRaccoon.js";

const contoursAt = (time) => nappingPath(nappingFrame(time)).split("Z").filter(Boolean)
  .map((contour) => [...contour.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]));
const area = (points) => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length];
  return sum + p[0] * q[1] - q[0] * p[1];
}, 0) / 2;

test("the breath stays shallow, the head tilts sideways and the lower contour stays planted", () => {
  const peak = contoursAt(2400);
  const movementIn = (region) => NAP_CONTOURS.flatMap((contour, i) => contour.flatMap(([x, y], j) =>
    region(x, y) ? [{ x: peak[i][j][0] - x, y: peak[i][j][1] - y }] : []));
  const back = movementIn((x, y) => x > 600 && x < 1000 && y < 200);
  const backRise = Math.max(...back.map((delta) => Math.abs(delta.y)));
  assert.ok(backRise > 14 && backRise < 22, "The breath should lift the back less than 2.5px at its desktop size");
  const head = movementIn((x, y) => x > 1640 && y > 400 && y < 690);
  assert.ok(Math.max(...head.map((delta) => Math.abs(delta.x))) > 20, "The head should visibly tilt and nestle inward");
  assert.ok(Math.max(...head.map((delta) => Math.abs(delta.y))) < 25, "Head motion should not add a large vertical bob");
  const tail = movementIn((x, y) => x < 500 && y > 550);
  assert.ok(Math.max(...tail.map((delta) => Math.hypot(delta.x, delta.y))) > 12);
  const floor = movementIn((x, y) => y === 808);
  assert.ok(floor.length > 0);
  assert.ok(floor.every((delta) => delta.x === 0 && delta.y === 0));
});

test("the sleeping loop closes and preserves all outlines and negative spaces through an ear twitch", () => {
  assert.equal(nappingPath(nappingFrame(NAP_BREATH_MS)), NAP_REST_PATH);
  assert.equal(nappingPath(nappingFrame(NAP_BREATH_MS - .001)), NAP_REST_PATH);
  for (let time = 0; time < 14400; time += 64) {
    const contours = contoursAt(time);
    assert.equal(contours.length, NAP_CONTOURS.length);
    contours.forEach((contour, i) => {
      assert.equal(contour.length, NAP_CONTOURS[i].length);
      assert.equal(Math.sign(area(contour)), Math.sign(area(NAP_CONTOURS[i])), "A contour or hole must not invert");
      assert.ok(contour.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x > 0 && x < 1859 && y > -30 && y <= 846));
    });
  }
});

test("pause, viewport visibility and reduced motion stop playback without a resume jump", () => {
  const pending = new Map(), listeners = new Map();
  let observer, serial = 0, path;
  const media = { matches: false, addEventListener(_, callback) { this.change = callback; }, removeEventListener() {} };
  const doc = {
    hidden: false,
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    defaultView: {
      matchMedia() { return media; },
      requestAnimationFrame(callback) { pending.set(++serial, callback); return serial; },
      cancelAnimationFrame(id) { pending.delete(id); },
      IntersectionObserver: class {
        constructor(callback) { observer = this; this.callback = callback; }
        observe() {}
        disconnect() { this.disconnected = true; }
      },
    },
  };
  const host = { ownerDocument: doc, dataset: {}, querySelector() { return { setAttribute(_, value) { path = value; } }; } };
  const tick = (now) => { const [id, callback] = pending.entries().next().value; pending.delete(id); callback(now); };
  const motion = mountNappingRaccoon(host);
  assert.equal(pending.size, 0);
  observer.callback([{ isIntersecting: true }]);
  tick(0); tick(100);
  assert.notEqual(path, NAP_REST_PATH);
  motion.setPaused(true);
  const pausedTime = host.dataset.time, pausedPath = path;
  assert.equal(pending.size, 0);
  motion.setPaused(false); tick(10000);
  assert.equal(host.dataset.time, pausedTime);
  assert.equal(path, pausedPath);
  tick(10100);
  assert.notEqual(path, pausedPath);
  doc.hidden = true; listeners.get("visibilitychange")();
  assert.equal(pending.size, 0);
  doc.hidden = false; listeners.get("visibilitychange")();
  observer.callback([{ isIntersecting: false }]);
  assert.equal(pending.size, 0);
  observer.callback([{ isIntersecting: true }]);
  media.matches = true; media.change();
  assert.equal(pending.size, 0);
  assert.equal(path, NAP_REST_PATH);
  media.matches = false; media.change();
  assert.equal(pending.size, 1);
  motion.dispose();
  assert.equal(pending.size, 0);
  assert.equal(listeners.size, 0);
  assert.ok(observer.disconnected);
});
