import { installMoleculeMesh } from "./engravedMolecule.js";
import { createEngravedEngine } from "./engravedEngine.js";

let engine;
const requests = new Map();
const post = (type, values = {}) => self.postMessage({ type, ...values });
// Worker animation frames are available for a transferred, visible canvas.
const schedule = typeof requestAnimationFrame === "function" ? callback => requestAnimationFrame(callback) : callback => setTimeout(() => callback(performance.now()), 1000 / 30);
const cancel = typeof cancelAnimationFrame === "function" ? id => cancelAnimationFrame(id) : id => clearTimeout(id);
self.onmessage = ({ data }) => {
  try {
    if (data.type === "init") {
      engine = createEngravedEngine(data.canvas, {
        playing: data.playing, visible: data.visible, paper: data.paper, background: data.background, schedule, cancel,
        loadScene: index => new Promise((resolve, reject) => { requests.set(index, { resolve, reject }); post("sceneRequest", { index }); }),
        createCanvas: (width, height) => new OffscreenCanvas(width, height),
        onUpdate: frame => post("update", { frame }), onReady: () => post("ready"),
        onError: error => post("error", { message: error.message }),
        onMetrics: values => post("metrics", { values: { ...values, renderThread: "worker" } }),
      });
      engine.resize(...data.size);
    } else if (data.type === "scene") {
      if (data.mesh) installMoleculeMesh(data.mesh);
      requests.get(data.index)?.resolve({ field: data.field, stamps: data.stamps, buildMs: data.buildMs }); requests.delete(data.index);
    } else if (data.type === "sceneError") {
      requests.get(data.index)?.reject(new Error(data.message)); requests.delete(data.index);
    } else if (data.type === "resize") engine?.resize(...data.size);
    else if (data.type === "playing") engine?.setPlaying(data.playing);
    else if (data.type === "visible") engine?.setVisible(data.visible);
    else if (data.type === "pointer") engine?.setPointer(data.x, data.y);
    else if (data.type === "seek") engine?.seek(data.seconds);
  } catch (error) { post("error", { message: error.message }); }
};
