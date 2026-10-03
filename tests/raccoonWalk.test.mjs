import assert from "node:assert/strict";
import { test } from "node:test";
import { mountRaccoonWalk, raccoonPose, raccoonContours } from "../src/lib/lectpy-raccoon/raccoon_walk.js";
import { RACCOON_CONTOURS } from "../src/lib/lectpy-raccoon/raccoon_art.js";

// Drive the actual imported renderer with a deterministic document/RAF clock.
function fixture(reducedMotion = false, initialWidth = 1280, initialFontSize = 32) {
  const frames = new Map(), documentListeners = new Map(), motionListeners = new Map();
  let serial = 0, now = 0, onIntersection, onResize, disconnected = false, resizeDisconnected = false;
  let viewportWidth = initialWidth;
  let fontSize = initialFontSize;
  const reduced = {
    matches: reducedMotion,
    addEventListener: (key, fn) => motionListeners.set(key, fn),
    removeEventListener: (key) => motionListeners.delete(key),
  };
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = new Map(); }
    get ownerDocument() { return doc; }
    append(child) { child.remove(); this.children.push(child); child.parent = this; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((n) => n !== this); this.parent = undefined; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getBoundingClientRect() { return { width: viewportWidth }; }
    addEventListener(key, fn) { this.listeners.set(key, fn); }
    all() { return [this, ...this.children.flatMap((child) => child.all())]; }
  }
  const doc = {
    hidden: false,
    createElement: (tag) => new Node(tag),
    createElementNS: (_, tag) => new Node(tag),
    addEventListener: (key, fn) => documentListeners.set(key, fn),
    removeEventListener: (key) => documentListeners.delete(key),
    defaultView: {
      matchMedia: () => reduced,
      getComputedStyle: () => ({ fontSize: `${fontSize}px` }),
      requestAnimationFrame: (fn) => { frames.set(++serial, fn); return serial; },
      cancelAnimationFrame: (id) => frames.delete(id),
      IntersectionObserver: class {
        constructor(fn) { onIntersection = fn; }
        observe() {}
        disconnect() { disconnected = true; }
      },
      ResizeObserver: class {
        constructor(fn) { onResize = fn; }
        observe() {}
        disconnect() { resizeDisconnected = true; }
      },
    },
  };
  const host = new Node("div");
  return {
    host, doc, frames, documentListeners, motionListeners,
    disconnected: () => disconnected,
    resizeDisconnected: () => resizeDisconnected,
    resize(width, size = fontSize) { viewportWidth = width; fontSize = size; onResize?.(); },
    intersect: (visible) => onIntersection([{ isIntersecting: visible }]),
    advance(count, elapsed = 100) {
      for (let i = 0; i < count; i++) {
        now += elapsed;
        const pending = [...frames.values()]; frames.clear();
        pending.forEach((fn) => fn(now));
      }
    },
  };
}

test("homepage control freezes and resumes the imported walk without resetting", () => {
  const f = fixture();
  const rig = mountRaccoonWalk(f.host, { controls: false, autoplay: false, loop: true, scale: .34, sceneHeight: 260 });
  const root = f.host.children[0];
  const actor = root.all().find((n) => "data-raccoon" in n.attributes);
  assert.equal(root.all().filter((n) => ["button", "input", "select"].includes(n.tagName)).length, 0);
  assert.equal(root.all().find((n) => n.tagName === "svg").attributes.viewBox, "0 0 1280 260");
  assert.equal(f.frames.size, 0);
  rig.play(); f.advance(25);
  assert.equal(root.dataset.phase, "Walking in");
  const before = root.dataset.time, transform = actor.attributes.transform;
  rig.pause(); f.advance(30);
  assert.equal(root.dataset.time, before);
  assert.equal(actor.attributes.transform, transform);
  assert.equal(f.frames.size, 0);
  rig.play(); f.advance(5);
  assert.ok(Number(root.dataset.time) > Number(before));
  assert.notEqual(actor.attributes.transform, transform);
  rig.dispose();
});

