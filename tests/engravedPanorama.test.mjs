import assert from "node:assert/strict";
import test from "node:test";
import { oceanCrests, oceanSurfacePoint, drawEngravedOcean } from "../src/lib/engravedOcean.js";
import { drawEngravedSpace } from "../src/lib/engravedSpace.js";
import { drawEngravedContinuum } from "../src/lib/engravedContinuum.js";
import { panoramaActors } from "../src/lib/engravedCast.js";
import { engravedFraming } from "../src/lib/engravedFraming.js";
import { createEngravedEngine } from "../src/lib/engravedEngine.js";
import { buildProceduralScene } from "../src/lib/engravedScenes.js";
import { DURATION, sceneStart } from "../src/lib/engravedTimeline.js";

test("the ocean moves at stations across and beyond the original plate", () => {
  assert.equal(oceanCrests(4).filter(c => c.radius > 0).length, 3);
  for (const x of [-1900, -500, 700, 1800, 3300]) {
    const a = oceanSurfacePoint(x, .5, 4), b = oceanSurfacePoint(x, .5, 8);
    assert.ok(a.every(Number.isFinite) && b.every(Number.isFinite));
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > .5, "the side water is animated too");
  }
});

test("wide supporting geometry is finite, extends to both sides and changes with time", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Path2D");
  const camera = engravedFraming(1800, 360, "desktop");
  let coordinates;
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: class {
    moveTo(x, y) { coordinates.push(x, y); } lineTo(x, y) { coordinates.push(x, y); }
  } });
  const context = { save() {}, restore() {}, stroke() {} };
  const capture = draw => { coordinates = []; draw(context); return coordinates; };
  try {
    const layers = [
      t => drawEngravedOcean(context, t, camera), t => drawEngravedSpace(context, t, camera),
      ...[2, 3, 5, 7].map(scene => t => drawEngravedContinuum(context, scene, sceneStart(scene) + t, camera)),
    ];
    for (const layer of layers) {
      const first = capture(() => layer(6)), later = capture(() => layer(8));
      assert.ok(first.length > 1000 && first.every(Number.isFinite));
      let left = Infinity, right = -Infinity;
      for (let i = 0; i < first.length; i += 2) { left = Math.min(left, first[i]); right = Math.max(right, first[i]); }
      assert.ok(left < 0 && right > 1400, "subjects occupy the wider world, not just the old central plate");
      assert.notDeepEqual(first, later);
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "Path2D", descriptor); else delete globalThis.Path2D;
  }
});

test("three workcells fit the panorama with staggered pickup phases", () => {
  for (const [w, h, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"]]) {
    const camera = engravedFraming(w, h, variant);
    const actors = panoramaActors(6, sceneStart(6) + 6, camera);
    assert.equal(actors.length, 2, "the two additional robots accompany the central robot");
    assert.ok(actors[0].x < 700 && actors[1].x > 700);
    assert.notEqual(actors[0].seconds, actors[1].seconds);
    for (const actor of actors) assert.ok(actor.x > camera.left && actor.x < camera.right);
    const late = panoramaActors(6, sceneStart(6) + 12, camera)[0];
    assert.ok(late.seconds - sceneStart(6) < 5.4, "the delayed robot is still lifting late in the scene");
  }
});

test("the same painted moon is retained across departure and the loop arrival", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Path2D");
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: class { moveTo() {} lineTo() {} closePath() {} } });
  const images = [], strokes = [];
  function fakeContext(main = false) {
    const stack = [], state = { globalAlpha: 1 };
    return new Proxy(state, { get(target, name) {
      if (name in target) return target[name];
      if (name === "save") return () => stack.push(target.globalAlpha);
      if (name === "restore") return () => { target.globalAlpha = stack.pop() ?? 1; };
      if (name === "drawImage") return image => { if (main) images.push({ image, alpha: target.globalAlpha }); };
      if (name === "stroke") return () => { if (main) strokes.push(target.globalAlpha); };
      return () => {};
    } });
  }
  const context = fakeContext(true), canvas = { getContext: () => context };
  let engine;
  try {
    await new Promise((resolve, reject) => {
      engine = createEngravedEngine(canvas, { playing: false, paper: false, buildScene: buildProceduralScene,
        createCanvas: (width, height) => ({ width, height, getContext: () => fakeContext() }),
        schedule() { throw new Error("No clock during regression check"); }, cancel() {}, onReady: resolve, onError: reject,
      }); engine.resize(1800, 360);
    });
    engine.seek(10, { completeMoon: true }); const moon = images.at(-1).image;
    images.length = 0; strokes.length = 0;
    engine.seek(10.0000001, { completeMoon: true });
    assert.equal(images.at(-1).image, moon);
    assert.ok(images.at(-1).alpha > .999999);
    assert.equal(images.filter(draw => draw.image === moon).length, 1, "the same cached Moon is painted once above its moving shore");
    engine.seek(DURATION - .00001, { completeMoon: true });
    assert.equal(images.at(-1).image, moon); assert.ok(images.at(-1).alpha > .99999);
    engine.seek(0, { completeMoon: true });
    assert.equal(images.at(-1).image, moon); assert.equal(images.at(-1).alpha, 1);
    engine.seek(sceneStart(3), { completeMoon: true });
    const mechanism = images.slice(-4).map(draw => draw.image);
    images.length = 0;
    engine.seek(sceneStart(3) - .0000001, { completeMoon: true });
    assert.deepEqual(images.slice(-4).map(draw => draw.image), mechanism, "the arriving mechanism uses the same painted layers as its hold");
    assert.ok(images.slice(-4).every(draw => draw.alpha > .999999));
  } finally {
    engine?.dispose();
    if (descriptor) Object.defineProperty(globalThis, "Path2D", descriptor); else delete globalThis.Path2D;
  }
});
