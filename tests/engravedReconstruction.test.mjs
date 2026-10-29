import assert from "node:assert/strict";
import test from "node:test";
import { createStrokeCapture, sampleCompositionParticles, inPlaceParticleMark, particleHandoff, invalidateCompositionParticles, drawReconstructedComposition } from "../src/lib/engravedReconstruction.js";
import { createEngravedScenery } from "../src/lib/engravedScenery.js";
import { createEngravedEngine } from "../src/lib/engravedEngine.js";
import { buildProceduralScene } from "../src/lib/engravedScenes.js";
import { sceneStart } from "../src/lib/engravedTimeline.js";

function close(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-9, `${value} differs from ${expected[index]}`));
}

function recordingPaths(run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "Path2D");
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: class {
    segments = [];
    moveTo(x, y) { this.cursor = [x, y]; this.first = this.cursor; }
    lineTo(x, y) { if (this.cursor) this.segments.push([...this.cursor, x, y]); this.cursor = [x, y]; }
    closePath() { if (this.cursor && this.first) this.segments.push([...this.cursor, ...this.first]); }
  } });
  return Promise.resolve().then(run).finally(() => {
    if (original) Object.defineProperty(globalThis, "Path2D", original); else delete globalThis.Path2D;
  });
}

test("captured cuts retain affine placement, ink and nested Canvas state", () => {
  const { context, strokes } = createStrokeCapture();
  const path = context.createInkPath();
  path.moveTo(1, 2); path.lineTo(3, 4);
  context.strokeStyle = "#575757"; context.lineWidth = 2; context.globalAlpha = .4;
  context.translate(10, 20); context.rotate(Math.PI / 2); context.scale(3);
  context.save();
  context.translate(2, -1); context.globalAlpha = .7; context.lineWidth = 4;
  context.stroke(path);
  context.restore(); context.stroke(path);
  close(strokes[0].slice(0, 6), [7, 29, 1, 35, .7, 12]);
  close(strokes[1].slice(0, 6), [4, 23, -2, 29, .4, 6]);
  assert.equal(strokes[0][6], "#575757");
  assert.equal(context.lineWidth, 2); assert.equal(context.globalAlpha, .4);
  context.resetTransform(); context.stroke(path);
  close(strokes[2].slice(0, 6), [1, 2, 3, 4, .4, 2]);
  context.setTransform({ a: 2, b: 0, c: 0, d: 2, e: -5, f: 7 });
  context.stroke(path);
  close(strokes[3].slice(0, 6), [-3, 11, 1, 15, .4, 4]);
  assert.deepEqual(path.segments, [[1, 2, 3, 4]], "drawing a path never changes its source geometry");
});

test("scenery exposes the exact finite cuts used by its cached held artwork", () => {
  const plates = [];
  const createCanvas = () => {
    const sink = createStrokeCapture();
    const image = { getContext: () => sink.context, cuts: sink.strokes };
    plates.push(image); return image;
  };
  const camera = { left: -2000, right: 3400, top: -100, bottom: 950, scale: 1, offsetX: 0, offsetY: 0 };
  const scenery = createEngravedScenery(createCanvas, 1800, 360, camera);
  const painted = [], target = createStrokeCapture().context;
  target.drawImage = image => painted.push(image);
  for (let scene = 0; scene < 8; scene++) {
    const strokes = scenery.strokes(scene);
    assert.ok(strokes.length > 100);
    assert.ok(strokes.every(stroke => stroke.slice(0, 6).every(Number.isFinite)));
    assert.deepEqual(strokes, plates[scene].cuts);
    const originalCount = plates[scene].cuts.length;
    scenery.draw(target, scene, 0); scenery.draw(target, scene, 2);
    assert.equal(painted.at(-1), plates[scene]);
    assert.equal(painted.at(-2), plates[scene]);
    assert.equal(scenery.strokes(scene), strokes, "the held plate and its captured lines share one stable cache");
    assert.equal(plates[scene].cuts.length, originalCount, "holding does not redraw the cached geometry");
  }
  assert.equal(plates.length, 8);
  assert.deepEqual(scenery.strokes(99), []);
  scenery.dispose();
});


function rgba(width, height, pixels = []) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, values] of pixels) data.set(values, (y * width + x) * 4);
  return data;
}

function sampledImage(width, height, pixels) {
  const state = { reads: 0, data: rgba(width, height, pixels) };
  return { width, height, state, getContext: () => ({ getImageData() { state.reads++; return { data: state.data }; } }) };
}

