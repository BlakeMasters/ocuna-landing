import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sampleShapePoints } from "./shapes.js";

const MORPH_IN_DURATION = 1.5;
const MORPH_OUT_DURATION = 2.6;
const ACCENT_RATIO = 0.08;

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function createIdlePositions(count, spread = 4.5) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spread * (0.3 + Math.random() * 0.7);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta) + 0.55;
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i3 + 2] = r * Math.cos(phi) - 1.5;

    velocities[i3] = (Math.random() - 0.5) * 0.004;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.004;
  }

  return { positions, velocities };
}

function offsetShapePoints(shapePoints, shapeOffsetX) {
  const out = new Float32Array(shapePoints.length);
  for (let i = 0; i < shapePoints.length; i += 3) {
    out[i] = shapePoints[i] + shapeOffsetX;
    out[i + 1] = shapePoints[i + 1] + 0.02;
    out[i + 2] = shapePoints[i + 2];
  }
  return out;
}

function mapShapeTargets(shapePoints, particleCount) {
  const pointCount = shapePoints.length / 3;
  const targets = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const shapeIdx = (i % pointCount) * 3;
    targets[i3] = shapePoints[shapeIdx];
    targets[i3 + 1] = shapePoints[shapeIdx + 1];
    targets[i3 + 2] = shapePoints[shapeIdx + 2];
  }

  return targets;
}

