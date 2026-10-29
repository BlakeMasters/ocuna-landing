import assert from "node:assert/strict";
import test from "node:test";
import { createEngravedEngine, sceneAnimationTime } from "../src/lib/engravedEngine.js";
import { sceneView } from "../src/lib/engravedPoses.js";
import { buildProceduralScene } from "../src/lib/engravedScenes.js";
import { DURATION, sceneStart } from "../src/lib/engravedTimeline.js";

const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

test("pickup and folding are already moving while their incoming particles settle", () => {
  const robotStart = sceneStart(6), proteinStart = sceneStart(7);
  const initialRobot = sceneView(6, robotStart).robot;
  const arrivingRobot = sceneView(6, sceneAnimationTime(6, robotStart - .5)).robot;
  assert.ok(distance(initialRobot.arms[0].wrist, arrivingRobot.arms[0].wrist) > 10,
    "the wrist has begun its approach before the chapter starts");
  const initialProtein = sceneView(7, proteinStart).protein;
  const arrivingProtein = sceneView(7, sceneAnimationTime(7, proteinStart - .5)).protein;
  assert.ok(arrivingProtein.progress > initialProtein.progress + .01,
    "folding starts before reconstruction is complete");
});

test("incoming, held and departing poses share a continuous clock without advancing the moon", () => {
  const epsilon = 1e-5;
  for (const scene of [6, 7]) {
    const start = sceneStart(scene);
    const times = [-3, -1, -epsilon, 0, epsilon, 1, 8, 13].map(offset => sceneAnimationTime(scene, start + offset));
    assert.ok(times.every((value, i) => i === 0 || value > times[i - 1]));
    for (const offset of [-1, 0, 1]) assert.equal(sceneAnimationTime(scene, start + offset), start + offset + 1.5);
    const before = sceneView(scene, sceneAnimationTime(scene, start - epsilon));
    const after = sceneView(scene, sceneAnimationTime(scene, start + epsilon));
    if (scene === 6) assert.ok(distance(before.robot.arms[0].wrist, after.robot.arms[0].wrist) < .01);
    else assert.ok(Math.abs(before.protein.progress - after.protein.progress) < .0001);
  }
  for (const scene of [0, 1, 2, 3, 4, 5]) {
    for (const time of [0, 3.4, 10, 39, DURATION - .1, DURATION]) assert.equal(sceneAnimationTime(scene, time), time);
  }
});

test("both transition plates repaint current moving poses while reusing their canvases", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Path2D");
  const checksum = (x, y) => x * .137 + y * .173 + x * y * .000031;
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: class {
    signature = 0;
    moveTo(x, y) { this.signature += checksum(x, y); }
    lineTo(x, y) { this.signature += checksum(x, y) * .79; }
    closePath() {}
  } });
  const reads = [];
  function context() {
    const values = { globalAlpha: 1, signature: 0, currentPath: 0, clears: 0 }, stack = [];
    return new Proxy(values, { get(target, name) {
      if (name in target) return target[name];
      if (name === "save") return () => stack.push(target.globalAlpha);
      if (name === "restore") return () => { target.globalAlpha = stack.pop() ?? 1; };
      if (name === "clearRect") return () => { target.signature = 0; target.clears++; };
      if (name === "beginPath") return () => { target.currentPath = 0; };
      if (name === "moveTo") return (x, y) => { target.currentPath += checksum(x, y); };
      if (name === "lineTo") return (x, y) => { target.currentPath += checksum(x, y) * .79; };
      if (name === "stroke" || name === "fill") return path => { target.signature += (path?.signature ?? target.currentPath) * target.globalAlpha; };
      if (name === "drawImage") return image => { target.signature += image.getContext("2d").signature; };
      if (name === "getImageData") return (x, y, width, height) => {
        reads.push({ image: target.owner, signature: target.signature, clears: target.clears });
        const data = new Uint8ClampedArray(width * height * 4);
        data[0] = 53; data[1] = 53; data[2] = 53; data[3] = 255;
        return { data };
      };
      return () => {};
    } });
  }
  let engine;
  try {
    const main = context();
    await new Promise((resolve, reject) => {
      engine = createEngravedEngine({ getContext: () => main }, {
        playing: false, paper: false, buildScene: buildProceduralScene,
        createCanvas(width, height) {
          const ink = context(), image = { width, height, getContext: () => ink };
          ink.owner = image; return image;
        },
        schedule() { throw Error("No animation clock during the paused regression check"); }, cancel() {}, onReady: resolve, onError: reject,
      });
      engine.resize(800, 500);
    });
    reads.length = 0;
    engine.seek(sceneStart(5) - 1.5, { completeMoon: true });
    assert.equal(reads.length, 2);
    const first = reads.slice();
    engine.seek(sceneStart(5) - 1.2, { completeMoon: true });
    assert.equal(reads.length, 4, "both current poses are resampled on the next transition frame");
    for (let i = 0; i < 2; i++) {
      assert.equal(reads[i + 2].image, first[i].image, "the existing scene canvas is reused");
      assert.equal(reads[i + 2].clears, first[i].clears + 1, "old ink is cleared instead of accumulating");
      assert.notEqual(reads[i + 2].signature, first[i].signature, "the painted subject geometry has moved before its particles settle");
    }
  } finally {
    engine?.dispose();
    if (descriptor) Object.defineProperty(globalThis, "Path2D", descriptor); else delete globalThis.Path2D;
  }
});
