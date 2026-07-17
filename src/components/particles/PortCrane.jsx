import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

export const CRANE_SCALE_X = 0.7;
export const CRANE_SCALE_Y = 0.76;
export const CRANE_ORIGIN = [1.1, -0.15];
const CRANE_LOCAL_TROLLEY_Y = 1.48;
const CRANE_LOCAL_SPREADER_BOTTOM = -0.16;
const LOCAL_STORAGE_POSITION = [5.65, -1.04];
export const CRANE_TROLLEY_Y =
  CRANE_ORIGIN[1] + CRANE_LOCAL_TROLLEY_Y * CRANE_SCALE_Y;
export const CRANE_SPREADER_BOTTOM_OFFSET =
  -CRANE_LOCAL_SPREADER_BOTTOM * CRANE_SCALE_Y;
export const STORAGE_POSITION = [
  CRANE_ORIGIN[0] + LOCAL_STORAGE_POSITION[0] * CRANE_SCALE_X,
  CRANE_ORIGIN[1] + LOCAL_STORAGE_POSITION[1] * CRANE_SCALE_Y,
];
export const CRANE_HOME_SPREADER_Y = CRANE_TROLLEY_Y - 0.28;
export const CRANE_LIFT_CARGO_Y = CRANE_HOME_SPREADER_Y - 0.25;

const COLORS = {
  black: "#050505",
  graphite: "#121212",
  darkSteel: "#292929",
  steel: "#525252",
  lightSteel: "#9a9a9a",
  silver: "#d7d7d7",
  white: "#f7f7f7",
};

