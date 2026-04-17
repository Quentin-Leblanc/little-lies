import React from 'react';
import MeshyModel from '../Props/MeshyModel';
import RunicCircle from '../Props/RunicCircle';
import { GALLOWS_PATH, MESHY_PODIUM, PODIUM_POSITION, PODIUM_SCALE } from '../constants';

// Gallows (potence) + runic circle + defense podium — the landmark of the
// plaza. During trial phases, a warm spotlight + ground glow highlight
// the podium where the accused stands.
const VillageCenter = React.memo(({ isTrialPhase }) => (
  <group>
    <RunicCircle position={[0, 0, 0]} scale={5.8} />
    <MeshyModel
      path={GALLOWS_PATH}
      position={[0, 0.1, 0]}
      rotation={[0, Math.PI * 0.15, 0]}
      scale={2}
      halfHeight={0.92}
    />
    <MeshyModel
      path={MESHY_PODIUM}
      position={PODIUM_POSITION}
      rotation={[0, Math.atan2(-PODIUM_POSITION[0], -PODIUM_POSITION[2]), 0]}
      scale={PODIUM_SCALE}
      halfHeight={0.92}
    />
    {isTrialPhase && (
      <>
        <spotLight
          position={[PODIUM_POSITION[0], 8, PODIUM_POSITION[2]]}
          target-position={PODIUM_POSITION}
          angle={0.35}
          penumbra={0.6}
          intensity={3}
          color="#ffcc88"
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
        <pointLight
          position={[PODIUM_POSITION[0], 0.3, PODIUM_POSITION[2]]}
          intensity={1.2}
          color="#ff6633"
          distance={3}
          decay={2}
        />
      </>
    )}
  </group>
));

export default VillageCenter;
