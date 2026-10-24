import assert from "node:assert/strict";
import test from "node:test";
import { HOME_RACCOON } from "../src/content/homeArtwork.js";
import { markScrollProgress, markWindowBounds, mountRaccoonMarkWindow } from "../src/lib/raccoonMarkWindow.js";

function environment(t, { width = 540, height = 312, noCanvas = false, tainted = false, initialScroll = 0 } = {}) {
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
  const win = { ...listeners(), innerHeight: 900, scrollY: initialScroll, devicePixelRatio: 3, matchMedia: () => media };
  const properties = new Map();
  const host = {
    ...listeners(), dataset: { state: "original" },
    style: { setProperty(name, value) { properties.set(name, value); } },
    getBoundingClientRect: () => ({ width, height, left: 0, top: 400 - win.scrollY }),
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
  return {
    host, win, image, imageDraws, media, document, controller, properties, observers, reads, timers, frames, surfaces,
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
    scroll(value) { win.scrollY = value; win.events.get("scroll")(); },
    settle() {
      for (let n = 0; frames.size && n < 100; n += 1) {
        const [id, callback] = frames.entries().next().value;
        frames.delete(id); callback();
      }
      assert.equal(frames.size, 0);
    },
  };
}

test("both effect halves remain inside the artwork at the top and bottom", () => {
  assert.deepEqual(markWindowBounds(0), { top: 0, middle: .19, bottom: .38 });
  assert.deepEqual(markWindowBounds(1), { top: .62, middle: .81, bottom: 1 });
  assert.deepEqual(markWindowBounds(-1), markWindowBounds(0));
  assert.deepEqual(markWindowBounds(2), markWindowBounds(1));
});

test("page scroll sweeps down and back up using cached samples and one frame per batch", t => {
  const env = environment(t);
  assert.equal(env.reads.length, 2);
  env.show();
  assert.equal(env.properties.get("--mark-top"), "0.000%");
  env.scroll(200); env.scroll(300); env.scroll(600);
  assert.equal(env.frames.size, 1, "Many scroll events schedule only one layout read");
  const paints = env.paints;
  env.settle();
  assert.equal(env.properties.get("--mark-bottom"), "100.000%");
  assert.equal(env.paints, paints, "Scroll movement only changes clipping");
  env.tick(); env.tick();
  env.scroll(0); env.settle();
  assert.equal(env.properties.get("--mark-top"), "0.000%");
  assert.equal(env.frames.size, 0);
  assert.equal(env.host.events.size, 0, "No cursor or gesture handlers are attached to the image");
  assert.equal(env.reads.length, 2, "Moving the window and animating never read pixels again");
});

test("scroll progress covers visible artwork and handles an image initially below the fold", () => {
  assert.equal(markScrollProgress({ top: 400, height: 312 }, 900, 0), 0);
  const middle = markScrollProgress({ top: 150, height: 312 }, 900, 250);
  assert.ok(middle > .4 && middle < .6);
  assert.equal(markScrollProgress({ top: -200, height: 312 }, 900, 600), 1);
  assert.equal(markScrollProgress({ top: 1800, height: 312 }, 900, 0), 0);
  assert.equal(markScrollProgress({ top: 900, height: 312 }, 900, 900), 0);
  assert.equal(markScrollProgress({ top: -312, height: 312 }, 900, 2112), 1);
  assert.equal(markScrollProgress({ top: 400, height: 0 }, 900, 0), 0);
});

test("restored scroll and viewport-height changes sync clipping without resampling", t => {
  const env = environment(t, { initialScroll: 250 });
  env.show();
  const previousTop = env.properties.get("--mark-top");
  assert.ok(parseFloat(previousTop) > 0);
  env.win.innerHeight = 300;
  env.win.events.get("resize")(); env.settle();
  assert.notEqual(env.properties.get("--mark-top"), previousTop);
  assert.equal(env.reads.length, 2);
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

test("pause, visibility and reduced motion stop both glyph and scroll movement", t => {
  const env = environment(t);
  env.show(); env.tick();
  env.controller.setAnimating(false);
  assert.equal(env.timers.size, 0);
  assert.equal(env.properties.get("--mark-play-state"), "paused");
  const paints = env.paints;
  const top = env.properties.get("--mark-top");
  env.scroll(300);
  assert.equal(env.frames.size, 0);
  assert.equal(env.properties.get("--mark-top"), top, "Pause freezes the band as well as the characters");
  assert.equal(env.paints, paints);
  env.controller.setAnimating(true);
  env.hide(true);
  env.scroll(0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.frames.size, 0);
  env.hide(false);
  assert.equal(env.timers.size, 1);
  env.show(false);
  env.scroll(600);
  assert.equal(env.timers.size, 0);
  assert.equal(env.frames.size, 0);
  env.show(); env.reduce(true);
  assert.equal(env.timers.size, 0);
  const still = env.properties.get("--mark-top");
  env.scroll(0);
  assert.equal(env.frames.size, 0);
  assert.equal(env.properties.get("--mark-top"), still, "Reduced motion keeps a fixed band while the page scrolls");
});

test("disposal cancels both queues and removes every observer and event listener", t => {
  const env = environment(t);
  env.show(); env.scroll(200);
  assert.equal(env.frames.size, 1);
  env.controller.dispose();
  assert.equal(env.frames.size + env.timers.size, 0);
  assert.ok(env.observers.every(observer => observer.disconnected));
  for (const target of [env.host, env.win, env.image, env.document, env.media]) assert.equal(target.events.size, 0);
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