function Beam({ position, scale, color = COLORS.steel, rotation = 0, z = 0.05 }) {
  return (
    <mesh position={[position[0], position[1], z]} rotation={[0, 0, rotation]}>
      <boxGeometry args={[scale[0], scale[1], scale[2] ?? 0.12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Strut({ from, to, width = 0.028, color = COLORS.lightSteel, z = 0.1 }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return (
    <Beam
      position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]}
      scale={[Math.hypot(dx, dy), width, 0.045]}
      rotation={Math.atan2(dy, dx)}
      color={color}
      z={z}
    />
  );
}

function BoomTruss() {
  const nodes = useMemo(
    () => Array.from({ length: 20 }, (_, index) => -2.1 + index * 0.45),
    []
  );
  return (
    <group>
      <Beam position={[2.15, 1.49]} scale={[8.6, 0.09, 0.16]} color={COLORS.steel} />
      <Beam position={[2.15, 1.64]} scale={[8.6, 0.035, 0.08]} color={COLORS.silver} z={0.1} />
      {nodes.map((x, index) => (
        <group key={x}>
          <Strut from={[x, 1.5]} to={[x, 1.64]} width={0.018} color={COLORS.lightSteel} />
          {index < nodes.length - 1 && (
            <Strut
              from={[x, index % 2 ? 1.5 : 1.64]}
              to={[nodes[index + 1], index % 2 ? 1.64 : 1.5]}
              width={0.018}
              color={COLORS.lightSteel}
            />
          )}
        </group>
      ))}
      <Beam position={[2.15, 1.44]} scale={[8.72, 0.025, 0.07]} color={COLORS.white} z={0.13} />
      <Beam position={[-2.1, 1.565]} scale={[0.045, 0.28, 0.09]} color={COLORS.silver} z={0.12} />
    </group>
  );
}

function FootAssembly({ x }) {
  return (
    <group position={[x, -1.34, 0.1]}>
      <Beam position={[0, 0.08]} scale={[0.7, 0.17, 0.2]} color={COLORS.graphite} z={0} />
      <Beam position={[0, -0.035]} scale={[0.92, 0.08, 0.18]} color={COLORS.darkSteel} z={0.01} />
      <Beam position={[-0.27, -0.09]} scale={[0.17, 0.09, 0.16]} color={COLORS.lightSteel} z={0.02} />
      <Beam position={[0.27, -0.09]} scale={[0.17, 0.09, 0.16]} color={COLORS.lightSteel} z={0.02} />
      <Strut from={[-0.32, 0.16]} to={[0.32, -0.01]} width={0.018} color={COLORS.silver} z={0.13} />
    </group>
  );
}

function Ladder({ x, yBottom, yTop }) {
  const rungCount = 12;
  const height = yTop - yBottom;
  return (
    <group>
      <Beam position={[x - 0.055, yBottom + height / 2]} scale={[0.016, height, 0.035]} color={COLORS.silver} z={0.16} />
      <Beam position={[x + 0.055, yBottom + height / 2]} scale={[0.016, height, 0.035]} color={COLORS.silver} z={0.16} />
      {Array.from({ length: rungCount }, (_, index) => {
        const y = yBottom + (height * index) / (rungCount - 1);
        return <Beam key={y} position={[x, y]} scale={[0.12, 0.014, 0.035]} color={COLORS.silver} z={0.17} />;
      })}
    </group>
  );
}

function MaintenancePlatform({ x, y, width }) {
  return (
    <group>
      <Beam position={[x, y]} scale={[width, 0.045, 0.09]} color={COLORS.silver} z={0.13} />
      <Beam position={[x, y + 0.14]} scale={[width, 0.018, 0.04]} color={COLORS.lightSteel} z={0.15} />
      {[-width / 2, 0, width / 2].map((offset) => (
        <Beam key={offset} position={[x + offset, y + 0.07]} scale={[0.014, 0.15, 0.035]} color={COLORS.lightSteel} z={0.15} />
      ))}
    </group>
  );
}

function StaticCrane() {
  const watersideLeg = 2.92;
  const landsideLeg = 4.3;
  return (
    <group>
      <Beam position={[4.05, -1.51]} scale={[6.45, 0.16, 0.24]} color={COLORS.black} />
      <Beam position={[4.05, -1.4]} scale={[6.25, 0.025, 0.09]} color={COLORS.silver} z={0.12} />
      <Beam position={[4.05, -1.34]} scale={[6.25, 0.018, 0.06]} color={COLORS.steel} z={0.12} />
      <FootAssembly x={watersideLeg} />
      <FootAssembly x={landsideLeg} />

      <Beam position={[watersideLeg, 0]} scale={[0.18, 2.72, 0.19]} color={COLORS.steel} />
      <Beam position={[landsideLeg, 0]} scale={[0.2, 2.72, 0.19]} color={COLORS.steel} />
      <Beam position={[3.61, -0.93]} scale={[1.55, 0.13, 0.18]} color={COLORS.darkSteel} />
      <Beam position={[3.61, 1.34]} scale={[1.64, 0.15, 0.2]} color={COLORS.darkSteel} />
      <Strut from={[watersideLeg, -1.17]} to={[landsideLeg, 1.27]} width={0.055} color={COLORS.silver} />
      <Strut from={[landsideLeg, -1.17]} to={[watersideLeg, 1.27]} width={0.055} color={COLORS.silver} />
      <Strut from={[watersideLeg, -0.92]} to={[3.61, -0.24]} width={0.03} />
      <Strut from={[landsideLeg, -0.92]} to={[3.61, -0.24]} width={0.03} />

      <BoomTruss />
      <Beam position={[3.72, 2.13]} scale={[0.16, 1.34, 0.18]} color={COLORS.steel} />
      <Beam position={[3.72, 2.77]} scale={[0.34, 0.12, 0.19]} color={COLORS.silver} />
      <Strut from={[3.72, 2.77]} to={[-2.08, 1.67]} width={0.026} color={COLORS.silver} />
      <Strut from={[3.72, 2.77]} to={[-0.75, 1.64]} width={0.021} color={COLORS.lightSteel} />
      <Strut from={[3.72, 2.77]} to={[6.45, 1.64]} width={0.03} color={COLORS.silver} />
      <Strut from={[3.72, 2.77]} to={[2.92, 1.5]} width={0.034} color={COLORS.white} />

      <Beam position={[4.55, 1.94]} scale={[0.9, 0.42, 0.3]} color={COLORS.graphite} />
      <Beam position={[4.43, 2.0]} scale={[0.42, 0.21, 0.32]} color={COLORS.silver} z={0.12} />
      <Beam position={[5.22, 1.83]} scale={[0.34, 0.5, 0.32]} color={COLORS.darkSteel} />
      <Strut from={[5.08, 1.62]} to={[5.36, 2.06]} width={0.02} color={COLORS.lightSteel} />

      <Beam position={[2.76, 1.19]} scale={[0.36, 0.34, 0.25]} color={COLORS.graphite} />
      <Beam position={[2.67, 1.2]} scale={[0.1, 0.2, 0.27]} color={COLORS.white} z={0.15} />
      <MaintenancePlatform x={2.75} y={0.94} width={0.75} />
      <MaintenancePlatform x={4.3} y={0.56} width={0.72} />
      <MaintenancePlatform x={4.3} y={1.12} width={0.7} />
      <Ladder x={4.3} yBottom={-1.16} yTop={1.3} />
      <Ladder x={3.72} yBottom={1.48} yTop={2.68} />

      <Beam position={[LOCAL_STORAGE_POSITION[0], -1.25]} scale={[1.26, 0.1, 0.16]} color={COLORS.graphite} />
      {[-0.5, -0.17, 0.17, 0.5].map((offset) => (
        <Beam key={offset} position={[LOCAL_STORAGE_POSITION[0] + offset, -1.13]} scale={[0.035, 0.22, 0.06]} color={COLORS.silver} />
      ))}
    </group>
  );
}

export default function PortCrane({ timelineRef }) {
  const trolleyRef = useRef();
  const spreaderRef = useRef();
  const ropeRefs = useRef([]);
  const ropeOffsets = useMemo(() => [-0.2, -0.065, 0.065, 0.2], []);

  useFrame(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const localTrolleyX =
      (timeline.trolleyX - CRANE_ORIGIN[0]) / CRANE_SCALE_X;
    const localSpreaderY =
      (timeline.spreaderY - CRANE_ORIGIN[1]) / CRANE_SCALE_Y;
    if (trolleyRef.current) trolleyRef.current.position.x = localTrolleyX;
    if (spreaderRef.current) {
      spreaderRef.current.position.set(localTrolleyX, localSpreaderY, 0.24);
    }
    const ropeLength = Math.max(0.015, CRANE_LOCAL_TROLLEY_Y - localSpreaderY);
    ropeRefs.current.forEach((rope) => {
      if (!rope) return;
      rope.position.x = localTrolleyX + Number(rope.userData.offset || 0);
      rope.position.y = CRANE_LOCAL_TROLLEY_Y - ropeLength / 2;
      rope.scale.y = ropeLength;
    });
  });

  return (
    <group
      position={[CRANE_ORIGIN[0], CRANE_ORIGIN[1], 0]}
      scale={[CRANE_SCALE_X, CRANE_SCALE_Y, 1]}
    >
      <StaticCrane />
      <group ref={trolleyRef} position={[0.42, CRANE_LOCAL_TROLLEY_Y, 0.23]}>
        <Beam position={[0, 0.02]} scale={[0.5, 0.13, 0.24]} color={COLORS.silver} z={0} />
        <Beam position={[0, -0.08]} scale={[0.24, 0.05, 0.25]} color={COLORS.graphite} z={0.02} />
        <Beam position={[-0.18, 0.1]} scale={[0.08, 0.05, 0.21]} color={COLORS.white} z={0.03} />
        <Beam position={[0.18, 0.1]} scale={[0.08, 0.05, 0.21]} color={COLORS.white} z={0.03} />
      </group>
      {ropeOffsets.map((offset, index) => (
        <mesh
          key={offset}
          ref={(node) => {
            ropeRefs.current[index] = node;
            if (node) node.userData.offset = offset;
          }}
          position={[0.42 + offset, CRANE_LOCAL_TROLLEY_Y - 0.28, 0.2]}
        >
          <boxGeometry args={[0.01, 1, 0.012]} />
          <meshBasicMaterial color={COLORS.white} toneMapped={false} />
        </mesh>
      ))}
      <group ref={spreaderRef} position={[0.42, 1.12, 0.24]}>
        <Beam position={[0, 0]} scale={[0.92, 0.095, 0.22]} color={COLORS.silver} z={0} />
        <Beam position={[0, 0.07]} scale={[0.45, 0.035, 0.23]} color={COLORS.white} z={0.01} />
        <Beam position={[-0.4, -0.08]} scale={[0.045, 0.16, 0.17]} color={COLORS.white} z={0} />
        <Beam position={[0.4, -0.08]} scale={[0.045, 0.16, 0.17]} color={COLORS.white} z={0} />
      </group>
    </group>
  );
}
