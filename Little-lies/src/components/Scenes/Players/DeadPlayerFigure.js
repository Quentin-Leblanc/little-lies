import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Character, skinForPlayer } from '../../Character/Character';
import GhostOrb from '../Wildlife/GhostOrb';

// Character with DeadPose (last frame = on ground) + ghost orb. Fades
// out over ~2s when `fading` is true (discussion phase transition).
const DeadPlayerFigure = ({ player, position, fading = false }) => {
  const groupRef = useRef();
  const fadeStart = useRef(null);
  const playerSkin = useMemo(() => skinForPlayer(player.id), [player.id]);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (fading) {
      if (fadeStart.current === null) fadeStart.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - fadeStart.current;
      const opacity = Math.max(1 - elapsed / 2, 0);
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = opacity;
        }
      });
    } else {
      fadeStart.current = null;
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        <Character
          color="#555555"
          animation="DeadPose"
          skin={playerSkin}
          scale={0.8}
        />
      </group>
      {!fading && <GhostOrb position={[0, 2, 0]} />}
      {!fading && (
        <Html position={[0, 2.4, 0]} center distanceFactor={8} zIndexRange={[15, 1]}>
          <div style={{
            color: '#888899',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '3px 10px',
            borderRadius: '5px',
            fontSize: '17px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            opacity: 0.7,
          }}>
            {player.profile.name}
          </div>
        </Html>
      )}
    </group>
  );
};

export default DeadPlayerFigure;
