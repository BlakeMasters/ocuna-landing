import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PREPARED_FILM } from "../src/content/preparedFilm.js";
import { DURATION } from "../src/lib/engravedTimeline.js";

test("prepared scene clips and responsive posters match their checked-in manifest", async () => {
  assert.equal(PREPARED_FILM.duration, DURATION);
  assert.equal(PREPARED_FILM.fps, 30);
  assert.equal(PREPARED_FILM.loopEntry, 3.4);
  for (const [name, variant] of Object.entries(PREPARED_FILM.variants)) {
    assert.ok(variant.width * variant.height <= (name === "desktop" ? 1120 * 640 : 640 * 672), "the scenic film keeps native decoder pixels below the earlier film budget");
    assert.ok(variant.width / variant.height >= (name === "desktop" ? 4.5 : 1.5), "the prepared frame is panoramic rather than a tall isolated plate");
    for (const [name, clip] of [["intro", variant.intro], ["loop", variant.loop]]) {
      const data = await readFile(new URL(`../site-public/${clip.src}`, import.meta.url));
      assert.equal(data.length, clip.bytes);
      assert.equal(createHash("sha256").update(data).digest("hex"), clip.sha256);
      assert.equal(clip.frames, Math.round(clip.duration * PREPARED_FILM.fps));
      assert.equal(clip.duration, name === "loop" ? DURATION : PREPARED_FILM.loopEntry);
    }
    const png = await readFile(new URL(`../site-public/${variant.poster}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), variant.width); assert.equal(png.readUInt32BE(20), variant.height);
  }
});

test("prepared scenes are regenerated when the source artwork or renderer changes", async () => {
  const sourceText = data => data.toString("utf8").replace(/\r\n/g, "\n");
  const hash = createHash("sha256").update(sourceText(await readFile(new URL("../scripts/render-prepared-film.mjs", import.meta.url))));
  const files = (await readdir(new URL("../src/lib/", import.meta.url))).filter(name => /^engraved.*\.js$/.test(name) || name === "proteinReference.js").sort();
  for (const name of files) hash.update(name).update(sourceText(await readFile(new URL(`../src/lib/${name}`, import.meta.url))));
  assert.equal(hash.digest("hex"), PREPARED_FILM.sourceHash);
});
