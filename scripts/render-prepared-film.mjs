import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, stat, unlink, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createEngravedEngine } from "../src/lib/engravedEngine.js";
import { buildProceduralScene } from "../src/lib/engravedScenes.js";
import { DURATION } from "../src/lib/engravedTimeline.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const toolchainArg = process.argv.indexOf("--toolchain");
if (toolchainArg < 0) throw new Error("Supply --toolchain <folder containing @napi-rs/canvas and ffmpeg-static>.");
const requireTool = createRequire(path.resolve(process.argv[toolchainArg + 1], "renderer.cjs"));
const { createCanvas, Path2D } = requireTool("@napi-rs/canvas");
const ffmpeg = requireTool("ffmpeg-static");
globalThis.Path2D = Path2D;
const fps = 30, introDuration = 3.4;
const variantArg = process.argv.indexOf("--variant"), receiptArg = process.argv.indexOf("--receipt");
const selectedVariant = variantArg >= 0 ? process.argv[variantArg + 1] : null;
if (selectedVariant && !["desktop", "mobile"].includes(selectedVariant)) throw new Error("Unknown --variant.");
if (selectedVariant && receiptArg < 0) throw new Error("Variant workers require --receipt <file>.");
let cancelled = false, activeEncoder;
function cancelWorker() {
  cancelled = true;
  activeEncoder?.stdin.destroy(); activeEncoder?.kill();
}
if (selectedVariant) {
  process.on("message", message => { if (message?.type === "cancel") cancelWorker(); });
  process.on("SIGINT", cancelWorker); process.on("SIGTERM", cancelWorker);
}
const variants = [{ key: "desktop", width: 1800, height: 360, labelPixels: 12 }, { key: "mobile", width: 800, height: 500, labelPixels: 24 }];
let variant, width, height, canvas, context, engine;
const sourceFiles = (await readdir(path.join(root, "src/lib"))).filter(name => /^engraved.*\.js$/.test(name) || name === "proteinReference.js").sort();
const sourceText = data => data.toString("utf8").replace(/\r\n/g, "\n");
const hash = createHash("sha256").update(sourceText(await readFile(fileURLToPath(import.meta.url))));
for (const name of sourceFiles) hash.update(name).update(sourceText(await readFile(path.join(root, "src/lib", name))));
const sourceHash = hash.digest("hex"), key = sourceHash.slice(0, 12);
const output = path.join(root, "site-public/motion");
await mkdir(output, { recursive: true });

async function encode(kind, duration, completeMoon) {
  const name = `engraved-${variant.key}-${kind}-${key}.mp4`, destination = path.join(output, name);
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pixel_format", "rgba", "-video_size", `${width}x${height}`, "-framerate", String(fps), "-i", "pipe:0", "-an", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "23", "-threads", "4", "-g", "60", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart", destination];
  if (cancelled) throw new Error("Film rendering cancelled.");
  const encoder = activeEncoder = spawn(ffmpeg, args, { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "", streamError;
  encoder.stderr.on("data", chunk => { stderr += chunk; });
  encoder.stdin.on("error", error => { streamError = error; });
  const done = new Promise((resolve, reject) => {
    encoder.on("error", reject);
    encoder.on("close", code => code === 0 ? resolve() : reject(new Error(`Encoder exited ${code}: ${stderr}`)));
  });
  done.catch(() => {});
  try {
    const frames = Math.round(duration * fps);
    for (let index = 0; index < frames; index++) {
      if (cancelled) throw new Error("Film rendering cancelled.");
      if (streamError) throw streamError;
      engine.seek(index / fps, { completeMoon });
      const pixels = context.getImageData(0, 0, width, height).data;
      if (!encoder.stdin.write(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength))) await once(encoder.stdin, "drain");
      if (index % 150 === 0) console.log(`${variant.key}/${kind}: ${index}/${frames} frames`);
    }
    encoder.stdin.end(); await done;
    const bytes = (await stat(destination)).size;
    console.log(`${variant.key}/${kind}: complete, ${bytes} bytes`);
    return { src: `motion/${name}`, duration, frames, bytes, sha256: createHash("sha256").update(await readFile(destination)).digest("hex") };
  } catch (error) { encoder.kill(); throw error; }
  finally { activeEncoder = undefined; }
}

