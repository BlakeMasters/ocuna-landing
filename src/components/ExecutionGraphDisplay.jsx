import { useEffect, useId, useRef, useState } from "react";
import { OCURA_OSS_DOCS } from "../content.js";
import {
  createExecutionPlayback, EXECUTION_DESCRIPTION, EXECUTION_NODES,
  EXECUTION_STILL_MS, EXECUTION_TITLE, executionCurvePath, executionCurvePoint,
  executionCurves, executionFrame,
} from "../lib/executionDisplay.js";
import "./ExecutionGraphDisplay.css";

function OperationMark({ kind, markRef }) {
  return <svg className="frontier-operation-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" ref={markRef}>
    {kind === "verify" ? <><path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z" /><path d="M13 3v6h6m-11 6 3 3 5-6" /></> : kind === "compare" ? <><rect x="4" y="5" width="6" height="14" rx="1" /><rect x="14" y="5" width="6" height="14" rx="1" /></> : <path d="m4 3 15 7-6 2-2 7z" />}
  </svg>;
}

export default function ExecutionGraphDisplay({ animate }) {
  const graph = useRef(null), marks = useRef({}), playback = useRef(null);
  const markerId = `frontier-${useId().replace(/:/g, "")}`;
  const [frame, setFrame] = useState(() => executionFrame(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? EXECUTION_STILL_MS : 0));
  const [layout, setLayout] = useState({ width: 0, height: 0, compact: false, anchors: {} });
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let disposed = false;
    const compact = window.matchMedia("(max-width: 700px)");
    const measure = () => {
      if (disposed || !graph.current) return;
      const bounds = graph.current.getBoundingClientRect();
      if (!bounds.width) return;
      const anchors = Object.fromEntries(EXECUTION_NODES.map(({ id }) => {
        const mark = marks.current[id].getBoundingClientRect();
        return [id, { left: mark.left - bounds.left, right: mark.right - bounds.left,
          top: mark.top - bounds.top, bottom: mark.bottom - bounds.top,
          x: mark.left - bounds.left + mark.width / 2, y: mark.top - bounds.top + mark.height / 2 }];
      }));
      const next = { width: bounds.width, height: bounds.height, compact: compact.matches, anchors };
      setLayout(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const controller = createExecutionPlayback(window, setFrame);
    playback.current = controller;
    const intersection = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .05 });
    const resize = new ResizeObserver(measure);
    const onVisibility = () => setPageVisible(!document.hidden);
    intersection.observe(graph.current);
    resize.observe(graph.current);
    compact.addEventListener("change", measure);
    document.addEventListener("visibilitychange", onVisibility);
    document.fonts?.ready.then(measure);
    measure();
    return () => {
      disposed = true;
      controller.dispose(); playback.current = null;
      intersection.disconnect(); resize.disconnect();
      compact.removeEventListener("change", measure);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const playing = animate && visible && pageVisible;
  useEffect(() => { playback.current?.setRunning(playing); }, [playing]);
  const curves = executionCurves(layout.anchors, layout.compact);
  const lane = ["warmup", "warmupRun"].includes(selected) ? "warmup" : ["inputs", "inputsRun"].includes(selected) ? "inputs" : null;
  return <section className="system-execution-section" id="ocura" aria-labelledby="execution-display-title" data-phase={frame.id} data-time={Math.round(frame.time)} data-playing={playing}>
    <div className="shell">
      <figure className="execution-display execution-frontier">
        <header className="frontier-heading">
          <h2 id="execution-display-title">{EXECUTION_TITLE}</h2>
          <a className="frontier-workflow-link" href={OCURA_OSS_DOCS}>Workflow</a>
        </header>
        <div className="frontier-graph" ref={graph} role="group" aria-label={EXECUTION_DESCRIPTION}>
          {layout.width > 0 && <svg className="frontier-connections" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
            <defs>{["neutral", "active"].map(kind => <marker key={kind} id={`${markerId}-${kind}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 7 4 1 7" className={`frontier-arrow${kind === "active" ? " is-active" : ""}`} /></marker>)}</defs>
            {Object.entries(curves).map(([edge, curve]) => {
              const [from, to] = edge.split("-");
              const parent = from === "baseline";
              const traversed = frame.completed.includes(to) || frame.packets.some(packet => packet.edge === edge);
              const traced = lane && [lane, `${lane}Run`].some(id => from === id || to === id);
              const active = traversed || traced;
              return <path key={edge} d={executionCurvePath(curve)} data-edge={edge} className={`frontier-wire${parent ? " is-parent" : ""}${active ? " is-traversed" : ""}`} markerEnd={parent ? undefined : `url(#${markerId}-${active ? "active" : "neutral"})`} />;
            })}
            {frame.packets.map(packet => {
              if (!curves[packet.edge]) return null;
              const [x, y] = executionCurvePoint(curves[packet.edge], packet.progress);
              return <rect key={packet.edge} className="frontier-packet" x={x - 2.5} y={y - 2.5} width="5" height="5" />;
            })}
          </svg>}
          {EXECUTION_NODES.map(node => {
            const record = node.kind === "record" || node.kind === "record-logs";
            const markRef = element => { marks.current[node.id] = element; };
            return <button key={node.id} type="button" data-node={node.id} className={`frontier-node frontier-node--${node.id}${record ? " frontier-record" : ""}${node.kind === "branch" ? " frontier-branch" : ""}${frame.active === node.id ? " is-active" : ""}${frame.completed.includes(node.id) ? " is-complete" : ""}${lane && ["baseline", lane, `${lane}Run`].includes(node.id) ? " is-traced" : ""}`} aria-label={node.description} aria-pressed={selected === node.id} onClick={() => setSelected(previous => previous === node.id ? null : node.id)}>
              {record ? <span className="frontier-sheet" ref={markRef} aria-hidden="true">{node.kind === "record-logs" && <span className="frontier-log" />}</span> : node.kind !== "branch" && <OperationMark kind={node.kind} markRef={markRef} />}
              <span className="frontier-node-label" ref={node.kind === "branch" ? markRef : undefined}>{node.label}</span>
            </button>;
          })}
        </div>
      </figure>
    </div>
  </section>;
}
