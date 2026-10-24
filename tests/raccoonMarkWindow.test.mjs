import assert from "node:assert/strict";
import test from "node:test";
import { HOME_RACCOON } from "../src/content/homeArtwork.js";
import { markWindowBounds, stepMarkSpring, mountRaccoonMarkWindow } from "../src/lib/raccoonMarkWindow.js";

function environment(t, { width = 540, height = 312, noCanvas = false, tainted = false } = {}) {
  const timers = new Map(), frames = new Map(), observers = [], reads = [], imageDraws = [];
  const listeners = () => ({
    events: new Map(), options: new Map(),
    addEventListener(name, callback, options) { this.events.set(name, callback); this.options.set(name, options); },
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
  const win = { ...listeners(), devicePixelRatio: 3, matchMedia: () => media };
  const properties = new Map();
  const host = {
    ...listeners(), dataset: { state: "original" },
    style: { setProperty(name, value) { properties.set(name, value); } },
    getBoundingClientRect: () => ({ width, height, left: 0, right: width, top: 400, bottom: 400 + height }),
    querySelectorAll: () => surfaces,
  };
  const media = { ...listeners(), matches: false };
  const document = { ...listeners(), hidden: false, createElement: () => canvas() };
  const Observer = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const globals = {
    document, window: win,
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
  const env = {
    host, win, image, imageDraws, media, document, controller, properties, observers, reads, timers, frames, surfaces,
    get paints() { return paints; },
    get y() { return parseFloat(properties.get("--mark-y")); },
    get opacity() { return parseFloat(properties.get("--mark-opacity")); },
    show(value = true) { observers[1].callback([{ isIntersecting: value }]); },
    hide(value) { document.hidden = value; document.events.get("visibilitychange")(); },
    reduce(value) { media.matches = value; media.events.get("change")(); },
    move(y, x = .5, pointerType = "mouse") { host.events.get("pointermove")?.({ clientX: x * width, clientY: 400 + y * height, pointerType }); },
    leave(y = .5, x = -.1) { host.events.get("pointerleave")({ clientX: x * width, clientY: 400 + y * height }); },
    frame() {
      now += 1000 / 60;
      assert.equal(frames.size, 1, "Only one motion frame is scheduled");
      const [id, callback] = frames.entries().next().value;
      frames.delete(id); callback(now);
    },
    settle() {
      for (let n = 0; frames.size && n < 100; n += 1) this.frame();
      assert.equal(frames.size, 0);
    },
    tick() {
      assert.equal(timers.size, 1);
      const [id, timer] = timers.entries().next().value;
      assert.ok(timer.delay >= 1000 / 12);
      timers.delete(id); now += timer.delay; timer.callback();
    },
  };
  return env;
}

test("the whole band clears the artwork above and below, with a centered middle pose", () => {
  assert.equal(markWindowBounds(0).bottom, 0);
  assert.ok(markWindowBounds(0).top < 0);
  assert.ok(Math.abs(markWindowBounds(1).top - 1) < 1e-10);
  assert.ok(markWindowBounds(1).bottom > 1);
  assert.ok(Math.abs(markWindowBounds(.5).middle - .5) < 1e-10);
  assert.deepEqual(markWindowBounds(-1), markWindowBounds(0));
  assert.deepEqual(markWindowBounds(2), markWindowBounds(1));
});

test("spring motion accelerates, slows to a stop, and behaves consistently at 30 and 60 fps", () => {
  const trace = [];
  let value = 0, velocity = 0;
  for (let n = 0; n < 30; n += 1) {
    const next = stepMarkSpring(value, velocity, 1, 1 / 60);
    trace.push(next.value - value);
    assert.ok(next.value >= value && next.value <= 1, "No bounce or overshoot");
    ({ value, velocity } = next);
  }
  assert.ok(trace[1] > trace[0], "Motion picks up speed from rest");
  assert.ok(trace[8] < trace[4], "Motion slows as it approaches the target");
  assert.equal(value, 1);
  let slower = { value: 0, velocity: 0 };
  for (let n = 0; n < 15; n += 1) slower = stepMarkSpring(slower.value, slower.velocity, 1, 1 / 30);
  assert.equal(slower.value, value);
});

test("local pointer movement eases vertically without repainting or resampling", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle();
  assert.equal(env.opacity, 1);
  assert.equal(env.timers.size, 1);
  const before = env.y, paints = env.paints;
  env.move(.7); env.move(.8);
  assert.equal(env.frames.size, 1);
  env.frame();
  assert.ok(env.y > before && env.y < markWindowBounds(.8).top * 312, "The layer moves smoothly rather than jumping");
  env.settle();
  assert.ok(Math.abs(env.y - markWindowBounds(.8).top * 312) < .02);
  assert.equal(env.paints, paints, "Motion changes transforms only");
  env.tick(); env.tick();
  assert.equal(env.reads.length, 2);
  assert.equal(env.win.events.has("scroll"), false);
});

test("idle and touch-only artwork schedules no animation work", t => {
  const env = environment(t);
  env.show();
  const paints = env.paints;
  assert.equal(env.timers.size + env.frames.size, 0);
  assert.equal(env.opacity, 0);
  env.move(.5, .5, "touch");
  assert.equal(env.timers.size + env.frames.size, 0);
  assert.equal(env.paints, paints);
  for (const name of ["pointerenter", "pointermove", "pointerleave", "pointercancel"]) assert.equal(env.host.options.get(name).passive, true);
});

test("leaving sideways fades to exactly zero and stops glyph work immediately", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle();
  env.leave();
  assert.equal(env.timers.size, 0);
  const paints = env.paints;
  env.frame();
  assert.ok(env.opacity > 0 && env.opacity < 1);
  env.settle();
  assert.equal(env.opacity, 0);
  assert.equal(env.host.dataset.effectActive, "false");
  assert.equal(env.timers.size + env.frames.size, 0);
  assert.equal(env.paints, paints, "The fade reuses the last cached glyph frame");
});

test("above and below exits slide the band completely off the image", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle();
  env.leave(-.1, .5); env.settle();
  assert.ok(env.y + .38 * 312 < .02);
  assert.equal(env.opacity, 0);
  env.move(.5); env.settle();
  env.leave(1.1, .5); env.settle();
  assert.ok(env.y >= 312 - .02);
  assert.equal(env.opacity, 0);
  assert.equal(env.reads.length, 2);
});

