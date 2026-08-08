import { useMemo, useState } from "react";
import {
  branchNodes,
  chokepointNode,
  graphOutputs,
  graphScripts,
  normalNodes,
} from "../ocuraDemoData.js";
import ThinkingOrb from "./ThinkingOrb.jsx";

export default function OcuraSimulator() {
  const [hasChokepoint, setHasChokepoint] = useState(false);
  const [hasSplit, setHasSplit] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState("main");
  const [runMode, setRunMode] = useState("idle");
  const nodes = useMemo(() => {
    const base = hasChokepoint
      ? [normalNodes[0], chokepointNode, ...normalNodes.slice(1)]
      : normalNodes;

    return hasSplit ? [...base, ...branchNodes] : base;
  }, [hasChokepoint, hasSplit]);

  const activeNode =
    nodes.find((node) => node.id === activeNodeId) ||
    nodes.find((node) => node.id === "main") ||
    nodes[0];

  const script = hasSplit
    ? graphScripts.split
    : hasChokepoint
      ? graphScripts.chokepoint
      : graphScripts.baseline;

  function insertChokepoint() {
    setHasChokepoint(true);
    setRunMode("idle");
    setActiveNodeId("chokepoint");
  }

  function splitPath() {
    setHasChokepoint(true);
    setHasSplit(true);
    setRunMode("idle");
    setActiveNodeId("review");
  }

  function runNormalPath() {
    setRunMode("normal");
    setActiveNodeId("printHello");
  }

  function runSplitPath() {
    setHasChokepoint(true);
    setHasSplit(true);
    setRunMode("split");
    setActiveNodeId("printReview");
  }

  function resetGraph() {
    setHasChokepoint(false);
    setHasSplit(false);
    setRunMode("idle");
    setActiveNodeId("main");
  }

  return (
    <section className="ocura-sim" id="ocura">
      <div className="shell ocura-graph-layout">
        <header className="graph-intro">
          <div>
            <h2>V0 is a working runtime. Run it right here.</h2>
          </div>
          <div className="graph-intro-copy">
            <p>
              Ocura started as a resident daemon that wrapped every run in one explicit phase
              contract. That core grew into a pathway, chokepoint, and branch-aware runtime.
              Insert a chokepoint, split the path, and watch each run resolve.
            </p>
          </div>
        </header>

        <div className="graph-canvas" aria-label="Interactive Python script graph">
          <div className="graph-row normal-row">
            <GraphNode
              active={activeNode?.id === "main"}
              node={normalNodes[0]}
              onSelect={() => setActiveNodeId("main")}
            />
            <GraphEdge />
            {hasChokepoint && (
              <>
                <GraphNode
                  active={activeNode?.id === "chokepoint"}
                  node={chokepointNode}
                  onSelect={() => setActiveNodeId("chokepoint")}
                />
                <GraphEdge />
              </>
            )}
            <GraphNode
              active={activeNode?.id === "hello"}
              node={normalNodes[1]}
              onSelect={() => setActiveNodeId("hello")}
            />
            <GraphEdge />
            <GraphNode
              active={activeNode?.id === "printHello"}
              node={normalNodes[2]}
              onSelect={() => setActiveNodeId("printHello")}
            />
          </div>

          {hasSplit && (
            <div className="graph-row split-row">
              <div className="split-spacer" aria-hidden="true" />
              <div className="split-stem" aria-hidden="true" />
              <GraphNode
                active={activeNode?.id === "review"}
                node={branchNodes[0]}
                onSelect={() => setActiveNodeId("review")}
              />
              <GraphEdge branch />
              <GraphNode
                active={activeNode?.id === "printReview"}
                node={branchNodes[1]}
                onSelect={() => setActiveNodeId("printReview")}
              />
            </div>
          )}
        </div>

        <div className="graph-actions" aria-label="Graph controls">
          <button className="button" onClick={insertChokepoint} type="button">
            Insert chokepoint
          </button>
          <button className="ghost" onClick={splitPath} type="button">
            Split path
          </button>
          <button className="ghost" onClick={runNormalPath} type="button">
            Run normal path
          </button>
          <button className="ghost" onClick={runSplitPath} type="button">
            Run split path
          </button>
          <button className="ghost" onClick={resetGraph} type="button">
            Reset
          </button>
        </div>

        <div className="graph-detail-grid">
          <article className="node-detail" aria-live="polite">
            <span className="panel-kicker">{activeNode?.kind}</span>
            <h3>{activeNode?.title}</h3>
            <p>{activeNode?.detail}</p>
            <pre><code>{activeNode?.code}</code></pre>
          </article>

          <article className="execution-panel" aria-live="polite">
            <span className="panel-kicker">Script preview</span>
            <h3>{hasSplit ? "Chokepoint split" : hasChokepoint ? "Chokepoint inserted" : "Normal path"}</h3>
            <pre><code>{script}</code></pre>
            <div className="terminal-output">
              <div className="terminal-output__stream">
                <span>$ run graph</span>
                {graphOutputs[runMode].map((line) => (
                  <strong key={line}>{line}</strong>
                ))}
              </div>
              <RunOrb runMode={runMode} />
            </div>
          </article>
        </div>

        <a
          className="v0-proof"
          href="https://blakemasters.github.io/aims-competition/"
          target="_blank"
          rel="noreferrer"
        >
          <span>
            <small>Stanford competition winner</small>
            <strong>
              V0 won a Stanford competition. Ocura is turning it into runtime infrastructure for
              training and inference.
            </strong>
          </span>
          <span className="v0-proof-action">Explore the winning project ↗</span>
        </a>
      </div>
    </section>
  );
}

function RunOrb({ runMode }) {
  if (runMode === "idle") return null;
  const isSplit = runMode === "split";
  return (
    <div className={`run-orb ${isSplit ? "run-orb--split" : "run-orb--normal"}`}>
      <ThinkingOrb
        state={isSplit ? "connecting" : "breathing"}
        size={104}
        aria-label={
          isSplit
            ? "Connecting the branched path"
            : "Thinking through one path"
        }
      />
    </div>
  );
}

function GraphNode({ active, node, onSelect }) {
  return (
    <button
      className={`graph-node ${active ? "active" : ""} ${node.kind}`}
      onClick={onSelect}
      type="button"
    >
      <span>{node.kind}</span>
      <strong>{node.label}</strong>
    </button>
  );
}

function GraphEdge({ branch = false }) {
  return <div className={`graph-edge ${branch ? "branch" : ""}`} aria-hidden="true" />;
}
