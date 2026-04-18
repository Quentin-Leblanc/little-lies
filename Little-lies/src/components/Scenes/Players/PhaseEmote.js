import React from 'react';
import { Html } from '@react-three/drei';

// Floating contextual icon above a player — currently only the
// JUDGMENT-phase scale for non-accused voters. Discussion icon removed
// (handled by ChatBubble on message).
const PhaseEmote = ({ phase, isAccused, CONSTANTS }) => {
  let iconClass = null;
  let color = '#fff';
  if (phase === CONSTANTS?.PHASE?.JUDGMENT && !isAccused) { iconClass = 'fa-scale-balanced'; color = '#cc88ff'; }

  if (!iconClass) return null;

  return (
    <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontSize: '16px',
        color,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
        userSelect: 'none',
      }}>
        <i className={`fas ${iconClass}`}></i>
      </div>
    </Html>
  );
};

export default PhaseEmote;
