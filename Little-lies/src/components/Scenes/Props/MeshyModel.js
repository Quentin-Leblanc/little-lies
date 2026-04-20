import React from 'react';
import KenneyModel from './KenneyModel';

// Meshy models have their pivot at the CENTER of a unit cube (Y ∈ [-0.95, 0.95]).
// After scaling by S, we must raise position.y by `halfHeight * S` to put the base
// on the ground. halfHeight defaults to 0.95 (most props); pass a custom value for
// flatter props like rope_ring (0.38). `saturate` / `contrast` forward to
// KenneyModel for landmark props that need a colour punch-up.
const MeshyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, halfHeight = 0.95, saturate = 1, contrast = 1 }) => {
  const pos = [position[0], position[1] + halfHeight * scale, position[2]];
  return <KenneyModel path={path} position={pos} rotation={rotation} scale={scale} saturate={saturate} contrast={contrast} />;
});

export default MeshyModel;