function particleSink() {
  const sink = createStrokeCapture(), images = [];
  sink.context.globalAlpha = .3; sink.context.strokeStyle = '#999999'; sink.context.lineWidth = 9;
  sink.context.drawImage = (image, ...geometry) => images.push({ image, geometry, alpha: sink.context.globalAlpha });
  return { ...sink, images };
}

test("particle sampling retains one-pixel hatching and uses alpha-weighted ink centroids", () => {
  const hatch = sampleCompositionParticles(rgba(2, 2, [[1, 0, [0, 0, 0, 255]]]), 2, 2);
  assert.equal(hatch.length, 1);
  close(hatch[0].slice(0, 2), [1.5, .5]);
  assert.ok(Math.abs(Math.hypot(hatch[0][2], hatch[0][3]) - .48) < 1e-12);
  assert.equal(hatch[0][4], .9);
  const weighted = sampleCompositionParticles(rgba(2, 2, [[1, 0, [0, 0, 0, 255]], [0, 1, [128, 128, 128, 128]]]), 2, 2);
  const faintInk = 128 / 255 * (1 - 128 / 255), mass = 1 + faintInk;
  close(weighted[0].slice(0, 2), [(1.5 + .5 * faintInk) / mass, (.5 + 1.5 * faintInk) / mass]);
  assert.deepEqual(sampleCompositionParticles(rgba(2, 2), 2, 2), [], "transparent black contributes no ink");
});

test("the light filled molecular envelope enters the same finite particle field as dark cuts", () => {
  const pixels = [[0, 0, [232, 232, 232, 255]], [1, 0, [232, 232, 232, 255]], [0, 1, [232, 232, 232, 255]], [1, 1, [232, 232, 232, 255]], [7, 3, [53, 53, 53, 255]]];
  const data = rgba(8, 4, pixels), particles = sampleCompositionParticles(data, 8, 4);
  assert.equal(particles.length, 2);
  const surface = particles.find(particle => particle[0] < 2);
  close(surface.slice(0, 2), [1, 1]);
  assert.ok(Math.abs(surface[4] - 4 * (1 - 232 / 255) * .9) < 1e-12);
  assert.ok(particles.every(particle => particle.every(Number.isFinite) && particle[4] > 0));
  assert.deepEqual(particles, sampleCompositionParticles(data, 8, 4), "sampling the complete scene is deterministic");
});

test("loose particles stay near their own scene regions without gathering in the middle", () => {
  for (const [width, height] of [[1800, 360], [800, 500]]) {
    const anchors = [[10, 10], [width - 10, 10], [10, height - 10], [width - 10, height - 10], [width * .5, height * .5]];
    for (const incoming of [false, true]) for (const progress of [0, .1, .25, .5, .75, .9, 1]) {
      const marks = anchors.map(([x, y]) => {
        const particle = [x, y, .4, .2, .5, 53], pristine = [...particle];
        const mark = inPlaceParticleMark(particle, progress, incoming, width, height);
        assert.ok([...mark].every(Number.isFinite));
        assert.ok(Math.abs(mark[0] - x) < width * .1, "even loose cuts travel within their original scene region");
        assert.ok(Math.abs(mark[1] - y) <= height * .25);
        assert.deepEqual(particle, pristine);
        return mark;
      });
      assert.ok(marks[1][0] - marks[0][0] > width * .75, "opposite page edges never converge into a common cloud");
      assert.ok(marks[2][1] - marks[0][1] > height * .4);
    }
  }
});

test("neighboring ink cuts separate before fading so the old contour actually breaks apart", () => {
  for (const [width, height, minimumSpread] of [[1800, 360, 12], [800, 500, 8]]) {
    const displacements = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const particle = [width * .5 + x * 2 + .5, height * .4 + y * 2 + .5, .48, 0, .5, 53];
      const mark = inPlaceParticleMark(particle, .3, false, width, height);
      assert.ok(mark[4] > particle[4] * .8, "cuts remain visible while their geometric contour separates");
      displacements.push([mark[0] - particle[0], mark[1] - particle[1]]);
    }
    const mean = [0, 1].map(axis => displacements.reduce((sum, point) => sum + point[axis], 0) / displacements.length);
    const spread = Math.sqrt(displacements.reduce((sum, point) => sum + (point[0] - mean[0]) ** 2 + (point[1] - mean[1]) ** 2, 0) / displacements.length);
    assert.ok(spread > minimumSpread, "nearby cuts fly in distinct directions instead of translating a faint complete silhouette");
  }
});

