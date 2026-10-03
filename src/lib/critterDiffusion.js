// Source-guided brushwork: wet washes, broken bristle marks, then fine pigment.
// The supplied engraving stays intact; this is a canvas effect, not inference.
export const DIFFUSION_DURATION = 8200;

const WASHES = [
  [[205,137,281,113,354,86,428,58,493,38,557,46,601,82], 78],
  [[575,128,552,161,553,202,573,250,549,284,509,314], 65],
  [[557,109,489,121,425,149,364,169,304,190,253,206], 76],
  [[151,133,144,161,125,191,104,218], 39],
  [[185,160,207,190,239,221,290,244,349,261,416,242,474,218], 63],
  [[160,112,145,102,133,126,122,157], 28],
  [[664,156,700,181,734,208,773,239,797,272], 56],
  [[279,226,270,261,259,294,276,319,304,321], 42],
  [[243,240,225,263,221,289,227,310], 30],
  [[675,258,689,284,696,307,685,322], 32],
  [[748,367,663,350,566,338,461,331,365,329,264,338,166,343,86,326,39,301], 38],
  [[112,368,183,382,263,397,353,410,459,404,562,405,673,409,739,409], 46],
];

function canvas(width, height, read = false) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const context = layer.getContext("2d", { willReadFrequently: read });
  if (!context) throw new Error("Canvas unavailable");
  return { layer, context };
}

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function curve(points) {
  const result = [];
  const count = points.length / 2;
  const point = (index, axis) => points[Math.max(0, Math.min(count - 1, index)) * 2 + axis];
  for (let i = 0; i < count - 1; i++) {
    for (let step = 0; step < 8; step++) {
      const t = step / 8;
      for (let axis = 0; axis < 2; axis++) {
        const a = point(i - 1, axis), b = point(i, axis);
        const c = point(i + 1, axis), d = point(i + 2, axis);
        result.push(0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t));
      }
    }
  }
  return result.concat(points.slice(-2));
}

function path(points, width) {
  const lengths = [0];
  for (let i = 2; i < points.length; i += 2) {
    lengths.push(lengths.at(-1) + Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]));
  }
  return { points, lengths, length: lengths.at(-1), width };
}

function stamps(paths, start, duration, opacity) {
  const total = paths.reduce((sum, item) => sum + item.length, 0);
  const result = [];
  let cursor = start;
  for (const item of paths) {
    const span = duration * item.length / total;
    const count = Math.ceil(item.length / (item.width * 0.085));
    let segment = 1;
    for (let mark = 0; mark <= count; mark++) {
      const fraction = mark / count, distance = fraction * item.length;
      while (segment < item.lengths.length - 1 && item.lengths[segment] < distance) segment++;
      const offset = segment * 2;
      const x = item.points[offset - 2], y = item.points[offset - 1];
      const dx = item.points[offset] - x, dy = item.points[offset + 1] - y;
      const length = item.lengths[segment] - item.lengths[segment - 1];
      const part = length ? (distance - item.lengths[segment - 1]) / length : 0;
      const pressure = 0.58 + Math.sin(Math.PI * fraction) * 0.42;
      result.push({ x: x + dx * part, y: y + dy * part,
        angle: Math.atan2(dy, dx), width: item.width * pressure,
        opacity: opacity * (0.75 + pressure * 0.25), time: cursor + span * fraction });
    }
    cursor += span;
  }
  return result;
}

function brush(dry, seed) {
  const { layer, context } = canvas(128, 128);
  const random = randomFrom(seed);
  // Individual long fibers leave directional gaps instead of circular dabs.
  context.lineCap = "round";
  for (let bristle = 0; bristle < 112; bristle++) {
    const y = 10 + bristle * 0.97;
    const profile = Math.sqrt(Math.max(0, 1 - ((y - 64) / 55) ** 2));
    const left = 64 - profile * (33 + random() * 20);
    const right = 64 + profile * (29 + random() * 24);
    context.strokeStyle = `rgba(0,0,0,${(dry ? 0.6 : 0.75) + random() * 0.25})`;
    context.lineWidth = dry ? 0.65 + random() * 0.85 : 1 + random() * 1.2;
    context.beginPath();
    context.moveTo(left, y);
    context.bezierCurveTo(45, y - random() * 1.8, 87, y + random() * 1.8, right, y);
    context.stroke();
  }
  // Small paper breaks remain visible within a freshly laid stroke.
  context.globalCompositeOperation = "destination-out";
  for (let fleck = 0; fleck < (dry ? 350 : 180); fleck++) {
    context.fillStyle = `rgba(0,0,0,${0.15 + random() * 0.35})`;
    context.beginPath();
    context.ellipse(random() * 128, random() * 128, 0.25 + random() * 0.5,
      0.3 + random() * 1.2, 0, 0, Math.PI * 2);
    context.fill();
  }
  return layer;
}

