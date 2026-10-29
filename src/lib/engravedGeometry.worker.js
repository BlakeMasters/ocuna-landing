import { buildProceduralScene, STRIDE } from "./engravedScenes.js";
import { makeInkStamp } from "./engravedDrawing.js";
import { moleculeMesh } from "./engravedMolecule.js";

// Geometry construction must not occupy the worker responsible for painting.
self.onmessage = ({ data: { index } }) => {
  try {
    const started = performance.now(), field = buildProceduralScene(index);
    const mesh = index === 7 ? moleculeMesh() : undefined;
    const groups = index === 0 ? [0] : index === 3 ? [0, 1, 2, 3] : [];
    const stamps = groups.map(group => {
      const cached = makeInkStamp(field, index, group, (w, h) => new OffscreenCanvas(w, h), STRIDE);
      return { ...cached, group, image: cached.image.transferToImageBitmap() };
    });
    self.postMessage({ index, field, mesh, stamps, buildMs: performance.now() - started }, [field.buffer, ...stamps.map(cached => cached.image)]);
  } catch (error) { self.postMessage({ index, error: error.message }); }
};
