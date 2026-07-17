import {
  SHIP_DENSITY_MAP_BASE64,
  SHIP_DENSITY_MAP_META,
} from "./ship-density-map.generated.js";
import {
  SHIP_DENSITY_FIT_BASE64,
  SHIP_DENSITY_FIT_META,
} from "./ship-density-fit.generated.js";

export const SHIP_TEMPLATE_ROLES = Object.freeze({
  shade: 1,
  secondary: 2,
  outline: 3,
});

const ROLE_QUOTAS = Object.freeze([0, 0.46, 0.3, 0.24]);
const ROLE_WEIGHT_EXPONENTS = Object.freeze([0, 0.72, 0.92, 1.1]);
const ROLE_ALPHA_FLOORS = Object.freeze([0, 0.045, 0.23, 0.48]);
const ROLE_SIZE_BASES = Object.freeze([0, 0.5, 0.7, 0.91]);
const ROLE_TONE_FLOORS = Object.freeze([0, 0.34, 0.52, 0.72]);
const MASTER_SEED = 0x5a17;

let decodedMap;
let decodedFitResiduals;
let masterTemplate;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function decodeDensityMap() {
  if (decodedMap) return decodedMap;
  const binary = globalThis.atob(SHIP_DENSITY_MAP_BASE64);
  const expectedLength = SHIP_DENSITY_MAP_META.width * SHIP_DENSITY_MAP_META.height;
  if (binary.length !== expectedLength) {
    throw new Error(
      `Particle ship density map has ${binary.length} bytes; expected ${expectedLength}`
    );
  }
  decodedMap = new Uint8Array(expectedLength);
  for (let index = 0; index < expectedLength; index++) {
    decodedMap[index] = binary.charCodeAt(index);
  }
  return decodedMap;
}

function decodeFitResiduals() {
  if (decodedFitResiduals) return decodedFitResiduals;
  if (
    SHIP_DENSITY_FIT_META.capacity !== SHIP_DENSITY_MAP_META.capacity ||
    SHIP_DENSITY_FIT_META.sourceDensity.sha256 !== SHIP_DENSITY_MAP_META.sha256 ||
    SHIP_DENSITY_FIT_META.sourceDensity.width !== SHIP_DENSITY_MAP_META.width ||
    SHIP_DENSITY_FIT_META.sourceDensity.height !== SHIP_DENSITY_MAP_META.height ||
    SHIP_DENSITY_FIT_META.sourceDensity.masterSeed !== MASTER_SEED ||
    SHIP_DENSITY_FIT_META.sourceDensity.localBounds.xMin !==
      SHIP_DENSITY_MAP_META.localBounds.xMin ||
    SHIP_DENSITY_FIT_META.sourceDensity.localBounds.xMax !==
      SHIP_DENSITY_MAP_META.localBounds.xMax ||
    SHIP_DENSITY_FIT_META.sourceDensity.localBounds.yMin !==
      SHIP_DENSITY_MAP_META.localBounds.yMin ||
    SHIP_DENSITY_FIT_META.sourceDensity.localBounds.yMax !==
      SHIP_DENSITY_MAP_META.localBounds.yMax
  ) {
    throw new Error(
      "Particle ship fit source contract does not match the density template"
    );
  }
  const binary = globalThis.atob(SHIP_DENSITY_FIT_BASE64);
  const expectedLength =
    SHIP_DENSITY_FIT_META.capacity * SHIP_DENSITY_FIT_META.bytesPerParticle;
  if (
    expectedLength !== SHIP_DENSITY_FIT_META.byteLength ||
    binary.length !== expectedLength
  ) {
    throw new Error(
      `Particle ship fit has ${binary.length} bytes; expected ${expectedLength}`
    );
  }
  decodedFitResiduals = new Uint8Array(expectedLength);
  for (let index = 0; index < expectedLength; index++) {
    decodedFitResiduals[index] = binary.charCodeAt(index);
  }
  return decodedFitResiduals;
}

function decodeSignedNibble(nibble) {
  return nibble < 8 ? nibble : nibble - 16;
}

function buildLookupTables() {
  const weight = Array.from({ length: 4 }, () => new Float64Array(64));
  const alpha = Array.from({ length: 4 }, () => new Float64Array(64));
  const size = Array.from({ length: 4 }, () => new Float64Array(64));
  const tone = Array.from({ length: 4 }, () => new Float64Array(64));
  for (let role = SHIP_TEMPLATE_ROLES.shade; role <= SHIP_TEMPLATE_ROLES.outline; role++) {
    for (let level = 1; level < 64; level++) {
      const density = level / 63;
      weight[role][level] = density ** ROLE_WEIGHT_EXPONENTS[role];
      alpha[role][level] =
        ROLE_ALPHA_FLOORS[role] +
        (1 - ROLE_ALPHA_FLOORS[role]) * density ** 0.76;
      size[role][level] = ROLE_SIZE_BASES[role] + 0.25 * density ** 0.65;
      tone[role][level] =
        ROLE_TONE_FLOORS[role] +
        (1 - ROLE_TONE_FLOORS[role]) * density ** 0.5;
    }
  }
  return { weight, alpha, size, tone };
}

function buildRoleRankings(map, random, lookup) {
  const rankings = [null, [], [], []];
  const raceByCell = new Float64Array(map.length);
  for (let cell = 0; cell < map.length; cell++) {
    const packed = map[cell];
    const level = packed >>> 2;
    const role = packed & 3;
    if (level === 0 || role === 0) continue;
    raceByCell[cell] =
      -Math.log(Math.max(random(), 1e-12)) / lookup.weight[role][level];
    rankings[role].push(cell);
  }
  for (let role = SHIP_TEMPLATE_ROLES.shade; role <= SHIP_TEMPLATE_ROLES.outline; role++) {
    rankings[role].sort(
      (a, b) => raceByCell[a] - raceByCell[b] || a - b
    );
  }
  return rankings;
}

