import React from 'react';
import MeshyModel from '../Props/MeshyModel';
import { MESHY_COTTAGE, MESHY_MANOR } from '../constants';

// Swap path based on building "type" so BUILDING_POSITIONS can stay pure
// data. Chapel slot uses the manor model for the dark theme; other types
// get the small cottage.
const BuildingRenderer = React.memo(function BuildingRenderer({ type, position, rotation, scale }) {
  const path = type === 'chapel' ? MESHY_MANOR : MESHY_COTTAGE;
  return <MeshyModel path={path} position={position} rotation={rotation} scale={scale * 1.6} />;
});

export default BuildingRenderer;
