import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import GpuParticleLayer from "./GpuParticleLayer.jsx";
import PortCrane, {
  CRANE_HOME_SPREADER_Y,
  CRANE_LIFT_CARGO_Y,
  CRANE_SPREADER_BOTTOM_OFFSET,
  STORAGE_POSITION,
} from "./PortCrane.jsx";
import {
  getShipDensityTemplate,
  SHIP_TEMPLATE_ROLES,
} from "./shipDensityTemplate.js";

const SERVICE_START = 29;
const CRANE_TIMING = Object.freeze({
  engage: 1,
  lift: 2.4,
  traverse: 4.4,
  cargoReleased: 5.7,
  spreaderClear: 7,
  home: 9.2,
});
// The cargo is settled at t=34.7 and the spreader is clear at t=36. The ship
// begins its zero-velocity departure at t=37 while the trolley/spreader is
// visibly completing its return home (t=36..38.2).
const DEPARTURE_START = SERVICE_START + 8;
const DEPARTURE_DURATION = 16;
const DEPARTURE_END = DEPARTURE_START + DEPARTURE_DURATION;
const RELEASE_TAIL_END = DEPARTURE_END + 4;
// Ships alternate as soon as the outgoing stern begins its progressive release.
// The incoming bow becomes visible during the same opening moments, keeping the
// scene continuously occupied without waiting for the first ship to move away.
const BOAT_INTERVAL = DEPARTURE_START;
const BOAT_PERIOD = BOAT_INTERVAL * 2;
const POOL_HANDOFF_DURATION = 4;
const BOAT_SLOTS = [
  { id: "alpha", startDelay: 0, seed: 0 },
  { id: "bravo", startDelay: BOAT_INTERVAL, seed: 7919 },
];
const SHIP_Y = -0.64;
const SHIP_X_SCALE = 1.85;
const SHIP_Y_SCALE = 0.68;
// This is one complete, isolated top container in the fitted density source.
// The former X range crossed a stack edge, the inter-stack gap, and part of
// the next stack, so its detached points could never align with the trolley.
const SHIP_CARGO_TEMPLATE_BOUNDS = Object.freeze({
  xMin: 1.126,
  xMax: 1.388,
  yMin: 0.02,
  yMax: 0.34,
});
const SHIP_CARGO_OFFSET = [
  ((SHIP_CARGO_TEMPLATE_BOUNDS.xMin + SHIP_CARGO_TEMPLATE_BOUNDS.xMax) / 2) *
    SHIP_X_SCALE,
  ((SHIP_CARGO_TEMPLATE_BOUNDS.yMin + SHIP_CARGO_TEMPLATE_BOUNDS.yMax) / 2) *
    SHIP_Y_SCALE,
];
const SHIP_CARGO_HALF_HEIGHT =
  ((SHIP_CARGO_TEMPLATE_BOUNDS.yMax - SHIP_CARGO_TEMPLATE_BOUNDS.yMin) / 2) *
  SHIP_Y_SCALE;
const SHIP_CARGO_SPREADER_OFFSET_Y =
  SHIP_CARGO_HALF_HEIGHT + CRANE_SPREADER_BOTTOM_OFFSET;
const SHIP_BOW_OFFSET_X = 4.63;
const SHIP_STERN_OFFSET_X = -4.77;
const BERTH_X = -2.2;
const PICKUP_X = BERTH_X + SHIP_CARGO_OFFSET[0];
const FORMATION_PLANE_X = -16.9;
const FORM_ENTRY_X = -22.18;
const APPROACH_START_X = -12.65;
const DEPARTURE_X = 6.2;
const TRAIL_DRAW_END = 18.5;
// The final structural particle can release at t=51.4 and live for 20 seconds.
// Keep a small fade margin, then hide the layer for two seconds before its
// 74-second same-slot reset.
const RELEASE_DRAW_END = 72;

const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float radius = distance(gl_PointCoord, vec2(0.5));
    float particleAlpha = 1.0 - smoothstep(0.22, 0.5, radius);
    if (particleAlpha <= 0.01) discard;
    gl_FragColor = vec4(vColor, particleAlpha * vAlpha);
  }
`;

const AMBIENT_VERTEX_SHADER = `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPointSize;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float phase = aSeed * 6.2831853;
    vec3 transformed = position;
    transformed.x += sin(uTime * 0.1 + phase) * 0.16;
    transformed.y += cos(uTime * 0.13 + phase * 1.7) * 0.1;
    transformed.z += sin(uTime * 0.08 + phase * 0.7) * 0.08;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uPointSize * (0.62 + aSeed * 0.45);
    vColor = aColor;
    vAlpha = 0.2 + aSeed * 0.28;
  }