const rendered = {};
if (selectedVariant) {
  try {
    for (variant of variants.filter(item => item.key === selectedVariant)) {
      ({ width, height } = variant);
      canvas = createCanvas(width, height); context = canvas.getContext("2d");
      await new Promise((resolve, reject) => {
        engine = createEngravedEngine(canvas, {
          playing: false, paper: false, background: "#ffffff", labelPixels: variant.labelPixels, variant: variant.key, buildScene: buildProceduralScene,
          createCanvas, schedule() { throw new Error("Offline rendering must never start an animation clock."); }, cancel() {},
          onReady: resolve, onError: reject,
        });
        engine.resize(width, height);
      });
      try {
        const posterName = `engraved-${variant.key}-poster-${key}.png`;
        await writeFile(path.join(output, posterName), canvas.toBuffer("image/png"));
        const intro = await encode("opening", introDuration, false);
        const loop = await encode("loop", DURATION, true);
        rendered[variant.key] = { width, height, poster: `motion/${posterName}`, intro, loop };
      } finally { engine.dispose(); }
    }
    await writeFile(path.resolve(process.argv[receiptArg + 1]), JSON.stringify({ sourceHash, rendered }));
  } finally { process.disconnect?.(); }
} else {
  // Each variant has its own engine and encoder. Both must finish against the
  // same source fingerprint before the shared manifest becomes visible.
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ocuna-prepared-film-"));
  const jobs = [], children = [];
  const cancelChildren = () => {
    for (const child of children) if (child.exitCode === null && child.connected) child.send({ type: "cancel" }, () => {});
  };
  process.on("SIGINT", cancelChildren); process.on("SIGTERM", cancelChildren);
  try {
    for (const item of variants) {
      const receipt = path.join(temporary, `${item.key}.json`);
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--toolchain", path.resolve(process.argv[toolchainArg + 1]), "--variant", item.key, "--receipt", receipt], {
        windowsHide: true, stdio: ["ignore", "inherit", "inherit", "ipc"],
      });
      children.push(child);
      const done = new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", code => code === 0 ? resolve() : reject(new Error(`${item.key} renderer exited ${code}.`)));
      });
      done.catch(() => {});
      jobs.push({ receipt, done });
    }
    await Promise.all(jobs.map(job => job.done));
    for (const job of jobs) {
      const receipt = JSON.parse(await readFile(job.receipt, "utf8"));
      if (receipt.sourceHash !== sourceHash) throw new Error("Artwork changed while variants were rendering.");
      Object.assign(rendered, receipt.rendered);
    }
    if (variants.some(item => !rendered[item.key])) throw new Error("A rendered variant is missing.");
  } catch (error) {
    cancelChildren();
    // IPC cancellation lets a worker stop its own FFmpeg child first. Retain a
    // fallback for a worker that cannot process the request, without touching
    // any process outside this render invocation.
    const fallback = setTimeout(() => { for (const child of children) if (child.exitCode === null) child.kill(); }, 2000);
    try { await Promise.allSettled(jobs.map(job => job.done)); } finally { clearTimeout(fallback); }
    throw error;
  } finally {
    process.off("SIGINT", cancelChildren); process.off("SIGTERM", cancelChildren);
    for (const job of jobs) await unlink(job.receipt).catch(error => { if (error.code !== "ENOENT") throw error; });
    await rmdir(temporary);
  }
  const manifest = { fps, duration: DURATION, loopEntry: introDuration, sourceHash, variants: rendered };
  await writeFile(path.join(root, "src/content/preparedFilm.js"), `// Generated by scripts/render-prepared-film.mjs.\nexport const PREPARED_FILM = Object.freeze(${JSON.stringify(manifest, null, 2)});\n`);
  await writeFile(path.join(output, "engraved-film.json"), JSON.stringify({ ...manifest, encoder: spawnSync(ffmpeg, ["-version"], { encoding: "utf8", windowsHide: true }).stdout.split(/\r?\n/)[0] }, null, 2));
  console.log(`Prepared film manifest: ${key}`);
}
