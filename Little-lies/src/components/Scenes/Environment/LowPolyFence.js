import React from 'react';

const LowPolyFence = React.memo(function LowPolyFence({ start, end }) {
  const dx = end[0] - start[0], dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const cx = (start[0] + end[0]) / 2, cz = (start[2] + end[2]) / 2;
  const postCount = Math.max(2, Math.round(len / 1.2));
  return (
    <group>
      <mesh position={[cx, 0.35, cz]} rotation={[0, angle, 0]} castShadow>
        <boxGeometry args={[0.04, 0.04, len]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[cx, 0.6, cz]} rotation={[0, angle, 0]} castShadow>
        <boxGeometry args={[0.04, 0.04, len]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      {Array.from({ length: postCount }, (_, i) => {
        const t = i / (postCount - 1);
        return (
          <mesh key={i} position={[start[0] + dx * t, 0.4, start[2] + dz * t]} castShadow>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color="#4a3020" />
          </mesh>
        );
      })}
    </group>
  );
});

export default LowPolyFence;
