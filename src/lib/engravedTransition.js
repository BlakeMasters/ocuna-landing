const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
export const morphProgress = (progress, seed) => ease(clamp((progress - seed * .14) / (1 - seed * .14)));

export function blendMark(a, b, progress, seed, out) {
  const t = morphProgress(progress, seed);
  const swell = Math.sin(Math.PI * t);
  const x = mix(a[0], b[0], t) - 700, y = mix(a[1], b[1], t) - 400;
  const twist = swell * .48, c = Math.cos(twist), s = Math.sin(twist);
  out[0] = 700 + x * c - y * s + Math.sin(seed * 31 + t * 5) * swell * 36;
  out[1] = 400 + x * s + y * c + Math.cos(seed * 23 + t * 4) * swell * 29;
  // Stretch the burin cuts into streamlines while the plate changes form.
  out[2] = mix(a[2], b[2], t) + (b[0] - a[0]) * swell * .010;
  out[3] = mix(a[3], b[3], t) + (b[1] - a[1]) * swell * .010;
  out[4] = mix(a[4], b[4], t) * (1 - swell * .12);
  out[5] = mix(a[5], b[5], t);
  return out;
}