test("loose outgoing ink hands off continuously to incoming ink without a reset", () => {
  const width = 1800, height = 360, particle = [800, 140, .4, .2, .5, 53];
  let previous = -1;
  for (let index = 0; index <= 100; index++) {
    const progress = index / 100, transfer = particleHandoff(progress);
    assert.ok(transfer >= previous && transfer >= 0 && transfer <= 1);
    previous = transfer;
    const outgoing = inPlaceParticleMark(particle, progress, false, width, height);
    const incoming = inPlaceParticleMark(particle, progress, true, width, height);
    const eased = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
    const outgoingGain = 1 + eased(progress / .56) * .22;
    const incomingGain = 1 + (1 - eased((progress - .38) / .62)) * .22;
    assert.ok(Math.abs(outgoing[4] / outgoingGain + incoming[4] / incomingGain - particle[4]) < 1e-12,
      "the two loose fields retain a full complementary ink budget");
  }
  for (const [x, y] of [[20, 30], [399, 170], [800, 80], [1399, 300], [1780, 330]]) {
    const cut = [x, y, .4, .2, .5, 53];
    for (const incoming of [false, true]) {
      const middle = inPlaceParticleMark(cut, .5, incoming, width, height);
      assert.ok(middle[4] >= cut[4] * .5, "both particle populations stay visible through the middle");
    }
    assert.ok(inPlaceParticleMark(cut, .7, true, width, height)[4] >= cut[4] * .9,
      "incoming cuts are visible before their positions finish settling");
  }
  let looseDistance = 0, settledDistance = 0;
  for (let index = 0; index < 80; index++) {
    const cut = [80 + index * 20, 140 + index % 5 * 4, .4, .2, .5, 53];
    const loose = inPlaceParticleMark(cut, .65, true, width, height), settled = inPlaceParticleMark(cut, .97, true, width, height);
    looseDistance += Math.hypot(loose[0] - cut[0], loose[1] - cut[1]);
    settledDistance += Math.hypot(settled[0] - cut[0], settled[1] - cut[1]);
  }
  assert.ok(looseDistance / 80 > 15, "the overlap remains dispersed cuts rather than two coherent silhouettes");
  assert.ok(settledDistance < looseDistance * .02, "position settling completes smoothly near the live scene handoff");
});

test("rendered particle ink remains continuous through the loose handoff", () => recordingPaths(() => {
  for (const [width, height] of [[1800, 360], [800, 500]]) {
    const outgoingPixels = [], incomingPixels = [], strengths = [4, 16, 64, 160];
    for (let row = 0; row < 10; row++) for (let column = 0; column < 24; column++) {
      const x = Math.floor((column + .5) / 24 * width / 2) * 2;
      const y = Math.floor((row + .5) / 10 * height / 2) * 2;
      const alpha = strengths[(row + column) % strengths.length];
      outgoingPixels.push([x, y, [53, 53, 53, alpha]]);
      incomingPixels.push([width - x - 2, height - y - 2, [53, 53, 53, alpha]]);
    }
    const from = sampledImage(width, height, outgoingPixels), to = sampledImage(width, height, incomingPixels);
    const sourceParticles = sampleCompositionParticles(from.state.data, width, height);
    const targetParticles = sampleCompositionParticles(to.state.data, width, height);
    const ink = particles => particles.reduce((sum, cut) => sum + cut[4] * 2 * Math.hypot(cut[2], cut[3]), 0);
    const outgoingInk = ink(sourceParticles), incomingInk = ink(targetParticles);
    let minimumRatio = Infinity;
    for (let step = 20; step <= 80; step++) {
      const progress = step / 100, sink = particleSink();
      drawReconstructedComposition(sink.context, from, to, progress, width, height);
      assert.equal(sink.images.length, 0, "painted pictures cannot hide a gap in the particle field");
      const actualInk = sink.strokes.reduce((sum, cut) => sum + cut[4] * Math.hypot(cut[2] - cut[0], cut[3] - cut[1]), 0);
      const referenceInk = outgoingInk * (1 - progress) + incomingInk * progress;
      const ratio = actualInk / referenceInk;
      minimumRatio = Math.min(minimumRatio, ratio);
      assert.ok(ratio >= .7, `visible ink drops to ${ratio.toFixed(3)} at ${progress}; the handoff must not blank`);
      assert.ok(sink.strokes.length > sourceParticles.length * .5,
        "the midpoint retains a population of individual cuts, including low-alpha source ink");
    }
    assert.ok(Number.isFinite(minimumRatio));
  }
}));

