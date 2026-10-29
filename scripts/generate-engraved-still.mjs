import { mkdir, writeFile } from "node:fs/promises";
import { buildMoonScene, STRIDE } from "../src/lib/engravedScenes.js";
const field = buildMoonScene(), paths = Array.from({ length: 12 }, () => []), n = value => value.toFixed(1);
for (let i = 0; i < field.length; i += STRIDE * 5) {
  const bucket = Math.min(11, Math.floor(field[i + 4] * 12));
  paths[bucket].push(`M${n(field[i] - field[i + 2])},${n(field[i + 1] - field[i + 3])}l${n(field[i + 2] * 2)},${n(field[i + 3] * 2)}`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 800" width="1400" height="800"><title>Engraved moon</title><g fill="none" stroke="#353535" stroke-width=".84" stroke-linecap="round">${paths.map((marks, i) => `<path opacity="${((i + .5) / 12).toFixed(3)}" d="${marks.join("")}"/>`).join("")}</g></svg>`;
await mkdir("site-public/images", { recursive: true });
await writeFile("site-public/images/engraved-moon.svg", svg);
console.log(`Generated moon still: ${Buffer.byteLength(svg)} bytes`);
