import React from 'react';

// ─────────────────────────────────────────────────────────────────────
// PlazaFloor — the flat graphic disc the day circle stands on.
//
// Readability device, not decoration. Before this, every phase happened
// on an undifferentiated 35-unit ground circle: nothing in frame said
// "the action is HERE". A single lighter value under the players does
// what no HUD label can — it separates stage from surroundings at a
// glance, from any camera angle, in one read.
//
// Drawn as an ANNULUS, not a disc: the inner radius clears the sunken
// runic circle at the origin (RunicCircle, scale 5.8 → ~2.9 units) so
// the plaza floor frames the ritual altar instead of covering it.
// Players stand at radius 4.0, comfortably on the ring.
//
// The rim is a second, darker annulus. That dark edge is what turns a
// tonal patch into a shape — the same trick a board game uses to print
// a play area. Without it the lighter value just reads as a lighting
// artefact.
// ─────────────────────────────────────────────────────────────────────
const INNER = 3.0;
const OUTER = 7.4;
const RIM_OUTER = 7.75;

const PlazaFloor = React.memo(function PlazaFloor({ isDay }) {
  // Deliberately one clear step lighter than GroundPlane's base tone
  // (day #a8a698 / night #23242c). Same hue family, different value —
  // the separation has to survive being desaturated by fog, so it can't
  // rely on colour.
  const floorColor = isDay ? '#c9c3b0' : '#3a3b46';
  const rimColor = isDay ? '#8d8778' : '#191a22';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <ringGeometry args={[INNER, OUTER, 72]} />
        <meshStandardMaterial color={floorColor} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[OUTER, RIM_OUTER, 72]} />
        <meshStandardMaterial color={rimColor} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
});

export default PlazaFloor;
