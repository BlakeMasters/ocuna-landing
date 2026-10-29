export const CHAPTERS = Object.freeze([
  { name: "Moon", description: "A gently rotating engraved moon forming above distant shores, drifting clouds and moving reflected light on the water." },
  { name: "Tide", description: "A continuous moving ocean with three breaking crests, travelling swells and foam across the full view." },
  { name: "Bonsai", description: "A pine bonsai growing in a wind-swept stone garden, with moving foliage, distant groves, reeds and three simple birds." },
  { name: "Mechanism", description: "An armillary sphere connected to moving drive wheels, crossed belts, telescopes and an escapement across an observatory deck." },
  { name: "Wormhole", description: "A twisting engraved passage with inward-moving rings, a breathing throat, lensed starlight and nearby planets." },
  { name: "Compute", description: "A rotating processor cutaway connected to asymmetric storage and cooling bays by moving work packets and cable routes." },
  { name: "Robotics", duration: 16, description: "Three distinct humanoid robots pick up, inspect and replace cartridges along a shared transfer line, with joint guides on the central robot." },
  { name: "Protein", duration: 16, description: "A complex greyscale core with a ribbon folding around its binding pocket, above a moving membrane and flexible molecular loops." },
]);
export const TRANSITION_SECONDS = 3;
export const CHAPTER_SECONDS = 13;
export const SCENE_STARTS = CHAPTERS.map((_, index) => CHAPTERS.slice(0, index).reduce((sum, chapter) => sum + (chapter.duration ?? CHAPTER_SECONDS), 0));
export const sceneStart = index => SCENE_STARTS[index];
export const sceneDuration = index => CHAPTERS[index].duration ?? CHAPTER_SECONDS;
export const DURATION = CHAPTERS.reduce((sum, chapter) => sum + (chapter.duration ?? CHAPTER_SECONDS), 0);
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));

export function filmFrame(seconds) {
  const time = Number.isFinite(seconds) ? ((seconds % DURATION) + DURATION) % DURATION : 0;
  const scene = CHAPTERS.findIndex((_, index) => time < sceneStart(index) + sceneDuration(index));
  const progress = clamp((time - sceneStart(scene) - sceneDuration(scene) + TRANSITION_SECONDS) / TRANSITION_SECONDS);
  return { time, scene, next: (scene + 1) % CHAPTERS.length, progress };
}