test("local particle paths retain their exact visible endpoints and deterministic opacity", () => {
  const particle = [120, 30, .3, -.2, .5, 53];
  close(inPlaceParticleMark(particle, 0, false, 1800, 360), particle);
  close(inPlaceParticleMark(particle, 1, true, 1800, 360), particle);
  assert.equal(inPlaceParticleMark(particle, 0, true, 1800, 360)[4], 0);
  assert.equal(inPlaceParticleMark(particle, 1, false, 1800, 360)[4], 0);
  for (const incoming of [false, true]) {
    const out = new Float64Array(6);
    assert.equal(inPlaceParticleMark(particle, .37, incoming, 1800, 360, out), out);
    assert.deepEqual(out, inPlaceParticleMark(particle, .37, incoming, 1800, 360));
  }
});

test("the middle of reconstruction draws actual moving ink particles without any image warp", () => recordingPaths(() => {
  const from = sampledImage(8, 4, [[0, 0, [0, 0, 0, 255]], [7, 3, [0, 0, 0, 255]]]);
  const to = sampledImage(8, 4, [[1, 3, [53, 53, 53, 255]], [6, 0, [53, 53, 53, 255]]]);
  const pristine = [from.state.reads, to.state.reads], normal = particleSink(), faint = particleSink();
  drawReconstructedComposition(normal.context, from, to, .5, 8, 4);
  drawReconstructedComposition(faint.context, from, to, .5, 8, 4, .25);
  assert.equal(normal.images.length, 0, "no separate subject, background, shell or stretched bitmap is drawn at midpoint");
  assert.ok(normal.strokes.length >= 2 && normal.strokes.length <= 4, "the midpoint contains loose cuts rather than two complete opaque scenes");
  const centers = normal.strokes.map(cut => [(cut[0] + cut[2]) / 2, (cut[1] + cut[3]) / 2]);
  assert.ok(centers.some(point => point[0] < 2) && centers.some(point => point[0] > 6), "loose cuts remain distributed across the page instead of converging");
  assert.equal(faint.strokes.length, normal.strokes.length);
  assert.equal(normal.context.globalAlpha, .3); assert.equal(normal.context.lineWidth, 9); assert.equal(normal.context.strokeStyle, '#999999');
  normal.strokes.forEach((cut, index) => {
    assert.ok(cut.slice(0, 6).every(Number.isFinite));
    close(faint.strokes[index].slice(0, 4), cut.slice(0, 4));
    assert.ok(Math.abs(faint.strokes[index][4] - cut[4] * .25) < 1e-12);
  });
  const again = particleSink(); drawReconstructedComposition(again.context, from, to, .5, 8, 4);
  assert.deepEqual(again.strokes, normal.strokes);
  assert.deepEqual([from.state.reads, to.state.reads], pristine.map(count => count + 1), "an unchanged full-scene field reuses its samples");
}));

test("repainting a scene invalidates its particle samples so moving poses do not freeze", () => recordingPaths(() => {
  const image = sampledImage(16, 8, [[0, 0, [53, 53, 53, 255]]]);
  const first = particleSink(); drawReconstructedComposition(first.context, image, null, .5, 16, 8);
  const firstCenter = (first.strokes[0][0] + first.strokes[0][2]) / 2;
  image.state.data = rgba(16, 8, [[14, 6, [53, 53, 53, 255]]]);
  const cached = particleSink(); drawReconstructedComposition(cached.context, image, null, .5, 16, 8);
  assert.deepEqual(cached.strokes, first.strokes);
  assert.equal(image.state.reads, 1);
  invalidateCompositionParticles(image);
  const fresh = particleSink(); drawReconstructedComposition(fresh.context, image, null, .5, 16, 8);
  assert.equal(image.state.reads, 2);
  assert.equal(fresh.strokes.length, 1);
  const nextCenter = (fresh.strokes[0][0] + fresh.strokes[0][2]) / 2;
  assert.ok(nextCenter - firstCenter > 10, "the new live pose is sampled at its current location");
}));

