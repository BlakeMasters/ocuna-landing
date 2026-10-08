const goldenRatio = (1 + Math.sqrt(5)) / 2;
const vertices = [
  [-1, goldenRatio, 0], [1, goldenRatio, 0], [-1, -goldenRatio, 0], [1, -goldenRatio, 0],
  [0, -1, goldenRatio], [0, 1, goldenRatio], [0, -1, -goldenRatio], [0, 1, -goldenRatio],
  [goldenRatio, 0, -1], [goldenRatio, 0, 1], [-goldenRatio, 0, -1], [-goldenRatio, 0, 1],
];

export const modelEdges = vertices.flatMap((point, index) => vertices.flatMap((other, next) => {
  const distance = point.reduce((sum, value, axis) => sum + (value - other[axis]) ** 2, 0);
  return next > index && Math.abs(distance - 4) < 0.001 ? [[index, next]] : [];
}));

export function modelProjection(seconds = 0) {
  const yaw = 0.5 + seconds * 0.38;
  const pitch = 0.32 + Math.sin(seconds * 0.32) * 0.15;
  const radius = Math.hypot(1, goldenRatio);
  return vertices.map(([vx, vy, vz]) => {
    const x = (vx * Math.cos(yaw) + vz * Math.sin(yaw)) / radius;
    const z = (vz * Math.cos(yaw) - vx * Math.sin(yaw)) / radius;
    const y = vy / radius;
    const tiltedY = y * Math.cos(pitch) - z * Math.sin(pitch);
    const depth = z * Math.cos(pitch) + y * Math.sin(pitch);
    const perspective = 4 / (4 - depth);
    return { x: x * 24 * perspective, y: tiltedY * 22 * perspective, depth: (depth + 1) / 2 };
  });
}

// After the first answer, the numerators spell "fourone" as alphabet positions.
const terminalEvents = [
  { start: 0, text: "> 2 * 2", duration: 2.2 },
  { start: 2.6, text: "4" },
  { start: 3.4, text: "> ... / 96", duration: 1.1 },
  { start: 5, text: "6/96" },
  { start: 7, text: "15/96" },
  { start: 9, text: "21/96" },
  { start: 11, text: "18/96" },
  { start: 11.8, text: "15/96" },
  { start: 13, text: "14/96" },
  { start: 14, text: "> (3 + 2) / 96", duration: 2 },
  { start: 16.8, text: "5/96" },
  { start: 18, text: "> " },
];

export function terminalFrame(seconds) {
  const phase = seconds % 22;
  const active = terminalEvents.filter(({ start }) => start <= phase);
  const lines = active.map(({ start, text, duration }) => duration
    ? text.slice(0, Math.min(text.length, Math.floor((phase - start) / duration * text.length)))
    : text);
  const newest = active[active.length - 1];
  const scrollProgress = Math.min(1, (phase - newest.start) / 0.25);
  const scrolling = lines.length > 6 && scrollProgress < 1;
  const rows = lines.slice(scrolling ? -7 : -6);
  return {
    rows,
    offset: scrolling ? -7.5 * (1 - (1 - scrollProgress) ** 3) : 0,
    cursorX: rows[rows.length - 1].length * 3.6 + 1,
    cursorY: (rows.length - 1) * 7.5 - 4,
    cursorVisible: Boolean(newest.duration && phase < newest.start + newest.duration) || Math.floor(phase * 2) % 2 === 0,
  };
}

// The branches remain fixed. A short highlight shows a contribution crossing
// the connection, then the receiving machine continues its own local work.
const exchanges = [
  { link: "lab", start: 2.2, reverse: false },
  { link: "wave", start: 3.4, reverse: false },
  { link: "wave", start: 5, reverse: true },
  { link: "model", start: 6.2, reverse: false },
  { link: "model", start: 10.5, reverse: true },
  { link: "terminal", start: 11.7, reverse: false },
  { link: "terminal", start: 16, reverse: true },
  { link: "study", start: 17.2, reverse: false },
  { link: "study", start: 19, reverse: true },
  { link: "lab", start: 20, reverse: true },
];

function ease(value) {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * (3 - 2 * progress);
}