function chooseRole(index, used) {
  let selected = SHIP_TEMPLATE_ROLES.shade;
  let greatestDeficit = -Infinity;
  for (let candidate = SHIP_TEMPLATE_ROLES.shade; candidate <= SHIP_TEMPLATE_ROLES.outline; candidate++) {
    const deficit = (index + 1) * ROLE_QUOTAS[candidate] - used[candidate];
    if (deficit > greatestDeficit) {
      greatestDeficit = deficit;
      selected = candidate;
    }
  }
  return selected;
}

function buildMasterTemplate() {
  const map = decodeDensityMap();
  const fitResiduals = decodeFitResiduals();
  const random = createRandom(MASTER_SEED);
  const lookup = buildLookupTables();
  const rankings = buildRoleRankings(map, random, lookup);
  const { capacity, height, localBounds, width } = SHIP_DENSITY_MAP_META;
  const target = new Float32Array(capacity * 3);
  const formedAlpha = new Float32Array(capacity);
  const formedSize = new Float32Array(capacity);
  const formedTone = new Float32Array(capacity);
  const role = new Uint8Array(capacity);
  const used = [0, 0, 0, 0];
  const inverseFitQuantizationMaximum =
    1 / SHIP_DENSITY_FIT_META.signedQuantizationMaximum;

  for (let index = 0; index < capacity; index++) {
    const selectedRole = chooseRole(index, used);
    const cell = rankings[selectedRole][used[selectedRole]++];
    if (cell === undefined) {
      throw new Error(`Particle ship density role ${selectedRole} exhausted at ${index}`);
    }

    const level = map[cell] >>> 2;
    const px = cell % width;
    const py = Math.floor(cell / width);
    const xNormalized = (px + random()) / width;
    const yNormalized = (py + random()) / height;
    const i3 = index * 3;
    target[i3] = localBounds.xMin + xNormalized * (localBounds.xMax - localBounds.xMin);
    target[i3 + 1] = localBounds.yMax - yNormalized * (localBounds.yMax - localBounds.yMin);
    target[i3 + 2] = -0.075 + random() * 0.15;

    formedAlpha[index] = lookup.alpha[selectedRole][level];
    const sizeNoise = (random() + random() - 1) * 0.035;
    formedSize[index] = clamp(
      lookup.size[selectedRole][level] + sizeNoise,
      0.42,
      1.22
    );
    formedTone[index] = lookup.tone[selectedRole][level];
    role[index] = selectedRole;

    const residualIndex = index * SHIP_DENSITY_FIT_META.bytesPerParticle;
    const positionResiduals = fitResiduals[residualIndex];
    const appearanceResiduals = fitResiduals[residualIndex + 1];
    const xResidualMapPx =
      decodeSignedNibble(positionResiduals & 0x0f) *
      inverseFitQuantizationMaximum *
      SHIP_DENSITY_FIT_META.scales.positionMapPx;
    const yResidualMapPx =
      decodeSignedNibble(positionResiduals >>> 4) *
      inverseFitQuantizationMaximum *
      SHIP_DENSITY_FIT_META.scales.positionMapPx;
    target[i3] = clamp(
      target[i3] +
        (xResidualMapPx / width) * (localBounds.xMax - localBounds.xMin),
      localBounds.xMin,
      localBounds.xMax
    );
    target[i3 + 1] = clamp(
      target[i3 + 1] -
        (yResidualMapPx / height) * (localBounds.yMax - localBounds.yMin),
      localBounds.yMin,
      localBounds.yMax
    );
    formedAlpha[index] = clamp(
      formedAlpha[index] +
        decodeSignedNibble(appearanceResiduals & 0x0f) *
          inverseFitQuantizationMaximum *
          SHIP_DENSITY_FIT_META.scales.formedAlpha,
      0.02,
      0.98
    );
    formedSize[index] = clamp(
      formedSize[index] +
        decodeSignedNibble(appearanceResiduals >>> 4) *
          inverseFitQuantizationMaximum *
          SHIP_DENSITY_FIT_META.scales.formedSize,
      0.42,
      1.22
    );
  }

  return Object.freeze({
    capacity,
    target,
    formedAlpha,
    formedSize,
    formedTone,
    role,
  });
}

function getMasterTemplate() {
  if (!masterTemplate) masterTemplate = buildMasterTemplate();
  return masterTemplate;
}

/**
 * Returns read-only typed-array views into one cached 23k master sequence.
 * Any smaller count is an exact prefix, so density-tier changes preserve every
 * already-present target. Callers should copy with TypedArray#set if mutation is
 * required; mutating these views would corrupt every later caller.
 */
export function getShipDensityTemplate(count) {
  if (!Number.isInteger(count) || count < 1 || count > SHIP_DENSITY_MAP_META.capacity) {
    throw new RangeError(
      `Particle ship template count must be an integer from 1 to ${SHIP_DENSITY_MAP_META.capacity}`
    );
  }
  const master = getMasterTemplate();
  return Object.freeze({
    count,
    target: master.target.subarray(0, count * 3),
    formedAlpha: master.formedAlpha.subarray(0, count),
    formedSize: master.formedSize.subarray(0, count),
    formedTone: master.formedTone.subarray(0, count),
    role: master.role.subarray(0, count),
  });
}

export { SHIP_DENSITY_MAP_META };
