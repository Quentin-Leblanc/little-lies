import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

// Daytime trial storm — a silent escalating storm that gathers while the
// accused is being judged and breaks on execution. Distant soft flashes
// during DEFENSE/JUDGMENT → closer sharper flashes during LAST_WORDS →
// one big strike when EXECUTION fires. A single directional light
// standing in for thunderclap flashes; all timing via refs so React
// never re-renders on each flash.
//
// `mode`:
//   'build'   → rare soft flashes, every 6–12s
//   'climax'  → sharp flashes, every 3–6s
//   'strike'  → one bright strike the moment we enter this mode, then
//               revert to 'climax' pacing
//   any other → no flashes
const TrialStormLighting = ({ mode }) => {
  const lightRef = useRef();
  const nextFlash = useRef(0);
  const flashTimer = useRef(0);
  const modeRef = useRef(mode);
  const pendingStrike = useRef(false);

  useEffect(() => {
    // Entering 'strike' mode fires one immediate bright bolt — useFrame
    // below picks it up on the next tick.
    if (mode === 'strike' && modeRef.current !== 'strike') {
      pendingStrike.current = true;
    }
    modeRef.current = mode;
    // Reset the random schedule so a mode change isn't locked waiting
    // on an old 10s timer.
    flashTimer.current = 0;
    nextFlash.current = mode === 'climax' ? 3 + Math.random() * 3 : 6 + Math.random() * 6;
  }, [mode]);

  useFrame((_, delta) => {
    if (!lightRef.current) return;

    if (pendingStrike.current) {
      pendingStrike.current = false;
      // Headline strike — much brighter than ambient flashes, with a
      // quick double-flash trail so it reads as a real lightning bolt.
      lightRef.current.intensity = 22 + Math.random() * 6;
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 0;
      }, 120);
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 12 + Math.random() * 4;
        setTimeout(() => {
          if (lightRef.current) lightRef.current.intensity = 0;
        }, 80);
      }, 260);
      flashTimer.current = 0;
      nextFlash.current = 3;
      return;
    }

    if (mode !== 'build' && mode !== 'climax') return;

    flashTimer.current += delta;
    if (flashTimer.current < nextFlash.current) return;

    const isClimax = mode === 'climax';
    const peak = isClimax ? 10 + Math.random() * 6 : 5 + Math.random() * 4;
    const dur  = isClimax ? 90 + Math.random() * 60 : 70 + Math.random() * 50;
    lightRef.current.intensity = peak;
    setTimeout(() => {
      if (lightRef.current) lightRef.current.intensity = 0;
    }, dur);
    // 40% chance of a weaker secondary flicker — sells the "rumbling"
    // effect without needing audio.
    if (Math.random() > 0.6) {
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = peak * 0.45;
        setTimeout(() => {
          if (lightRef.current) lightRef.current.intensity = 0;
        }, 60);
      }, dur + 120);
    }
    flashTimer.current = 0;
    nextFlash.current = isClimax ? 3 + Math.random() * 3 : 6 + Math.random() * 6;
  });

  if (mode !== 'build' && mode !== 'climax' && mode !== 'strike') return null;

  return (
    <directionalLight
      ref={lightRef}
      position={[6, 28, -12]}
      intensity={0}
      color="#cdd6ff"
    />
  );
};

export default TrialStormLighting;
