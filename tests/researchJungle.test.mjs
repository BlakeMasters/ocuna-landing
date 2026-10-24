import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Node does not supply Vite's import.meta.env replacement. Use the production
// development flag and an absolute import; drawing and controller code runs unchanged.
const moduleUrl = new URL("../src/lib/researchJungle.js", import.meta.url);
const source = (await readFile(moduleUrl, "utf8"))
  .replaceAll("import.meta.env.DEV", "true")
  .replace('"./imageMarks.js"', JSON.stringify(new URL("../src/lib/imageMarks.js", import.meta.url).href));
const { createResearchJungle } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function environment(t, { width = 1200, height = 1600, sampleContextAvailable = true } = {}) {
  const pending = new Map(), documentListeners = new Map(), media = new Map();
  const visibilityObservers = [], sizeObservers = [], sampleCanvases = [], reads = [];
  let serial = 0, now = 0, controller, visibleReads = 0;

  function makeContext(canvas, sampling = false) {
    const context = { clears: 0, strokes: 0, glyphs: 0, contextOptions: null };
    for (const name of ["save", "restore", "translate", "rotate", "scale", "setTransform", "beginPath", "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "fill", "stroke", "fillRect", "drawImage", "fillText"]) {
      context[name] = () => {};
    }
    context.clearRect = () => { context.clears += 1; };
    context.stroke = () => { context.strokes += 1; };
    context.fillText = () => { context.glyphs += 1; };
    context.createRadialGradient = () => ({ addColorStop() {} });
    context.getImageData = (_x, _y, readWidth, readHeight) => {
      if (!sampling) {
        visibleReads += 1;
        throw new Error("The visible DPR canvas must never be sampled");
      }
      reads.push({ canvas, width: readWidth, height: readHeight });
      const data = new Uint8ClampedArray(readWidth * readHeight * 4);
      // One representative green sample exercises the real shared glyph path.
      // Tests concern lifecycle and read bounds, not the foliage's rasterization.
      data.set([64, 112, 75, 255]);
      return { width: readWidth, height: readHeight, data };
    };
    return context;
  }

  function makeCanvas(sampling = false) {
    const canvas = { width: 300, height: 150, dataset: {} };
    canvas.context = makeContext(canvas, sampling);
    canvas.getContext = (_kind, options) => {
      canvas.context.contextOptions = options;
      return sampling && !sampleContextAvailable ? null : canvas.context;
    };
    return canvas;
  }

  const canvas = makeCanvas();
  const scene = { getBoundingClientRect: () => ({ width, height }) };
  const document = {
    hidden: false,
    createElement(name) {
      assert.equal(name, "canvas");
      const sample = makeCanvas(true);
      sampleCanvases.push(sample);
      return sample;
    },
    addEventListener(name, callback) { documentListeners.set(name, callback); },
    removeEventListener(name) { documentListeners.delete(name); },
  };
  const window = {
    devicePixelRatio: 3,
    matchMedia(query) {
      if (!media.has(query)) media.set(query, {
        matches: query === "(max-width: 700px)" && width <= 700,
        listeners: new Set(),
        addEventListener(_name, callback) { this.listeners.add(callback); },
        removeEventListener(_name, callback) { this.listeners.delete(callback); },
      });
      return media.get(query);
    },
  };
  function observerClass(collection) {
    return class {
      constructor(callback) { this.callback = callback; collection.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    };
  }
  const globals = {
    window, document,
    requestAnimationFrame(callback) { pending.set(++serial, callback); return serial; },
    cancelAnimationFrame(id) { pending.delete(id); },
    IntersectionObserver: observerClass(visibilityObservers),
    ResizeObserver: observerClass(sizeObservers),
  };
  const originals = new Map(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  t.after(() => {
    controller?.dispose();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  const api = {
    canvas, pending, reads, sampleCanvases, visibilityObservers, sizeObservers,
    get visibleReads() { return visibleReads; },
    mount(options) {
      controller = options === undefined ? createResearchJungle(canvas, scene) : createResearchJungle(canvas, scene, options);
      return controller;
    },
    setInView(value) { visibilityObservers[0].callback([{ isIntersecting: value }]); },
    setHidden(value) { document.hidden = value; documentListeners.get("visibilitychange")?.(); },
    setReduced(value) {
      const query = media.get("(prefers-reduced-motion: reduce)");
      query.matches = value;
      for (const callback of query.listeners) callback();
    },
    step(timestamp) {
      now = timestamp;
      assert.equal(pending.size, 1, "Only one animation frame should be scheduled");
      const [id, callback] = pending.entries().next().value;
      pending.delete(id);
      callback(timestamp);
    },
    advance(milliseconds) {
      const end = now + milliseconds;
      while (now < end) {
        const timestamp = Math.min(end, now + 1000 / 60);
        if (pending.size) this.step(timestamp);
        else now = timestamp;
      }
    },
    assertDisposed() {
      assert.equal(pending.size, 0);
      assert.equal(documentListeners.size, 0);
      assert.ok([...visibilityObservers, ...sizeObservers].every(observer => observer.disconnected));
      assert.ok([...media.values()].every(query => query.listeners.size === 0));
    },
  };
  return api;
}

test("ASCII sampling stays below 20,000 pixels on a large high-DPR scene", t => {
  const env = environment(t, { width: 8000, height: 12000 });
  env.mount({ style: "ascii" });
  env.setInView(true);
  env.advance(4000);
  assert.equal(env.sampleCanvases.length, 1);
  assert.equal(env.sampleCanvases[0].context.contextOptions.willReadFrequently, true);
  assert.ok(env.reads.length > 1, "The growing scene should update its sample field");
  assert.ok(env.reads.every(read => read.width * read.height <= 20_000));
  assert.ok(env.reads.every(read => read.width * read.height < env.canvas.width * env.canvas.height / 100));
  assert.equal(env.visibleReads, 0);
});

test("ASCII starts with the original animation, then layers in without keeping full-resolution drawing active", t => {
  const env = environment(t);
  env.mount({ style: "ascii" });
  env.setInView(true);
  env.advance(2900);
  assert.equal(env.canvas.dataset.asciiBlend, "0.000");
  assert.ok(env.canvas.context.strokes > 0, "The original foliage should animate before the overlay");
  assert.equal(env.canvas.context.glyphs, 0);
  assert.equal(env.reads.length, 0, "The original-only introduction needs no pixel reads");
  env.advance(1100);
  assert.ok(Number(env.canvas.dataset.asciiBlend) > 0.4 && Number(env.canvas.dataset.asciiBlend) < 0.6);
  assert.ok(env.canvas.context.glyphs > 0, "ASCII should arrive gradually over the original");
  env.advance(2000);
  assert.equal(env.canvas.dataset.asciiBlend, "1.000");
  const strokes = env.canvas.context.strokes, glyphs = env.canvas.context.glyphs;
  env.advance(1000);
  assert.equal(env.canvas.context.strokes, strokes, "The settled overlay should reuse its bounded underlay");
  assert.ok(env.canvas.context.glyphs > glyphs, "The settled ASCII should keep animating");
});

test("pausing freezes the ASCII fade and resumes from the same scene time", t => {
  const env = environment(t);
  const controller = env.mount({ style: "ascii" });
  env.setInView(true);
  env.advance(4000);
  controller.setPaused(true);
  const blend = env.canvas.dataset.asciiBlend, reads = env.reads.length;
  assert.ok(Number(blend) > 0 && Number(blend) < 1);
  env.advance(5000);
  assert.equal(env.canvas.dataset.asciiBlend, blend);
  assert.equal(env.reads.length, reads);
  controller.setPaused(false);
  env.step(10_000);
  assert.ok(Math.abs(Number(env.canvas.dataset.asciiBlend) - Number(blend)) < 0.04,
    "Resuming must not skip the fade by counting paused wall time");
  env.advance(1500);
  assert.equal(env.canvas.dataset.asciiBlend, "1.000");
  env.setReduced(true);
  assert.equal(env.pending.size, 0);
  assert.equal(env.canvas.dataset.asciiBlend, "1.000", "Reduced motion should use the mature layered scene");
});

test("mature ASCII glyph paints reuse a more slowly refreshed source field", t => {
  const env = environment(t);
  env.mount({ style: "ascii" });
  env.setInView(true);
  env.advance(15_000);
  assert.equal(env.canvas.dataset.growth, "1.000");
  const readsBefore = env.reads.length, paintsBefore = env.canvas.context.clears;
  env.advance(2000);
  const sourceUpdates = env.reads.length - readsBefore;
  const glyphPaints = env.canvas.context.clears - paintsBefore;
  assert.ok(sourceUpdates >= 6 && sourceUpdates <= 10, `Expected about four source updates per second, got ${sourceUpdates / 2}`);
  assert.ok(glyphPaints >= 15 && glyphPaints <= 26);
  assert.ok(glyphPaints > sourceUpdates * 1.5, "Glyph frames should reuse the cached field");
});

test("pause, visibility, reduced motion and disposal stop scheduled work", t => {
  const env = environment(t);
  const controller = env.mount({ style: "ascii" });
  assert.equal(env.pending.size, 0, "An offscreen scene should not start playback");
  env.setInView(true);
  env.advance(1000);
  controller.setPaused(true);
  assert.equal(env.pending.size, 0);
  const pausedGrowth = env.canvas.dataset.growth;
  const pausedReads = env.reads.length;
  env.advance(5000);
  assert.equal(env.reads.length, pausedReads, "Pausing must stop source updates");
  controller.setPaused(false);
  env.step(10_000);
  // The first resume paint can catch up the last unpainted animation frame,
  // but must not advance by the several seconds spent paused.
  assert.ok(Number(env.canvas.dataset.growth) - Number(pausedGrowth) < 0.01, "Resuming must not include time spent paused");
  env.setHidden(true);
  assert.equal(env.pending.size, 0);
  env.setHidden(false);
  assert.equal(env.pending.size, 1);
  env.setInView(false);
  assert.equal(env.pending.size, 0);
  env.setInView(true);
  env.setReduced(true);
  assert.equal(env.pending.size, 0);
  assert.equal(env.canvas.dataset.growth, "1.000", "Reduced motion should show the mature scene");
  env.setReduced(false);
  assert.equal(env.pending.size, 1);
  controller.dispose();
  env.assertDisposed();
  const disposedReads = env.reads.length;
  env.advance(1000);
  assert.equal(env.reads.length, disposedReads);
});

test("the original two-argument API does not create or read a sample canvas", t => {
  const env = environment(t);
  env.mount();
  env.setInView(true);
  env.advance(500);
  assert.ok(env.canvas.context.clears > 1, "The original scene should keep drawing");
  assert.equal(env.sampleCanvases.length, 0);
  assert.equal(env.reads.length, 0);
  assert.equal(env.visibleReads, 0);
});

test("an unavailable sample context falls back to the original scene", t => {
  const env = environment(t, { sampleContextAvailable: false });
  env.mount({ style: "ascii" });
  env.setInView(true);
  env.advance(500);
  assert.ok(env.canvas.context.clears > 1);
  assert.equal(env.reads.length, 0);
  assert.equal(env.visibleReads, 0);
  assert.equal(env.pending.size, 1, "Fallback drawing should retain its animation lifecycle");
});
