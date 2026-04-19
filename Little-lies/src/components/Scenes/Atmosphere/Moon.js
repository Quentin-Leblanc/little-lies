import React from 'react';

// Moon phases drive the shadow sphere offset + opacity. The base moon
// stays rendered as a warm off-white; the "shadow" is a dark sphere
// slightly larger, offset to one side, with opacity scaled by phase.
// At phase 0 (new moon) the shadow covers the whole moon; at phase 3
// (full) it disappears. In between: crescent / half / gibbous.
//
// Pick is deterministic via the `phase` prop so all clients see the
// same sky — the caller derives it from gameSeed.
const PHASE_CONFIG = [
  { name: 'new',      offsetX:  0.0,  opacity: 0.98 },
  { name: 'crescent', offsetX:  1.8,  opacity: 0.92 },
  { name: 'half',     offsetX:  2.6,  opacity: 0.85 },
  { name: 'full',     offsetX:  6.0,  opacity: 0.0  },
];

const Moon = ({ phase = 3 }) => {
  const cfg = PHASE_CONFIG[((phase % 4) + 4) % 4];
  return (
    <group position={[-20, 22, -18]}>
      <mesh>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.2, 16, 16]} />
        <meshBasicMaterial color="#aabbdd" transparent opacity={0.08} />
      </mesh>
      {/* Phase shadow — offset + opacity driven by the lunar phase. At
          full moon the opacity is 0 so the sphere is effectively absent. */}
      {cfg.opacity > 0.01 && (
        <mesh position={[cfg.offsetX, 0, 0.05]}>
          <sphereGeometry args={[2.55, 16, 16]} />
          <meshBasicMaterial color="#060818" transparent opacity={cfg.opacity} />
        </mesh>
      )}
      <pointLight color="#8899cc" intensity={phase === 0 ? 0.18 : 0.4} distance={80} />
    </group>
  );
};

export default Moon;