test("painted scene images are limited to the endpoint handoffs", () => recordingPaths(() => {
  const from = sampledImage(4, 4, [[0, 0, [53, 53, 53, 255]]]), to = sampledImage(4, 4, [[3, 3, [53, 53, 53, 255]]]);
  for (const [progress, expected] of [[0, from], [1, to]]) {
    const sink = particleSink(); drawReconstructedComposition(sink.context, from, to, progress, 4, 4);
    const visible = sink.images.filter(draw => draw.alpha > 0);
    assert.equal(visible.length, 1); assert.equal(visible[0].image, expected);
    assert.equal(visible[0].alpha, 1); assert.deepEqual(visible[0].geometry, [0, 0]);
    assert.equal(sink.strokes.length, 0);
  }
  for (const progress of [.2, .4, .5, .7, .8]) {
    const sink = particleSink(); drawReconstructedComposition(sink.context, from, to, progress, 4, 4);
    assert.equal(sink.images.length, 0, "complete picture opacity cannot substitute for visible breakup and formation");
  }
  const opening = particleSink(); drawReconstructedComposition(opening.context, null, to, .1, 4, 4);
  assert.ok(opening.strokes.length > 0, "a standalone opening begins before the normal incoming chapter interval");
  for (const [a, b, progress] of [[null, to, 0], [from, null, 1]]) {
    const sink = particleSink(); drawReconstructedComposition(sink.context, a, b, progress, 4, 4);
    assert.ok(sink.images.every(draw => draw.alpha === 0)); assert.equal(sink.strokes.length, 0);
  }
}));

test("the engine samples complete actors, scenery and molecular fills into one particle reconstruction", () => recordingPaths(async () => {
  const mainImages = [], mainStrokes = [], mainFills = [], sampled = [];
  function fakeContext(main = false) {
    const values = { globalAlpha: 1, strokes: 0, fills: 0 }, stack = [];
    return new Proxy(values, { get(target, name) {
      if (name in target) return target[name];
      if (name === 'save') return () => stack.push(target.globalAlpha);
      if (name === 'restore') return () => { target.globalAlpha = stack.pop() ?? 1; };
      if (name === 'drawImage') return (image, ...geometry) => { if (main) mainImages.push({ image, geometry }); };
      if (name === 'stroke') return () => { target.strokes++; if (main) mainStrokes.push({ shade: target.strokeStyle }); };
      if (name === 'fill') return () => { target.fills++; if (main) mainFills.push(true); };
      if (name === 'getImageData') return (x, y, width, height) => {
        sampled.push(target.owner);
        return { data: rgba(width, height, [[10, 10, [53, 53, 53, 255]], [width - 10, height - 10, [232, 232, 232, 255]]]) };
      };
      return () => {};
    } });
  }
  const context = fakeContext(true); let engine;
  try {
    await new Promise((resolve, reject) => {
      engine = createEngravedEngine({ getContext: () => context }, { playing: false, paper: false,
        createCanvas: (width, height) => { const ink = fakeContext(); const image = { width, height, getContext: () => ink }; ink.owner = image; return image; },
        buildScene: buildProceduralScene, schedule() { throw new Error('No clock during regression check'); }, cancel() {}, onReady: resolve, onError: reject,
      }); engine.resize(1800, 360);
    });
    mainImages.length = 0; mainStrokes.length = 0; mainFills.length = 0; sampled.length = 0;
    engine.seek(sceneStart(7) - 1.5, { completeMoon: true });
    const plates = [...new Set(sampled)];
    assert.equal(plates.length, 2, 'both complete scenes enter the single particle field');
    assert.ok(plates.every(image => image.width === 1800 && image.height === 360 && image.getContext().strokes > 0));
    assert.ok(plates.some(image => image.getContext().fills > 0), 'the incoming molecular surface enters the same sampled composition');
    assert.equal(mainImages.length, 0, 'there is no separate painted subject or molecular shell at midpoint');
    assert.equal(mainFills.length, 0);
    assert.equal(mainStrokes.length, 64, 'only the shared particle ink buckets are drawn');
    assert.ok(mainStrokes.every(draw => draw.shade === '#353535'));
    const counts = plates.map(image => image.getContext().strokes);
    engine.seek(sceneStart(7) - 1.4, { completeMoon: true });
    assert.equal(sampled.length, 4, 'both moving compositions are sampled again during the transition');
    assert.deepEqual([...new Set(sampled)], plates, 'the same canvases are reused for advancing poses');
    assert.ok(plates.every((image, index) => image.getContext().strokes > counts[index]), 'both compositions keep painting before the particles settle');
    mainStrokes.length = 0; mainFills.length = 0;
    engine.seek(sceneStart(7), { completeMoon: true });
    assert.ok(mainStrokes.length > 0 && mainFills.length > 0, 'normal held-scene motion resumes for both linework and molecular surface');
  } finally { engine?.dispose(); }
}));