function pigment(ink, blur, color, opacity) {
  const { layer, context } = canvas(ink.width, ink.height);
  context.filter = `blur(${blur}px)`;
  context.drawImage(ink, 0, 0);
  context.filter = "none";
  context.globalCompositeOperation = "source-in";
  context.fillStyle = `rgba(${color.join(",")},${opacity})`;
  context.fillRect(0, 0, ink.width, ink.height);
  return layer;
}

function detailPaths(ink, size, widthFactor, seed) {
  const { width, height } = ink;
  const pixels = ink.getContext("2d").getImageData(0, 0, width, height).data;
  const random = randomFrom(seed);
  const tiles = [];
  for (let top = 0; top < height; top += size) {
    for (let left = 0; left < width; left += size) {
      let darkest = 0;
      for (let y = top; y < Math.min(height, top + size); y++) {
        for (let x = left; x < Math.min(width, left + size); x++) {
          darkest = Math.max(darkest, pixels[(y * width + x) * 4 + 3]);
        }
      }
      if (darkest < 3) continue;
      const x = Math.min(width - 1, left + size / 2);
      const y = Math.min(height - 1, top + size / 2);
      const branch = y > 347;
      const angle = (branch ? -0.1 : x > 625 ? 0.72 : x < 218 ? -0.83 : 1.05) + (random() - 0.5) * 0.25;
      const dx = Math.cos(angle) * size * 0.7, dy = Math.sin(angle) * size * 0.7;
      const bend = (random() - 0.5) * size * 0.22;
      const points = curve([x - dx, y - dy, x + bend, y - bend, x + dx, y + dy]);
      // Interleave neighboring regions so detail develops in separate strokes.
      const region = branch ? 4 : x < 218 ? 1 : x > 625 ? 3 : y > 247 ? 2 : 0;
      tiles.push({ path: path(points, size * widthFactor), order: random() + region * 0.16 });
    }
  }
  return tiles.sort((a, b) => a.order - b.order).map(({ path: stroke }) => stroke);
}

export function engravingInk(image, width, height) {
  const { layer, context } = canvas(width, height, true);
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const gray = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 0;
    pixels.data[i + 3] = 255 - gray;
  }
  context.putImageData(pixels, 0, 0);
  return layer;
}

export function brushDiffusion(ink) {
  const { width, height } = ink;
  const wet = brush(false, 213), dry = brush(true, 1902);
  const passes = [
    { image: pigment(ink, 1.6, [82, 91, 69], 0.82), brush: wet, bleed: 1.2,
      stamps: stamps(WASHES.map(([points, width]) => path(curve(points), width)), 100, 3500, 0.48) },
    { image: pigment(ink, 0.45, [29, 37, 29], 0.96), brush: dry, bleed: 0.3,
      stamps: stamps(detailPaths(ink, 48, 1.75, 443), 2600, 2900, 0.78) },
    { image: ink, brush: wet, bleed: 0,
      stamps: stamps(detailPaths(ink, 25, 3.1, 837), 4900, 3100, 1) },
  ];
  for (const pass of passes) {
    pass.mask = canvas(width, height);
    pass.next = 0;
  }
  return { passes, texture: canvas(width, height) };
}

function paintStamp(context, brush, stamp) {
  context.save();
  context.translate(stamp.x, stamp.y);
  context.rotate(stamp.angle);
  context.globalAlpha = stamp.opacity;
  context.drawImage(brush, -stamp.width * 0.36, -stamp.width / 2, stamp.width * 0.72, stamp.width);
  context.restore();
}

export function drawBrushDiffusion(context, painting, elapsed, width, height) {
  context.clearRect(0, 0, width, height);
  const { texture } = painting;
  for (const pass of painting.passes) {
    while (pass.next < pass.stamps.length && pass.stamps[pass.next].time <= elapsed) {
      paintStamp(pass.mask.context, pass.brush, pass.stamps[pass.next++]);
    }
    if (!pass.next) continue;
    // A little water spreads beyond the bristle edge, while the stroke itself
    // stays distinct. Later passes replace pigment locally, never across a wipe.
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.drawImage(pass.mask.layer, 0, 0, width, height);
    context.restore();
    texture.context.clearRect(0, 0, width, height);
    texture.context.save();
    texture.context.drawImage(pass.image, 0, 0);
    texture.context.globalCompositeOperation = "destination-in";
    texture.context.filter = pass.bleed ? `blur(${pass.bleed}px)` : "none";
    texture.context.drawImage(pass.mask.layer, 0, 0);
    texture.context.restore();
    context.drawImage(texture.layer, 0, 0, width, height);
  }
  return Math.min(11, Math.floor(elapsed / DIFFUSION_DURATION * 11));
}
