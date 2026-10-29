import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createExecutionPlayback, EXECUTION_CYCLE_MS, EXECUTION_DESCRIPTION, EXECUTION_NODES, EXECUTION_STILL_MS,
  executionCurvePath, executionCurvePoint, executionCurves, executionFrame,
} from "../src/lib/executionDisplay.js";

test("branch records precede their separate runs, with both run records available before comparison", () => {
  assert.equal(executionFrame(0).active, "baseline");
  assert.equal(executionFrame(1400).active, "warmup");
  assert.equal(executionFrame(2800).active, "warmupRun");
  assert.ok(executionFrame(2800).completed.includes("warmup"));
  assert.equal(executionFrame(4500).active, "inputs");
  assert.equal(executionFrame(5900).active, "inputsRun");
  assert.ok(executionFrame(5900).completed.includes("inputs"));
  for (const time of [7300, 7800, 8399]) {
    const frame = executionFrame(time);
    assert.ok(frame.completed.includes("warmupRun"));
    assert.ok(frame.completed.includes("inputsRun"));
    assert.deepEqual(frame.packets.map((packet) => packet.edge), ["warmupRun-verify", "inputsRun-verify"]);
  }
  const comparison = executionFrame(10300);
  assert.equal(comparison.active, "compare");
  for (const id of ["warmupRun", "inputsRun", "verify"]) assert.ok(comparison.completed.includes(id));
  assert.equal(executionFrame(11700).active, "choose");
});

test("the completed view holds all records, then repeats without changing the public meaning", () => {
  const complete = executionFrame(EXECUTION_STILL_MS);
  assert.equal(complete.id, "complete");
  assert.equal(complete.active, null);
  assert.deepEqual(new Set(complete.completed), new Set(EXECUTION_NODES.map((node) => node.id)));
  assert.deepEqual(complete.packets, []);
  assert.equal(executionFrame(EXECUTION_CYCLE_MS - 1).id, "complete");
  assert.ok(EXECUTION_CYCLE_MS - EXECUTION_STILL_MS >= 3000);
  for (const time of [0, 1400, 3900, 7800, EXECUTION_STILL_MS]) {
    assert.deepEqual(executionFrame(EXECUTION_CYCLE_MS + time), executionFrame(time));
  }
  assert.deepEqual(executionFrame(-1), executionFrame(EXECUTION_CYCLE_MS - 1));
  for (const node of EXECUTION_NODES) assert.ok(node.description.includes(node.label));
  assert.match(EXECUTION_DESCRIPTION, /separate command/);
  assert.match(EXECUTION_DESCRIPTION, /consistency, not workload quality/);
  assert.match(EXECUTION_DESCRIPTION, /you or your agent chooses/);
  complete.completed.length = 0;
  assert.equal(executionFrame(EXECUTION_STILL_MS).completed.length, 8, "Callers cannot mutate later frames");
});

function anchorsFor(width, compact) {
  const centers = compact
    ? { baseline: [.5, 40], warmup: [.25, 140], inputs: [.75, 140], warmupRun: [.25, 240], inputsRun: [.75, 240], verify: [.5, 350], compare: [.5, 450], choose: [.5, 550] }
    : { baseline: [.125, 150], warmup: [.375, 40], inputs: [.375, 260], warmupRun: [.625, 40], inputsRun: [.625, 260], verify: [.875, 150], compare: [.875, 260], choose: [.875, 370] };
  return Object.fromEntries(Object.entries(centers).map(([id, [fraction, y]]) => {
    const x = width * fraction, half = Math.min(27, width / 16);
    return [id, { x, y, left: x - half, right: x + half, top: y - 18, bottom: y + 18 }];
  }));
}

test("packets follow the measured cubic connectors at narrow and desktop widths", () => {
  assert.deepEqual(executionCurves({}), {});
  const simple = [[0, 0], [0, 4], [4, 4], [4, 0]];
  assert.deepEqual(executionCurvePoint(simple, .5), [2, 3]);
  assert.deepEqual(executionCurvePoint(simple, -1), simple[0]);
  assert.deepEqual(executionCurvePoint(simple, 2), simple[3]);
  assert.equal(executionCurvePath(simple), "M0,0 C0,4 4,4 4,0");
  const observedEdges = new Set();
  for (const [width, compact] of [[248, true], [318, true], [600, false], [1100, false]]) {
    const anchors = anchorsFor(width, compact), curves = executionCurves(anchors, compact);
    assert.equal(Object.keys(curves).length, 8);
    for (const [edge, curve] of Object.entries(curves)) {
      const [from, to] = edge.split("-");
      const vertical = compact || ["verify-compare", "compare-choose"].includes(edge);
      assert.deepEqual(curve[0], vertical ? [anchors[from].x, anchors[from].bottom] : [anchors[from].right, anchors[from].y]);
      assert.deepEqual(curve[3], vertical ? [anchors[to].x, anchors[to].top] : [anchors[to].left, anchors[to].y]);
      assert.deepEqual(executionCurvePoint(curve, 0), curve[0]);
      assert.deepEqual(executionCurvePoint(curve, 1), curve[3]);
    }
    for (let time = 0; time < EXECUTION_CYCLE_MS; time += 17) {
      for (const packet of executionFrame(time).packets) {
        observedEdges.add(packet.edge);
        const curve = curves[packet.edge], point = executionCurvePoint(curve, packet.progress);
        assert.ok(point.every(Number.isFinite));
        for (const axis of [0, 1]) {
          const values = curve.map((control) => control[axis]);
          assert.ok(point[axis] >= Math.min(...values) - 1e-9 && point[axis] <= Math.max(...values) + 1e-9);
        }
        assert.ok(point[0] >= 0 && point[0] <= width);
      }
    }
  }
  assert.equal(observedEdges.size, 8);
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
  advance(400);
  assert.ok(frames.at(-1).time < EXECUTION_CYCLE_MS);
  playback.dispose(); assert.equal(scheduled.size, 0);
  const count = frames.length;
  advance(200); playback.setRunning(true);
  assert.equal(scheduled.size, 0);
  assert.equal(frames.length, count);
});

test("a consumer can suspend or dispose playback during a frame without scheduling hidden work", () => {
  for (const stop of ["pause", "dispose"]) {
    let serial = 0;
    const scheduled = new Map();
    const playback = createExecutionPlayback({
      requestAnimationFrame: (fn) => { scheduled.set(++serial, fn); return serial; },
      cancelAnimationFrame: (id) => scheduled.delete(id),
    }, () => stop === "pause" ? playback.setRunning(false) : playback.dispose());
    playback.setRunning(true);
    const callbacks = [...scheduled.values()]; scheduled.clear();
    callbacks.forEach((callback) => callback(50));
    assert.equal(scheduled.size, 0);
  }
});
