import React, { useEffect, useRef, useState } from 'react';
import './PhaseTransitionFX.scss';

// Phase-transition overlay FX. Adds two new visual beats the scene
// didn't have before:
//
//   1. Radial vignette pulse on DISCUSSION → VOTING — brief dark
//      pulse from the screen edges that tells the room "the talking
//      is over, it's time to pick a target".
//
//   2. Cinematic letterbox bars during the trial (DEFENSE / JUDGMENT
//      / LAST_WORDS). Slam in on VOTING → DEFENSE, hold through the
//      accusation phases, retract on EXECUTION / SPARED / NO_LYNCH —
//      so the climax of the trial is literally the moment the bars
//      release.
//
// Nothing else already in MainScene.js is stepped on:
//   - NIGHT fade-to-black / from-black is left alone
//   - EXECUTION red vignette (blood-flash) is left alone — adding a
//     second flash on top of it would just be noise
//   - DEATH_REPORT blood overlay (victim-only) is left alone
const PhaseTransitionFX = ({ phase, CONSTANTS }) => {
  const prevPhaseRef = useRef(phase);
  const [transient, setTransient] = useState(null);
  const transientTimer = useRef(null);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    const cur = phase;

    let fx = null;
    if (prev === CONSTANTS.PHASE.DISCUSSION && cur === CONSTANTS.PHASE.VOTING) {
      fx = 'radial-pulse';
    }

    prevPhaseRef.current = cur;

    if (fx) {
      if (transientTimer.current) clearTimeout(transientTimer.current);
      const key = `${fx}-${Date.now()}`;
      setTransient({ kind: fx, key });
      // Keep slightly longer than the CSS animation so the key-based
      // remount always gets to finish.
      transientTimer.current = setTimeout(() => {
        setTransient((cur) => (cur?.key === key ? null : cur));
      }, 900);
    }
    return () => {
      if (transientTimer.current) clearTimeout(transientTimer.current);
    };
  }, [phase, CONSTANTS]);

  const showLetterbox = [
    CONSTANTS.PHASE.DEFENSE,
    CONSTANTS.PHASE.JUDGMENT,
    CONSTANTS.PHASE.LAST_WORDS,
  ].includes(phase);

  return (
    <>
      <div className={`phase-fx-letterbox ${showLetterbox ? 'visible' : ''}`}>
        <div className="phase-fx-letterbox-top" />
        <div className="phase-fx-letterbox-bottom" />
      </div>
      {transient?.kind === 'radial-pulse' && (
        <div key={transient.key} className="phase-fx-radial-pulse" />
      )}
    </>
  );
};

export default PhaseTransitionFX;
