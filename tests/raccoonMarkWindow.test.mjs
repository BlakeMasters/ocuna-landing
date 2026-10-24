import assert from "node:assert/strict";
import test from "node:test";
import { HOME_RACCOON } from "../src/content/homeArtwork.js";
import { markWindowBounds, mountRaccoonMarkWindow } from "../src/lib/raccoonMarkWindow.js";

function environment(t, { width = 540, height = 312, noCanvas = false, tainted = false } = {}) {
  const timers = new Map(), frames = new Map(), observers = [], reads = [], imageDraws = [];
  const listeners = () => ({
    events: new Map(),
    addEventListener(name, callback) { this.events.set(name, callback); },
    removeEventListener(name) { this.events.delete(name); },
  });
  let serial = 0, now = 0, paints = 0;
  function canvas() {
    const value = { width: 0, height: 0 };
    const context = {};
    for (const key of ["save", "restore", "setTransform", "fillRect", "drawImage", "fillText", "beginPath", "moveTo", "lineTo", "stroke"]) context[key] = () => { if (key === "fillRect") paints += 1; };
    context.drawImage = (...args) => imageDraws.push(args);
    context.getImageData = (_x, _y, w, h) => {
      if (tainted) throw new Error("unreadable image");
      reads.push([w, h]);
      const data = new Uint8ClampedArray(w * h * 4);
      data.set([80, 80, 80, 255]);
      return { width: w, height: h, data };
    };
    value.getContext = () => noCanvas ? null : context;
    return value;
  }
  const surfaces = [canvas(), canvas()];
  const input = { ...listeners(), value: "45", setAttribute(name, value) { this[name] = value; } };
  const properties = new Map();
  const host = {
    ...listeners(), dataset: { state: "original" },
    style: { setProperty(name, value) { properties.set(name, value); } },
    getBoundingClientRect: () => ({ width, height, left: 0 }),
    querySelectorAll: () => surfaces,
    querySelector: () => input,
  };
  const media = { ...listeners(), matches: false };
  const document = { ...listeners(), hidden: false, createElement: () => canvas() };
  const Observer = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const globals = {
    document, window: { devicePixelRatio: 3, matchMedia: () => media },
    performance: { now: () => now },
    ResizeObserver: Observer, IntersectionObserver: Observer,
    requestAnimationFrame(callback) { frames.set(++serial, callback); return serial; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { timers.set(++serial, { callback, delay }); return serial; },
    clearTimeout(id) { timers.delete(id); },
  };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const image = { naturalWidth: 691, naturalHeight: 961, ...listeners() };
  const controller = mountRaccoonMarkWindow(host, { image, artwork: HOME_RACCOON });
  t.after(() => {
    controller.dispose();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    host, input, image, imageDraws, media, document, controller, properties, observers, reads, timers, frames, surfaces,
    get paints() { return paints; },
    show(value = true) { observers[1].callback([{ isIntersecting: value }]); },
    hide(value) { document.hidden = value; document.events.get("visibilitychange")(); },
    reduce(value) { media.matches = value; media.events.get("change")(); },
    tick() {
      assert.equal(timers.size, 1);
      const [id, timer] = timers.entries().next().value;
      assert.ok(timer.delay >= 1000 / 12);
      timers.delete(id); now += timer.delay; timer.callback();
    },
    pointer(value, pointerType = "mouse") { host.events.get("pointermove")({ clientX: value * width, pointerType }); },
    settle() {
      for (let n = 0; frames.size && n < 100; n += 1) {
        const [id, callback] = frames.entries().next().value;
        frames.delete(id); callback();
      }
      assert.equal(frames.size, 0);
    },
  };
}

test("both effect halves remain inside the artwork at either cursor edge", () => {
  assert.deepEqual(markWindowBounds(0), { left: 0, middle: .19, right: .38 });
  assert.deepEqual(markWindowBounds(1), { left: .62, middle: .81, right: 1 });
  assert.deepEqual(markWindowBounds(-1), markWindowBounds(0));
  assert.deepEqual(markWindowBounds(2), markWindowBounds(1));
});

test("pointer, range input and animation reuse samples; touch does not hijack scrolling", t => {
  const env = environment(t);
  assert.equal(env.reads.length, 2);
  env.show();
  env.pointer(1); env.settle();
  assert.equal(env.properties.get("--mark-right"), "100.000%");
  env.tick(); env.tick();
  env.pointer(0, "touch");
  assert.equal(env.frames.size, 0);
  env.input.value = "0"; env.input.events.get("input")();
  assert.equal(env.properties.get("--mark-left"), "0.000%");
  assert.equal(env.input["aria-valuetext"], "0% across the artwork");
  assert.equal(env.reads.length, 2, "Moving the window and animating never read pixels again");
});

test("large high-DPR displays keep sampling bounded and ignore duplicate resize callbacks", t => {
  const env = environment(t, { width: 8000, height: 4600 });
  assert.ok(env.reads.every(([w, h]) => w * h <= 8000));
  assert.equal(env.surfaces[0].width, 16000, "DPR is capped at two");
  env.observers[0].callback();
  assert.equal(env.reads.length, 2);
});

test("responsive images use the CSS crop without density-corrected source-pixel coordinates", t => {
  const env = environment(t);
  const sourceDraw = env.imageDraws.find(([image]) => image === env.image);
  assert.equal(sourceDraw.length, 5, "Scale the complete image in destination space, including srcset images");
  const [, x, y, width, height] = sourceDraw;
  const { crop } = HOME_RACCOON;
  assert.ok(Math.abs(-x / width - crop.x / HOME_RACCOON.width) < 1e-10);
  assert.ok(Math.abs(-y / height - crop.y / HOME_RACCOON.height) < 1e-10);
  env.image.events.get("load")();
  assert.equal(env.reads.length, 4, "A changed responsive source rebuilds both fields");
});

test("pause, visibility and reduced motion stop scheduling while manual adjustment remains available", t => {
  const env = environment(t);
  env.show(); env.tick();
  env.controller.setAnimating(false);
  assert.equal(env.timers.size, 0);
  assert.equal(env.properties.get("--mark-play-state"), "paused");
  const paints = env.paints;
  env.pointer(1);
  assert.equal(env.frames.size, 0);
  assert.equal(env.paints, paints, "Manual movement only updates clipping");
  env.controller.setAnimating(true);
  env.hide(true);
  assert.equal(env.timers.size, 0);
  env.hide(false);
  assert.equal(env.timers.size, 1);
  env.show(false);
  assert.equal(env.timers.size, 0);
  env.show(); env.reduce(true);
  assert.equal(env.timers.size, 0);
  env.pointer(0);
  assert.equal(env.frames.size, 0);
  assert.equal(env.properties.get("--mark-left"), "0.000%");
});

test("disposal cancels both queues and removes every observer and event listener", t => {
  const env = environment(t);
  env.show(); env.pointer(1);
  assert.equal(env.frames.size, 1);
  env.controller.dispose();
  assert.equal(env.frames.size + env.timers.size, 0);
  assert.ok(env.observers.every(observer => observer.disconnected));
  for (const target of [env.host, env.input, env.image, env.document, env.media]) assert.equal(target.events.size, 0);
});

test("unavailable canvas or unreadable images leave the original illustration", t => {
  const env = environment(t, { tainted: true });
  env.show();
  assert.equal(env.host.dataset.state, "original");
  assert.equal(env.timers.size, 0);
});

test("missing 2D context retains a disposable original-only presentation", t => {
  const env = environment(t, { noCanvas: true });
  env.controller.setAnimating(true);
  assert.equal(env.host.dataset.state, "original");
  assert.equal(env.timers.size + env.frames.size, 0);
});
