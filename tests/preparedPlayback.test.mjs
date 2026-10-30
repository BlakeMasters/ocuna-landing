import assert from "node:assert/strict";
import test from "node:test";
import { mountPreparedPlayback } from "../src/lib/preparedPlayback.js";
import { DURATION } from "../src/lib/engravedTimeline.js";

const assets = { loopEntry: 3.4, variants: Object.fromEntries(["desktop", "mobile"].map(name => [name, { poster: `${name}.png`, intro: { src: `${name}-opening.mp4` }, loop: { src: `${name}-loop.mp4` } }])) };
class Media extends EventTarget {
  style = {}; paused = true; readyState = 0; currentTime = 0; seeking = false; plays = 0; loads = 0;
  play() { this.plays++; if (this.playError) return Promise.reject(this.playError); this.paused = false; this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
  pause() { const changed = !this.paused; this.paused = true; if (changed) this.dispatchEvent(new Event("pause")); }
  load() { this.loads++; this.readyState = 0; this.currentTime = 0; }
  removeAttribute(name) { delete this[name]; }
  metadata() { this.readyState = 1; this.dispatchEvent(new Event("loadedmetadata")); }
  ready() { this.readyState = 4; this.dispatchEvent(new Event("canplay")); }
  advance(time) { this.currentTime = time; this.dispatchEvent(new Event("timeupdate")); }
}
async function fixture(run) {
  const originals = new Map();
  const replace = (name, value) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, configurable: true }); };
  const document = new EventTarget(); document.hidden = false;
  const query = new EventTarget(); query.matches = false;
  let intersection, disconnected = false, controller;
  const host = { dataset: {} }, opening = new Media(), loop = new Media(), poster = { style: {} };
  try {
    replace("document", document); replace("window", { matchMedia: () => query });
    replace("IntersectionObserver", class { constructor(fn) { intersection = fn; } observe() {} disconnect() { disconnected = true; } });
    for (const name of ["Worker", "requestAnimationFrame"]) replace(name, () => { throw new Error("Prepared playback must not create workers or per-frame JavaScript callbacks."); });
    const mount = (playing, visible = true) => {
      controller = mountPreparedPlayback({ host, opening, loop, poster, assets, playing });
      intersection([{ isIntersecting: visible }]);
      return controller;
    };
    await run({ host, opening, loop, poster, document, query, mount, intersect: value => intersection([{ isIntersecting: value }]), disconnected: () => disconnected });
  } finally {
    controller?.dispose();
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}

test("a paused or reduced-motion start shows a still without fetching video", () => fixture(({ mount, host, opening, loop, poster }) => {
  const player = mount(false);
  assert.equal(host.dataset.mode, "poster"); assert.equal(host.dataset.simulatedStrokes, "0");
  assert.equal(opening.src, undefined); assert.equal(loop.src, undefined); assert.equal(poster.style.visibility, "visible");
  player.setPlaying(true);
  assert.equal(opening.src, "desktop-opening.mp4"); assert.equal(loop.src, "desktop-loop.mp4");
  assert.equal(opening.paused, false); assert.equal(loop.paused, true);
}));

test("loading autoplay never flashes a completed scene before the opening decodes", () => fixture(({ mount, host, opening, loop, poster, query }) => {
  mount(true);
  assert.equal(host.dataset.mode, "opening");
  assert.equal(poster.style.visibility, "hidden");
  assert.equal(opening.style.visibility, "hidden");
  opening.metadata();
  assert.equal(poster.style.visibility, "hidden", "metadata must not expose the completed Moon");
  opening.ready();
  assert.equal(poster.style.visibility, "hidden");
  assert.equal(opening.style.visibility, "visible");
  loop.metadata(); loop.ready(); opening.dispatchEvent(new Event("ended"));
  loop.advance(42.875);
  query.matches = true; query.dispatchEvent(new Event("change"));
  assert.equal(poster.style.visibility, "hidden", "responsive loading must not jump back to the Moon");
  assert.equal(host.dataset.time, "42.875", "loading does not reset the scene clock");
  loop.metadata();
  assert.equal(poster.style.visibility, "hidden");
  loop.ready();
  assert.equal(poster.style.visibility, "hidden");
  assert.equal(loop.style.visibility, "visible");
  assert.equal(loop.currentTime, 42.875);
}));