test("the exact upper and lower image edges show no band and schedule no glyph work", t => {
  const env = environment(t);
  env.show(); env.move(0); env.settle();
  assert.equal(env.timers.size, 0);
  assert.ok(env.y + .38 * 312 < .02);
  env.move(1); env.settle();
  assert.equal(env.timers.size, 0);
  assert.ok(env.y >= 312 - .02);
});

test("pause and reduced motion keep deliberate pointer adjustment immediate and characters still", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle();
  env.controller.setAnimating(false);
  assert.equal(env.timers.size + env.frames.size, 0);
  env.move(.8);
  assert.equal(env.frames.size, 0);
  assert.ok(Math.abs(env.y - markWindowBounds(.8).top * 312) < .02);
  env.leave();
  assert.equal(env.opacity, 0);
  env.controller.setAnimating(true); env.reduce(true); env.move(.4);
  assert.equal(env.timers.size + env.frames.size, 0);
  assert.equal(env.opacity, 1);
  env.leave();
  assert.equal(env.opacity, 0);
});

test("hidden and offscreen artwork cancels both queues and resumes as the original", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle(); env.move(.8);
  env.hide(true);
  assert.equal(env.timers.size + env.frames.size, 0);
  assert.equal(env.opacity, 0);
  env.hide(false);
  assert.equal(env.timers.size + env.frames.size, 0);
  env.move(.5); env.settle(); env.move(.8);
  env.show(false);
  assert.equal(env.timers.size + env.frames.size, 0);
  assert.equal(env.opacity, 0);
});

test("losing browser focus fades the effect instead of leaving it stuck", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle();
  env.win.events.get("blur")(); env.settle();
  assert.equal(env.opacity, 0);
  assert.equal(env.timers.size + env.frames.size, 0);
});

test("large high-DPR displays keep sampling bounded and ignore duplicate resize callbacks", t => {
  const env = environment(t, { width: 8000, height: 4600 });
  assert.ok(env.reads.every(([w, h]) => w * h <= 8000));
  assert.equal(env.surfaces[0].width, 16000);
  env.observers[0].callback();
  assert.equal(env.reads.length, 2);
});

test("responsive images preserve the CSS crop and rebuild only when their source changes", t => {
  const env = environment(t);
  const [, x, y, width, height] = env.imageDraws.find(([image]) => image === env.image);
  const { crop } = HOME_RACCOON;
  assert.ok(Math.abs(-x / width - crop.x / HOME_RACCOON.width) < 1e-10);
  assert.ok(Math.abs(-y / height - crop.y / HOME_RACCOON.height) < 1e-10);
  env.image.events.get("load")();
  assert.equal(env.reads.length, 4);
});

test("disposal cancels both queues and removes every observer and listener", t => {
  const env = environment(t);
  env.show(); env.move(.5); env.settle(); env.move(.8);
  assert.equal(env.frames.size, 1);
  env.controller.dispose();
  assert.equal(env.frames.size + env.timers.size, 0);
  assert.ok(env.observers.every(observer => observer.disconnected));
  for (const target of [env.host, env.win, env.image, env.document, env.media]) assert.equal(target.events.size, 0);
});

test("unreadable images retain the original without scheduling hover work", t => {
  const env = environment(t, { tainted: true });
  env.show(); env.move(.5);
  assert.equal(env.host.dataset.state, "original");
  assert.equal(env.timers.size + env.frames.size, 0);
});

test("missing 2D context retains a disposable original-only presentation", t => {
  const env = environment(t, { noCanvas: true });
  env.controller.setAnimating(true);
  assert.equal(env.host.dataset.state, "original");
  assert.equal(env.timers.size + env.frames.size, 0);
});
