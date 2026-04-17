import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// GLSL simplex noise + fBm — used by the ground mist shader
const MIST_NOISE_GLSL = `
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float snoise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h * vec3(dot(a, hash22(i)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}
`;

// One flat mist slab — large plane hovering above ground with a scrolling
// fBm noise as alpha. Multiple slabs are stacked at different heights /
// speeds / scales to build a full volume of drifting mist.
const MistSlab = ({ y, scale = 1, speed = 0.02, density = 0.55, color, seed = 0 }) => {
  const matRef = useRef();

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uDensity: { value: density },
      uSpeed: { value: speed },
      uSeed: { value: seed },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 1 },
      fogFar: { value: 100 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vFogDepth;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mvPos.z;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uSpeed;
      uniform float uSeed;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec2 vUv;
      varying float vFogDepth;
      varying vec3 vWorldPos;
      ${MIST_NOISE_GLSL}
      void main() {
        // World-space bubble around the camera — any fragment inside this
        // sphere is discarded entirely. Fixes "half the screen is fog"
        // when the camera orbits right above/through a slab.
        float camDist = distance(vWorldPos, cameraPosition);
        if (camDist < 7.0) discard;
        float bubbleFade = smoothstep(7.0, 13.0, camDist);

        // Two scrolling noise octaves at different speeds/scales
        float t = uTime * uSpeed;
        vec2 uv = vUv * 3.0 + vec2(uSeed * 13.0, uSeed * 7.0);
        float n1 = fbm(uv + vec2(t, t * 0.6));
        float n2 = fbm(uv * 1.8 - vec2(t * 0.7, -t * 0.4));
        float mist = n1 * 0.65 + n2 * 0.35;
        mist = smoothstep(-0.15, 0.75, mist);
        vec2 centered = vUv - 0.5;
        float r = length(centered) * 2.0;
        float edgeFade = 1.0 - smoothstep(0.5, 1.0, r);
        float farFade = 1.0 - smoothstep(45.0, 80.0, vFogDepth);
        float alpha = mist * edgeFade * bubbleFade * farFade * uDensity;
        vec3 col = uColor;
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        col = mix(col, fogColor, fogFactor);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }), [color, density, speed, seed]);

  matRef.current = material;

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={1}>
      <planeGeometry args={[42 * scale, 42 * scale, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default MistSlab;
