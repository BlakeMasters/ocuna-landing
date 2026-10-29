import assert from "node:assert/strict";
import test from "node:test";
import { drawEngravedNaturalWorld, moonWaterPoint } from "../src/lib/engravedNaturalWorld.js";
import { bonsaiWind } from "../src/lib/engravedBonsai.js";
import { engravedFraming } from "../src/lib/engravedFraming.js";
import { DURATION, sceneStart } from "../src/lib/engravedTimeline.js";

function capture(scene, seconds, camera) {
  const coordinates = []; let batches = 0;
  const context = {
    save() {}, restore() {},
    createInkPath() { return { moveTo(x, y) { coordinates.push(x, y); }, lineTo(x, y) { coordinates.push(x, y); } }; },
    stroke() { batches++; },
  };
  drawEngravedNaturalWorld(context, scene, seconds, camera);
  return { coordinates, batches };
}

test("natural scenery spans the camera and stays animated with a bounded set of ink paths", () => {
  for (const [w, h, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"]]) {
    const camera = engravedFraming(w, h, variant);
    for (const scene of [0, 1, 2]) {
      const a = capture(scene, sceneStart(scene) + 2, camera), b = capture(scene, sceneStart(scene) + 6, camera);
      assert.equal(a.batches, 8); assert.equal(b.batches, 8);
      assert.ok(a.coordinates.length > 2000 && a.coordinates.length < 90000);
      assert.ok(a.coordinates.every(Number.isFinite));
      const xs = a.coordinates.filter((_, i) => i % 2 === 0);
      assert.ok(Math.min(...xs) < camera.left + 50 && Math.max(...xs) > camera.right - 50);
      assert.notDeepEqual(a.coordinates, b.coordinates, "clouds, water or wind continue through the held scene");
    }
  }
});

test("the Moon's complete moving shore returns to the same phase at the film seam", () => {
  const camera = engravedFraming(1800, 360, "desktop");
  const a = capture(0, 0, camera), b = capture(0, DURATION, camera);
  assert.equal(a.coordinates.length, b.coordinates.length);
  for (let i = 0; i < a.coordinates.length; i++) assert.ok(Math.abs(a.coordinates[i] - b.coordinates[i]) < 1e-8);
  for (const depth of [.15, .5, .9]) {
    const initial = moonWaterPoint(710, depth, 0), later = moonWaterPoint(710, depth, 2);
    assert.ok(Math.hypot(...later.map((value, axis) => value - initial[axis])) > .4);
  }
});

test("the garden wind keeps the root collar fixed and bends the canopy continuously", () => {
  for (let t = -3; t <= 16; t += .05) {
    assert.equal(bonsaiWind(658, 612, t), 0);
    assert.equal(bonsaiWind(658, 700, t), 0);
    assert.ok(Math.abs(bonsaiWind(658, 100, t)) < 11.5);
    assert.ok(Math.abs(bonsaiWind(658, 100, t + 1 / 30) - bonsaiWind(658, 100, t)) < .5);
  }
  const canopy = Array.from({ length: 101 }, (_, i) => bonsaiWind(658, 100, i / 10));
  assert.ok(Math.max(...canopy) - Math.min(...canopy) > 12);
});
