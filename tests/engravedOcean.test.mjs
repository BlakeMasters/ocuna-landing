import assert from "node:assert/strict";
import test from "node:test";
import { oceanCrests, oceanCurlPoint, drawEngravedOcean } from "../src/lib/engravedOcean.js";
import { engravedFraming } from "../src/lib/engravedFraming.js";

test("the breaker advances and turns over during its held chapter", () => {
  const poses = Array.from({ length: 101 }, (_, i) => oceanCrests(13 + i / 10)[2]);
  const range = values => Math.max(...values) - Math.min(...values);
  assert.ok(range(poses.map(pose => pose.x)) > 100, "the visible crest travels rather than only bobbing");
  const tips = poses.map(pose => {
    const point = oceanCurlPoint(pose, .5, 1, true);
    return [point[0] - pose.x, point[1] - pose.y];
  });
  assert.ok(range(tips.map(point => point[0])) > 70, "the lip evolves relative to the crest itself");
  for (let i = 1; i < tips.length; i++) {
    assert.ok(Math.hypot(tips[i][0] - tips[i - 1][0], tips[i][1] - tips[i - 1][1]) < 4,
      "the curl evolves continuously without a shape reset");
  }
});

test("the wave train advances through the chapter without rocking backwards", () => {
  let before = oceanCrests(-3);
  for (let time = -3 + 1 / 30; time <= 13; time += 1 / 30) {
    const current = oceanCrests(time);
    for (let i = 0; i < current.length; i++) assert.ok(current[i].x > before[i].x);
    before = current;
  }
});

test("animated foam and spray remain finite and use a bounded set of batched paths", () => {
  for (const [width, height, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"]]) {
    const camera = engravedFraming(width, height, variant);
    for (const seconds of [13, 13 + 1 / 30, 16.5, 19, 22.99]) {
      let cuts = 0, batches = 0;
      const context = {
        save() {}, restore() {},
        createInkPath() {
          return {
            moveTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); },
            lineTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); cuts++; },
          };
        },
        stroke() { batches++; },
      };
      drawEngravedOcean(context, seconds, camera);
      assert.equal(batches, 8, "water, curl, foam and spray retain shared ink batches");
      assert.ok(cuts > 4000 && cuts < 14000);
    }
  }
});