function point(x, y) {
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

// Hands stay attached to their tools; the sleeves follow the moving shoulders
// and wrists. All gestures use the same active clock as the device animations.
export function figureFrame(seconds) {
  const labPhase = seconds % 13;
  const lean = ease((labPhase - 3.4) / 1.6) - ease((labPhase - 8.2) / 1.8);
  const focusing = ease((labPhase - 0.7) / 0.5) * (1 - ease((labPhase - 3) / 0.6))
    + ease((labPhase - 5.3) / 0.5) * (1 - ease((labPhase - 7.7) / 0.6));
  const focus = Math.sin(labPhase * 5.5) * 12 * focusing;
  const angle = lean * Math.PI / 20;
  const shoulderX = 233 + 28 * Math.cos(angle) + 30 * Math.sin(angle) + 5 * lean;
  const shoulderY = 282 + 28 * Math.sin(angle) - 30 * Math.cos(angle) - 3 * lean;
  const elbowX = 283 + 3 * lean;
  const elbowY = 267 + lean;
  const focusAngle = focus * Math.PI / 180;
  const cuffX = 319 - 9 * Math.cos(focusAngle);
  const cuffY = 253 - 9 * Math.sin(focusAngle);
  const labArm = `M${point(shoulderX, shoulderY - 2)}C${point(shoulderX + 12, shoulderY - 3)} ${point(elbowX - 8, elbowY - 8)} ${point(elbowX, elbowY - 4)}L${point(cuffX - 2, cuffY - 3)} ${point(cuffX + 1, cuffY + 4)} ${point(elbowX + 3, elbowY + 5)}Q${point(elbowX - 4, elbowY + 12)} ${point(elbowX - 10, elbowY + 4)}L${point(shoulderX - 6, shoulderY + 6)}Z`;

  const studyPhase = seconds % 17;
  const turnTime = studyPhase - (studyPhase < 8 ? 3.8 : 11.7);
  const turn = ease(turnTime / 2.1);
  const pageAngle = turn * Math.PI;
  const cosine = Math.cos(pageAngle);
  const lift = Math.sin(pageAngle);
  const outerTop = { x: 857 + 31 * cosine, y: 278 - 2 * cosine - 16 * lift };
  const outerBottom = { x: 855 + 32 * cosine, y: 291 - 2 * cosine - 16 * lift };
  const page = `M857 278Q${point((857 + outerTop.x) / 2, (278 + outerTop.y) / 2 - 3 * Math.abs(cosine))} ${point(outerTop.x, outerTop.y)}L${point(outerBottom.x, outerBottom.y)}Q${point((855 + outerBottom.x) / 2, (291 + outerBottom.y) / 2 - 3 * Math.abs(cosine))} 855 291Z`;
  const pagePoint = (across, down) => point(
    857 - 2 * down + (31 + down) * cosine * across,
    278 + 13 * down + (-2 * cosine - 16 * lift) * across,
  );
  const pageLines = `M${pagePoint(0.18, 0.3)}Q${pagePoint(0.5, 0.23)} ${pagePoint(0.85, 0.3)}M${pagePoint(0.18, 0.6)}Q${pagePoint(0.5, 0.53)} ${pagePoint(0.85, 0.6)}`;
  const reach = turnTime < 0 ? ease((turnTime + 0.8) / 0.8) : 1 - ease((turnTime - 2.1) / 0.7);
  const handX = 838 + (outerTop.x - 2 - 838) * reach;
  const handY = 286 + (outerTop.y + 2 - 286) * reach;
  const studyElbowX = (871 + handX) / 2 + 7;
  const studyElbowY = Math.max(263, handY) + 6;
  const studyArm = `M869 258Q${point(studyElbowX + 5, studyElbowY - 5)} ${point(studyElbowX, studyElbowY - 3)}L${point(handX - 2, handY - 3)} ${point(handX - 4, handY + 2)} ${point(studyElbowX - 3, studyElbowY + 3)}Q${point(studyElbowX + 7, studyElbowY + 3)} 878 264Z`;
  const pageShade = Math.round(210 - lift * 28);

  return {
    labBody: `translate(${point(5 * lean, -3 * lean)}) rotate(${(9 * lean).toFixed(2)} 233 282)`,
    labArm,
    focus: `rotate(${focus.toFixed(2)} 319 253)`,
    studyHead: `rotate(${(-2.2 - Math.sin(seconds * 0.65) - lift * 2.5).toFixed(2)} 863 251)`,
    studyArm,
    studyHand: `translate(${point(handX, handY)}) rotate(${(-12 * lift * reach).toFixed(2)})`,
    page,
    pageLines,
    pageOpacity: turnTime < 0 ? "0" : (1 - ease((turnTime - 2.1) / 1.2)).toFixed(2),
    pageFill: `rgb(${pageShade}, ${pageShade}, ${pageShade})`,
  };
}

export function createResearchStageMotion(root) {
  const edges = [...root.querySelectorAll("[data-model-edge]")];
  const nodes = [...root.querySelectorAll("[data-model-node]")];
  const rows = [...root.querySelectorAll("[data-terminal-row]")];
  const terminal = root.querySelector("[data-terminal-content]");
  const cursor = root.querySelector("[data-terminal-cursor]");
  const links = [...root.querySelectorAll("[data-stage-link]")];
  const review = root.querySelector("[data-study-result]");
  const labBody = root.querySelector("[data-lab-body]");
  const labArm = root.querySelector("[data-lab-arm]");
  const labHand = root.querySelector("[data-lab-hand]");
  const microscopeFocus = root.querySelector("[data-microscope-focus]");
  const studyHead = root.querySelector("[data-study-head]");
  const studyArm = root.querySelector("[data-study-arm]");
  const studyHand = root.querySelector("[data-study-hand]");
  const studyPage = root.querySelector("[data-study-page]");
  const pageSheet = root.querySelector("[data-study-page-sheet]");
  const pageLines = root.querySelector("[data-study-page-lines]");
  let elapsed = 0;
  let previous = null;
  let frameId = null;
  let running = false;

  function draw(seconds) {
    const figures = figureFrame(seconds);
    labBody.setAttribute("transform", figures.labBody);
    labArm.setAttribute("d", figures.labArm);
    labHand.setAttribute("transform", figures.focus);
    microscopeFocus.setAttribute("transform", figures.focus);
    studyHead.setAttribute("transform", figures.studyHead);
    studyArm.setAttribute("d", figures.studyArm);
    studyHand.setAttribute("transform", figures.studyHand);
    studyPage.setAttribute("opacity", figures.pageOpacity);
    pageSheet.setAttribute("d", figures.page);
    pageSheet.setAttribute("fill", figures.pageFill);
    pageLines.setAttribute("d", figures.pageLines);

    const points = modelProjection(seconds);
    edges.forEach((edge, index) => {
      const [a, b] = modelEdges[index].map((vertex) => points[vertex]);
      edge.setAttribute("x1", a.x.toFixed(2));
      edge.setAttribute("y1", a.y.toFixed(2));
      edge.setAttribute("x2", b.x.toFixed(2));
      edge.setAttribute("y2", b.y.toFixed(2));
      edge.setAttribute("opacity", (0.2 + (a.depth + b.depth) * 0.35).toFixed(2));
    });
    nodes.forEach((node, index) => {
      const point = points[index];
      node.setAttribute("cx", point.x.toFixed(2));
      node.setAttribute("cy", point.y.toFixed(2));
      node.setAttribute("r", (1 + point.depth * 0.9).toFixed(2));
      node.setAttribute("opacity", (0.35 + point.depth * 0.65).toFixed(2));
    });

    const output = terminalFrame(seconds);
    rows.forEach((row, index) => {
      const text = output.rows[index] || "";
      if (row.textContent !== text) row.textContent = text;
    });
    terminal.setAttribute("transform", `translate(0 ${output.offset.toFixed(2)})`);
    cursor.setAttribute("x", output.cursorX.toFixed(2));
    cursor.setAttribute("y", output.cursorY.toFixed(2));
    cursor.setAttribute("opacity", output.cursorVisible ? "1" : "0");

    const phase = seconds % 22;
    links.forEach((link) => {
      const exchange = exchanges.find(({ link: name, start }) => name === link.dataset.stageLink && phase >= start && phase < start + 1.2);
      if (!exchange) {
        link.setAttribute("opacity", "0");
        return;
      }
      const progress = (phase - exchange.start) / 1.2;
      link.setAttribute("stroke-dashoffset", (exchange.reverse ? -1 + progress * 1.15 : 0.15 - progress * 1.15).toFixed(3));
      link.setAttribute("opacity", (Math.sin(Math.PI * progress) * 0.85).toFixed(2));
    });
    review.setAttribute("opacity", phase >= 17.2 ? "1" : "0.35");
  }

  function tick(timestamp) {
    if (!running) return;
    if (previous !== null) elapsed += (timestamp - previous) / 1000;
    previous = timestamp;
    draw(elapsed);
    frameId = requestAnimationFrame(tick);
  }

  return {
    setRunning(value) {
      if (value === running) return;
      running = value;
      previous = null;
      if (running) frameId = requestAnimationFrame(tick);
      else if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    },
    destroy() {
      running = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
    },
  };
}
