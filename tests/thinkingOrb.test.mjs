import assert from "node:assert/strict";
import { test } from "node:test";
import { createThinkingOrbRenderer } from "../src/lib/thinkingOrb.js";

function fixture({ reduced = false, paused = false } = {}) {
  let now = 0, serial = 0, resets = 0, width = 300, height = 150;
  const requests = new Map(), frames = [], observers = [], stack = [];
  const listeners = () => {
    const events = new Map();
    return {
      addEventListener: (name, fn) => events.set(name, fn),
      removeEventListener: (name, fn) => { if (events.get(name) === fn) events.delete(name); },
      emit: (name) => events.get(name)?.(),
      get count() { return events.size; },
    };
  };
  const motion = Object.assign(listeners(), { matches: reduced });
  const document = Object.assign(listeners(), { hidden: false });
  const context = {
    globalAlpha: 1,
    save: () => stack.push(context.globalAlpha),
    restore: () => { context.globalAlpha = stack.pop(); },
    setTransform() {},
    clearRect: () => frames.push([]),
  };
  const modes = Object.fromEntries(["breathing", "connecting", "orbits", "globe"].map((name) => [name, {
    speed: 1,
    draw: (ctx, size, time, dark) => frames.at(-1).push({ name, size, time, dark, opacity: ctx.globalAlpha }),
  }]));
  const canvas = {
    get width() { return width; },
    set width(value) { width = value; resets++; },
    get height() { return height; },
    set height(value) { height = value; resets++; },
    getContext: () => context,
  };
  const win = {
    devicePixelRatio: 2, document,
    matchMedia: () => motion,
    requestAnimationFrame: (fn) => { requests.set(++serial, fn); return serial; },
    cancelAnimationFrame: (id) => requests.delete(id),
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
  };
  const renderer = createThinkingOrbRenderer(canvas, win, modes, { state: "breathing", size: 96, dark: false, paused });
  return {
    renderer, canvas, frames, requests, motion, document, observers, win,
    get resets() { return resets; },
    visible(value) { observers[0].callback([{ isIntersecting: value }]); },
    advance(ticks, milliseconds = 100) {
      for (let tick = 0; tick < ticks; tick++) {
        now += milliseconds;
        const callbacks = [...requests.values()]; requests.clear();
        callbacks.forEach((fn) => fn(now));
      }
    },
  };
}

test("execution state changes blend on the same canvas without blank frames or resolution resets", () => {
  const f = fixture();
  f.visible(true); f.advance(5);
  const originalResets = f.resets;
  for (const state of ["connecting", "orbits", "globe", "breathing"]) {
    f.renderer.update({ state });
    f.advance(2);
    assert.equal(f.frames.at(-1).length, 2, "The existing shape stays visible as the next shape arrives");
    f.advance(3);
    assert.equal(f.frames.at(-1).at(-1).name, state);
    assert.equal(f.frames.at(-1).length, 1);
    assert.equal(f.resets, originalResets);
  }
  for (const layers of f.frames) {
    assert.ok(layers.length > 0);
    assert.ok(Math.abs(layers.reduce((total, layer) => total + layer.opacity, 0) - 1) < 1e-10);
  }
  assert.equal(f.observers.length, 1);
  f.renderer.dispose();
});

test("pausing and suspending offscreen or in a hidden tab preserve the animation clock", () => {
  const f = fixture();
  f.visible(true); f.advance(10);
  for (const [stop, resume] of [
    [() => f.renderer.update({ paused: true }), () => f.renderer.update({ paused: false })],
    [() => f.visible(false), () => f.visible(true)],
    [() => { f.document.hidden = true; f.document.emit("visibilitychange"); }, () => { f.document.hidden = false; f.document.emit("visibilitychange"); }],
  ]) {
    const time = f.frames.at(-1)[0].time;
    stop(); f.advance(500);
    assert.equal(f.requests.size, 0);
    assert.equal(f.frames.at(-1)[0].time, time);
    resume(); f.advance(1);
    assert.equal(f.frames.at(-1)[0].time, time, "Resuming must not jump forward by the suspended time");
    f.advance(1);
    assert.equal(Math.round(f.frames.at(-1)[0].time * 1000), Math.round(time * 1000) + 100);
  }
  f.renderer.dispose();
});

test("reduced motion paints the current state without scheduling animation", () => {
  const f = fixture({ reduced: true });
  f.visible(true);
  f.renderer.update({ state: "orbits" });
  assert.equal(f.frames.at(-1)[0].name, "orbits");
  assert.equal(f.requests.size, 0);
  f.motion.matches = false; f.motion.emit("change"); f.advance(5);
  assert.equal(f.requests.size, 1);
  f.motion.matches = true; f.motion.emit("change");
  assert.equal(f.requests.size, 0);
  f.renderer.dispose();
});

test("only an actual size or pixel-density change resizes the backing canvas", () => {
  const f = fixture({ paused: true });
  const initialResets = f.resets;
  for (let frame = 0; frame < 100; frame++) f.renderer.update({ size: 96, dark: Boolean(frame % 2) });
  assert.equal(f.resets, initialResets);
  f.renderer.update({ size: 120 });
  assert.equal(f.canvas.width, 240);
  assert.equal(f.canvas.height, 240);
  assert.equal(f.resets, initialResets + 2);
  f.win.devicePixelRatio = 1;
  f.renderer.update({ size: 120 });
  assert.equal(f.canvas.width, 120);
  assert.equal(f.canvas.height, 120);
  assert.equal(f.resets, initialResets + 4);
  f.renderer.dispose();
});

test("disposal cancels all scheduled work and disconnects the canvas observer", () => {
  const f = fixture();
  f.visible(true); f.advance(3);
  f.renderer.dispose();
  const count = f.frames.length;
  assert.equal(f.requests.size, 0);
  assert.equal(f.observers[0].disconnected, true);
  assert.equal(f.motion.count, 0);
  assert.equal(f.document.count, 0);
  f.renderer.update({ state: "globe", paused: false });
  f.document.emit("visibilitychange"); f.motion.emit("change"); f.advance(20);
  assert.equal(f.frames.length, count);
  assert.equal(f.requests.size, 0);
});