test("an offscreen autoplay mount does not expose the completed still before starting", () => fixture(({ mount, poster, intersect, opening }) => {
  mount(true, false);
  assert.equal(poster.style.visibility, "hidden");
  intersect(true);
  assert.equal(poster.style.visibility, "hidden");
  opening.metadata(); opening.ready();
  assert.equal(poster.style.visibility, "hidden");
  assert.equal(opening.style.visibility, "visible");
}));

test("pausing a pending opening shows the still and resuming restores the formation", () => fixture(({ mount, poster, opening }) => {
  const player = mount(true);
  player.setPlaying(false);
  assert.equal(poster.style.visibility, "visible");
  player.setPlaying(true);
  assert.equal(poster.style.visibility, "hidden");
  opening.metadata(); opening.ready(); opening.advance(.75);
  player.setPlaying(false);
  assert.equal(poster.style.visibility, "hidden", "a decoded paused frame stays in place");
  assert.equal(opening.style.visibility, "visible");
  assert.equal(opening.currentTime, .75);
}));

test("blocked autoplay falls back to the still and a successful retry starts cleanly", () => fixture(async ({ mount, poster, opening, host }) => {
  opening.playError = Object.assign(new Error("Autoplay blocked"), { name: "NotAllowedError" });
  const player = mount(true);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(host.dataset.mode, "poster");
  assert.equal(poster.style.visibility, "visible");
  delete opening.playError;
  player.setPlaying(false); player.setPlaying(true);
  await Promise.resolve();
  assert.equal(poster.style.visibility, "hidden");
  assert.equal(host.dataset.mode, "opening");
}));

test("the opening hands off to the loop at its matching formed-moon frame", () => fixture(({ mount, host, opening, loop }) => {
  mount(true); opening.metadata(); opening.ready(); loop.metadata(); loop.ready();
  assert.equal(loop.currentTime, 3.4);
  opening.advance(3.4); opening.pause(); opening.dispatchEvent(new Event("ended"));
  assert.equal(host.dataset.mode, "loop"); assert.equal(loop.paused, false); assert.equal(opening.paused, true);
  loop.advance(DURATION - .02); loop.advance(.03);
  assert.equal(host.dataset.cycle, "1"); assert.equal(host.dataset.scene, "Moon");
}));

test("a slow-loading loop holds the last opening frame until it can play", () => fixture(({ mount, host, opening, loop }) => {
  mount(true); opening.metadata(); opening.ready();
  opening.advance(3.4); opening.pause(); opening.dispatchEvent(new Event("ended"));
  assert.equal(host.dataset.mode, "handoff"); assert.equal(opening.style.visibility, "visible"); assert.equal(loop.paused, true);
  loop.metadata(); loop.ready();
  assert.equal(host.dataset.mode, "loop"); assert.equal(loop.currentTime, 3.4); assert.equal(loop.paused, false);
}));

test("shared pause, document visibility and intersection stop native playback without seeking", () => fixture(({ mount, opening, loop, document, intersect }) => {
  const player = mount(true); opening.metadata(); opening.ready(); opening.advance(1.8);
  player.setPlaying(false); assert.equal(opening.paused, true); assert.equal(loop.paused, true); assert.equal(opening.currentTime, 1.8);
  player.setPlaying(true); assert.equal(opening.paused, false); assert.equal(opening.currentTime, 1.8);
  intersect(false); assert.equal(opening.paused, true);
  intersect(true); assert.equal(opening.paused, false);
  document.hidden = true; document.dispatchEvent(new Event("visibilitychange")); assert.equal(opening.paused, true);
}));

