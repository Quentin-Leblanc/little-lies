import React from 'react';
import './PhaseTransitionFX.scss';

// Phase-transition overlay FX. Currently drives the cinematic letterbox
// bars during the trial (DEFENSE / JUDGMENT / LAST_WORDS) — bars slam
// in on VOTING → DEFENSE, hold through the accusation phases, retract
// on EXECUTION / SPARED / NO_LYNCH so the climax of the trial is
// literally the moment the bars release.
//
// Nothing else already in MainScene.js is stepped on:
//   - NIGHT fade-to-black / from-black is left alone
//   - EXECUTION red vignette (blood-flash) is left alone — adding a
//     second flash on top of it would just be noise
//   - DEATH_REPORT blood overlay (victim-only) is left alone
const PhaseTransitionFX = ({ phase, CONSTANTS }) => {
  const showLetterbox = [
    CONSTANTS.PHASE.DEFENSE,
    CONSTANTS.PHASE.JUDGMENT,
    CONSTANTS.PHASE.LAST_WORDS,
  ].includes(phase);

  return (
    <div className={`phase-fx-letterbox ${showLetterbox ? 'visible' : ''}`}>
      <div className="phase-fx-letterbox-top" />
      <div className="phase-fx-letterbox-bottom" />
    </div>
  );
};

export default PhaseTransitionFX;
