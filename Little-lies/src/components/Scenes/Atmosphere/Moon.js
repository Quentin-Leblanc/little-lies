import React from 'react';

const Moon = () => (
  <group position={[-20, 22, -18]}>
    <mesh>
      <sphereGeometry args={[2.5, 16, 16]} />
      <meshBasicMaterial color="#ffffee" />
    </mesh>
    <mesh>
      <sphereGeometry args={[3.2, 16, 16]} />
      <meshBasicMaterial color="#aabbdd" transparent opacity={0.08} />
    </mesh>
    <pointLight color="#8899cc" intensity={0.4} distance={80} />
  </group>
);

export default Moon;
