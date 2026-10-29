import { PLATE, STRIDE } from "./engravedScenes.js";
import { drawMolecule } from "./engravedMolecule.js";
import { moonRotation, poseMark, sceneView } from "./engravedPoses.js";
import { makeInkStamp, strokeInkPaths } from "./engravedDrawing.js";
import { CHAPTERS, DURATION, filmFrame, sceneStart } from "./engravedTimeline.js";
import { engravedFraming } from "./engravedFraming.js";
import { drawEngravedOcean } from "./engravedOcean.js";
import { drawEngravedSpace } from "./engravedSpace.js";
import { drawEngravedNaturalWorld } from "./engravedNaturalWorld.js";
import { drawEngravedBiologyWorld } from "./engravedBiologyWorld.js";
import { drawEngravedWorkshop } from "./engravedWorkshop.js";
import { panoramaActors } from "./engravedCast.js";
import { drawReconstructedComposition, invalidateCompositionParticles } from "./engravedReconstruction.js";
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));

// These two actions previously waited until the scene was completely formed.
// One clock is used through arrival, the hold and departure, so motion is
// already under way as the last particles settle and never restarts at entry.
export const sceneAnimationTime = (scene, seconds) => seconds + (scene === 6 || scene === 7 ? 1.5 : 0);

// DOM-free engine shared by OffscreenCanvas and the compatibility fallback.
function paperTexture(createCanvas) {
  const canvas = createCanvas(PLATE.width, PLATE.height);
  canvas.width = PLATE.width; canvas.height = PLATE.height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f2f2f2";
  context.fillRect(0, 0, PLATE.width, PLATE.height);
  const wash = context.createRadialGradient(690, 390, 90, 700, 400, 810);
  wash.addColorStop(0, "rgba(255,255,255,.55)");
  wash.addColorStop(.6, "rgba(216,216,216,.05)");
  wash.addColorStop(1, "rgba(143,143,143,.13)");
  context.fillStyle = wash;
  context.fillRect(0, 0, PLATE.width, PLATE.height);
  let seed = 83;
  const rng = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  for (let i = 0; i < 22000; i++) {
    context.fillStyle = i % 3 ? "rgba(61,61,61,.035)" : "rgba(255,255,255,.25)";
    context.fillRect(rng() * 1400, rng() * 800, .4 + rng() * 1.2, .4 + rng());
  }
  return canvas;
}

