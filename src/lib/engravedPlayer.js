import { engravedDensity } from "./engravedResolution.js";

/** Keep layout, accessibility and controls on the page; draw on a worker. */
export function mountEngravedMotion(canvas, {
  playing = true, paper = true, background = "#f2f2f2", onUpdate = () => {}, onReady = () => {}, onError = () => {},
} = {}) {
  let worker, geometryWorker, engine, disposed = false, inView = true, pendingSeek, pointerFrame;
  let pointerPosition = [0, 0];
  const bounds = canvas.getBoundingClientRect();
  let size = [bounds.width, bounds.height, engravedDensity(bounds.width, bounds.height, window.devicePixelRatio || 1)];
  const visible = () => inView && !document.hidden;
  const metrics = values => { if (!disposed) Object.assign(canvas.dataset, values); };
  function send(type, values = {}) {
    if (disposed) return;
    if (worker) worker.postMessage({ type, ...values });
    else if (engine) {
      if (type === "playing") engine.setPlaying(playing);
      if (type === "visible") engine.setVisible(visible());
      if (type === "resize") engine.resize(...size);
      if (type === "pointer") engine.setPointer(values.x, values.y);
      if (type === "seek") engine.seek(values.seconds);
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    size = [rect.width, rect.height, engravedDensity(rect.width, rect.height, window.devicePixelRatio || 1)];
    send("resize", { size });
  }
  const syncVisibility = () => send("visible", { visible: visible() });
  const pointer = event => {
    if (event.pointerType !== "mouse" || !playing) return;
    const rect = canvas.getBoundingClientRect();
    pointerPosition = [((event.clientX - rect.left) / size[0] - .5) * 12, ((event.clientY - rect.top) / size[1] - .5) * 8];
    if (pointerFrame === undefined) pointerFrame = requestAnimationFrame(() => {
      pointerFrame = undefined; send("pointer", { x: pointerPosition[0], y: pointerPosition[1] });
    });
  };
  const cancelPointer = () => { if (pointerFrame !== undefined) cancelAnimationFrame(pointerFrame); pointerFrame = undefined; };
  const leave = () => { cancelPointer(); send("pointer", { x: 0, y: 0 }); };
  const resizeObserver = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncVisibility(); }, { threshold: .02 });
  resizeObserver.observe(canvas); intersection.observe(canvas);
  document.addEventListener("visibilitychange", syncVisibility);
  canvas.addEventListener("pointermove", pointer, { passive: true });
  canvas.addEventListener("pointerleave", leave);

  async function fallback() {
    try {
      const [{ createEngravedEngine }, { buildProceduralScene }] = await Promise.all([import("./engravedEngine.js"), import("./engravedScenes.js")]);
      if (disposed) return;
      engine = createEngravedEngine(canvas, {
        playing, visible: visible(), paper, background, buildScene: buildProceduralScene, onUpdate, onReady, onError,
        onMetrics: values => metrics({ ...values, renderThread: "main-fallback" }),
        createCanvas(width, height) { const image = document.createElement("canvas"); image.width = width; image.height = height; return image; },
      });
      engine.resize(...size);
      if (pendingSeek !== undefined) engine.seek(pendingSeek);
    } catch (error) { if (!disposed) onError(error); }
  }
  if (typeof Worker !== "undefined" && typeof canvas.transferControlToOffscreen === "function") {
    try {
      geometryWorker = new Worker(new URL("./engravedGeometry.worker.js", import.meta.url), { type: "module" });
      worker = new Worker(new URL("./engravedMotion.worker.js", import.meta.url), { type: "module" });
    } catch { geometryWorker?.terminate(); geometryWorker = undefined; /* Retain the same artwork through the fallback. */ }
  }
  if (worker) {
    geometryWorker.onmessage = ({ data }) => {
      if (disposed) return;
      if (data.error) worker.postMessage({ type: "sceneError", index: data.index, message: data.error });
      else worker.postMessage({ type: "scene", ...data }, [data.field.buffer, ...(data.stamps || []).map(cached => cached.image)]);
    };
    geometryWorker.onerror = event => { if (!disposed) onError(new Error(event.message || "The illustration could not be prepared.")); };
    worker.onmessage = ({ data }) => {
      if (disposed) return;
      if (data.type === "sceneRequest") geometryWorker.postMessage({ index: data.index });
      if (data.type === "metrics") metrics(data.values);
      if (data.type === "update") onUpdate(data.frame);
      if (data.type === "ready") onReady();
      if (data.type === "error") onError(new Error(data.message));
    };
    worker.onerror = event => { if (!disposed) onError(new Error(event.message || "The animation could not start.")); };
    let transferred = false;
    try {
      const surface = canvas.transferControlToOffscreen(); transferred = true;
      worker.postMessage({ type: "init", canvas: surface, size, playing, paper, background, visible: visible() }, [surface]);
    } catch (error) {
      worker.terminate(); geometryWorker.terminate(); worker = undefined; geometryWorker = undefined;
      if (transferred) onError(error);
      else fallback();
    }
  } else fallback();

  return {
    setPlaying(value) { playing = Boolean(value); if (!playing) cancelPointer(); send("playing", { playing }); },
    seek(seconds) { pendingSeek = seconds; send("seek", { seconds }); },
    dispose() {
      disposed = true; cancelPointer(); worker?.terminate(); geometryWorker?.terminate(); engine?.dispose();
      resizeObserver.disconnect(); intersection.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      canvas.removeEventListener("pointermove", pointer); canvas.removeEventListener("pointerleave", leave);
    },
  };
}