test("offscreen and hidden-document suspension preserve the walk clock; looping continues", () => {
  const f = fixture();
  const rig = mountRaccoonWalk(f.host, { controls: false, autoplay: true, loop: true });
  const root = f.host.children[0];
  f.advance(30); const before = root.dataset.time;
  f.intersect(false); f.advance(20); assert.equal(root.dataset.time, before);
  f.intersect(true); f.advance(8); assert.ok(Number(root.dataset.time) > Number(before));
  f.doc.hidden = true; f.documentListeners.get("visibilitychange")();
  const hidden = root.dataset.time;
  f.advance(20); assert.equal(root.dataset.time, hidden);
  f.doc.hidden = false; f.documentListeners.get("visibilitychange")();
  f.advance(135);
  assert.ok(Number(root.dataset.time) < 2, "The 16-second loop should restart after walking out");
  assert.equal(root.dataset.playing, "true");
  rig.dispose();
});

test("reduced motion gives a visible still pose and disposal removes all scheduled work", () => {
  const f = fixture(true);
  const rig = mountRaccoonWalk(f.host, { controls: false, autoplay: true, loop: true });
  assert.equal(f.host.children[0].dataset.time, "5.600");
  assert.equal(f.host.children[0].dataset.playing, "false");
  assert.equal(f.frames.size, 0);
  for (const at of [2, 5.8, 8.5, 12.2]) {
    rig.seek(at);
    const paths = f.host.all().filter((n) => "d" in n.attributes);
    assert.ok(paths.every((n) => !/NaN|Infinity/.test(n.attributes.d)));
  }
  rig.dispose();
  assert.equal(f.host.children.length, 0);
  assert.equal(f.documentListeners.size, 0);
  assert.equal(f.motionListeners.size, 0);
  assert.equal(f.disconnected(), true);
});

test("idle variations remain distinct without changing travel or jumping at loop boundaries", () => {
  const poses = [0, 1, 2].map((variation) => raccoonPose(8.3, variation));
  assert.equal(new Set(poses.map((pose) => pose.pitch)).size, 3);
  assert.equal(new Set(poses.map((pose) => pose.x)).size, 1);
  for (let at = 0; at <= 16; at += .05) {
    for (let variation = 0; variation < 3; variation++) {
      const pose = raccoonPose(at, variation);
      assert.ok([pose.x, pose.pitch, pose.bob, pose.down, pose.turn].every(Number.isFinite));
    }
  }
  const f = fixture();
  const rig = mountRaccoonWalk(f.host, { controls: false, autoplay: true, loop: true, variations: true });
  const root = f.host.children[0];
  f.advance(150); assert.equal(root.dataset.variation, "look-around");
  f.advance(20); assert.notEqual(root.dataset.variation, "look-around");
  assert.equal(root.dataset.phase, "Walking in");
  rig.dispose();
});

