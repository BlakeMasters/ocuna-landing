// An image-space approximation of diagonal hatching and colored ASCII.
// The caller owns sampling, canvas scaling, source/background drawing and motion policy.
const ASCII_RAMP = ".,:;+=xX08#@";
const TAU = Math.PI * 2;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function spatialHash(column, row) {
  let value = Math.imul(column + 1, 374761393) ^ Math.imul(row + 1, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/**
 * Build marks from an already downsampled ImageData-like value, without a DOM.
 * Sample dimensions are authoritative; cellSize is a fallback for plain RGBA data.
 * Coordinates and lengths are in the caller's logical CSS pixel dimensions.
 */
export function buildMarkField(imageData, {
  width,
  height,
  cellSize = 8,
  mode = "hatch",
  tone = "dark",
} = {}) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError("Mark field width and height must be positive finite numbers.");
  }
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new RangeError("Mark field cellSize must be a positive finite number.");
  }
  if (mode !== "hatch" && mode !== "ascii") throw new RangeError("Unknown mark mode.");
  if (tone !== "dark" && tone !== "paper") throw new RangeError("Unknown mark tone.");

  const columns = imageData?.width ?? Math.ceil(width / cellSize);
  const rows = imageData?.height ?? Math.ceil(height / (cellSize * (mode === "ascii" ? 1.65 : 1.4)));
  if (!Number.isInteger(columns) || columns <= 0 || !Number.isInteger(rows) || rows <= 0
    || !imageData?.data || imageData.data.length < columns * rows * 4) {
    throw new RangeError("Mark field requires complete RGBA samples and positive integer sample dimensions.");
  }

  const data = imageData.data;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const luminances = new Float32Array(columns * rows);
  for (let index = 0; index < luminances.length; index += 1) {
    const offset = index * 4;
    luminances[index] = (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255;
  }

  const cells = [];
  const diagonal = Math.hypot(cellWidth, cellHeight);
  const tileAngle = Math.atan2(cellHeight, cellWidth);
  const threshold = tone === "paper" ? 0.075 : 0.055;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const offset = index * 4;
      const alpha = data[offset + 3] / 255;
      if (alpha <= 0) continue;

      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      const luminance = luminances[index];
      // A saturated source can still carry visible structure at low luminance.
      // This affects density only; the source's RGB hue remains unchanged.
      const signal = tone === "paper"
        ? 1 - luminance
        : Math.max(luminance, Math.max(r, g, b) / 255 * 0.45);
      if (signal <= threshold) continue;
      const intensity = Math.pow(clamp((signal - threshold) / (1 - threshold), 0, 1), 0.85);

      const sample = (sampleColumn, sampleRow) => {
        const neighbour = clamp(sampleRow, 0, rows - 1) * columns + clamp(sampleColumn, 0, columns - 1);
        // Transparent pixels have no meaningful RGB direction at the silhouette edge.
        return data[neighbour * 4 + 3] > 0 ? luminances[neighbour] : luminance;
      };
      const gradientX = (sample(column + 1, row) - sample(column - 1, row)) * 0.5;
      const gradientY = (sample(column, row + 1) - sample(column, row - 1)) * 0.5;
      const gradient = Math.hypot(gradientX, gradientY);
      const seed = spatialHash(column, row);
      // Quantize the image tangent to the two tile diagonals. Smooth regions use
      // a coherent field, making neighboring bright strokes join into chevrons.
      const direction = gradient > 0.025 && Math.abs(gradientX * gradientY) > 0.00008
        ? (gradientX * gradientY < 0 ? 1 : -1)
        : (Math.sin(column * 0.43 + row * 0.67) + Math.sin(column * 0.16 - row * 0.31) * 0.6 >= 0 ? 1 : -1);
      const glyphIndex = Math.round(intensity * (ASCII_RAMP.length - 1));
      cells.push({
        column, row,
        x: (column + 0.5) * cellWidth,
        y: (row + 0.5) * cellHeight,
        r, g, b, alpha, luminance, intensity, gradient,
        color: `rgb(${r}, ${g}, ${b})`,
        opacity: alpha * (0.16 + intensity * 0.84),
        angle: direction * tileAngle,
        length: diagonal * (0.16 + intensity * 0.84),
        glyphIndex,
        glyph: ASCII_RAMP[glyphIndex],
        phase: seed * TAU,
        wavePhase: column * 0.075 + row * 0.11,
      });
    }
  }

  return { width, height, columns, rows, cellWidth, cellHeight, mode, tone, cells };
}

/** Draw marks only. `time` is in seconds; drawing never mutates the field. */
export function drawMarkField(context, field, { time = 0, animate = false, strength = 1 } = {}) {
  const amount = Number.isFinite(strength) ? clamp(strength, 0, 1) : 1;
  if (!field.cells.length || amount === 0) return;
  const seconds = Number.isFinite(time) ? time : 0;
  context.save();
  try {
    if (field.mode === "ascii") {
      const fontSize = Math.min(field.cellHeight * 0.88, field.cellWidth / 0.61);
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const cell of field.cells) {
        const cycle = animate ? Math.sin(seconds * 0.65 + cell.phase) : 0;
        const shift = cycle > 0.58 ? 1 : cycle < -0.58 ? -1 : 0;
        const glyph = ASCII_RAMP[clamp(cell.glyphIndex + shift, 0, ASCII_RAMP.length - 1)];
        context.fillStyle = cell.color;
        context.globalAlpha = cell.opacity * amount;
        context.fillText(glyph, cell.x, cell.y);
      }
    } else {
      context.lineCap = "round";
      context.lineWidth = clamp(field.cellWidth * 0.095, 0.55, 1.35);
      for (const cell of field.cells) {
        // The wave changes length and opacity gently, preserving tile orientation.
        const wave = animate ? Math.sin(seconds * 0.7 + cell.wavePhase) : 0;
        const halfLength = cell.length * (1 - (wave + 1) * (animate ? 0.018 : 0)) * 0.5;
        const dx = Math.cos(cell.angle) * halfLength;
        const dy = Math.sin(cell.angle) * halfLength;
        context.strokeStyle = cell.color;
        context.globalAlpha = cell.opacity * amount * (animate ? 0.94 + wave * 0.06 : 1);
        context.beginPath();
        context.moveTo(cell.x - dx, cell.y - dy);
        context.lineTo(cell.x + dx, cell.y + dy);
        context.stroke();
      }
    }
  } finally {
    context.restore();
  }
}
