import assert from "node:assert/strict";
import test from "node:test";
import { drawEngravedSpace, lensedStarImages } from "../src/lib/engravedSpace.js";
import { engravedFraming } from "../src/lib/engravedFraming.js";
import { wormholePoint } from "../src/lib/engravedForms.js";
import { buildProceduralScene, STRIDE } from "../src/lib/engravedScenes.js";
import { poseMark, sceneView } from "../src/lib/engravedPoses.js";
import { sceneStart } from "../src/lib/engravedTimeline.js";

function capturedSpace(seconds, camera) {
  const cuts = [];
  const context = {
    save() {}, restore() {}, globalAlpha: 1,
    createInkPath() {
      const segments = []; let previous;
      return { segments, moveTo(x, y) { previous = [x, y]; }, lineTo(x, y) {
        if (previous) segments.push([...previous, x, y]); previous = [x, y];
      } };
    },
    stroke(path) { if (this.globalAlpha > 0) cuts.push(...path.segments); },
  };
  drawEngravedSpace(context, seconds, camera);
  return cuts;
}

test("the near ring crosses the planet while the far ring remains occluded", () => {
  for (const [width, height, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"]]) {
    const camera = engravedFraming(width, height, variant), span = camera.right - camera.left;
    const radius = Math.min(170, span * .087);
    const bands = Array.from({ length: 10 }, (_, band) => [1.48 + band * .047, .27 + band * .012]);
    bands.push([1.96, .39], [1.46, .27]);
    for (const seconds of [0, 6, 12]) {
      const cx = 700 - Math.min(1370, span * .43) + Math.sin(seconds * .022) * 17;
      const cy = 215 + Math.sin(seconds * .033) * 12, tilt = -.32 + Math.sin(seconds * .028) * .035;
      const local = (x, y) => {
        const dx = x - cx, dy = y - cy;
        return [dx * Math.cos(tilt) + dy * Math.sin(tilt), -dx * Math.sin(tilt) + dy * Math.cos(tilt)];
      };
      const onEllipse = (point, rx, ry) => Math.abs((point[0] / (radius * rx)) ** 2 + (point[1] / (radius * ry)) ** 2 - 1) < 1e-8;
      let frontAcross = 0, backAcross = 0, backOutside = 0;
      for (const cut of capturedSpace(seconds, camera)) {
        const a = local(cut[0], cut[1]), b = local(cut[2], cut[3]);
        // Both endpoints lie on a projected ring ellipse. This excludes globe
        // hatching, stellar paths and the other world's contours.
        if (!bands.some(([rx, ry]) => onEllipse(a, rx, ry) && onEllipse(b, rx, ry))) continue;
        const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
        const overGlobe = Math.hypot(x, y) < radius * .98;
        if (y > 0 && overGlobe) frontAcross++;
        if (y < 0 && overGlobe) backAcross++;
        if (y < 0 && Math.hypot(x, y) > radius * 1.02) backOutside++;
      }
      assert.ok(frontAcross > 100, `${variant}: foreground rings continue visibly across the disk`);
      assert.equal(backAcross, 0, `${variant}: rear rings never show through the globe`);
      assert.ok(backOutside > 100, `${variant}: rear rings remain present outside the silhouette`);
    }
  }
});

test("the Ellis sheet flares smoothly from an open throat instead of ending in a cone", () => {
  const throat = 126, extent = Math.sqrt(310 ** 2 - throat ** 2);
  for (const u of [0, .2, .5, .8, .99, 1]) {
    const proper = (1 - u) * extent, point = wormholePoint(u, .63);
    const radius = Math.hypot(point[0], point[1]);
    assert.ok(Math.abs(radius ** 2 - proper ** 2 - throat ** 2) < 1e-8);
    const embedded = -405 + 625 * Math.asinh(proper / throat) / Math.asinh(extent / throat);
    assert.ok(Math.abs(point[2] - embedded) < 1e-10);
  }
  const near = Math.hypot(...wormholePoint(.9999, 0).slice(0, 2));
  assert.ok((near - throat) / .0001 < .1, "radial slope approaches zero at the throat");
  assert.ok(throat / 310 > .4, "the far sky occupies a readable opening");
});

test("lensed stars form opposite primary and secondary images around the Einstein ring", () => {
  const ring = 275;
  for (const [sx, sy] of [[15, 0], [70, -45], [-190, 130], [400, 70]]) {
    const beta = Math.hypot(sx, sy) / ring;
    const [primary, secondary] = lensedStarImages(sx, sy, ring);
    const outer = Math.hypot(primary[0], primary[1]) / ring;
    const inner = Math.hypot(secondary[0], secondary[1]) / ring;
    assert.ok(outer > 1 && inner < 1);
    assert.ok(Math.abs(outer - 1 / outer ** 2 - beta) < 1e-7);
    assert.ok(Math.abs(1 / inner ** 2 - inner - beta) < 1e-7);
    assert.ok(primary[0] * secondary[0] + primary[1] * secondary[1] < 0);
    assert.ok(primary.every(Number.isFinite) && secondary.every(Number.isFinite));
  }
  const aligned = lensedStarImages(0, 0, ring);
  assert.ok(aligned.every(image => image.every(Number.isFinite)));
  assert.ok(Math.abs(Math.hypot(...aligned[0].slice(0, 2)) - ring) < 1e-5);
  assert.ok(lensedStarImages(8, 0, ring)[0][2] > lensedStarImages(240, 0, ring)[0][2], "near alignment stretches the image tangentially");
});

test("the wormhole carries visible braided material and unequal arc accents through depth", () => {
  const field = buildProceduralScene(4), a = new Float64Array(6), b = new Float64Array(6);
  const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  assert.ok(field.some((value, i) => i % STRIDE === 6 && value === 5), "partial moving arcs break the static symmetry of full rings");
  for (const local of [1.5, 4.5, 7.5]) {
    const start = sceneStart(4) + local, from = sceneView(4, start), to = sceneView(4, start + .5);
    const motion = { meridian: [], accent: [] };
    for (let i = 0; i < field.length; i += STRIDE * 7) {
      const group = field[i + 6];
      if (group !== 0 && group !== 5) continue;
      poseMark(field, i, 4, start, a, from); poseMark(field, i, 4, start + .5, b, to);
      if (a[4] < .06 || b[4] < .06) continue;
      motion[group === 0 ? "meridian" : "accent"].push(Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
    assert.ok(motion.meridian.length > 100 && median(motion.meridian) > 12, "the throat itself moves, rather than only the distant stars");
    assert.ok(motion.accent.length > 15 && median(motion.accent) > 14, "recognizable sparse cuts visibly advance through the tunnel");
  }
});