`;

const DYNAMIC_VERTEX_SHADER = `
  attribute vec3 aTarget;
  attribute vec3 aWakeVector;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aKind;
  attribute float aCapture;
  attribute float aDuration;
  attribute vec3 aReleaseProfile;
  attribute float aEncounter;
  attribute float aEntrain;
  attribute float aBand;
  attribute float aDetail;
  attribute vec2 aTemplateVisual;

  uniform float uTime;
  uniform float uLocalTime;
  uniform float uPointSize;
  uniform float uClaim;
  uniform float uRelease;
  uniform float uCyclePhase;
  uniform float uWakeStrength;
  uniform float uPoolVisibility;
  uniform float uStructureVisibility;
  uniform float uShipSpeed;
  uniform float uShipX;
  uniform float uShipY;
  uniform float uFormationPlaneX;
  uniform vec2 uCargoPosition;
  uniform float uCargoDetached;
  uniform float uTrailPass;
  uniform float uTemplateExposure;
  uniform float uTemplateMinPixels;

  varying vec3 vColor;
  varying float vAlpha;

  float ease(float value) {
    return value * value * (3.0 - 2.0 * value);
  }

  float bell(float value) {
    return exp2(-1.442695 * value * value);
  }

  float hash(float value) {
    return fract(sin(value * 91.3458) * 47453.5453);
  }

  vec3 hermitePath(vec3 p0, vec3 p1, vec3 m0, vec3 m1, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    return
      (2.0 * t3 - 3.0 * t2 + 1.0) * p0 +
      (t3 - 2.0 * t2 + t) * m0 +
      (-2.0 * t3 + 3.0 * t2) * p1 +
      (t3 - t2) * m1;
  }

  float departureShipXAt(float localTime) {
    float t = clamp(
      (localTime - ${DEPARTURE_START.toFixed(1)}) /
        ${DEPARTURE_DURATION.toFixed(1)},
      0.0,
      1.0
    );
    float eased = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    return mix(${BERTH_X.toFixed(2)}, ${DEPARTURE_X.toFixed(2)}, eased);
  }

  float departureSpeedAt(float localTime) {
    float t = clamp(
      (localTime - ${DEPARTURE_START.toFixed(1)}) /
        ${DEPARTURE_DURATION.toFixed(1)},
      0.0,
      1.0
    );
    return
      ((${DEPARTURE_X.toFixed(2)} - ${BERTH_X.toFixed(2)}) /
        ${DEPARTURE_DURATION.toFixed(1)}) *
      30.0 * t * t * (1.0 - t) * (1.0 - t);
  }

  vec3 advectFog(vec3 source, out float wakeDensity, out float bowDensity) {
    float phase = aSeed * 6.2831853;
    vec3 p = source;
    vec3 body = source - vec3(uShipX, uShipY, 0.0);
    const float bowOffset = ${SHIP_BOW_OFFSET_X.toFixed(2)};
    const float sternOffset = ${SHIP_STERN_OFFSET_X.toFixed(2)};
    const float halfHeight = 0.58;

    // The bow is a stagnation region: particles are displaced around it,
    // never pulled into its point.  A seeded sign keeps centreline points
    // from collapsing into a visible seam.
    float bowX = source.x - (uShipX + bowOffset);
    float sideSign = abs(body.y) > 0.025
      ? sign(body.y)
      : (aWakeVector.y < 0.0 ? -1.0 : 1.0);
    bowDensity = bell(bowX / 0.72) * bell(body.y / 0.72) * bell(body.z / 0.7);
    p.y += sideSign * bowDensity * (0.18 + 0.18 * aEntrain) * uWakeStrength;
    p.z += aWakeVector.z * bowDensity * 0.12 * uWakeStrength;
    p.x += bowDensity * 0.035 * uWakeStrength;

    // World-frame Darwin displacement.  Nearby marked air is carried
    // forward, then slowly relaxes while retaining a broad trailing wake.
    float age = max(uLocalTime - aEncounter, 0.0);
    float rise = 1.0 - exp(-age / 1.25);
    float relax = exp(-age / 15.0);
    float nearBody = bell(body.y / 1.0) * bell(body.z / 0.9);
    float darwin = aEntrain * rise * (0.36 + 0.62 * relax);
    p.x += darwin * (0.36 + 0.66 * uShipSpeed) * uWakeStrength;

    // A separated, tapered airwake begins at the stern, widens aft and
    // loses coherence with distance instead of radiating in straight lines.
    float downstream = (uShipX + sternOffset) - source.x;
    float behind = smoothstep(0.02, 0.42, downstream);
    float wakeWidth = 0.2 + 0.21 * sqrt(max(downstream, 0.0));
    float radial = length(vec2((source.y - uShipY) / wakeWidth, source.z / (wakeWidth * 0.82)));
    float core = bell(radial) * behind * exp(-max(downstream, 0.0) / 8.4);
    float ageGate = smoothstep(-0.6, 0.7, uLocalTime - aEncounter);
    wakeDensity = core * ageGate * uWakeStrength;

    float inward = -sign(source.y - uShipY + sideSign * 0.001);
    float eddyA = sin(downstream * 1.55 - uTime * 0.72 + phase * 2.3);
    float eddyB = sin(downstream * 2.8 + uTime * 0.43 + phase * 5.1);
    float mixing = (0.055 + 0.13 * sqrt(max(downstream, 0.0))) * wakeDensity;
    p.y += inward * 0.07 * wakeDensity + (eddyA * 0.58 + eddyB * 0.22 + aWakeVector.y * 0.5) * mixing;
    p.z += (cos(downstream * 1.7 + phase) * 0.48 + aWakeVector.z * 0.55) * mixing;
    p.x += wakeDensity * (0.2 + 0.24 * bell(downstream / 3.2));

    // Fog tracers cannot occupy the solid hull. Deflect them through a
    // seeded bypass shell instead of projecting every point onto one exact
    // clearance contour (which reads as an artificial horizontal line).
    vec3 displacedBody = p - vec3(uShipX, uShipY, 0.0);
    float hullHalfLength = (bowOffset - sternOffset) * 0.5;
    float hullCenterX = (bowOffset + sternOffset) * 0.5;
    float hullX = abs(displacedBody.x - hullCenterX) / hullHalfLength;
    float hullY = abs(displacedBody.y) / halfHeight;
    if (hullX < 0.98 && hullY < 1.0 && abs(displacedBody.z) < 0.34 && uWakeStrength > 0.05) {
      float shellSeed = hash(aSeed * 53.1 + source.x * 7.7 + aBand * 17.3);
      float hullClearance = halfHeight * (0.96 - 0.28 * pow(hullX, 3.0));
      float shellDepth = mix(0.035, 0.24, pow(shellSeed, 1.7));
      float penetration = 1.0 - smoothstep(0.42, 1.0, hullY);
      float bypassY = uShipY + sideSign * (hullClearance + shellDepth);
      p.y = mix(p.y, bypassY, penetration);
      p.x += (hash(aSeed * 81.7 + aBand * 9.1) - 0.5) * 0.13 * penetration;
      p.z += aWakeVector.z * mix(0.05, 0.15, shellSeed) * penetration;
    }

    return p;
  }

  void main() {
    bool outsideReleaseTail =
      uLocalTime < 0.001 || uLocalTime > ${RELEASE_DRAW_END.toFixed(1)};
    if (
      uPoolVisibility < 0.001 &&
      uStructureVisibility < 0.001 &&
      outsideReleaseTail
    ) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      return;
    }

    // The tracer draw reuses the full attribute contract, but cargo and
    // reserve vertices never participate. Cull them before any advection math
    // so the extra pass pays only for the fitted ship points it displays.
    if (uTrailPass > 0.5 && aKind > 0.5) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      return;
    }

    float phase = aSeed * 6.2831853;
    float bandPhase = aBand * 6.2831853;
    vec3 freeField = position;
    if (aKind > 1.5) {
      const float fieldMinX = -21.5;
      const float fieldSpanX = 31.0;
      float ambientAdvance = uTime * (0.025 + 0.018 * aEntrain);
      freeField.x = fieldMinX + mod(position.x - fieldMinX + ambientAdvance, fieldSpanX);
    }
    freeField.x += sin(uTime * 0.11 + phase + position.y * 0.5) * 0.045;
    freeField.y += cos(uTime * 0.09 + phase * 1.37) * 0.04;
    freeField.y += sin(position.x * 0.46 + bandPhase) * 0.035;
    freeField.z += sin(uTime * 0.08 - phase * 0.8) * 0.035;

    float wakeDensity = 0.0;
    float bowDensity = 0.0;
    vec3 advectedField = advectFog(freeField, wakeDensity, bowDensity);
    bool isReserve = aKind > 1.5;
    if (isReserve) {
      vec4 reservePosition = modelViewMatrix * vec4(advectedField, 1.0);
      gl_Position = projectionMatrix * reservePosition;
      gl_PointSize = uPointSize * (0.58 + aSeed * 0.22);
      vColor = aColor * 0.68;
      vAlpha = (
        (0.25 + aSeed * 0.28) +
        wakeDensity * (0.72 + aEntrain * 0.34) +
        bowDensity * 0.16
      ) * uPoolVisibility;
      return;
    }

    vec3 formed;
    if (aKind < 0.5) {
      formed = vec3(
        aTarget.x * ${SHIP_X_SCALE.toFixed(2)},
        aTarget.y * ${SHIP_Y_SCALE.toFixed(2)},
        aTarget.z
      ) + vec3(uShipX, uShipY, 0.0);
    } else {
      vec2 attachedPosition = vec2(
        uShipX + ${SHIP_CARGO_OFFSET[0].toFixed(2)},
        uShipY + ${SHIP_CARGO_OFFSET[1].toFixed(2)}
      );
      vec2 cargoOrigin = mix(attachedPosition, uCargoPosition, uCargoDetached);
      formed = aTarget + vec3(cargoOrigin, 0.08);
    }

    float revealJitter = (aSeed - 0.5) * 0.12 + (aCapture - 0.4) * 0.035;
    float signedReveal = formed.x - (uFormationPlaneX + revealJitter);
    float formationHalfWidth = 0.12 + aDuration * 0.2;
    float capture =
      ease(smoothstep(-formationHalfWidth, formationHalfWidth, signedReveal));
    float feedMask = (1.0 - capture) * bell(signedReveal / 0.84);
    float curve = sin(capture * 3.14159265);
    float sourceLag = max(uFormationPlaneX - position.x, 0.08);
    float strandBand = floor(aBand * 5.0);
    float strandPhase =
      ((strandBand + 0.5) / 5.0) * 6.2831853 + 0.08 * sin(phase);
    float minimumSpan =
      mix(0.08, 0.22, hash(aSeed * 31.7 + aBand * 17.1));
    float forwardSpan = max(formed.x - advectedField.x, minimumSpan);
    vec3 feedSource = advectedField;
    feedSource.x = formed.x - forwardSpan;
    float wispAmplitude =
      (0.1 + 0.22 * sqrt(sourceLag)) *
      (0.65 + 0.35 * aEntrain);
    vec3 sourceTangent = vec3(
      forwardSpan * 0.75,
      wispAmplitude * (
        0.75 * sin(strandPhase + sourceLag * 1.15) +
        0.25 * sin(strandPhase * 2.2)
      ),
      wispAmplitude * 0.52 *
        cos(strandPhase * 0.9 + sourceLag * 1.35)
    );
    vec3 targetTangent = vec3(
      forwardSpan * 0.42,
      wispAmplitude * 0.18 * sin(strandPhase + 1.7),
      wispAmplitude * 0.12 * cos(strandPhase - 0.8)
    );
    vec3 materialized = hermitePath(
      feedSource,
      formed,
      sourceTangent,
      targetTangent,
      capture
    );
    float eddy =
      0.7 * sin(
        strandPhase + sourceLag * 1.25 + capture * 4.6 - uTime * 0.12
      ) +
      0.3 * sin(
        strandPhase * 2.1 - sourceLag * 0.65 - capture * 7.4 + uTime * 0.07
      );
    materialized.y += curve * wispAmplitude * 0.68 * eddy;
    materialized.z +=
      curve * wispAmplitude * 0.22 *
      sin(strandPhase * 1.4 + capture * 5.2 + sourceLag * 0.7);

    // A second draw of the same fitted targets becomes a temporary tracer
    // ribbon. It lets the incoming material remain visible along a long curved
    // path while the primary pass can attach sharply to the reference outline.
    // The window follows the formation plane and is fully gone after capture.
    if (uTrailPass > 0.5) {
      if (aKind > 0.5) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec3(0.0);
        vAlpha = 0.0;
        return;
      }
      float trailProgress = clamp(
        ease(smoothstep(-1.45, 0.22, signedReveal)) +
          (aSeed - 0.5) * 0.16,
        0.0,
        1.0
      );
      float trailWindow =
        smoothstep(-1.75, -1.15, signedReveal) *
        (1.0 - smoothstep(-0.08, 0.52, signedReveal));
      float trailSignal =
        0.5 + 0.5 * sin(strandPhase + sourceLag * 2.1 - uTime * 0.1);
      float trailFilament = 0.01 + 0.99 * pow(trailSignal, 9.0);
      vec3 trailPosition = hermitePath(
        feedSource,
        formed,
        sourceTangent,
        targetTangent,
        trailProgress
      );
      float trailCurve = sin(trailProgress * 3.14159265);
      float filamentCenterY =
        uShipY +
        sin(strandPhase + sourceLag * 0.75 + trailProgress * 1.8) *
          (0.42 + 0.16 * cos(strandPhase * 2.0));
      trailPosition.y = mix(
        trailPosition.y,
        filamentCenterY,
        trailCurve * 0.92
      );
      trailPosition.x +=
        trailCurve * (0.62 + 0.48 * trailFilament);
      trailPosition.y +=
        trailCurve * wispAmplitude * 0.82 *
        sin(strandPhase * 1.13 + trailProgress * 5.6 + sourceLag * 0.7);
      trailPosition.z +=
        trailCurve * wispAmplitude * 0.38 *
        cos(strandPhase * 0.91 - trailProgress * 4.2);
      vec4 trailView = modelViewMatrix * vec4(trailPosition, 1.0);
      gl_Position = projectionMatrix * trailView;
      gl_PointSize = max(
        1.0,
        uPointSize * (0.82 + 0.66 * trailFilament + 0.22 * aDetail)
      );
      vColor = aColor;
      vAlpha =
        trailWindow * uPoolVisibility *
        (0.02 + 0.84 * trailFilament) *
        (0.65 + 0.35 * aDetail);
      return;
    }

    float releaseTime = aReleaseProfile.x;
    float dragTau = aReleaseProfile.y;
    float lifetime = aReleaseProfile.z;
    float releaseAge = max(uLocalTime - releaseTime, 0.0);
    float releaseBlend = ease(smoothstep(0.0, 0.72, releaseAge));
    float releaseShipX = departureShipXAt(releaseTime);
    vec3 releaseOrigin = vec3(
      aTarget.x * ${SHIP_X_SCALE.toFixed(2)},
      aTarget.y * ${SHIP_Y_SCALE.toFixed(2)},
      aTarget.z
    ) + vec3(releaseShipX, uShipY, 0.0);

    float releaseSpeed = max(0.0, departureSpeedAt(releaseTime));
    float effectiveDragTau = dragTau * mix(0.52, 0.9, aEntrain);
    // Preserve the body's exact world-space velocity at detachment, then let
    // drag remove it continuously. Scaling the time constant retains the old
    // total drift without a visible speed kick at the stern release front.
    float forwardDrift =
      releaseSpeed * effectiveDragTau *
      (1.0 - exp(-releaseAge / max(effectiveDragTau, 0.001)));
    float diffusion = (0.035 + mix(0.055, 0.15, aEntrain)) * sqrt(releaseAge);
    float diffusionRamp = 1.0 - exp(-releaseAge / 0.7);
    float trailRadius = sqrt(hash(aSeed * 37.7 + aBand * 19.3));
    float eddyY = (
      sin(phase + 1.7 * releaseAge) +
      0.5 * sin(2.3 * phase - 0.83 * releaseAge)
    ) / 1.5;
    float eddyZ = (
      cos(1.4 * phase + 1.3 * releaseAge) +
      0.5 * cos(0.7 * phase - 1.91 * releaseAge)
    ) / 1.5;
    vec3 wakePosition = releaseOrigin + vec3(
      forwardDrift + aWakeVector.x * diffusion * 0.5 * diffusionRamp,
      (aWakeVector.y * 0.45 + eddyY * 0.55) * diffusion * trailRadius * diffusionRamp,
      (aWakeVector.z * 0.45 + eddyZ * 0.55) * diffusion * trailRadius * diffusionRamp
    );

    if (aKind > 0.5 && aKind < 1.5) {
      releaseOrigin = aTarget + vec3(
        ${STORAGE_POSITION[0].toFixed(3)},
        ${STORAGE_POSITION[1].toFixed(3)},
        0.08
      );
      float localSpread =
        (0.06 + 0.13 * sqrt(releaseAge)) * releaseBlend;
      wakePosition = releaseOrigin + vec3(
        aWakeVector.x * localSpread * 0.24,
        aWakeVector.y * localSpread - 0.018 * releaseAge * releaseBlend,
        aWakeVector.z * localSpread * 0.72
      );
    }

    // Release is position-continuous because releaseOrigin is the ship-space
    // target evaluated at this particle's own release time. Switch ownership
    // immediately so no post-release frame can inherit the live ship position.
    vec3 released = releaseAge > 0.0 ? wakePosition : materialized;

    vec3 transformed = released;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float shadeAlpha = mix(0.018, 0.22, smoothstep(0.0, 0.14, aDetail));
    float secondaryAlpha = mix(0.22, 0.52, smoothstep(0.14, 0.5, aDetail));
    float outlineAlpha = mix(0.62, 0.98, smoothstep(0.55, 1.0, aDetail));
    float proceduralTargetAlpha = aDetail < 0.14
      ? shadeAlpha
      : aDetail < 0.55
        ? secondaryAlpha
        : outlineAlpha;
    float templatePointScale = mix(0.42, 1.22, aTemplateVisual.y);
    float targetAlpha = aKind < 1.5
      ? aTemplateVisual.x
      : proceduralTargetAlpha;
    if (aKind < 1.5) {
      float intendedTemplatePixels = uPointSize * templatePointScale;
      // Keep the fitted point-size variation visible in WebGL. Most fitted
      // points otherwise collapse onto the implementation's one-pixel floor,
      // which turns the shaded hull into a hard band and erases bow curvature.
      float rasterTemplatePixels = max(uTemplateMinPixels, intendedTemplatePixels);
      float coverageCorrection =
        (intendedTemplatePixels * intendedTemplatePixels) /
        (rasterTemplatePixels * rasterTemplatePixels);
      float referenceExposure =
        uTemplateExposure * pow(1.08 / max(uPointSize, 0.4), 2.0);
      targetAlpha = min(
        0.98,
        targetAlpha * coverageCorrection * referenceExposure
      );
    }
    float freeAlpha = 0.07 + aSeed * 0.16;
    float filamentSignal =
      0.5 + 0.5 * sin(strandPhase + sourceLag * 2.1 - uTime * 0.1);
    float filament = 0.05 + 0.95 * pow(filamentSignal, 4.5);
    float feedAlpha =
      freeAlpha * uPoolVisibility * feedMask * filament;
    float formationHighlight =
      curve * (0.045 + 0.11 * aDetail) * filament;
    float claimedAlpha =
      mix(feedAlpha, targetAlpha, capture) + formationHighlight;
    float lifeFade = 1.0 - smoothstep(lifetime - 3.0, lifetime, releaseAge);
    float plumeSeed = hash(aSeed * 43.7 + aBand * 11.9);
    float releasedAlpha =
      (0.2 + 0.3 * plumeSeed) *
      (0.72 + 0.28 * aEntrain) *
      lifeFade;
    float attachedAlpha = claimedAlpha * (1.0 - releaseBlend) * uStructureVisibility;
    float detachedAlpha = releasedAlpha * releaseBlend;
    vAlpha = attachedAlpha + detachedAlpha;
    float formedPointScale = aKind < 1.5
      ? max(templatePointScale, uTemplateMinPixels / max(uPointSize, 0.4))
      : 0.72 + aSeed * 0.3;
    float pointScale = mix(
      0.58 + aSeed * 0.22,
      formedPointScale,
      capture
    );
    pointScale = mix(pointScale, 0.78 + aSeed * 0.32, releaseBlend);
    gl_PointSize = max(1.0, uPointSize * pointScale);
    float formedTone = aKind < 1.5
      ? 1.0
      : mix(0.68, 1.0, capture * aDetail);
    vec3 formedColor = aColor * formedTone;
    vec3 plumeColor = vec3(mix(0.44, 0.7, plumeSeed));
    vColor = (
      formedColor * attachedAlpha + plumeColor * detachedAlpha
    ) / max(vAlpha, 0.00001);
  }
