import React from 'react';

const LowPolyCart = React.memo(({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.45, 0]} castShadow>
      <boxGeometry args={[1.6, 0.1, 0.9]} />
      <meshStandardMaterial color="#6b4226" />
    </mesh>
    <mesh position={[0, 0.65, 0.4]} castShadow>
      <boxGeometry args={[1.6, 0.3, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    <mesh position={[0, 0.65, -0.4]} castShadow>
      <boxGeometry args={[1.6, 0.3, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    <mesh position={[-0.77, 0.65, 0]} castShadow>
      <boxGeometry args={[0.05, 0.3, 0.9]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    {[[-0.5, 0.25, 0.5], [-0.5, 0.25, -0.5], [0.5, 0.25, 0.5], [0.5, 0.25, -0.5]].map((p, i) => (
      <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.2, 0.04, 6, 8]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
    ))}
    <mesh position={[-0.5, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 1.1, 4]} />
      <meshStandardMaterial color="#3a2a1a" />
    </mesh>
    <mesh position={[0.5, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 1.1, 4]} />
      <meshStandardMaterial color="#3a2a1a" />
    </mesh>
    <mesh position={[1.1, 0.5, 0]} rotation={[0, 0, -0.2]} castShadow>
      <boxGeometry args={[0.8, 0.05, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    <mesh position={[-0.1, 0.6, 0]}>
      <sphereGeometry args={[0.35, 5, 4]} />
      <meshStandardMaterial color="#c4a44a" roughness={1} />
    </mesh>
  </group>
));

export default LowPolyCart;
