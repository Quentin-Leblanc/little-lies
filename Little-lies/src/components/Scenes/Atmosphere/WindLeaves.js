import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD_W, FIELD_H, WIND_NX, WIND_NZ } from '../constants';

// Procedural leaf silhouette — teardrop/almond shape drawn with two bezier
// curves (tip → right side → stem → left side → tip). Triangulated once
// via ShapeGeometry and shared by every instance in the InstancedMesh.
const LEAF_SHAPE_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);
  shape.bezierCurveTo(
    0.38, 0.32,
    0.38, -0.18,
    0, -0.5,
  );
  shape.bezierCurveTo(
    -0.38, -0.18,
    -0.38, 0.32,
    0, 0.55,
  );
  const geo = new THREE.ShapeGeometry(shape, 16);
  geo.computeBoundingBox();
  const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
  const cy = (geo.boundingBox.min.y + geo.boundingBox.max.y) / 2;
  geo.translate(-cx, -cy, 0);
  return geo;
})();

// Autumn leaves drifting across the scene (day). Directional flow (wind)
// + per-particle turbulence + wrap-around at the bounds so the field
// looks continuous. Small instanced planes with tumbling rotation.
const WindLeaves = ({ count = 90 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * FIELD_W,
        y: Math.random() * 6 + 0.3,
        z: (Math.random() - 0.5) * FIELD_H,
        speed: 1.2 + Math.random() * 1.8,
        bobAmp: 0.25 + Math.random() * 0.55,
        bobFreq: 0.8 + Math.random() * 1.4,
        sideAmp: 0.3 + Math.random() * 0.6,
        sideFreq: 0.5 + Math.random() * 1.2,
        spin: (Math.random() - 0.5) * 3,
        tilt: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
        scale: 0.16 + Math.random() * 0.10,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const halfW = FIELD_W / 2;
  const halfH = FIELD_H / 2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const distance = t * p.speed;
      const rawX = p.x + WIND_NX * distance;
      const rawZ = p.z + WIND_NZ * distance;
      // Wrap into [-half, +half] so the field is toroidal
      const px = ((rawX + halfW) % FIELD_W + FIELD_W) % FIELD_W - halfW
               + (-WIND_NZ) * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const pz = ((rawZ + halfH) % FIELD_H + FIELD_H) % FIELD_H - halfH
               + WIND_NX * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const py = p.y + Math.sin(t * p.bobFreq + p.phase) * p.bobAmp;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(
        t * p.tilt + p.phase,
        t * p.spin,
        Math.sin(t * p.bobFreq + p.phase) * 0.8,
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[LEAF_SHAPE_GEOMETRY, null, count]}>
      <meshBasicMaterial
        color="#b4611e"
        transparent
        opacity={0.75}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default WindLeaves;
