import { sceneStart } from "./engravedTimeline.js";

// Distinct workcells share one workshop and stagger their pickup/inspection.
export function panoramaActors(scene, seconds, camera) {
  if (scene !== 6) return [];
  const span = camera.right - camera.left, mobile = span < 2200;
  const distance = Math.min(1320, span * .30);
  const local = seconds - sceneStart(scene);
  return [-1, 1].map(side => ({
    scene, x: 700 + side * distance, y: 412,
    scale: mobile ? .62 : .92,
    seconds: sceneStart(scene) + Math.max(0, local * .68 + (side < 0 ? -3.2 : 2.1)),
    robotVariant: side < 0 ? "survey" : "precision",
    opacity: 1, step: 1, annotations: false,
  }));
}
