import assert from "node:assert/strict";
import test from "node:test";
import { buildProceduralScene, STRIDE } from "../src/lib/engravedScenes.js";
import { humanoidState, poseHumanoid } from "../src/lib/engravedHumanoid.js";
import { panoramaActors } from "../src/lib/engravedCast.js";
import { engravedFraming } from "../src/lib/engravedFraming.js";
import { sceneStart } from "../src/lib/engravedTimeline.js";

const field = buildProceduralScene(6);
const variants = [undefined, "survey", "precision"];

test("the workcells have distinct hardware as well as staggered motion", () => {
  for (const [width, height, variant] of [[1800, 360, "desktop"], [800, 500, "mobile"]]) {
    const actors = panoramaActors(6, sceneStart(6) + 4, engravedFraming(width, height, variant));
    assert.deepEqual(actors.map(actor => actor.robotVariant), ["survey", "precision"]);
    assert.notEqual(actors[0].seconds, actors[1].seconds);
  }
  assert.ok(panoramaActors(5, sceneStart(5) + 4, engravedFraming(1800, 360)).every(actor => !actor.robotVariant));
});

test("robot heads have distinct proportions while their neck attachment stays fixed", () => {
  const bounds = variants.map(variant => {
    const state = { ...humanoidState(4), variant }, out = new Float64Array(6);
    const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (let i = 0; i < field.length; i += STRIDE) if (field[i + 6] === 42) {
      poseHumanoid(field, i, state, out);
      assert.ok(out.every(Number.isFinite));
      box.left = Math.min(box.left, out[0]); box.right = Math.max(box.right, out[0]);
      box.top = Math.min(box.top, out[1]); box.bottom = Math.max(box.bottom, out[1]);
    }
    return box;
  });
  const [standard, survey, precision] = bounds;
  assert.ok(survey.right - survey.left > (standard.right - standard.left) * 1.15);
  assert.ok(precision.right - precision.left < (standard.right - standard.left) * .86);
  assert.ok(survey.top > standard.top + 15 && precision.top < standard.top - 10);
  for (const bound of bounds) assert.equal(bound.bottom, -176, "the lower head edge still meets the shared neck");
});

test("hardware variants preserve all fingertip, payload, cable and annotation paths", () => {
  const out = new Float64Array(6), standardOut = new Float64Array(6);
  for (const time of [0, 1.4, 2.9, 4.2, 5.4]) {
    const standard = humanoidState(time);
    for (const variant of ["survey", "precision"]) {
      const modified = { ...humanoidState(time), variant };
      for (let i = 0; i < field.length; i += STRIDE) {
        const group = field[i + 6], part = group % 100;
        poseHumanoid(field, i, modified, out);
        assert.ok(out.every(Number.isFinite));
        assert.ok(Math.abs(out[0]) < 550 && Math.abs(out[1]) < 410 && Math.abs(out[2]) < 250);
        if (group === 30 || group === 60 || (group >= 100 && [12, 18, 19].includes(part))) {
          poseHumanoid(field, i, standard, standardOut);
          assert.deepEqual(out, standardOut, "cosmetic changes do not move contacts, cables or angle guides");
        }
      }
    }
  }
});