`;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(start, end, value) {
  if (start === end) return value < start ? 0 : 1;
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function smootherstep(start, end, value) {
  if (start === end) return value < start ? 0 : 1;
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t ** 3 * (t * (t * 6 - 15) + 10);
}

function quinticPosition(
  start,
  end,
  startVelocity,
  endVelocity,
  startAcceleration,
  endAcceleration,
  duration,
  elapsed
) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  return (
    (1 - 10 * t3 + 15 * t4 - 6 * t5) * start +
    (t - 6 * t3 + 8 * t4 - 3 * t5) * startVelocity * duration +
    (0.5 * (t2 - 3 * t3 + 3 * t4 - t5)) * startAcceleration * duration ** 2 +
    (10 * t3 - 15 * t4 + 6 * t5) * end +
    (-4 * t3 + 7 * t4 - 3 * t5) * endVelocity * duration +
    (0.5 * (t3 - 2 * t4 + t5)) * endAcceleration * duration ** 2
  );
}

function quinticVelocity(
  start,
  end,
  startVelocity,
  endVelocity,
  startAcceleration,
  endAcceleration,
  duration,
  elapsed
) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  return (
    (-30 * t2 + 60 * t3 - 30 * t4) * start +
    (1 - 18 * t2 + 32 * t3 - 15 * t4) * startVelocity * duration +
    (t - 4.5 * t2 + 6 * t3 - 2.5 * t4) * startAcceleration * duration ** 2 +
    (30 * t2 - 60 * t3 + 30 * t4) * end +
    (-12 * t2 + 28 * t3 - 15 * t4) * endVelocity * duration +
    (1.5 * t2 - 4 * t3 + 2.5 * t4) * endAcceleration * duration ** 2
  ) / duration;
}

function formationShipX(time) {
  return quinticPosition(
    FORM_ENTRY_X,
    APPROACH_START_X,
    0.3,
    1.1,
    0,
    0.1,
    18,
    time
  );
}

function approachShipX(time) {
  return quinticPosition(
    APPROACH_START_X,
    BERTH_X,
    1.1,
    0,
    0.1,
    0,
    11,
    time - 18
  );
}

function departureShipX(time) {
  return mix(
    BERTH_X,
    DEPARTURE_X,
    smootherstep(DEPARTURE_START, DEPARTURE_END, time)
  );
}

function inverseShipPosition(positionAt, targetX, startTime, endTime) {
  let low = startTime;
  let high = endTime;
  for (let step = 0; step < 18; step++) {
    const midpoint = (low + high) / 2;
    if (positionAt(midpoint) < targetX) low = midpoint;
    else high = midpoint;
  }
  return (low + high) / 2;
}

function encounterTimeForSourceX(sourceX) {
  const targetCenterX = sourceX - SHIP_BOW_OFFSET_X;
  if (targetCenterX <= APPROACH_START_X) {
    if (targetCenterX <= FORM_ENTRY_X) return 0;
    return inverseShipPosition(formationShipX, targetCenterX, 0, 18);
  }
  if (targetCenterX <= BERTH_X) {
    return inverseShipPosition(
      approachShipX,
      targetCenterX,
      18,
      SERVICE_START
    );
  }
  if (targetCenterX >= DEPARTURE_X) return DEPARTURE_END;
  return inverseShipPosition(
    departureShipX,
    targetCenterX,
    DEPARTURE_START,
    DEPARTURE_END
  );
}

function samplePaths(paths, count, seed = 1) {
  const segments = [];
  let totalLength = 0;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (length > 0.0001) {
        segments.push({ a, b, length, start: totalLength });
        totalLength += length;
      }
    }
  }
  const random = seededRandom(seed);
  const points = new Float32Array(count * 3);
  let segmentIndex = 0;
  for (let i = 0; i < count; i++) {
    const distance = ((i + random() * 0.85) / count) * totalLength;
    while (segmentIndex < segments.length - 1 && distance > segments[segmentIndex].start + segments[segmentIndex].length) {
      segmentIndex += 1;
    }
    const segment = segments[segmentIndex];
    const t = Math.max(0, Math.min(1, (distance - segment.start) / segment.length));
    const i3 = i * 3;
    points[i3] = mix(segment.a[0], segment.b[0], t);
    points[i3 + 1] = mix(segment.a[1], segment.b[1], t);
    points[i3 + 2] = mix(segment.a[2], segment.b[2], t);
  }
  return points;
}

function rectanglePath(x, y, width, height, z = 0) {
  return [[x, y, z], [x + width, y, z], [x + width, y + height, z], [x, y + height, z], [x, y, z]];
}

function softRectanglePath(x, y, width, height, radius = 0.035, z = 0) {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    [x + r, y, z],
    [x + width - r, y, z],
    [x + width, y + r, z],
    [x + width, y + height - r, z],
    [x + width - r, y + height, z],
    [x + r, y + height, z],
    [x, y + height - r, z],
    [x, y + r, z],
    [x + r, y, z],
  ];
}

function cubicPath(start, controlA, controlB, end, steps = 18) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const inv = 1 - t;
    return [0, 1, 2].map(
      (axis) =>
        inv ** 3 * start[axis] +
        3 * inv ** 2 * t * controlA[axis] +
        3 * inv * t ** 2 * controlB[axis] +
        t ** 3 * end[axis]
    );
  });
}

const CONTAINER_STACKS = [
  { x: -0.72, height: 0.74 },
  { x: -0.37, height: 0.78 },
  { x: -0.02, height: 0.76 },
  { x: 0.33, height: 0.73 },
  { x: 0.68, height: 0.7 },
  { x: 1.03, height: 0.64 },
  { x: 1.38, height: 0.52 },
];

function shipPathRoles() {
  const z = 0;
  const primary = [
    cubicPath([-2.58, -0.03, z], [-1.55, 0.01, z], [1.48, 0.04, z], [1.78, -0.015, z], 30),
    cubicPath([1.78, -0.015, z], [1.94, 0.015, z], [2.05, 0.1, z], [2.18, 0.09, z], 8),
    cubicPath([2.18, 0.09, z], [2.34, 0.08, z], [2.47, -0.01, z], [2.5, -0.12, z], 8),
    cubicPath([2.5, -0.12, z], [2.45, -0.33, z], [2.15, -0.74, z], [1.86, -0.84, z], 12),
    cubicPath([1.86, -0.84, z], [0.55, -0.91, z], [-1.72, -0.92, z], [-2.5, -0.78, z], 28),
    cubicPath([-2.5, -0.78, z], [-2.57, -0.66, z], [-2.59, -0.2, z], [-2.58, -0.03, z], 10),
  ];

  const containers = [];
  const containerDetails = [];
  for (const stack of CONTAINER_STACKS) {
    const width = 0.28;
    const base = 0.03;
    containers.push(softRectanglePath(stack.x, base, width, stack.height, 0.025, z));
    const separatorCount = stack.height < 0.66 ? 2 : 3;
    for (let separator = 1; separator <= separatorCount; separator++) {
      const y = base + (stack.height * separator) / (separatorCount + 1);
      containerDetails.push([[stack.x + 0.018, y, z], [stack.x + width - 0.018, y, z]]);
    }
    containerDetails.push([
      [stack.x + width * 0.5, base + 0.025, z],
      [stack.x + width * 0.5, base + stack.height - 0.025, z],
    ]);
  }

  const bridge = [
    [
      [-1.58, 0.02, z],
      [-1.56, 0.47, z],
      [-1.49, 0.47, z],
      [-1.49, 0.6, z],
      [-1.42, 0.6, z],
      [-1.42, 0.76, z],
      [-1.08, 0.76, z],
      [-0.98, 0.56, z],
      [-1.0, 0.02, z],
    ],
    [[-1.58, 0.2, z], [-1.0, 0.2, z]],
    [[-1.55, 0.4, z], [-0.99, 0.4, z]],
    [[-1.48, 0.59, z], [-1.0, 0.59, z]],
    [[-1.24, 0.76, z], [-1.24, 1.2, z]],
    [[-1.24, 1.18, z], [-1.04, 1.07, z]],
    [[-1.38, 1.04, z], [-1.08, 1.04, z]],
    [[-1.34, 0.94, z], [-1.11, 0.94, z]],
    [[-1.58, 0.02, z], [-1.78, 0.02, z], [-1.72, 0.19, z], [-1.58, 0.19, z]],
  ];
  for (let window = 0; window < 4; window++) {
    const x = -1.39 + window * 0.082;
    bridge.push([[x, 0.68, z], [x + 0.066, 0.68, z]]);
  }

  const secondary = [
    ...containerDetails,
    [[-1.94, -0.73, z], [-1.94, -0.3, z]],
    [[-0.54, -0.84, z], [-0.54, -0.34, z]],
    [[0.86, -0.84, z], [0.86, -0.34, z]],
    cubicPath([-1.92, -0.08, z], [-1.62, -0.06, z], [-1.4, -0.06, z], [-1.18, -0.07, z], 6),
    cubicPath([0.0, -0.08, z], [0.2, -0.06, z], [0.48, -0.06, z], [0.68, -0.08, z], 6),
    [[2.1, 0.08, z], [2.1, 0.35, z]],
    [[2.02, 0.28, z], [2.18, 0.28, z]],
    [[-2.57, 0.0, z], [-2.48, 0.17, z], [-1.78, 0.18, z]],
  ];

  return { primary, containers, bridge, secondary };
}

function createProceduralShipTargets(count) {
  const roles = shipPathRoles();
  const roleCounts = {
    primary: Math.floor(count * 0.24),
    containers: Math.floor(count * 0.24),
    bridge: Math.floor(count * 0.16),
    secondary: Math.floor(count * 0.1),
  };
  const points = new Float32Array(count * 3);
  const detail = new Float32Array(count);
  const random = seededRandom(3921);
  let cursor = 0;

  const writeRole = (role, seed, detailMin, detailMax, jitterX, jitterY) => {
    const roleCount = roleCounts[role];
    const sampled = samplePaths(roles[role], roleCount, seed);
    points.set(sampled, cursor * 3);
    for (let localIndex = 0; localIndex < roleCount; localIndex++) {
      const index = cursor + localIndex;
      const i3 = index * 3;
      points[i3] = Math.max(
        -2.58,
        Math.min(2.5, points[i3] + (random() + random() - 1) * jitterX)
      );
      points[i3 + 1] += (random() + random() - 1) * jitterY;
      points[i3 + 2] = mix(-0.075, 0.075, random());
      detail[index] = mix(detailMin, detailMax, random());
    }
    cursor += roleCount;
  };

  writeRole("primary", 91, 0.72, 1, 0.028, 0.022);
  writeRole("containers", 193, 0.66, 0.96, 0.024, 0.02);
  writeRole("bridge", 277, 0.7, 1, 0.022, 0.018);
  writeRole("secondary", 349, 0.24, 0.5, 0.032, 0.025);

  for (let i = cursor; i < count; i++) {
    const i3 = i * 3;
    const region = random();
    let shadeDetail;
    if (region < 0.12) {
      points[i3] = mix(-1.53, -1.04, random());
      const bridgeRoof = points[i3] < -1.49
        ? 0.45
        : points[i3] < -1.42
          ? 0.58
          : points[i3] < -1.08
            ? 0.73
            : 0.76 - 2 * (points[i3] + 1.08);
      points[i3 + 1] = mix(0.05, bridgeRoof, random());
      shadeDetail = mix(0.012, 0.085, Math.pow(random(), 1.9));
    } else if (region < 0.2) {
      const stack = CONTAINER_STACKS[Math.floor(random() * CONTAINER_STACKS.length)];
      points[i3] = mix(stack.x + 0.025, stack.x + 0.255, random());
      points[i3 + 1] = mix(0.055, stack.height, random());
      shadeDetail = mix(0.008, 0.045, Math.pow(random(), 2.2));
    } else {
      let x = 0;
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = mix(-2.45, 2.34, random());
        const patchMask =
          0.5 +
          0.28 * Math.sin(candidate * 3.7 + 0.4) +
          0.18 * Math.sin(candidate * 8.3 + 1.2);
        x = candidate;
        if (random() > 0.35 || patchMask > 0.5) break;
      }
      const sternProgress = Math.max(0, Math.min(1, (x + 2.45) / 0.67));
      const bowProgress = Math.max(0, Math.min(1, (x - 1.82) / 0.52));
      const lowerHull = x < -1.78
        ? mix(-0.75, -0.89, sternProgress)
        : x > 1.82
          ? mix(-0.85, -0.24, bowProgress)
          : -0.88;
      const upperHull = x > 1.78
        ? mix(-0.015, -0.12, Math.max(0, Math.min(1, (x - 1.78) / 0.56)))
        : mix(-0.035, 0.015, Math.max(0, Math.min(1, (x + 2.45) / 4.23)));
      const skinBias = random() < 0.72
        ? Math.pow(random(), 2.8)
        : 1 - Math.pow(random(), 3);
      points[i3] = x;
      points[i3 + 1] =
        mix(lowerHull + 0.045, upperHull - 0.028, skinBias) +
        (random() + random() - 1) * 0.018;
      shadeDetail = mix(0.008, 0.11, Math.pow(random(), 1.95));
    }
    points[i3 + 2] = mix(-0.11, 0.11, random());
    detail[i] = shadeDetail;
  }
  return { points, detail };
}

function createShipTargets(count) {
  const template = getShipDensityTemplate(count);
  const detail = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    detail[index] = template.role[index] === SHIP_TEMPLATE_ROLES.outline
      ? 0.84
      : template.role[index] === SHIP_TEMPLATE_ROLES.secondary
        ? 0.36
        : 0.08;
  }
  return {
    points: template.target,
    detail,
    formedAlpha: template.formedAlpha,
    formedSize: template.formedSize,
    formedTone: template.formedTone,
  };
}

function createBoxTargets(count, width, height, depth, seed) {
  const halfW = width / 2;
  const halfH = height / 2;
  const edgeCount = Math.floor(count * 0.68);
  const paths = [rectanglePath(-halfW, -halfH, width, height), [[-halfW, 0, 0], [halfW, 0, 0]]];
  for (let rib = 1; rib < 6; rib++) {
    const x = -halfW + (width * rib) / 6;
    paths.push([[x, -halfH, 0], [x, halfH, 0]]);
  }
  const points = new Float32Array(count * 3);
  points.set(samplePaths(paths, edgeCount, seed));
  const random = seededRandom(seed + 17);
  for (let i = edgeCount; i < count; i++) {
    const i3 = i * 3;
    points[i3] = mix(-halfW, halfW, random());
    points[i3 + 1] = mix(-halfH, halfH, random());
    points[i3 + 2] = mix(-depth / 2, depth / 2, random());
  }
  return points;
}

function createCloudPositions(count, seed) {
  const random = seededRandom(seed);
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    points[i3] = mix(-18.4, 7.2, random());
    points[i3 + 1] = mix(-3.25, 3.25, random());
    points[i3 + 2] = mix(-0.85, 0.85, random());
  }
  return points;
}

function setColor(array, index, value) {
  const i3 = index * 3;
  array[i3] = value;
  array[i3 + 1] = value;
  array[i3 + 2] = value;
}

function createAmbientAttributes(count) {
  const position = createCloudPositions(count, 811);
  const aSeed = new Float32Array(count);
  const aColor = new Float32Array(count * 3);
  const random = seededRandom(1181);
  for (let i = 0; i < count; i++) {
    const seed = random();
    aSeed[i] = seed;
    setColor(aColor, i, seed < 0.05 ? 0.86 : seed < 0.28 ? 0.54 : 0.3);
  }
  return {
    position: { array: position, itemSize: 3 },
    aSeed: { array: aSeed, itemSize: 1 },
    aColor: { array: aColor, itemSize: 3 },
  };
}

function createDynamicAttributes({ ship, cargo, reserve }, generationSeed = 0) {
  const total = ship + cargo + reserve;
  const aTarget = new Float32Array(total * 3);
  const shipTargets = createShipTargets(ship);
  aTarget.set(shipTargets.points);
  aTarget.set(createBoxTargets(cargo, 0.52, 0.2, 0.22, 303 + generationSeed), ship * 3);
  const position = new Float32Array(total * 3);
  const aWakeVector = new Float32Array(total * 3);
  const aColor = new Float32Array(total * 3);
  const aSeed = new Float32Array(total);
  const aKind = new Float32Array(total);
  const aCapture = new Float32Array(total);
  const aDuration = new Float32Array(total);
  const aReleaseProfile = new Float32Array(total * 3);
  const aEncounter = new Float32Array(total);
  const aEntrain = new Float32Array(total);
  const aBand = new Float32Array(total);
  const aDetail = new Float32Array(total);
  const aTemplateVisual = new Uint8Array(total * 2);
  aDetail.set(shipTargets.detail);
  aDetail.fill(1, ship, ship + Math.floor(cargo * 0.68));
  aDetail.fill(0.08, ship + cargo, total);
  const random = seededRandom(5107 + generationSeed);

  for (let i = 0; i < total; i++) {
    const i3 = i * 3;
    const isCargo = i >= ship && i < ship + cargo;
    const isReserve = i >= ship + cargo;
    if (isReserve) {
      aTarget[i3] = mix(-2.6, 2.6, random());
      aTarget[i3 + 1] = mix(-0.95, 0.95, random());
      aTarget[i3 + 2] = mix(-0.14, 0.14, random());
    }
    const localX = aTarget[i3];
    const localY = aTarget[i3 + 1];
    const isTemplateCargo =
      !isCargo &&
      !isReserve &&
      localX >= SHIP_CARGO_TEMPLATE_BOUNDS.xMin &&
      localX <= SHIP_CARGO_TEMPLATE_BOUNDS.xMax &&
      localY >= SHIP_CARGO_TEMPLATE_BOUNDS.yMin &&
      localY <= SHIP_CARGO_TEMPLATE_BOUNDS.yMax;
    const isCargoParticle = isCargo || isTemplateCargo;
    if (isTemplateCargo) {
      aTarget[i3] = localX * SHIP_X_SCALE - SHIP_CARGO_OFFSET[0];
      aTarget[i3 + 1] = localY * SHIP_Y_SCALE - SHIP_CARGO_OFFSET[1];
    }
    const angle = random() * Math.PI * 2;
    const band = random();
    const bandIndex = Math.floor(band * 7);
    const bandOffset = (band - 0.5) * 2;
    const ribbonNoise = (random() + random() + random() - 1.5) * 0.12;
    if (isReserve) {
      // A broad marked-fog sheet. Its left-heavy distribution leaves black
      // water around the crane and gives the moving hull something to advect.
      position[i3] = mix(-18.2, 3.8, Math.pow(random(), 1.52));
      position[i3 + 1] = SHIP_Y +
        (random() + random() - 1.0) * 2.75 +
        Math.sin(position[i3] * 0.37 + bandIndex) * 0.12;
      position[i3 + 2] = mix(-0.9, 0.9, random());
    } else {
      // A compact incoming collar supplies only the target region currently
      // crossing stage left. The target itself determines bow-to-stern order.
      // Seed the forming points across a longer offstage collar so the visible
      // segment is a set of arcing pull paths, not a short horizontal smear.
      // The target reveal still owns timing; this only lengthens the material
      // path that pours into the bow-first outline.
      const sourceLag = mix(0.35, 2.2, Math.pow(random(), 1.45));
      position[i3] = FORMATION_PLANE_X - sourceLag;
      position[i3 + 1] =
        SHIP_Y +
        localY * SHIP_Y_SCALE +
        bandOffset * (0.18 + 0.14 * Math.sqrt(sourceLag)) +
        Math.sin(sourceLag * 1.25 + band * Math.PI * 2) *
          (0.07 + 0.04 * sourceLag) +
        ribbonNoise * 0.55;
      position[i3 + 2] = mix(-0.72, 0.72, random());
    }
    aBand[i] = band;

    aWakeVector[i3] = mix(-1, 1, random());
    aWakeVector[i3 + 1] = Math.sin(angle);
    aWakeVector[i3 + 2] = Math.cos(angle);

    const sourceX = position[i3];
    aEncounter[i] = encounterTimeForSourceX(sourceX);
    const centreAffinity = Math.exp(-Math.pow((position[i3 + 1] - SHIP_Y) / 1.35, 2));
    aEntrain[i] = mix(0.25, 1.0, centreAffinity) * mix(0.72, 1.0, random());

    const seed = random();
    aSeed[i] = seed;
    if (isCargoParticle) {
      const visualIndex = i * 2;
      if (isTemplateCargo) {
        aTemplateVisual[visualIndex] = Math.round(shipTargets.formedAlpha[i] * 255);
        aTemplateVisual[visualIndex + 1] = Math.round(
          Math.max(0, Math.min(1, (shipTargets.formedSize[i] - 0.42) / 0.8)) * 255
        );
        setColor(aColor, i, shipTargets.formedTone[i]);
      } else {
        aTemplateVisual[visualIndex] = 255;
        aTemplateVisual[visualIndex + 1] = 185;
        setColor(aColor, i, seed < 0.45 ? 1.0 : seed < 0.82 ? 0.78 : 0.5);
      }
      aKind[i] = 1;
      aCapture[i] = mix(0.42, 0.62, random());
      aDuration[i] = mix(0.16, 0.28, random());
      aReleaseProfile[i3] = mix(
        DEPARTURE_START + 2,
        DEPARTURE_START + 4.2,
        random()
      );
      aReleaseProfile[i3 + 1] = mix(1.2, 2.4, random());
      aReleaseProfile[i3 + 2] = mix(9, 14, random());
    } else if (isReserve) {
      aKind[i] = 2;
      aCapture[i] = 2;
      aDuration[i] = 1;
      aReleaseProfile[i3] = 200;
      aReleaseProfile[i3 + 1] = 2;
      aReleaseProfile[i3 + 2] = 200;
      setColor(aColor, i, seed < 0.14 ? 0.98 : seed < 0.62 ? 0.78 : 0.56);
    } else {
      const visualIndex = i * 2;
      aTemplateVisual[visualIndex] = Math.round(shipTargets.formedAlpha[i] * 255);
      aTemplateVisual[visualIndex + 1] = Math.round(
        Math.max(0, Math.min(1, (shipTargets.formedSize[i] - 0.42) / 0.8)) * 255
      );
      const bowToStern = 1 - (localX + 2.58) / 5.08;
      const isBridge = localX < -1.5 && localY > 0.015;
      const isContainer = localX >= -1.5 && localY > 0.015;
      const captureThreshold = isBridge
        ? mix(0.3, 0.46, random())
        : isContainer
          ? 0.4 + bowToStern * 0.2 + random() * 0.12
          : 0.08 + bowToStern * 0.5 + random() * 0.12;
      aCapture[i] = Math.max(0.07, Math.min(0.78, captureThreshold));
      aDuration[i] = mix(0.16, 0.34, random());
      const sternToBow = Math.max(0, Math.min(1, (localX + 2.58) / 5.08));
      aReleaseProfile[i3] =
        DEPARTURE_START + 0.35 + sternToBow * 13.7 + random() * 0.35;
      aReleaseProfile[i3 + 1] = mix(1.4, 4.0, random());
      aReleaseProfile[i3 + 2] = mix(12, 20, random());
      setColor(aColor, i, shipTargets.formedTone[i]);
    }
  }
  return {
    position: { array: position, itemSize: 3 },
    aTarget: { array: aTarget, itemSize: 3 },
    aWakeVector: { array: aWakeVector, itemSize: 3 },
    aColor: { array: aColor, itemSize: 3 },
    aSeed: { array: aSeed, itemSize: 1 },
    aKind: { array: aKind, itemSize: 1 },
    aCapture: { array: aCapture, itemSize: 1 },
    aDuration: { array: aDuration, itemSize: 1 },
    aReleaseProfile: { array: aReleaseProfile, itemSize: 3 },
    aEncounter: { array: aEncounter, itemSize: 1 },
    aEntrain: { array: aEntrain, itemSize: 1 },
    aBand: { array: aBand, itemSize: 1 },
    aDetail: { array: aDetail, itemSize: 1 },
    aTemplateVisual: {
      array: aTemplateVisual,
      itemSize: 2,
      normalized: true,
    },
  };
}

function takeAttributePrefix(attributes, count) {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, definition]) => [
      name,
      {
        ...definition,
        array: definition.array.subarray(0, count * definition.itemSize),
      },
    ])
  );
}

function trailDrawVisible(uniforms) {
  return (
    uniforms.uPoolVisibility.value > 0.001 &&
    uniforms.uLocalTime.value < TRAIL_DRAW_END
  );
}

function mainDrawVisible(uniforms) {
  const localTime = uniforms.uLocalTime.value;
  return (
    uniforms.uPoolVisibility.value > 0.001 ||
    uniforms.uStructureVisibility.value > 0.001 ||
    (localTime > DEPARTURE_START && localTime < RELEASE_DRAW_END)
  );
}

function craneJobAt(elapsed, attachedPosition) {
  const attachedX = attachedPosition[0];
  const attachedY = attachedPosition[1];
  let trolleyX = PICKUP_X;
  let spreaderY = CRANE_HOME_SPREADER_Y;
  let cargoX = attachedX;
  let cargoY = attachedY;

  if (elapsed < CRANE_TIMING.engage) {
    spreaderY = mix(
      CRANE_HOME_SPREADER_Y,
      attachedY + SHIP_CARGO_SPREADER_OFFSET_Y,
      smoothstep(0, CRANE_TIMING.engage, elapsed)
    );
  } else if (elapsed < CRANE_TIMING.lift) {
    cargoX = PICKUP_X;
    cargoY = mix(
      attachedY,
      CRANE_LIFT_CARGO_Y,
      smoothstep(CRANE_TIMING.engage, CRANE_TIMING.lift, elapsed)
    );
    spreaderY = cargoY + SHIP_CARGO_SPREADER_OFFSET_Y;
  } else if (elapsed < CRANE_TIMING.traverse) {
    trolleyX = mix(
      PICKUP_X,
      STORAGE_POSITION[0],
      smoothstep(CRANE_TIMING.lift, CRANE_TIMING.traverse, elapsed)
    );
    cargoX = trolleyX;
    cargoY = CRANE_LIFT_CARGO_Y;
    spreaderY = cargoY + SHIP_CARGO_SPREADER_OFFSET_Y;
  } else if (elapsed < CRANE_TIMING.cargoReleased) {
    trolleyX = STORAGE_POSITION[0];
    cargoX = STORAGE_POSITION[0];
    cargoY = mix(
      CRANE_LIFT_CARGO_Y,
      STORAGE_POSITION[1],
      smoothstep(
        CRANE_TIMING.traverse,
        CRANE_TIMING.cargoReleased,
        elapsed
      )
    );
    spreaderY = cargoY + SHIP_CARGO_SPREADER_OFFSET_Y;
  } else if (elapsed < CRANE_TIMING.spreaderClear) {
    trolleyX = STORAGE_POSITION[0];
    cargoX = STORAGE_POSITION[0];
    cargoY = STORAGE_POSITION[1];
    spreaderY = mix(
      STORAGE_POSITION[1] + SHIP_CARGO_SPREADER_OFFSET_Y,
      CRANE_HOME_SPREADER_Y,
      smoothstep(
        CRANE_TIMING.cargoReleased,
        CRANE_TIMING.spreaderClear,
        elapsed
      )
    );
  } else if (elapsed < CRANE_TIMING.home) {
    trolleyX = mix(
      STORAGE_POSITION[0],
      PICKUP_X,
      smoothstep(CRANE_TIMING.spreaderClear, CRANE_TIMING.home, elapsed)
    );
    cargoX = STORAGE_POSITION[0];
    cargoY = STORAGE_POSITION[1];
  } else {
    cargoX = STORAGE_POSITION[0];
    cargoY = STORAGE_POSITION[1];
  }

  return {
    trolleyX,
    spreaderY,
    cargoPosition: [cargoX, cargoY],
    cargoDetached: smoothstep(
      CRANE_TIMING.engage - 0.06,
      CRANE_TIMING.engage + 0.06,
      elapsed
    ),
    active: elapsed >= 0 && elapsed < CRANE_TIMING.home,
  };
}

function boatAt(time, slot) {
  const elapsedSinceStart = time - slot.startDelay;
  const started = elapsedSinceStart >= 0;
  const t = started
    ? ((elapsedSinceStart % BOAT_PERIOD) + BOAT_PERIOD) % BOAT_PERIOD
    : 0;
  const cycleIndex = started ? Math.floor(elapsedSinceStart / BOAT_PERIOD) : -1;
  let claim = 0;
  let release = 0;
  let shipX = FORM_ENTRY_X;
  let state = started ? "claiming" : "waiting";
  let wakeStrength = 0;
  let shipSpeed = 0;
  let poolVisibility = 0;
  let structureVisibility = 0;

  if (started && t < 18) {
    claim = t / 18;
    shipX = formationShipX(t);
    shipSpeed = quinticVelocity(
      FORM_ENTRY_X,
      APPROACH_START_X,
      0.3,
      1.1,
      0,
      0.1,
      18,
      t
    );
    wakeStrength =
      smootherstep(0.5, 6, t) *
      mix(0.62, 1, smootherstep(13, 18, t));
    poolVisibility = 0.95 * smoothstep(0, 4, t);
    structureVisibility = smoothstep(0, 0.7, t);
    state = "claiming";
  } else if (started && t < SERVICE_START) {
    claim = 1;
    shipX = approachShipX(t);
    shipSpeed = quinticVelocity(
      APPROACH_START_X,
      BERTH_X,
      1.1,
      0,
      0.1,
      0,
      11,
      t - 18
    );
    wakeStrength = mix(0.48, 1, smootherstep(0, 0.55, shipSpeed));
    poolVisibility = mix(0.88, 0.95, smootherstep(0, 0.45, shipSpeed));
    structureVisibility = 1;
    state = "approach";
  } else if (started && t < DEPARTURE_START) {
    claim = 1;
    shipX = BERTH_X;
    wakeStrength = 0.48;
    poolVisibility = 0.88;
    structureVisibility = 1;
    state = "berth";
  } else if (started && t < DEPARTURE_END) {
    claim = 1;
    release = smootherstep(DEPARTURE_START, DEPARTURE_END, t);
    shipX = departureShipX(t);
    const departureProgress = Math.max(
      0,
      Math.min(1, (t - DEPARTURE_START) / DEPARTURE_DURATION)
    );
    shipSpeed =
      ((DEPARTURE_X - BERTH_X) / DEPARTURE_DURATION) *
      30 *
      departureProgress ** 2 *
      (1 - departureProgress) ** 2;
    wakeStrength = mix(
      0.48,
      1,
      smootherstep(
        DEPARTURE_START,
        DEPARTURE_START + POOL_HANDOFF_DURATION,
        t
      )
    );
    // Hand the marked-fog pool to the next boat at the onset of stern-first
    // release. Its incoming pool ramps over local t=0..4, so material flows
    // directly into the next bow instead of waiting behind the departing ship.
    poolVisibility =
      mix(
        0.88,
        0.95,
        smootherstep(
          DEPARTURE_START,
          DEPARTURE_START + POOL_HANDOFF_DURATION,
          t
        )
      ) *
      (
        1 -
        smoothstep(
          BOAT_INTERVAL,
          BOAT_INTERVAL + POOL_HANDOFF_DURATION,
          t
        )
      );
    structureVisibility = 1;
    state = "release";
  } else if (started) {
    claim = 1;
    release = 1;
    shipX = DEPARTURE_X;
    const tailVisibility = 1 - smoothstep(DEPARTURE_END, RELEASE_TAIL_END, t);
    wakeStrength = t < RELEASE_TAIL_END ? 1 : 0;
    poolVisibility = 0;
    structureVisibility = tailVisibility;
    state = t < RELEASE_TAIL_END ? "recirculate" : "waiting";
  }

  const attachedPosition = [shipX + SHIP_CARGO_OFFSET[0], SHIP_Y + SHIP_CARGO_OFFSET[1]];
  const jobElapsed = t - SERVICE_START;
  const craneJob = craneJobAt(jobElapsed, attachedPosition);
  const cargoPosition = started && t >= SERVICE_START
    ? craneJob.cargoPosition
    : attachedPosition;

  return {
    id: slot.id,
    t,
    cycleIndex,
    cyclePhase: t / BOAT_PERIOD,
    state,
    started,
    claim,
    release,
    wakeStrength,
    poolVisibility,
    structureVisibility,
    shipSpeed,
    shipX,
    cargoPosition,
    cargoDetached: started && t >= SERVICE_START ? craneJob.cargoDetached : 0,
    craneJob: started && craneJob.active
      ? { ...craneJob, ownerId: slot.id, id: `${slot.id}:${cycleIndex}` }
      : null,
  };
}

function craneTimelineAt(boats) {
  const activeJobs = boats.map((boat) => boat.craneJob).filter(Boolean);
  if (import.meta.env.DEV && activeJobs.length > 1) {
    throw new Error("Particle logistics invariant failed: crane jobs overlap");
  }
  const activeJob = activeJobs[0];
  return activeJob ?? {
    trolleyX: PICKUP_X,
    spreaderY: CRANE_HOME_SPREADER_Y,
  };
}

function getAuditTuning(name, fallback, min, max) {
  if (!import.meta.env.DEV || typeof window === "undefined") return fallback;
  const rawValue = new URLSearchParams(window.location.search).get(name);
  if (rawValue === null || rawValue.trim() === "") return fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function createDynamicUniforms(
  pointSize,
  trailPass = 0,
  templateExposure = 2.25,
  templateMinPixels = 1.4
) {
  return {
    uTime: { value: 0 },
    uLocalTime: { value: 0 },
    uPointSize: { value: pointSize },
    uClaim: { value: 0 },
    uRelease: { value: 0 },
    uCyclePhase: { value: 0 },
    uWakeStrength: { value: 0 },
    uPoolVisibility: { value: 0 },
    uStructureVisibility: { value: 0 },
    uShipSpeed: { value: 0 },
    uShipX: { value: FORM_ENTRY_X },
    uShipY: { value: SHIP_Y },
    uFormationPlaneX: { value: FORMATION_PLANE_X },
    uCargoPosition: { value: new THREE.Vector2(PICKUP_X, SHIP_Y + SHIP_CARGO_OFFSET[1]) },
    uCargoDetached: { value: 0 },
    uTrailPass: { value: trailPass },
    uTemplateExposure: { value: templateExposure },
    uTemplateMinPixels: { value: templateMinPixels },
  };
}

function applyTimeline(uniforms, timeline, time) {
  uniforms.uTime.value = time;
  uniforms.uLocalTime.value = timeline.t;
  uniforms.uClaim.value = timeline.claim;
  uniforms.uRelease.value = timeline.release;
  uniforms.uCyclePhase.value = timeline.cyclePhase;
  uniforms.uWakeStrength.value = timeline.wakeStrength;
  uniforms.uPoolVisibility.value = timeline.poolVisibility;
  uniforms.uStructureVisibility.value = timeline.structureVisibility;
  uniforms.uShipSpeed.value = timeline.shipSpeed;
  uniforms.uShipX.value = timeline.shipX;
  uniforms.uCargoPosition.value.set(...timeline.cargoPosition);
  uniforms.uCargoDetached.value = timeline.cargoDetached;
}

export default function LogisticsParticleScene({ density, shouldAnimate, initialTime = 0, debugBoat = null }) {
  const templateExposure = getAuditTuning("logisticsExposure", 2.25, 0.5, 4);
  const templateMinPixels = getAuditTuning("logisticsMinPixels", 1.4, 1, 2.2);
  const timeRef = useRef(initialTime);
  const activeSlots = useMemo(
    () => debugBoat ? BOAT_SLOTS.filter((slot) => slot.id === debugBoat) : BOAT_SLOTS,
    [debugBoat]
  );
  const initialBoats = activeSlots.map((slot) => boatAt(initialTime, slot));
  const timelineRef = useRef(craneTimelineAt(initialBoats));
  const { camera, gl, invalidate, size } = useThree();
  const ambientAttributes = useMemo(() => createAmbientAttributes(density.ambient), [density.ambient]);
  const ambientUniforms = useMemo(() => ({ uTime: { value: 0 }, uPointSize: { value: density.pointSize } }), [density.pointSize]);
  const boatLayers = useMemo(
    () => activeSlots.map((slot) => {
      const uniforms = createDynamicUniforms(
        density.pointSize,
        0,
        templateExposure,
        templateMinPixels
      );
      const trailUniforms = createDynamicUniforms(
        density.pointSize,
        1,
        templateExposure,
        templateMinPixels
      );
      applyTimeline(uniforms, boatAt(initialTime, slot), initialTime);
      applyTimeline(trailUniforms, boatAt(initialTime, slot), initialTime);
      const attributes = createDynamicAttributes(density, slot.seed);
      return {
        slot,
        attributes,
        // The tracer shader only draws semantic ship points. Supplying a
        // ship-only prefix avoids submitting every reserve-fog vertex through
        // a second draw call while preserving the exact fitted point sequence.
        trailAttributes: takeAttributePrefix(attributes, density.trail),
        uniforms,
        trailUniforms,
      };
    }),
    [activeSlots, density, initialTime, templateExposure, templateMinPixels]
  );

  useEffect(() => {
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const zForWidth = 13.0 / (Math.tan(halfFov) * aspect);
    const zForHeight = 4.5 / Math.tan(halfFov);
    camera.position.set(-5.4, 0.02, Math.max(zForWidth, zForHeight));
    camera.updateProjectionMatrix();
    const pixelRatio = gl.getPixelRatio();
    ambientUniforms.uPointSize.value = density.pointSize * pixelRatio;
    boatLayers.forEach(({ uniforms, trailUniforms }) => {
      uniforms.uPointSize.value = density.pointSize * pixelRatio;
      trailUniforms.uPointSize.value = density.pointSize * pixelRatio;
    });
    invalidate();
  }, [ambientUniforms, boatLayers, camera, density.pointSize, gl, invalidate, size.height, size.width]);

  useEffect(() => invalidate(), [invalidate, shouldAnimate]);

  useFrame((_, delta) => {
    if (shouldAnimate) timeRef.current += Math.min(delta, 0.05);
    const boatTimelines = boatLayers.map(({ slot }) => boatAt(timeRef.current, slot));
    timelineRef.current = craneTimelineAt(boatTimelines);
    ambientUniforms.uTime.value = timeRef.current;
    boatLayers.forEach(({ slot, uniforms, trailUniforms }, index) => {
      applyTimeline(uniforms, boatTimelines[index], timeRef.current);
      applyTimeline(trailUniforms, boatTimelines[index], timeRef.current);
    });
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <GpuParticleLayer
        attributes={ambientAttributes}
        uniforms={ambientUniforms}
        vertexShader={AMBIENT_VERTEX_SHADER}
        fragmentShader={PARTICLE_FRAGMENT_SHADER}
        blending={THREE.AdditiveBlending}
      />
      {boatLayers.map(({
        slot,
        attributes,
        trailAttributes,
        uniforms,
        trailUniforms,
      }) => (
        <group key={slot.id}>
          <GpuParticleLayer
            attributes={trailAttributes}
            uniforms={trailUniforms}
            vertexShader={DYNAMIC_VERTEX_SHADER}
            fragmentShader={PARTICLE_FRAGMENT_SHADER}
            blending={THREE.AdditiveBlending}
            isVisible={trailDrawVisible}
          />
          <GpuParticleLayer
            attributes={attributes}
            uniforms={uniforms}
            vertexShader={DYNAMIC_VERTEX_SHADER}
            fragmentShader={PARTICLE_FRAGMENT_SHADER}
            blending={THREE.NormalBlending}
            isVisible={mainDrawVisible}
            getDrawCount={(activeUniforms) =>
              activeUniforms.uPoolVisibility.value > 0.001
                ? density.ship + density.cargo + density.reserve
                : density.ship + density.cargo
            }
          />
        </group>
      ))}
      <PortCrane timelineRef={timelineRef} />
    </>
  );
}