test("responsive source changes preserve the active loop time and pause state", () => fixture(({ mount, opening, loop, query, host }) => {
  const player = mount(true); opening.metadata(); opening.ready(); loop.metadata(); loop.ready();
  opening.dispatchEvent(new Event("ended")); loop.advance(25); player.setPlaying(false);
  query.matches = true; query.dispatchEvent(new Event("change"));
  assert.equal(loop.src, "mobile-loop.mp4"); loop.advance(0); assert.equal(host.dataset.cycle, "0", "changing sources is not a loop wrap"); loop.metadata(); loop.ready();
  assert.equal(loop.currentTime, 25); assert.equal(loop.paused, true); assert.equal(host.dataset.variant, "mobile");
}));

for (const playing of [false, true]) {
  const state = playing ? "playing" : "paused";
  test(`rapid responsive crossings retain the ${state} loop position while metadata is pending`, () => fixture(({ mount, opening, loop, query, host }) => {
    const player = mount(true); opening.metadata(); opening.ready(); loop.metadata(); loop.ready();
    opening.dispatchEvent(new Event("ended")); loop.advance(42.875); player.setPlaying(playing);
    // A native source replacement clears currentTime before its metadata is
    // available. Cross the breakpoint again during that loading interval.
    for (const mobile of [true, false, true, false, true]) {
      query.matches = mobile; query.dispatchEvent(new Event("change"));
      assert.equal(loop.readyState, 0); assert.equal(loop.currentTime, 0);
      loop.advance(0);
      assert.equal(host.dataset.cycle, "0", "source loading must not count as a film wrap");
      assert.equal(host.dataset.time, "42.875", "the accessible chapter does not reset while metadata loads");
    }
    assert.equal(loop.src, "mobile-loop.mp4"); loop.metadata(); loop.ready();
    assert.equal(loop.currentTime, 42.875, "the last decoded film position survives all pending replacements");
    assert.equal(loop.paused, !playing); assert.equal(host.dataset.variant, "mobile");
    assert.equal(host.dataset.mode, "loop"); assert.equal(host.dataset.cycle, "0");
    assert.equal(opening.paused, true);
  }));

  test(`rapid responsive crossings retain the ${state} opening near its handoff`, () => fixture(({ mount, opening, loop, query, host }) => {
    const player = mount(true); opening.metadata(); opening.ready(); loop.metadata(); loop.ready();
    const openingTime = assets.loopEntry - .002;
    opening.advance(openingTime); player.setPlaying(playing);
    for (const mobile of [true, false, true, false]) {
      query.matches = mobile; query.dispatchEvent(new Event("change"));
      assert.equal(opening.readyState, 0); assert.equal(opening.currentTime, 0);
      opening.advance(0);
      assert.equal(host.dataset.time, openingTime.toFixed(3));
    }
    assert.equal(opening.src, "desktop-opening.mp4"); opening.metadata(); opening.ready();
    assert.equal(opening.currentTime, openingTime, "a late opening does not restart during rapid resizing");
    assert.equal(opening.paused, !playing); assert.equal(host.dataset.mode, "opening");
    loop.metadata(); loop.ready();
    opening.dispatchEvent(new Event("ended"));
    assert.equal(host.dataset.mode, "loop"); assert.equal(loop.currentTime, assets.loopEntry);
    assert.equal(loop.paused, !playing); assert.equal(host.dataset.cycle, "0");
  }));
}

test("media errors keep a still, and disposal releases sources and observers", () => fixture(({ mount, host, opening, loop, poster, disconnected }) => {
  const player = mount(true); opening.dispatchEvent(new Event("error"));
  assert.equal(host.dataset.mode, "poster"); assert.equal(poster.style.visibility, "visible"); assert.equal(loop.paused, true);
  player.dispose(); assert.equal(disconnected(), true); assert.equal(opening.src, undefined); assert.equal(loop.src, undefined);
}));


test("an offscreen film does not fetch either clip until it becomes visible", () => fixture(({ mount, opening, loop, intersect }) => {
  mount(true, false);
  assert.equal(opening.src, undefined); assert.equal(loop.src, undefined);
  intersect(true); assert.equal(opening.src, "desktop-opening.mp4"); assert.equal(opening.paused, false);
}));
