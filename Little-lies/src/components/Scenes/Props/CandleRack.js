import React, { useMemo } from 'react';
import * as THREE from 'three';

// Row of candles by the church facade — one goes out per death. Acts
// as a diegetic death counter the players see every day from the
// plaza: "oh, only 3 candles left". Placed on the right of the church
// entrance so the default orbits that sweep through this side pick it
// up naturally.
//
// Each candle: wooden base plank slot, thin wax cylinder, tiny cone
// flame with emissive material + a pointLight. Extinguished candles
// drop the flame mesh + light entirely. No smoke (scope) — the dark
// wick stub reads fine from orbit distance.
const CANDLE_COUNT = 7;

const CandleRack = React.memo(({
  position = [5.5, 0, -11],
  rotation = [0, -0.35, 0],
  deathsCount = 0,
}) => {
  const litCount = Math.max(CANDLE_COUNT - deathsCount, 0);

  const plankGeo  = useMemo(() => new THREE.BoxGeometry(2.2, 0.08, 0.28), []);
  const legGeo    = useMemo(() => new THREE.BoxGeometry(0.1, 0.5, 0.1), []);
  const waxGeo    = useMemo(() => new THREE.CylinderGeometry(0.055, 0.06, 0.3, 8), []);
  const flameGeo  = useMemo(() => new THREE.ConeGeometry(0.045, 0.13, 6), []);
  const wickGeo   = useMemo(() => new THREE.CylinderGeometry(0.008, 0.008, 0.04, 4), []);

  const candles = useMemo(() => {
    // Spread 7 candles across the 2.2m plank, 0.3m between centers.
    const spacing = 0.3;
    const startX = -((CANDLE_COUNT - 1) * spacing) / 2;
    return Array.from({ length: CANDLE_COUNT }, (_, i) => ({
      x: startX + i * spacing,
      y: 0.66,
      z: 0,
    }));
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* Plank + two legs — simple trestle shape */}
      <mesh geometry={plankGeo} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#3a2e25" flatShading roughness={0.95} />
      </mesh>
      <mesh geometry={legGeo} position={[-0.9, 0.25, 0]}>
        <meshStandardMaterial color="#3a2e25" flatShading roughness={0.95} />
      </mesh>
      <mesh geometry={legGeo} position={[0.9, 0.25, 0]}>
        <meshStandardMaterial color="#3a2e25" flatShading roughness={0.95} />
      </mesh>

      {candles.map((c, i) => {
        const isLit = i < litCount;
        return (
          <group key={i} position={[c.x, c.y, c.z]}>
            {/* Wax */}
            <mesh geometry={waxGeo}>
              <meshStandardMaterial color={isLit ? '#e8dcb5' : '#786c55'} flatShading roughness={0.9} />
            </mesh>
            {/* Wick (always visible — even dark candles have a wick) */}
            <mesh geometry={wickGeo} position={[0, 0.17, 0]}>
              <meshStandardMaterial color="#1a1410" flatShading />
            </mesh>
            {isLit && (
              <>
                <mesh geometry={flameGeo} position={[0, 0.25, 0]}>
                  <meshBasicMaterial color="#ffcf6a" />
                </mesh>
                <pointLight
                  position={[0, 0.27, 0]}
                  intensity={0.35}
                  distance={1.2}
                  color="#ffb060"
                  decay={2}
                />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
});

export default CandleRack;
