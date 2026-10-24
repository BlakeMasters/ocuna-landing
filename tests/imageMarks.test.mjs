import test from "node:test";
import assert from "node:assert/strict";
import { buildMarkField, drawMarkField } from "../src/lib/imageMarks.js";

function samples(width, height, pixels) {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) };
}

const gray = (value, alpha = 255) => [value, value, value, alpha];

function recordingContext() {
  const records = [];
  let start, end, saved;
  const context = {
    globalAlpha: 0.73, lineWidth: 3, strokeStyle: "previous stroke", fillStyle: "previous fill",
    lineCap: "butt", font: "12px serif", textAlign: "left", textBaseline: "top",
    save() { saved = Object.fromEntries(Object.entries(this).filter(([, value]) => typeof value !== "function")); },
    restore() { Object.assign(this, saved); },
    beginPath() {},
    moveTo(x, y) { start = [x, y]; },
    lineTo(x, y) { end = [x, y]; },
    stroke() { records.push({ type: "stroke", start, end, color: this.strokeStyle, alpha: this.globalAlpha, width: this.lineWidth }); },
    fillText(glyph, x, y) { records.push({ type: "text", glyph, x, y, color: this.fillStyle, alpha: this.globalAlpha }); },
  };
  return { context, records };
}

test("dark fields retain increasing luminance as increasing mark density", () => {
  const field = buildMarkField(samples(4, 1, [gray(0), gray(70), gray(150), gray(255)]), { width: 160, height: 40 });
  assert.equal(field.cells.length, 3, "black background should contain no marks");
  for (let index = 1; index < field.cells.length; index += 1) {
    assert.ok(field.cells[index].luminance > field.cells[index - 1].luminance);
    assert.ok(field.cells[index].intensity > field.cells[index - 1].intensity);
    assert.ok(field.cells[index].length > field.cells[index - 1].length);
    assert.ok(field.cells[index].glyphIndex >= field.cells[index - 1].glyphIndex);
  }
});

test("paper fields invert density and leave a white page unmarked", () => {
  const pixels = samples(4, 1, [gray(0), gray(70), gray(150), gray(255)]);
  const paper = buildMarkField(pixels, { width: 160, height: 40, tone: "paper", mode: "ascii" });
  assert.deepEqual(paper.cells.map(cell => cell.column), [0, 1, 2]);
  assert.ok(paper.cells[0].intensity > paper.cells[1].intensity);
  assert.ok(paper.cells[1].intensity > paper.cells[2].intensity);
  assert.ok(paper.cells[0].glyphIndex > paper.cells[2].glyphIndex);
  assert.equal(paper.cells[0].color, "rgb(0, 0, 0)", "source ink color should be preserved");
});

test("transparent sample RGB does not create marks; partial alpha scales opacity", () => {
  const field = buildMarkField(samples(3, 1, [gray(255, 0), gray(150, 128), gray(150)]), { width: 90, height: 30 });
  assert.equal(field.cells.length, 2);
  assert.equal(field.cells[0].column, 1);
  assert.ok(Math.abs(field.cells[0].opacity / field.cells[1].opacity - 128 / 255) < 1e-10);
});

test("actual non-square sample dimensions control logical cell geometry", () => {
  const field = buildMarkField(samples(3, 2, Array.from({ length: 6 }, () => gray(180))), {
    width: 150, height: 120, cellSize: 2, mode: "ascii",
  });
  assert.equal(field.columns, 3);
  assert.equal(field.rows, 2);
  assert.equal(field.cellWidth, 50);
  assert.equal(field.cellHeight, 60);
  assert.deepEqual(field.cells.map(({ x, y }) => [x, y]), [[25, 30], [75, 30], [125, 30], [25, 90], [75, 90], [125, 90]]);
});

test("source chroma survives sampling without inventing a replacement palette", () => {
  const field = buildMarkField(samples(1, 1, [[25, 80, 230, 255]]), { width: 16, height: 20 });
  assert.equal(field.cells.length, 1);
  assert.equal(field.cells[0].color, "rgb(25, 80, 230)");
});

for (const mode of ["hatch", "ascii"]) {
  test(`${mode} rendering is deterministic, finite, mark-only and does not mutate the field`, () => {
    const pixels = samples(3, 2, [gray(30), [80, 190, 50, 255], gray(220), gray(130), [220, 50, 60, 180], gray(250)]);
    const options = { width: 111, height: 79, mode };
    const field = buildMarkField(pixels, options);
    assert.deepEqual(field, buildMarkField(pixels, options));
    const original = structuredClone(field);
    const a = recordingContext(), b = recordingContext();
    drawMarkField(a.context, field, { time: 12.5, animate: true, strength: 0.8 });
    drawMarkField(b.context, field, { time: 12.5, animate: true, strength: 0.8 });
    assert.deepEqual(a.records, b.records);
    assert.equal(a.records.length, field.cells.length);
    assert.deepEqual(field, original);
    assert.equal(a.context.globalAlpha, 0.73, "caller canvas state should be restored");
    assert.equal(a.context.fillStyle, "previous fill");
    assert.equal(a.context.strokeStyle, "previous stroke");
    for (const mark of a.records) {
      const coordinates = mode === "hatch" ? [...mark.start, ...mark.end] : [mark.x, mark.y];
      assert.ok(coordinates.every(Number.isFinite));
      assert.ok(mark.alpha >= 0 && mark.alpha <= 1);
      if (mode === "hatch") {
        assert.ok(mark.start[0] >= 0 && mark.end[0] <= field.width);
        assert.ok(mark.start[1] >= 0 && mark.start[1] <= field.height);
        assert.ok(mark.end[1] >= 0 && mark.end[1] <= field.height);
      } else {
        assert.equal(mark.glyph.length, 1);
        assert.ok(".,:;+=xX08#@".includes(mark.glyph));
      }
    }
    const later = recordingContext();
    drawMarkField(later.context, field, { time: 19, animate: true, strength: 0.8 });
    assert.notDeepEqual(a.records, later.records, "animation should evolve with time");
    const stillA = recordingContext(), stillB = recordingContext();
    drawMarkField(stillA.context, field, { time: 0 });
    drawMarkField(stillB.context, field, { time: 900 });
    assert.deepEqual(stillA.records, stillB.records, "static mode should ignore time");
  });
}
