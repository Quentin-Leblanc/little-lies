import React, { useMemo } from 'react';
import { Character, resolvePlayerSkin } from '../../Character/Character';

// Corpse sprite — last frame of the death animation, lying on the ground
// in the plaza center. Intentionally sparse: no name label, no ghost orb,
// no highlight — dead players should feel like set dressing, not targets.
// Rotation is per-player so the bodies don't all face the same way.
const DeadPlayerFigure = ({ player, position, rotation = [0, 0, 0] }) => {
  const playerSkin = useMemo(() => resolvePlayerSkin(player), [player.id, player.profile?.skin]);
  return (
    <group position={position} rotation={rotation}>
      <Character
        color="#555555"
        animation="DeadPose"
        skin={playerSkin}
        scale={0.8}
      />
    </group>
  );
};

export default DeadPlayerFigure;
