export const MAX_ENGRAVED_PIXELS = 2_000_000;

// High-DPI Chrome windows can otherwise rasterize millions of extra pixels.
// Keep every source stroke, while bounding the size of the drawing surface.
export function engravedDensity(width, height, ratio = 1) {
  const requested = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return Math.min(2, requested, Math.sqrt(MAX_ENGRAVED_PIXELS / Math.max(1, width * height)));
}