test("the entire character starts and ends beyond the page edges at both responsive scales", () => {
  for (const [profile, duration] of [["varied", 16], ["startle-sniff", 24.8]]) {
    for (const scale of [.23, .46]) {
      const f = fixture();
      const rig = mountRaccoonWalk(f.host, { controls: false, scale, centerActor: true, profile });
      const actor = f.host.all().find((n) => "data-raccoon" in n.attributes);
      const worldX = () => {
        const translation = Number(actor.attributes.transform.match(/translate\(([-\d.]+)/)[1]);
        return actor.children.flatMap((path) => {
          const coordinates = path.attributes.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
          return coordinates.filter((_, index) => index % 2 === 0).map((x) => x * scale + translation);
        });
      };
      rig.seek(0); assert.ok(Math.max(...worldX()) < 0, "Entry begins completely beyond the left edge");
      rig.seek(duration); assert.ok(Math.min(...worldX()) > 1280, "Exit ends completely beyond the right edge");
      rig.dispose();
    }
  }
});

test("the homepage actor keeps its pixel size and edge-to-edge travel when the viewport changes", () => {
  const f = fixture(false, 761);
  const rig = mountRaccoonWalk(f.host, { controls: false, profile: "startle-sniff", loop: true,
    actorWidth: 120, sceneHeight: 68, baseline: 6 });
  const root = f.host.children[0];
  const scene = root.all().find((n) => n.tagName === "svg");
  const actor = root.all().find((n) => "data-raccoon" in n.attributes);
  const pixelBounds = () => {
    const [translation, , scale] = actor.attributes.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const points = actor.children.flatMap((path) => path.attributes.d.match(/-?\d+(?:\.\d+)?/g)
      .map(Number).filter((_, i) => i % 2 === 0).map((x) => x * scale + translation));
    return { min: Math.min(...points), max: Math.max(...points) };
  };
  rig.seek(8.2);
  const first = pixelBounds(), actorWidth = first.max - first.min;
  assert.ok(actorWidth > 110 && actorWidth <= 121);
  for (const width of [390, 761, 1440, 1920, 2560, 2790]) {
    f.resize(width);
    assert.equal(scene.attributes.viewBox, `0 0 ${width} 68`);
    const still = pixelBounds();
    assert.ok(Math.abs(still.max - still.min - actorWidth) < 1e-9);
    assert.ok(Math.abs((still.max + still.min) / 2 - width / 2) < 6);
    assert.equal(root.dataset.time, "8.200", "Resize must preserve the current pose");
    rig.seek(0); assert.ok(pixelBounds().max < 0);
    rig.seek(24.8); assert.ok(pixelBounds().min > width);
    rig.seek(8.2);
  }
  f.resize(320);
  assert.ok(pixelBounds().max - pixelBounds().min <= 320 * .32);
  rig.play(); f.advance(5);
  const before = root.dataset.time;
  f.resize(1920);
  assert.equal(root.dataset.time, before);
  assert.equal(root.dataset.playing, "true");
  f.advance(5); assert.ok(Number(root.dataset.time) > Number(before));
  rig.dispose();
  assert.equal(f.resizeDisconnected(), true);
  assert.equal(f.frames.size, 0);
});

test("title-relative sizing follows the headline cap instead of continuing to grow with the viewport", () => {
  const f = fixture(false, 761, 32);
  const rig = mountRaccoonWalk(f.host, { controls: false, profile: "startle-sniff",
    actorWidthEm: 2.4, sceneHeight: 68, baseline: 6 });
  const root = f.host.children[0];
  const scene = root.all().find((n) => n.tagName === "svg");
  const actor = root.all().find((n) => "data-raccoon" in n.attributes);
  rig.seek(7.5);
  let cappedScale;
  for (const [width, size] of [[390, 26.52], [761, 32], [1440, 59.04], [1920, 59.2], [2560, 59.2], [2790, 59.2]]) {
    f.resize(width, size);
    const scale = Number(actor.attributes.transform.match(/scale\(([^)]+)/)[1]);
    assert.ok(Math.abs(scale * 860 / size - 2.4) < 1e-9);
    const viewBox = scene.attributes.viewBox.split(" ").map(Number);
    assert.equal(viewBox[2], width, "The travel lane must still span the viewport");
    assert.ok(Math.abs(viewBox[3] - 68 * 2.4 * size / 120) < 1e-9);
    assert.equal(root.dataset.time, "7.500");
    if (width === 1920) cappedScale = scale;
    if (width > 1920) assert.equal(scale, cappedScale);
  }
  rig.dispose();
  assert.equal(f.resizeDisconnected(), true);
});

test("planted paws stay on the ground while the resized homepage actor advances", () => {
  for (const [width, fontSize] of [[390, 26.52], [1440, 59.04], [2790, 59.2]]) {
    const f = fixture(false, width, fontSize);
    const rig = mountRaccoonWalk(f.host, { controls: false, profile: "startle-sniff", actorWidthEm: 2.4, walkCadence: 1.5, baseline: 6, sceneHeight: 68 });
    const actor = f.host.all().find((n) => "data-raccoon" in n.attributes);
    let previous, planted = 0;
    rig.seek(.5); rig.play();
    for (let frame = 0; frame < 300; frame++) {
      f.advance(1, 20);
      const [translation, baseline, scale] = actor.attributes.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
      // Q control point 78 is the flat sole of the near hind paw in the actual
      // rendered outline. Its full limb binding keeps the ground contact rigid.
      const paw = [...actor.children[1].attributes.d.matchAll(/Q(-?[\d.]+) (-?[\d.]+)/g)][78];
      const point = { x: translation + Number(paw[1]) * scale, y: baseline + Number(paw[2]) * scale };
      // Rounded path coordinates can touch floor height just before landing;
      // require the planted part of the stride as well as the actual sole height.
      const cycle = ((translation / scale / (140 / .62)) % 1 + 1) % 1;
      const onGround = cycle < .62 && Math.abs(point.y - (baseline + 387.94 * scale)) < .000001;
      if (onGround && previous?.onGround) {
        assert.ok(Math.abs(point.x - previous.point.x) < .015, `The planted paw should not slide at viewport ${width}, frame ${frame}: ${JSON.stringify({ point, previous })}`);
        assert.ok(translation > previous.translation, "The body should still advance while the paw holds its position");
        planted++;
      }
      previous = { point, onGround, translation };
    }
    assert.ok(planted > 40, "Verify many ground contacts across multiple strides");
    rig.dispose();
  }
});

test("homepage entry and exit keep a relaxed stride cadence across screen widths", () => {
  for (const [width, fontSize] of [[390, 26.52], [761, 32], [1440, 59.04], [2790, 59.2]]) {
    const f = fixture(false, width, fontSize);
    const rig = mountRaccoonWalk(f.host, { controls: false, profile: "startle-sniff", actorWidthEm: 2.4, walkCadence: 1.5 });
    const actor = f.host.all().find((n) => "data-raccoon" in n.attributes);
    const position = () => actor.attributes.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
    for (const at of [2, 11]) {
      rig.seek(at); rig.play(); f.advance(1);
      const [before, , scale] = position();
      f.advance(40);
      const [after] = position();
      const cadence = (after - before) / scale / (140 / .62) / 4;
      assert.ok(cadence > 1.45 && cadence < 1.55, `Expected a relaxed walk at viewport ${width}, source time ${at}; observed ${cadence} strides per second`);
    }
    rig.dispose();
  }
});

test("the short profile holds walking speed until a brief final approach", () => {
  const at = (time) => raccoonPose(time, 0, "startle-sniff");
  const cruiseStep = at(2.1).x - at(2).x;
  const approachStep = at(6.6).x - at(6.5).x;
  assert.ok(Math.abs(approachStep / cruiseStep - 1) < .001, "The raccoon should still walk at its normal speed close to the startle spot");
  assert.equal(at(6.6).walk, 1);
  assert.ok(at(7.1).x - at(7.099).x < cruiseStep * .001, "The short braking segment must still settle smoothly at the spot");
  assert.equal(at(7.1).x, 365);
});

test("the short profile gives one brief startle, one sniff, then leaves", () => {
  const at = (time) => raccoonPose(time, 0, "startle-sniff");
  assert.equal(at(4.25).phaseLabel, "Walking in", "The entrance now takes seven seconds");
  assert.ok(at(4.1).x < 200, "The actor must still be well short of its stop after the old entrance duration");
  assert.equal(at(7.25).phaseLabel, "Startled");
  assert.equal(at(7.25).startle, 1);
  assert.equal(at(8.2).phaseLabel, "Sniffing");
  assert.equal(at(8.2).down, 1);
  assert.equal(at(9).phaseLabel, "Walking out");
  assert.equal(at(9).down, 0);
  let startles = 0, sniffs = 0, lastStartle = false, lastSniff = false;
  for (let time = 0; time <= 24.8; time += .02) {
    const pose = at(time);
    if (pose.startle > 0 && !lastStartle) startles++;
    if (pose.down > 0 && !lastSniff) sniffs++;
    lastStartle = pose.startle > 0; lastSniff = pose.down > 0;
    assert.equal(pose.turn, 0); assert.equal(pose.back, 0);
    assert.ok(pose.pitch >= -2.5 && pose.pitch <= 9);
    assert.ok(raccoonContours(pose).flat(2).every(Number.isFinite));
  }
  assert.equal(startles, 1); assert.equal(sniffs, 1);
});

test("the sniff keeps the face rigid and the long neck nearly unchanged", () => {
  const source = RACCOON_CONTOURS[1];
  const length = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // Upper and lower edges where the long neck meets the head.
  const neckEdges = [[30, 29], [29, 28], [28, 27], [27, 26], [26, 25],
    [142, 143], [143, 144], [144, 145], [145, 146], [146, 147]];
  for (let time = 7.1; time <= 9; time += .02) {
    const pose = raccoonPose(time, 0, "startle-sniff");
    const points = raccoonContours(pose)[1];
    for (const [a, b] of neckEdges) {
      const ratio = length(points[a], points[b]) / length(source[a], source[b]);
      assert.ok(Math.abs(ratio - 1) < .04, `Neck edge ${a}-${b} should retain its length`);
    }
    // Nose, cheek, forehead and ear tips all follow the same rigid rotation.
    for (const [a, b] of [[0, 4], [4, 9], [9, 14], [14, 19], [0, 196]]) {
      assert.ok(Math.abs(length(points[a], points[b]) - length(source[a], source[b])) < .001);
    }
    for (const vertex of [29, 30, 141, 142, 143]) {
      assert.equal(points[vertex][0], source[vertex][0]);
      assert.ok(Math.abs(points[vertex][1] - pose.bob - source[vertex][1]) < 1e-9);
    }
  }
});

test("the short profile waits ten seconds between walks and has a centered reduced-motion still", () => {
  const f = fixture(false, 1440, 59.04);
  const rig = mountRaccoonWalk(f.host, { controls: false, autoplay: true, loop: true,
    profile: "startle-sniff", variations: true, actorWidthEm: 2.4, walkCadence: 1.5 });
  const root = f.host.children[0];
  f.advance(252);
  assert.ok(Number(root.dataset.time) > 9 && Number(root.dataset.time) < 14.3, "The slower crossing should still be walking out after twenty-five seconds");
  assert.equal(root.dataset.variation, "startle-sniff");
  rig.seek(14.8);
  const actor = root.all().find((n) => "data-raccoon" in n.attributes);
  const offstage = actor.attributes.transform;
  rig.play(); f.advance(100);
  assert.equal(root.dataset.phase, "Offstage");
  assert.ok(Number(root.dataset.time) > 24.6);
  assert.equal(actor.attributes.transform, offstage);
  f.advance(3);
  assert.equal(root.dataset.phase, "Walking in");
  assert.ok(Number(root.dataset.time) < .5);
  rig.seek(8.2); rig.play(); f.advance(5); rig.pause();
  const stopped = root.dataset.time;
  f.advance(20); assert.equal(root.dataset.time, stopped);
  rig.seek(100); assert.equal(root.dataset.time, "24.800");
  rig.dispose();
  const still = fixture(true);
  const staticRig = mountRaccoonWalk(still.host, { controls: false, autoplay: true, profile: "startle-sniff", actorWidthEm: 2.4, walkCadence: 1.5 });
  assert.equal(still.host.children[0].dataset.time, "7.500");
  assert.equal(still.host.children[0].dataset.playing, "false");
  assert.equal(still.frames.size, 0);
  staticRig.dispose();
});
