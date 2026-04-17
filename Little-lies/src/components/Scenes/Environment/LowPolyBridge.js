import React from 'react';

const LowPolyBridge = React.memo(({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.15, 0]} castShadow>
      <boxGeometry args={[2.0, 0.1, 1.2]} />
      <meshStandardMaterial color="#6b4226" />
    </mesh>
    {Array.from({ length: 6 }, (_, i) => (
      <mesh key={i} position={[-0.75 + i * 0.3, 0.21, 0]} castShadow>
        <boxGeometry args={[0.25, 0.02, 1.15]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#7a5a3a' : '#6b4a2a'} />
      </mesh>
    ))}
    {[-0.55, 0.55].map((z, i) => (
      <group key={i}>
        <mesh position={[-0.8, 0.45, z]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#4a3020" />
        </mesh>
        <mesh position={[0.8, 0.45, z]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#4a3020" />
        </mesh>
        <mesh position={[0, 0.7, z]} castShadow>
          <boxGeometry args={[1.8, 0.04, 0.04]} />
          <meshStandardMaterial color="#5a3a1a" />
        </mesh>
      </group>
    ))}
  </group>
));

export default LowPolyBridge;
