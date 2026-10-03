import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createExecutionPlayback, EXECUTION_CYCLE_MS, EXECUTION_SOURCE, EXECUTION_STILL_MS,
  executionFrame, executionGeometry, executionPacket,
} from "../src/lib/executionDisplay.js";

test("the run opens a branch after the normal output and retains both results until replay", () => {
  assert.equal(executionFrame(0).active, "main");
  assert.equal(executionFrame(0).orb, "breathing");
  assert.equal(EXECUTION_SOURCE[executionFrame(0).line], "main()");
  assert.equal(executionFrame(1500).active, "chokepoint");
  assert.match(EXECUTION_SOURCE[executionFrame(1500).line], /ocura.chokepoint/);
  assert.deepEqual(executionFrame(5000).output, [false, false]);
  assert.deepEqual(executionFrame(5300).output, [true, false]);
  assert.equal(executionFrame(6000).id, "branch");
  assert.equal(executionFrame(6000).orb, "connecting");
  assert.match(EXECUTION_SOURCE[executionFrame(6000).line], /point.split/);
  assert.equal(executionFrame(7000).active, "review");
  assert.equal(executionFrame(7000).orb, "orbits");
  assert.equal(executionFrame(7800).active, "printReview");
  const complete = executionFrame(EXECUTION_STILL_MS);
  assert.deepEqual(complete.output, [true, true]);
  assert.equal(complete.completed.length, 6);
  assert.equal(complete.orb, "globe");
  assert.equal(complete.packet, null);
  assert.deepEqual(executionFrame(EXECUTION_CYCLE_MS), executionFrame(0));
  assert.deepEqual(executionFrame(EXECUTION_CYCLE_MS + 6000), executionFrame(6000));
});

test("moving work stays on the connector at desktop and narrow mobile widths", () => {
  for (const width of [282, 318, 600, 690]) {
    const routes = executionGeometry(width);
    for (let time = 0; time < EXECUTION_CYCLE_MS; time += 17) {
      const frame = executionFrame(time);
      if (!frame.packet) continue;
      const route = routes[frame.packet.edge];
      const point = executionPacket(route, frame.packet.progress);
      assert.ok(point.every(Number.isFinite));
      assert.ok(point[0] >= 0 && point[0] <= width);
      assert.ok(route.slice(1).some((end, index) => {
        const start = route[index];
        return point[0] >= Math.min(start[0], end[0]) && point[0] <= Math.max(start[0], end[0])
          && point[1] >= Math.min(start[1], end[1]) && point[1] <= Math.max(start[1], end[1]);
      }), "The work marker must follow the actual connector, including its turns");
    }
    assert.deepEqual(executionPacket(routes.normal, 0), routes.normal[0]);
    assert.deepEqual(executionPacket(routes.normal, 1), routes.normal.at(-1));
  }
});

test("pause, offscreen suspension and disposal retain the clock without hidden work", () => {
  let now = 0, serial = 0;
  const scheduled = new Map(), frames = [];
  const playback = createExecutionPlayback({
    requestAnimationFrame: (fn) => { scheduled.set(++serial, fn); return serial; },
    cancelAnimationFrame: (id) => scheduled.delete(id),
  }, (frame) => frames.push(frame));
  const advance = (ticks) => {
    for (let tick = 0; tick < ticks; tick++) {
      now += 50;
      const callbacks = [...scheduled.values()]; scheduled.clear();
      callbacks.forEach((fn) => fn(now));
    }
  };
  assert.equal(scheduled.size, 0);
  playback.setRunning(true); advance(50);
  const before = frames.at(-1);
  playback.setRunning(false); advance(500);
  assert.equal(scheduled.size, 0);
  assert.equal(frames.at(-1), before);
  playback.setRunning(true); advance(1);
  assert.equal(frames.at(-1).time, before.time);
  advance(10); assert.equal(frames.at(-1).time, before.time + 500);
  playback.setRunning(true); assert.equal(scheduled.size, 1);
  playback.dispose(); assert.equal(scheduled.size, 0);
  const count = frames.length;
  advance(200); playback.setRunning(true);
  assert.equal(scheduled.size, 0);
  assert.equal(frames.length, count);
});