export default function ParticleField({
  particleCount,
  activeShape,
  sectionId,
  reducedMotion,
  isVisible,
  shapeOffsetX,
}) {
  const fieldRef = useRef(null);
  const morphRef = useRef({ progress: 0, shapeKey: null, dissolving: false });
  const mouseRef = useRef({ x: 0, y: 0 });
  const shapeTargets = useRef(null);
  const pendingSnapshot = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  const { positions: idlePositions, velocities } = useMemo(
    () => createIdlePositions(particleCount),
    [particleCount]
  );

  const fieldPositions = useMemo(
    () => new Float32Array(idlePositions),
    [idlePositions]
  );

  const morphSource = useMemo(
    () => new Float32Array(idlePositions),
    [idlePositions]
  );

  const fieldColors = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    const accentCount = Math.floor(particleCount * ACCENT_RATIO);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      if (i < accentCount * 0.5) {
        arr[i3] = 0.85;
        arr[i3 + 1] = 0.36;
        arr[i3 + 2] = 0.28;
      } else if (i < accentCount) {
        arr[i3] = 0.03;
        arr[i3 + 1] = 0.5;
        arr[i3 + 2] = 0.51;
      } else {
        const v = 0.55 + Math.random() * 0.35;
        arr[i3] = v;
        arr[i3 + 1] = v;
        arr[i3 + 2] = v + 0.05;
      }
    }
    return arr;
  }, [particleCount]);

  const activeKey =
    activeShape && activeShape.sectionId === sectionId ? activeShape.shapeKey : null;

  useEffect(() => {
    const targetSizeChanged =
      shapeTargets.current?.length !== particleCount * 3;

    if (
      activeKey &&
      (activeKey !== morphRef.current.shapeKey || targetSizeChanged)
    ) {
      pendingSnapshot.current = true;
      morphRef.current.shapeKey = activeKey;
      morphRef.current.progress = 0;
      morphRef.current.dissolving = false;

      const rawPoints = offsetShapePoints(
        sampleShapePoints(activeKey, particleCount),
        shapeOffsetX
      );
      shapeTargets.current = mapShapeTargets(rawPoints, particleCount);
    } else if (!activeKey && morphRef.current.shapeKey) {
      pendingSnapshot.current = true;
      morphRef.current.dissolving = true;
      morphRef.current.shapeKey = null;
      morphRef.current.progress = 1;
    }
  }, [activeKey, particleCount, shapeOffsetX]);

  useEffect(() => {
    if (!reducedMotion) {
      return;
    }

    morphRef.current = { progress: 0, shapeKey: null, dissolving: false };
    shapeTargets.current = null;
    pendingSnapshot.current = false;
    fieldPositions.set(idlePositions);

    if (fieldRef.current) {
      const positionAttribute = fieldRef.current.geometry.attributes.position;
      positionAttribute.needsUpdate = true;
    }
    invalidate();
  }, [fieldPositions, idlePositions, invalidate, reducedMotion]);

  useEffect(() => {
    function onPointerMove(event) {
      mouseRef.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    }

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useFrame((_, delta) => {
    if (!isVisible || !fieldRef.current) {
      return;
    }

    if (pendingSnapshot.current) {
      morphSource.set(fieldPositions);
      pendingSnapshot.current = false;
    }

    const dissolving = morphRef.current.dissolving;
    const targets = shapeTargets.current;

    if (activeKey && !reducedMotion) {
      morphRef.current.progress = Math.min(
        1,
        morphRef.current.progress + delta / MORPH_IN_DURATION
      );
      morphRef.current.dissolving = false;
    } else if (dissolving && morphRef.current.progress > 0 && !reducedMotion) {
      morphRef.current.progress = Math.max(
        0,
        morphRef.current.progress - delta / MORPH_OUT_DURATION
      );
      if (morphRef.current.progress === 0) {
        morphRef.current.dissolving = false;
        shapeTargets.current = null;
      }
    }

    const rawProgress = reducedMotion ? 0 : morphRef.current.progress;
    const forming = Boolean(activeKey && targets);
    const morphT = forming ? smoothstep(rawProgress) : 0;
    const releaseT = dissolving ? 1 - easeOutCubic(rawProgress) : 0;
    const driftScale = forming ? 1 - morphT * 0.85 : dissolving ? 1 - releaseT * 0.5 : 1;
    const parallaxX = mouseRef.current.x * 0.12 * driftScale;
    const parallaxY = mouseRef.current.y * 0.08 * driftScale;

    const fieldAttr = fieldRef.current.geometry.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      if (!reducedMotion && driftScale > 0.05) {
        idlePositions[i3] += velocities[i3];
        idlePositions[i3 + 1] += velocities[i3 + 1];
        idlePositions[i3 + 2] += velocities[i3 + 2];

        const limit = 5;
        for (let j = 0; j < 3; j++) {
          if (idlePositions[i3 + j] > limit) velocities[i3 + j] *= -1;
          if (idlePositions[i3 + j] < -limit) velocities[i3 + j] *= -1;
        }
      }

      const idleX = idlePositions[i3] + parallaxX;
      const idleY = idlePositions[i3 + 1] + parallaxY;
      const idleZ = idlePositions[i3 + 2];

      let x = idleX;
      let y = idleY;
      let z = idleZ;

      if (forming) {
        x = morphSource[i3] + (targets[i3] - morphSource[i3]) * morphT;
        y = morphSource[i3 + 1] + (targets[i3 + 1] - morphSource[i3 + 1]) * morphT;
        z = morphSource[i3 + 2] + (targets[i3 + 2] - morphSource[i3 + 2]) * morphT;
      } else if (dissolving && rawProgress > 0) {
        x = morphSource[i3] + (idleX - morphSource[i3]) * releaseT;
        y = morphSource[i3 + 1] + (idleY - morphSource[i3 + 1]) * releaseT;
        z = morphSource[i3 + 2] + (idleZ - morphSource[i3 + 2]) * releaseT;
      }

      fieldPositions[i3] = x;
      fieldPositions[i3 + 1] = y;
      fieldPositions[i3 + 2] = z;

      fieldAttr.setXYZ(i, x, y, z);
    }

    fieldAttr.needsUpdate = true;
  });

  return (
    <points ref={fieldRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[fieldPositions, 3]}
          count={particleCount}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[fieldColors, 3]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
