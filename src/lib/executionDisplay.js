import { graphScripts } from "../ocuraDemoData.js";

export const EXECUTION_CYCLE_MS = 12500;
export const EXECUTION_STILL_MS = 9000;
export const EXECUTION_SOURCE = graphScripts.split
  .replace(/\n{3,}/g, "\n\n")
  .replace('point = ocura.chokepoint(reason="before hello_world()")', 'point = ocura.chokepoint(\n        reason="before hello_world()"\n    )')
  .split("\n");
const lineOf = (code) => EXECUTION_SOURCE.findIndex((line) => line.trim() === code);

const phases = [
  { at: 0, id: "entry", active: "main", line: lineOf("main()"), detail: "main() starts the run.", completed: [] },
  { at: 1200, id: "boundary", active: "chokepoint", line: lineOf("point = ocura.chokepoint("), detail: "Execution reaches a decision boundary before hello_world().", completed: ["main"] },
  { at: 3000, id: "normal", active: "hello", line: lineOf("hello_world()"), detail: "The original path continues through hello_world().", completed: ["main", "chokepoint"] },
  { at: 4300, id: "normal-output", active: "printHello", line: lineOf('print("hello_world")'), detail: "The normal path writes its output.", completed: ["main", "chokepoint", "hello"] },
  { at: 5400, id: "branch", active: "chokepoint", line: lineOf("point.split(review_path)"), detail: "A review branch opens from the same decision boundary.", completed: ["main", "chokepoint", "hello", "printHello"] },
  { at: 6500, id: "review", active: "review", line: lineOf("def review_path():"), detail: "review_path() runs along its own branch.", completed: ["main", "chokepoint", "hello", "printHello"] },
  { at: 7700, id: "review-output", active: "printReview", line: lineOf('print("review branch")'), detail: "The review branch writes a separate output.", completed: ["main", "chokepoint", "hello", "printHello", "review"] },
  { at: 8800, id: "complete", active: null, line: null, detail: "Both outputs stay connected to their paths and shared chokepoint.", completed: ["main", "chokepoint", "hello", "printHello", "review", "printReview"] },
];

const flights = [
  { edge: "entry", from: 500, until: 1200 },
  { edge: "normal", from: 2350, until: 3000 },
  { edge: "normal-output", from: 3750, until: 4300 },
  { edge: "review", from: 5750, until: 6500 },
  { edge: "review-output", from: 7150, until: 7700 },
];

export function executionFrame(elapsed) {
  const time = ((elapsed % EXECUTION_CYCLE_MS) + EXECUTION_CYCLE_MS) % EXECUTION_CYCLE_MS;
  const phase = phases.findLast((item) => item.at <= time);
  const flight = flights.find((item) => time >= item.from && time < item.until);
  return {
    ...phase,
    time,
    orb: phase.id === "complete" ? "globe" : phase.id === "branch" ? "connecting" : phase.id.startsWith("review") ? "orbits" : "breathing",
    output: [time >= 5100, time >= 8500],
    packet: flight ? { edge: flight.edge, progress: (time - flight.from) / (flight.until - flight.from) } : null,
  };
}

// The HTML nodes have fixed-height rows, while their columns adapt to the lane.
export function executionGeometry(width) {
  const center = width / 2;
  const left = (width - 24) / 4;
  const right = width - left;
  return {
    entry: [[center, 62], [center, 110]],
    normal: [[center, 172], [center, 196], [left, 196], [left, 220]],
    review: [[center, 172], [center, 196], [right, 196], [right, 220]],
    "normal-output": [[left, 282], [left, 330]],
    "review-output": [[right, 282], [right, 330]],
  };
}

export function executionPacket(points, progress) {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  let distance = Math.max(0, Math.min(1, progress)) * lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index]) {
      const fraction = lengths[index] ? distance / lengths[index] : 0;
      return points[index].map((value, axis) => value + (points[index + 1][axis] - value) * fraction);
    }
    distance -= lengths[index];
  }
  return points.at(-1);
}

// Pauses preserve elapsed time, including viewport and document suspension.
export function createExecutionPlayback(win, onFrame) {
  let elapsed = 0, previous = null, request = 0, running = false, disposed = false, published = -Infinity;
  function tick(now) {
    request = 0;
    if (disposed || !running) return;
    if (previous !== null) elapsed += now - previous;
    previous = now;
    if (now - published >= 40) {
      published = now;
      onFrame(executionFrame(elapsed));
    }
    request = win.requestAnimationFrame(tick);
  }
  return {
    setRunning(next) {
      if (disposed || running === next) return;
      running = next;
      previous = null;
      if (running) request = win.requestAnimationFrame(tick);
      else { win.cancelAnimationFrame(request); request = 0; }
    },
    dispose() { disposed = true; win.cancelAnimationFrame(request); request = 0; },
  };
}
