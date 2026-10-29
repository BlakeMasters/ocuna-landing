import assert from "node:assert/strict";
import test from "node:test";
import { engravedFraming } from "../src/lib/engravedFraming.js";
import { createEngravedScenery } from "../src/lib/engravedScenery.js";
import { poseMark } from "../src/lib/engravedPoses.js";

test("the scenic camera covers each frame and honors the explicit mobile render variant", () => {
  for (const [width, height, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"], [390, 360, "auto"]]) {
    const c = engravedFraming(width, height, variant);
    const screen = (x, y) => [x * c.scale + c.offsetX, y * c.scale + c.offsetY];
    for (const [actual, expected] of [[screen(c.left, c.top), [0, 0]], [screen(c.right, c.bottom), [width, height]], [screen(700, 400), [width / 2, height / 2]]]) {
      actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]) < 1e-9));
    }
    // The complete growing tree fits even before the responsive cover crop.
    assert.ok(screen(700, 10)[1] > 0 && screen(700, 710)[1] < height);
  }
  const mobile = engravedFraming(800, 500, "mobile"), desktop = engravedFraming(800, 500, "desktop");
  assert.notEqual(mobile.scale, desktop.scale, "an 800px bake still uses its requested mobile camera");
});

test("environment paintings cache per scene, respect transition opacity and release their cache", () => {
  let builds = 0, cuts = 0;
  const background = new Proxy({}, { get: (_, name) => name === "stroke" ? () => cuts++ : () => {} });
  const createCanvas = () => { builds++; return { getContext: () => background }; };
  const scenery = createEngravedScenery(createCanvas, 1800, 360, engravedFraming(1800, 360, "desktop"));
  const alphas = [], context = { save() {}, restore() {}, drawImage() { alphas.push(this.globalAlpha); } };
  scenery.draw(context, 0, 0, 0); assert.equal(builds, 0);
  scenery.draw(context, 0, 0, .3); assert.equal(builds, 1); assert.deepEqual(alphas, [.3]);
  const firstCuts = cuts; scenery.draw(context, 0, 1, .7);
  assert.equal(builds, 1); assert.equal(cuts, firstCuts, "later frames reuse the engraved environment");
  for (let scene = 1; scene < 8; scene++) scenery.draw(context, scene, 0, 1);
  assert.equal(builds, 8); assert.ok(cuts > firstCuts);
  scenery.dispose(); scenery.draw(context, 0, 0, 1); assert.equal(builds, 9);
});

test("the wave field softens its rectangular edges into the extended sea", () => {
  const ink = (x, y) => { const out = new Float64Array(6); poseMark(new Float32Array([x, y, 2, -.5, .8, 0, 0, .2]), 0, 1, 4, out); return out[4]; };
  assert.ok(ink(700, 560) > .79);
  assert.ok(ink(54, 560) < .01 && ink(1346, 560) < .01);
  assert.ok(ink(700, 700) < .03);
});
