import { useEffect, useRef, useState } from "react";
import { branchNodes, chokepointNode, normalNodes } from "../ocuraDemoData.js";
import { HOME } from "../content/home.js";
import ThinkingOrb from "./ThinkingOrb.jsx";
import {
  createExecutionPlayback, EXECUTION_SOURCE, EXECUTION_STILL_MS,
  executionFrame, executionGeometry, executionPacket,
} from "../lib/executionDisplay.js";
import "./ExecutionGraphDisplay.css";

const nodes = [normalNodes[0], chokepointNode, normalNodes[1], branchNodes[0], normalNodes[2], branchNodes[1]];
const labels = { main: "Entry", chokepoint: "Decision boundary", hello: "Normal path", review: "Review branch", printHello: "Normal output", printReview: "Branch output" };
const destinations = { entry: "chokepoint", normal: "hello", review: "review", "normal-output": "printHello", "review-output": "printReview" };

export default function ExecutionGraphDisplay({ animate }) {
  const section = useRef(null), graph = useRef(null), playback = useRef(null);
  const [frame, setFrame] = useState(() => executionFrame(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? EXECUTION_STILL_MS : 0));
  const [width, setWidth] = useState(600);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const controller = createExecutionPlayback(window, setFrame);
    playback.current = controller;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .12 });
    const resize = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setWidth(entry.contentRect.width); });
    const onVisibility = () => setPageVisible(!document.hidden);
    observer.observe(section.current);
    resize.observe(graph.current);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller.dispose(); playback.current = null;
      observer.disconnect(); resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => { playback.current?.setRunning(animate && visible && pageVisible); }, [animate, visible, pageVisible]);

  const routes = executionGeometry(width);
  const packet = frame.packet && executionPacket(routes[frame.packet.edge], frame.packet.progress);
  return (
    <section className="system-execution-section" id="ocura" aria-labelledby="execution-display-title" ref={section} data-phase={frame.id} data-time={frame.time.toFixed(0)} data-playing={animate && visible && pageVisible}>
      <div className="shell">
        <header className="system-section-heading">
          <h2 id="execution-display-title">{HOME.executionTitle}</h2>
          <p>{HOME.executionIntroduction}</p>
        </header>
        <div className="execution-display">
          <figure className="execution-topology">
            <h3>Execution graph</h3>
            <div className="execution-topology-grid" ref={graph} role="img" aria-label="main() reaches a chokepoint. The normal path calls hello_world(), and a separate branch calls review_path(). Each produces its own output.">
              <svg className="execution-connections" viewBox={`0 0 ${width} 392`} preserveAspectRatio="none" aria-hidden="true">
                {Object.entries(routes).map(([id, points]) => <polyline key={id} points={points.map((point) => point.join(",")).join(" ")} className={`execution-wire${id.startsWith("review") ? " is-branch" : ""}${frame.completed.includes(destinations[id]) || frame.packet?.edge === id ? " is-traversed" : ""}`} />)}
                {packet && <rect className={`execution-packet${frame.packet.edge.startsWith("review") ? " is-branch" : ""}`} x={packet[0] - 3.5} y={packet[1] - 3.5} width="7" height="7" />}
              </svg>
              {nodes.map((node) => <div key={node.id} className={`execution-node execution-node--${node.id}${node.kind.startsWith("branch") ? " is-branch" : ""}${frame.active === node.id ? " is-active" : ""}${frame.completed.includes(node.id) ? " is-complete" : ""}`} aria-hidden="true">
                <span>{labels[node.id]}</span>
                <strong>{node.id === "printHello" ? "hello_world" : node.id === "printReview" ? "review branch" : node.label === "chokepoint" ? "chokepoint" : node.label}</strong>
                {frame.completed.includes(node.id) && <svg className="execution-node-check" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" /></svg>}
              </div>)}
            </div>
            <figcaption className="execution-phase" aria-live="off">{frame.detail}</figcaption>
          </figure>
          <div className="execution-workflow">
            <h3>Python workflow</h3>
            <pre className="execution-source" aria-label="Illustrative Python workflow"><code>{EXECUTION_SOURCE.map((line, index) => <span key={index} className={`execution-source-line${frame.line === index ? " is-active" : ""}${frame.id.startsWith("review") || frame.id === "branch" ? " is-branch" : ""}`}><span className="execution-line-number" aria-hidden="true">{index + 1}</span>{line || "\u00a0"}</span>)}</code></pre>
            <div className="execution-output" aria-label="Illustrative run output" aria-live="off">
              <h3>Run output</h3>
              <div className="execution-output-body">
                <div>
                  <div className={`execution-output-row${frame.output[0] ? " is-ready" : ""}`}><span>Normal path</span><code>{frame.output[0] ? "hello_world" : "Awaiting output"}</code></div>
                  <div className={`execution-output-row is-branch${frame.output[1] ? " is-ready" : ""}`}><span>Review branch</span><code>{frame.output[1] ? "review branch" : "Awaiting output"}</code></div>
                </div>
                <div className="execution-orb" data-state={frame.orb}>
                  <ThinkingOrb state={frame.orb} size={96} dark={false} paused={!animate || !visible || !pageVisible} aria-label={`Execution state: ${frame.detail}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