export function createEngravedEngine(canvas, {
  playing = true, visible = true, onUpdate = () => {}, onReady = () => {}, onError = () => {},
  onMetrics = () => {}, createCanvas, loadScene, buildScene, paper: texturedPaper = true, background = "#f2f2f2", labelPixels = 12, variant = "auto", schedule = requestAnimationFrame, cancel = cancelAnimationFrame,
} = {}) {
  const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const scenes = [], pendingScenes = new Map(), stamps = new Map(), metrics = {};
  let paper, reconstructionPlates, openingPlate, frameId, warmTimer, disposed = false, ready = false;
  let elapsed = 0, cycle = 0, previous, lastPaint = -Infinity, lastUpdate = -Infinity;
  let width = 1, height = 1, density = 1, paints = 0;
  let pointerX = 0, pointerY = 0, viewX = 0, viewY = 0;
  const a = new Float64Array(6);
  let metricSentAt = -Infinity;
  let metricScene = -1, metricSamples = 0, metricTotal = 0, metricMax = 0;
  let lastPaintWall, intervalSamples = 0, intervalTotal = 0, intervalMax = 0, over50 = 0;
  const sceneStats = {};
  let skipIntro = !playing;
  const canPlay = () => playing && visible && ready && !disposed;

  function field(index) {
    if (scenes[index]) return scenes[index];
    if (!loadScene) return scenes[index] = buildScene(index);
    if (!pendingScenes.has(index)) {
      pendingScenes.set(index, loadScene(index).then(result => {
        if (disposed) return;
        scenes[index] = result.field;
        for (const cached of result.stamps || []) stamps.set(`${index}:${cached.group}`, cached);
        metrics.geometryBuildMaxMs = Math.max(Number(metrics.geometryBuildMaxMs || 0), result.buildMs || 0).toFixed(2);
        if (ready) { if (!canPlay()) { draw(); publish(true); } onMetrics(metrics); }
      }).catch(error => { if (!disposed) { ready = false; sync(); onError(error); } }));
    }
    return undefined;
  }
  function warmNext(index) {
    if (scenes[index] || warmTimer !== undefined || !canPlay()) return;
    warmTimer = setTimeout(() => {
      warmTimer = undefined;
      if (!disposed && canPlay()) {
        const started = performance.now(); field(index);
        metrics.warmMaxMs = Math.max(Number(metrics.warmMaxMs || 0), performance.now() - started).toFixed(2);
      }
    }, 200);
  }
  function stamp(scene, group) {
    const key = `${scene}:${group}`;
    if (!stamps.has(key)) stamps.set(key, makeInkStamp(field(scene), scene, group, createCanvas, STRIDE));
    return stamps.get(key);
  }
  function drawRigid(scene, seconds, opacity = 1, target = context) {
    if (opacity <= 0) return;
    target.save(); target.globalAlpha = opacity;
    if (scene === 0) {
      const cached = stamp(0, 0);
      target.save();
      target.translate(Math.sin(seconds / DURATION * Math.PI * 2) * 4, Math.cos(seconds / DURATION * Math.PI * 4) * 1.8);
      target.translate(700, 390); target.rotate(moonRotation(seconds)); target.translate(-700, -390);
      target.drawImage(cached.image, cached.left, cached.top, cached.width, cached.height); target.restore();
    } else for (let group = 0; group < 4; group++) {
      target.save();
      if (group) { target.translate(700, 395); target.rotate(seconds * .035 * (group === 2 ? -1 : 1)); target.translate(-700, -395); }
      const cached = stamp(3, group);
      target.drawImage(cached.image, cached.left, cached.top, cached.width, cached.height); target.restore();
    }
    target.restore();
  }

  function drawActor(actor, camera, target = context) {
    const source = field(actor.scene), view = sceneView(actor.scene, actor.seconds);
    if (!source) return;
    if (actor.scene === 6) view.robot.variant = actor.robotVariant;
    // The complete scene now dissipates as particles; releasing this depth
    // mask from the advanced action clock would reveal hidden linework early.
    if (actor.scene === 7) view.protein.surface.dissolve = 0;
    if (actor.scene === 6) view.labelScale = Math.max(1, labelPixels / (14 * camera.scale * actor.scale));
    const paths = Array.from({ length: 48 }, () => (target.createInkPath?.() ?? new Path2D()));
    for (let i = 0; i < source.length; i += STRIDE * actor.step) {
      if (!actor.annotations && source[i + 6] === 60) continue;
      poseMark(source, i, actor.scene, actor.seconds, a, view);
      const alpha = a[4] * actor.opacity;
      if (alpha < .015) continue;
      const bucket = Math.min(15, Math.floor(clamp(alpha) * 16)) + (a[5] < .5 ? 0 : a[5] < 1.5 ? 16 : 32);
      paths[bucket].moveTo(a[0] - a[2], a[1] - a[3]); paths[bucket].lineTo(a[0] + a[2], a[1] + a[3]);
    }
    target.save();
    if (actor.x !== 700 || actor.y !== 400 || actor.scale !== 1) {
      target.translate(actor.x, actor.y); target.scale(actor.scale, actor.scale); target.translate(-700, -400);
    }
    strokeInkPaths(target, paths); target.restore();
  }

  function drawWorld(scene, seconds, camera, opacity, target = context) {
    if (opacity <= 0) return;
    drawEngravedNaturalWorld(target, scene, seconds, camera, opacity);
    if (scene === 1) drawEngravedOcean(target, seconds - sceneStart(1), camera, opacity);
    if (scene === 4) drawEngravedSpace(target, seconds - sceneStart(4), camera, opacity);
    drawEngravedWorkshop(target, scene, seconds, camera, opacity);
    if (scene === 7) drawEngravedBiologyWorld(target, seconds, camera, opacity);
    for (const actor of panoramaActors(scene, seconds, camera)) drawActor({ ...actor, opacity: actor.opacity * opacity }, camera, target);
  }

  function paintComposition(target, scene, seconds, camera) {
    const animationSeconds = sceneAnimationTime(scene, seconds);
    target.save(); target.setTransform(density, 0, 0, density, 0, 0);
    target.translate(camera.offsetX, camera.offsetY); target.scale(camera.scale, camera.scale);
    target.translate(viewX, viewY);
    drawWorld(scene, animationSeconds, camera, 1, target);
    if (scene === 7) {
      const surface = sceneView(scene, animationSeconds).protein.surface;
      surface.dissolve = 0;
      drawMolecule(target, surface, 1);
    }
    if (scene === 0 || scene === 3) drawRigid(scene, animationSeconds, 1, target);
    else if (scene !== 1) drawActor({ scene, seconds: animationSeconds, x: 700, y: 400, scale: 1, opacity: 1, step: 1, annotations: true }, camera, target);
    target.restore();
  }

  function refreshCompositionPlate(image, scene, seconds, camera) {
    const target = image.getContext("2d", { willReadFrequently: true });
    target.save(); target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, image.width, image.height); target.restore();
    paintComposition(target, scene, seconds, camera);
    invalidateCompositionParticles(image);
  }

  function draw() {
    if (!ready || disposed || !width || !height) return;
    const state = filmFrame(elapsed);
    const from = field(state.scene), to = state.progress ? field(state.next) : null;
    if (!from || (state.progress && !to)) return;
    const drawStarted = performance.now();
    if (canPlay() && lastPaintWall !== undefined) {
      const interval = drawStarted - lastPaintWall;
      intervalSamples++; intervalTotal += interval; intervalMax = Math.max(intervalMax, interval);
      metrics.allFrameGapMaxMs = Math.max(Number(metrics.allFrameGapMaxMs || 0), interval).toFixed(2);
      if (interval > 50) over50++;
    }
    lastPaintWall = canPlay() ? drawStarted : undefined;
    const camera = engravedFraming(width, height, variant);
    const fromView = sceneView(state.scene, elapsed);
    if (cycle > 0 && state.scene === 0) fromView.moon = 1;
    if (skipIntro) {
      if (state.scene === 0) fromView.moon = 1;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    if (paper) context.drawImage(paper, 0, 0, width, height);
    const assembling = state.scene === 0 && !state.progress && fromView.moon < 1;
    const transforming = state.progress > 1e-5 && state.progress < 1 - 1e-5;
    if (transforming || assembling) {
      context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
      if (assembling) {
        openingPlate ??= createCanvas(canvas.width, canvas.height);
        refreshCompositionPlate(openingPlate, 0, elapsed, camera);
        drawReconstructedComposition(context, null, openingPlate, fromView.moon, canvas.width, canvas.height);
      } else {
        if (reconstructionPlates?.scene !== state.scene) reconstructionPlates = {
          scene: state.scene,
          from: createCanvas(canvas.width, canvas.height),
          to: createCanvas(canvas.width, canvas.height),
        };
        // Reuse the canvases but repaint both current poses every frame. The
        // destination is moving while its particles arrive, not a frozen pose
        // waiting for the chapter boundary to start its animation clock.
        refreshCompositionPlate(reconstructionPlates.from, state.scene, elapsed, camera);
        refreshCompositionPlate(reconstructionPlates.to, state.next, elapsed, camera);
        drawReconstructedComposition(context, reconstructionPlates.from, reconstructionPlates.to, state.progress, canvas.width, canvas.height);
      }
      context.restore();
    } else paintComposition(context, state.progress > .5 ? state.next : state.scene, elapsed, camera);
    metrics.cachedArtwork = String(transforming || assembling || state.scene === 0 || state.scene === 3);
    context.globalAlpha = 1;
    if (metricScene !== state.scene) { metricScene = state.scene; metricSamples = 0; metricTotal = 0; metricMax = 0; intervalSamples = 0; intervalTotal = 0; intervalMax = 0; over50 = 0; }
    const drawCost = performance.now() - drawStarted; metricSamples++; metricTotal += drawCost; metricMax = Math.max(metricMax, drawCost);
    metrics.paintFps = intervalSamples ? (1000 * intervalSamples / intervalTotal).toFixed(1) : "0";
    metrics.frameGapMaxMs = intervalMax.toFixed(2); metrics.framesOver50Ms = String(over50);
    sceneStats[CHAPTERS[state.scene].name] = { fps: metrics.paintFps, maxGapMs: metrics.frameGapMaxMs, over50 };
    metrics.drawAverageMs = (metricTotal / metricSamples).toFixed(2); metrics.drawMaxMs = metricMax.toFixed(2);
    metrics.cycle = String(cycle);
    metrics.moonFormation = state.scene === 0 ? String(fromView.moon) : "";
    metrics.scene = CHAPTERS[state.scene].name;
    metrics.time = elapsed.toFixed(3);
    metrics.frames = String(++paints);
    metrics.playing = String(canPlay());
    if (elapsed - metricSentAt > .25 || elapsed < metricSentAt || !canPlay()) { metricSentAt = elapsed; metrics.sceneStats = JSON.stringify(sceneStats); onMetrics(metrics); }
    warmNext(state.next);
  }

  function publish(force = false) {
    if (force || elapsed - lastUpdate > .10 || elapsed < lastUpdate) {
      lastUpdate = elapsed;
      onUpdate(filmFrame(elapsed));
    }
  }

  function tick(timestamp) {
    frameId = undefined;
    if (!canPlay()) { previous = undefined; return; }
    if (previous !== undefined) {
      const nextTime = elapsed + clamp((timestamp - previous) / 1000, 0, .1);
      cycle += Math.floor(nextTime / DURATION); elapsed = nextTime % DURATION;
    }
    previous = timestamp;
    if (timestamp - lastPaint >= 1000 / 30 - 1) {
      lastPaint = timestamp;
      viewX += (pointerX - viewX) * .07;
      viewY += (pointerY - viewY) * .07;
      draw(); publish();
    }
    frameId = schedule(tick);
  }

  function sync() {
    if (frameId !== undefined) cancel(frameId);
    frameId = undefined; previous = undefined; lastPaintWall = undefined;
    metrics.playing = String(canPlay()); onMetrics(metrics);
    if (canPlay()) frameId = schedule(tick);
  }

  function resize(nextWidth, nextHeight, nextDensity = 1) {
    reconstructionPlates = undefined; openingPlate = undefined;
    width = nextWidth; height = nextHeight; density = Math.min(2, nextDensity);
    canvas.width = Math.max(1, Math.floor(width * density));
    canvas.height = Math.max(1, Math.floor(height * density));
    draw();
  }

  async function prepare() {
    try {
      if (disposed) return;
      if (!context) throw new Error("Canvas is unavailable in this browser.");
      const initStarted = performance.now();
      field(0);
      if (loadScene) await pendingScenes.get(0);
      if (disposed || !scenes[0]) return;
      paper = texturedPaper ? paperTexture(createCanvas) : null;
      metrics.initMs = (performance.now() - initStarted).toFixed(2);
      ready = true;
      draw(); publish(true); onReady(); onMetrics(metrics); sync();
    } catch (error) {
      if (!disposed) onError(error);
    }
  }
  queueMicrotask(prepare);

  return {
    setPlaying(value) { playing = Boolean(value); if (!ready && !playing) skipIntro = true; sync(); },
    setVisible(value) { visible = Boolean(value); if (!visible) { clearTimeout(warmTimer); warmTimer = undefined; } sync(); },
    setPointer(x, y) { pointerX = x; pointerY = y; },
    resize,
    seek(seconds, { completeMoon = false } = {}) {
      elapsed = filmFrame(seconds).time; cycle = 0; skipIntro = completeMoon;
      previous = undefined; viewX = 0; viewY = 0;
      draw(); publish(true); onMetrics(metrics);
    },
    dispose() {
      disposed = true;
      if (frameId !== undefined) cancel(frameId);
      clearTimeout(warmTimer); scenes.length = 0; pendingScenes.clear(); for (const cached of stamps.values()) cached.image.close?.(); stamps.clear(); paper = undefined;
      reconstructionPlates = undefined; openingPlate = undefined;
    },
  };
}
