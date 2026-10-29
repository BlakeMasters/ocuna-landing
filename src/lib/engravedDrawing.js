export const INK_PALETTE = Object.freeze(["#353535", "#5c5c5c", "#787878"]);
const clamp = n => Math.max(0, Math.min(1, n));

export function strokeInkPaths(target, paths) {
  target.lineWidth = .84; target.lineCap = "round";
  for (let i = 0; i < paths.length; i++) {
    target.strokeStyle = INK_PALETTE[Math.floor(i / 16)];
    target.globalAlpha = (i % 16 + .5) / 16; target.stroke(paths[i]);
  }
  target.globalAlpha = 1;
}
export function makeInkStamp(source, scene, group, createCanvas, stride) {
  const paths = Array.from({ length: 48 }, () => new Path2D());
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let i = 0; i < source.length; i += stride) {
    if (scene === 3 && source[i + 6] !== group) continue;
    const alpha = source[i + 4]; if (alpha < .015) continue;
    const bucket = Math.min(15, Math.floor(clamp(alpha) * 16)) + (source[i + 5] < .5 ? 0 : source[i + 5] < 1.5 ? 16 : 32);
    left = Math.min(left, source[i] - Math.abs(source[i + 2])); right = Math.max(right, source[i] + Math.abs(source[i + 2]));
    top = Math.min(top, source[i + 1] - Math.abs(source[i + 3])); bottom = Math.max(bottom, source[i + 1] + Math.abs(source[i + 3]));
    paths[bucket].moveTo(source[i] - source[i + 2], source[i + 1] - source[i + 3]);
    paths[bucket].lineTo(source[i] + source[i + 2], source[i + 1] + source[i + 3]);
  }
  // Crop the transparent cache and retain two pixels per plate unit.
  left = Math.floor(left) - 2; top = Math.floor(top) - 2;
  const width = Math.ceil(right) + 2 - left, height = Math.ceil(bottom) + 2 - top;
  const image = createCanvas(width * 2, height * 2), ink = image.getContext("2d");
  ink.scale(2, 2); ink.translate(-left, -top); strokeInkPaths(ink, paths);
  return { image, left, top, width, height };
}
