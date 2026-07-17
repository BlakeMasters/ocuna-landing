import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A small reusable GPU particle primitive.
 *
 * Attribute buffers are uploaded once. Animation code updates shader uniforms,
 * avoiding the per-frame Float32Array rewrite used by the original hover field.
 */
export default function GpuParticleLayer({
  attributes,
  uniforms,
  vertexShader,
  fragmentShader,
  onFrame,
  isVisible,
  getDrawCount,
  blending = THREE.NormalBlending,
  depthWrite = false,
  transparent = true,
}) {
  const pointsRef = useRef(null);
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();

    for (const [name, definition] of Object.entries(attributes)) {
      nextGeometry.setAttribute(
        name,
        new THREE.BufferAttribute(
          definition.array,
          definition.itemSize,
          definition.normalized ?? false
        )
      );
    }

    return nextGeometry;
  }, [attributes]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent,
        depthWrite,
        depthTest: true,
        blending,
        toneMapped: false,
      }),
    [blending, depthWrite, fragmentShader, transparent, uniforms, vertexShader]
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((state, delta) => {
    const visible = isVisible ? isVisible(material.uniforms) : true;
    if (pointsRef.current) pointsRef.current.visible = visible;

    if (visible && getDrawCount) {
      const nextCount = Math.max(0, Math.floor(getDrawCount(material.uniforms)));
      if (geometry.drawRange.count !== nextCount) {
        geometry.setDrawRange(0, nextCount);
      }
    }

    onFrame?.({ state, delta, uniforms: material.uniforms });
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
