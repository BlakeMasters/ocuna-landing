import assert from "node:assert/strict";
import test from "node:test";
import { drawEngravedBiologyWorld, fibrilPoint, membranePoint, vesicleState } from "../src/lib/engravedBiologyWorld.js";
import { engravedFraming } from "../src/lib/engravedFraming.js";
import { sceneStart } from "../src/lib/engravedTimeline.js";

for (const [width, height, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"]]) {
  const camera = engravedFraming(width, height, variant);
  test(`${variant} fibrils remain attached to the moving membrane and domains`, () => {
    const span = camera.right - camera.left;
    const anchors = [[camera.left - span * .05, camera.left + span * .40],
      [camera.left + span * .05, camera.left + span * .30],
      [camera.right + span * .08, camera.right - span * .42],
      [camera.right - span * .06, camera.right - span * .32]];
    for (const time of [-1.5, 0, 3.2, 7.5, 14]) for (let id = 0; id < 4; id++) {
      const root = membranePoint(anchors[id][0], -1, time, camera);
      for (const across of [-1, 0, 1]) assert.deepEqual(fibrilPoint(0, across, id, time, camera).slice(0, 2), root);
      const end = membranePoint(anchors[id][1], -1, time, camera);
      for (const across of [-1, 0, 1]) {
        const at = fibrilPoint(1, across, id, time, camera);
        assert.ok(Math.hypot(at[0] - end[0], at[1] - end[1]) < 1e-5, "both ends meet the membrane instead of leaving an upright stalk");
      }
      const domain = vesicleState(id, time, camera), at = fibrilPoint(id % 2 ? .62 : .30, 0, id, time, camera);
      assert.equal(domain.x, at[0]); assert.equal(domain.y, at[1]);
      for (let u = 0; u <= 1; u += .05) {
        const a = fibrilPoint(u, 1, id, time, camera), b = fibrilPoint(u, 1, id, time + .001, camera);
        assert.ok(a.every(Number.isFinite) && b.every(Number.isFinite));
        assert.ok(Math.hypot(...a.map((v, axis) => v - b[axis])) < .1, "the attached chain moves continuously");
      }
    }
  });
  test(`${variant} molecular environment spans the camera and moves without a dense render graph`, () => {
    function capture(time) {
      let count = 0, batches = 0, left = Infinity, right = -Infinity, checksum = 0;
      const context = { save() {}, restore() {}, createInkPath() { return {
        moveTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); },
        lineTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); count++; left = Math.min(left, x); right = Math.max(right, x); checksum += x * .31 + y * .67; },
      }; }, stroke() { batches++; assert.ok(this.globalAlpha <= .52); assert.match(this.strokeStyle, /^#([0-9a-f]{2})\1\1$/i); } };
      drawEngravedBiologyWorld(context, sceneStart(7) + time, camera);
      return { count, batches, left, right, checksum };
    }
    const a = capture(1), b = capture(5);
    assert.ok(a.count > 5000 && a.count < 20000);
    assert.ok(a.batches <= 12);
    assert.ok(a.left <= camera.left && a.right >= camera.right);
    assert.notEqual(a.checksum, b.checksum, "the surrounding medium stays active while folding completes");
  });
}
