export const EXECUTION_TITLE = "Execution frontier";
export const EXECUTION_DESCRIPTION = "An example Ocura OSS workflow. A completed baseline has two child branches, each recording its parent and reason. Each variation runs as a separate command and keeps its own outcome and captured logs. Record verification checks local consistency, not workload quality. Compare the recorded runs, then you or your agent chooses what to run next.";

export const EXECUTION_NODES = [
  { id: "baseline", label: "Baseline", kind: "record", description: "Baseline: a completed command with its recorded outcome and captured logs." },
  { id: "warmup", label: "Longer warmup", kind: "branch", description: "Longer warmup: a child branch records the reason and parent; execution is a separate step." },
  { id: "inputs", label: "New data mix", kind: "branch", description: "New data mix: a child branch records the reason and parent; your command supplies the actual inputs." },
  { id: "warmupRun", label: "Run & record", kind: "record-logs", description: "Run & record: warmup variation, executed as a separate command with its own outcome and captured logs." },
  { id: "inputsRun", label: "Run & record", kind: "record-logs", description: "Run & record: data variation, executed as a separate command with its own outcome and captured logs, whether the command succeeds or fails." },
  { id: "verify", label: "Verify records", kind: "verify", description: "Verify records: check local record and captured-log consistency, not workload quality." },
  { id: "compare", label: "Compare runs", kind: "compare", description: "Compare runs: review command status, timing, and parameter differences against the baseline; your workflow interprets workload metrics." },
  { id: "choose", label: "You choose", kind: "choose", description: "You choose: you or your agent decides what to run next." },
];

export const EXECUTION_CYCLE_MS = 16000;
export const EXECUTION_STILL_MS = 12800;

const phases = [
  { at: 0, id: "baseline", active: "baseline", completed: [] },
  { at: 1400, id: "warmup", active: "warmup", completed: ["baseline"] },
  { at: 2800, id: "warmupRun", active: "warmupRun", completed: ["baseline", "warmup"] },
  { at: 4500, id: "inputs", active: "inputs", completed: ["baseline", "warmup", "warmupRun"] },
  { at: 5900, id: "inputsRun", active: "inputsRun", completed: ["baseline", "warmup", "warmupRun", "inputs"] },
  { at: 7000, id: "recorded", active: null, completed: ["baseline", "warmup", "warmupRun", "inputs", "inputsRun"] },
  { at: 8400, id: "verify", active: "verify", completed: ["baseline", "warmup", "warmupRun", "inputs", "inputsRun"] },
  { at: 10300, id: "compare", active: "compare", completed: ["baseline", "warmup", "warmupRun", "inputs", "inputsRun", "verify"] },
  { at: 11700, id: "choose", active: "choose", completed: ["baseline", "warmup", "warmupRun", "inputs", "inputsRun", "verify", "compare"] },
  { at: EXECUTION_STILL_MS, id: "complete", active: null, completed: EXECUTION_NODES.map((node) => node.id) },
];

const flights = [
  { edge: "baseline-warmup", from: 650, until: 1400 },
  { edge: "warmup-warmupRun", from: 2050, until: 2800 },
  { edge: "baseline-inputs", from: 3750, until: 4500 },
  { edge: "inputs-inputsRun", from: 5150, until: 5900 },
  { edge: "warmupRun-verify", from: 7300, until: 8400 },
  { edge: "inputsRun-verify", from: 7300, until: 8400 },
  { edge: "verify-compare", from: 9500, until: 10300 },
  { edge: "compare-choose", from: 10900, until: 11700 },
];

export function executionFrame(elapsed) {
  const time = ((elapsed % EXECUTION_CYCLE_MS) + EXECUTION_CYCLE_MS) % EXECUTION_CYCLE_MS;
  const phase = phases.findLast((item) => item.at <= time);
  return {
    time, id: phase.id, active: phase.active, completed: [...phase.completed],
    packets: flights.filter((flight) => time >= flight.from && time < flight.until)
      .map((flight) => ({ edge: flight.edge, progress: (time - flight.from) / (flight.until - flight.from) })),
  };
}

function horizontalCurve(from, to) {
  const middle = (from.right + to.left) / 2;
  return [[from.right, from.y], [middle, from.y], [middle, to.y], [to.left, to.y]];
}

function verticalCurve(from, to) {
  const middle = (from.bottom + to.top) / 2;
  return [[from.x, from.bottom], [from.x, middle], [to.x, middle], [to.x, to.top]];
}

export function executionCurves(anchors, compact = false) {
  if (EXECUTION_NODES.some((node) => !anchors[node.id])) return {};
  const connect = compact ? verticalCurve : horizontalCurve;
  return {
    "baseline-warmup": connect(anchors.baseline, anchors.warmup),
    "warmup-warmupRun": connect(anchors.warmup, anchors.warmupRun),
    "warmupRun-verify": connect(anchors.warmupRun, anchors.verify),
    "baseline-inputs": connect(anchors.baseline, anchors.inputs),
    "inputs-inputsRun": connect(anchors.inputs, anchors.inputsRun),
    "inputsRun-verify": connect(anchors.inputsRun, anchors.verify),
    "verify-compare": verticalCurve(anchors.verify, anchors.compare),
    "compare-choose": verticalCurve(anchors.compare, anchors.choose),
  };
}

export function executionCurvePath(curve) {
  return `M${curve[0].join(",")} C${curve[1].join(",")} ${curve[2].join(",")} ${curve[3].join(",")}`;
}

export function executionCurvePoint(curve, progress) {
  const t = Math.max(0, Math.min(1, progress)), u = 1 - t;
  return [0, 1].map((axis) => u ** 3 * curve[0][axis]
    + 3 * u ** 2 * t * curve[1][axis]
    + 3 * u * t ** 2 * curve[2][axis]
    + t ** 3 * curve[3][axis]);
}

// Suspension keeps elapsed time; resuming never counts time spent offscreen.
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
    if (!disposed && running) request = win.requestAnimationFrame(tick);
  }
  return {
    setRunning(next) {
      if (disposed || running === next) return;
      running = next;
      previous = null;
      if (running) request = win.requestAnimationFrame(tick);
      else { win.cancelAnimationFrame(request); request = 0; }
    },
    dispose() { disposed = true; running = false; win.cancelAnimationFrame(request); request = 0; },
  };
}
