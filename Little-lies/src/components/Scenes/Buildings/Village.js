import React from 'react';
import VillageCenter from './VillageCenter';
import BuildingRenderer from './BuildingRenderer';
import SkullLantern from '../Props/SkullLantern';
import MeshyModel from '../Props/MeshyModel';
import KenneyModel from '../Props/KenneyModel';
import DarkMountain from '../Environment/DarkMountain';
import LowPolyFence from '../Environment/LowPolyFence';
import LowPolyRiver from '../Environment/LowPolyRiver';
import LowPolyBridge from '../Environment/LowPolyBridge';
import {
  BUILDING_POSITIONS, MOUNTAINS, TORCH_POS, TREE_POSITIONS,
  ROCK_POSITIONS, FENCE_SEGMENTS,
  MESHY_TREE, MESHY_BOARD, MESHY_SKULL, MESHY_RING,
} from '../constants';
import { faceCenter } from '../utils';

// Aggregates the full village — center landmarks, buildings, lanterns,
// mountains, trees, rocks, dark props, fences, river + bridge, and
// night-only blood splatter clusters.
const Village = React.memo(({ isDay, isTrialPhase }) => (
  <group>
    <VillageCenter isTrialPhase={isTrialPhase} />

    {BUILDING_POSITIONS.map((b, i) => (
      <BuildingRenderer key={`bld-${i}`} {...b} />
    ))}

    {TORCH_POS.map((pos, i) => (
      <SkullLantern key={`lantern-${i}`} position={pos} rotation={[0, i * Math.PI / 2, 0]} scale={1.2} />
    ))}

    {MOUNTAINS.map((m, i) => (
      <DarkMountain key={`mountain-${i}`} position={m.position} scale={m.scale * 1.2} variant={i} />
    ))}

    {TREE_POSITIONS.map((pos, i) => (
      <MeshyModel
        key={`tree-${i}`}
        path={MESHY_TREE}
        position={pos}
        scale={1.4 + (i % 4) * 0.3}
        rotation={[0, i * 1.3, 0]}
      />
    ))}

    {ROCK_POSITIONS.map((r, i) => (
      <KenneyModel
        key={`rock-${i}`}
        path="/models/kaykit/rock_single_A.gltf"
        position={r.position}
        scale={r.scale * 3}
        rotation={[0, i * 2.1, 0]}
      />
    ))}

    {/* Extra Meshy trees behind the buildings (radius 20+) */}
    <MeshyModel path={MESHY_TREE} position={[-21, 0, -6]} scale={1.7} rotation={[0, 0.4, 0]} />
    <MeshyModel path={MESHY_TREE} position={[21, 0, -5]} scale={1.6} rotation={[0, 1.1, 0]} />
    <MeshyModel path={MESHY_TREE} position={[-22, 0, 4]} scale={1.8} rotation={[0, 2.3, 0]} />
    <MeshyModel path={MESHY_TREE} position={[22, 0, 5]} scale={1.5} rotation={[0, 0.8, 0]} />
    <MeshyModel path={MESHY_TREE} position={[-9, 0, 21]} scale={1.6} rotation={[0, 1.7, 0]} />
    <MeshyModel path={MESHY_TREE} position={[9, 0, 22]} scale={1.7} rotation={[0, 2.9, 0]} />

    {/* Dark-theme props: wanted board, skull sign, rope ring */}
    <MeshyModel path={MESHY_BOARD}
      position={[5.5, 0, 3]} scale={1.3}
      rotation={[0, faceCenter(5.5, 3), 0]} />
    <MeshyModel path={MESHY_SKULL}
      position={[-5.5, 0, -4]} scale={1.3}
      rotation={[0, faceCenter(-5.5, -4), 0]} />
    <MeshyModel path={MESHY_RING}
      position={[-9, 0, 5]} scale={1.6}
      rotation={[0, 0.5, 0]}
      halfHeight={0.38} />

    {FENCE_SEGMENTS.map((f, i) => (
      <LowPolyFence key={`fence-${i}`} start={f.start} end={f.end} />
    ))}

    <LowPolyRiver isDay={isDay} />
    <LowPolyBridge position={[5, 0, 16]} rotation={[0, 0.15, 0]} scale={1.3} />

    {/* Night-only blood splatter clusters — each cluster is 6 small splats */}
    {!isDay && <>
      {[
        [2, -3], [-3.5, 2], [5, -8], [-8, -5], [0, 5],
        [-1, -1.5], [3, 6], [-6, -9], [8, -6],
      ].map(([cx, cz], ci) => (
        <group key={`blood-cluster-${ci}`}>
          {[
            [0, 0], [0.2, 0.15], [-0.15, 0.2], [0.1, -0.2], [-0.25, -0.1], [0.3, 0.05],
          ].map(([ox, oz], si) => (
            <mesh key={`b-${ci}-${si}`}
              position={[cx + ox, 0.03, cz + oz]}
              rotation={[-Math.PI / 2, 0, (ci * 1.7 + si * 2.3)]}
            >
              <circleGeometry args={[0.06 + (si % 3) * 0.04, 4 + si % 2]} />
              <meshBasicMaterial
                color={si % 2 === 0 ? '#7a1515' : '#5a0e0e'}
                transparent
                opacity={0.55}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>}
  </group>
));

export default Village;
