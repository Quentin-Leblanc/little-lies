import React, { useRef, useState, useEffect } from 'react';
import { useMultiplayerState } from 'playroomkit';
import { useGameEngine } from '../../hooks/useGameEngine';
import Audio from '../../utils/AudioManager';
import i18n from '../../trad/i18n';

// Side-effect import — registers the GLB preload hooks so the village
// assets warm up in cache as soon as the game module loads. The R3F
// payload itself is now hosted by UnifiedScene's <VillageView />.
import './preloads';
import { getNightAmbiance } from './utils';
import PhaseTransitionFX from '../Effects/PhaseTransitionFX';
import RoleCard from '../RoleCard/RoleCard';

import './MainScene.scss';

// ============================================================
// MainScene — HTML overlay orchestrator. The R3F village now lives
// in <UnifiedScene><VillageView /></UnifiedScene>, so this component
// no longer renders a Canvas. What it owns:
//
//   - phase-driven HTML overlays (blood vignette for the local victim,
//     death report card, lynch role reveal, scene announcements,
//     night-fade to/from black, night/day flavor text)
//   - the random "flavor" text rotations tied to phase transitions
//   - PhaseTransitionFX (radial pulses + cinematic letterbox bars)
//
// State that drives R3F output (player positions, camera focus, walk
// transitions, pause-mode controls, sunset lighting) has been moved
// to <VillageView /> which now consumes the same useGameEngine state
// directly. Both copies compute deterministically from the same shared
// state, so they stay in sync without extra coordination.
// ============================================================
const MainScene = () => {
  const { game, getPlayers, getMe, CONSTANTS } = useGameEngine();
  const [events] = useMultiplayerState('events', []);
  const players = getPlayers();
  const me = getMe();
  const phase = game.phase;

  // Black fade + overlay text drives the night/day transition cinematic.
  // All timers are tracked in a ref so a rapid phase change clears the
  // pending fade chain.
  const [nightFade, setNightFade] = useState('none'); // 'none' | 'to-black' | 'from-black'
  const [showNightText, setShowNightText] = useState(false);
  const [showDayText, setShowDayText] = useState(false);
  const [nightAmbianceMsg, setNightAmbianceMsg] = useState(null);
  const [showDeathReport, setShowDeathReport] = useState(false);
  const [showBloodEffect, setShowBloodEffect] = useState(false);
  const [showExecutionFlash, setShowExecutionFlash] = useState(false);
  const [dayRisingText, setDayRisingText] = useState(null);
  const [peacefulNightText, setPeacefulNightText] = useState(null);
  const [nightTransitionText, setNightTransitionText] = useState(null);
  const [noLynchText, setNoLynchText] = useState(null);

  // Gates — re-fire-once-per-day refs so chained pre-night phases
  // (e.g. EXECUTION → EXECUTION_REVEAL → NIGHT_TRANSITION) don't
  // re-roll the same flavor text three times in a row.
  const lastPhaseForFade = useRef(phase);
  const fadeTimers = useRef([]);
  const nightStartedForDay = useRef(null);
  const introToDayFired = useRef(false);
  const morningStartedForDay = useRef(null);

  const PRE_NIGHT_PHASES = [
    CONSTANTS.PHASE.NO_LYNCH, CONSTANTS.PHASE.SPARED,
    CONSTANTS.PHASE.EXECUTION,
    CONSTANTS.PHASE.NIGHT_TRANSITION,
  ];

  useEffect(() => {
    fadeTimers.current.forEach(clearTimeout);
    fadeTimers.current = [];

    if (PRE_NIGHT_PHASES.includes(phase)) {
      const isFirstPreNightThisDay = nightStartedForDay.current !== game.dayCount;

      if (isFirstPreNightThisDay) {
        nightStartedForDay.current = game.dayCount;
        const nightVariants = i18n.t('game:night_transition_variants', { returnObjects: true });
        if (Array.isArray(nightVariants) && nightVariants.length > 0) {
          setNightTransitionText(nightVariants[Math.floor(Math.random() * nightVariants.length)]);
        } else {
          setNightTransitionText(i18n.t('game:phases.NIGHT_TRANSITION'));
        }
        if (phase === CONSTANTS.PHASE.NO_LYNCH) {
          const noLynchVariants = i18n.t('game:no_lynch_variants', { returnObjects: true });
          if (Array.isArray(noLynchVariants) && noLynchVariants.length > 0) {
            setNoLynchText(noLynchVariants[Math.floor(Math.random() * noLynchVariants.length)]);
          } else {
            setNoLynchText(i18n.t('game:scene.no_lynch'));
          }
        }
      }
      const fadeDelay = phase === CONSTANTS.PHASE.NIGHT_TRANSITION ? 0 : 4000;
      const textDelay = phase === CONSTANTS.PHASE.NIGHT_TRANSITION ? 0 : 3500;
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, fadeDelay));
      if (isFirstPreNightThisDay) {
        fadeTimers.current.push(setTimeout(() => {
          setShowNightText(true);
        }, textDelay));
      }
    }

    if (phase === CONSTANTS.PHASE.NIGHT && lastPhaseForFade.current !== CONSTANTS.PHASE.NIGHT) {
      fadeTimers.current.push(setTimeout(() => setShowNightText(false), 3000));
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => setNightFade('none'), 1500));

      const nightDuration = CONSTANTS.DURATIONS?.NIGHT || 30000;
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, nightDuration - 3000));

      const shuffled = [...getNightAmbiance()].sort(() => Math.random() - 0.5);
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[0]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 6000));
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[1]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 13000));
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[2]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 20000));
    }

    if (lastPhaseForFade.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT) {
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('none');
      }, 2000));
    }

    lastPhaseForFade.current = phase;
    return () => fadeTimers.current.forEach(clearTimeout);
  }, [phase]);

  // Execution flash — red vignette during EXECUTION phase, before the text.
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.EXECUTION) {
      setShowExecutionFlash(true);
      return () => setShowExecutionFlash(false);
    }
    setShowExecutionFlash(false);
  }, [phase]);

  // Day-1 opening — intro cinematic feeds directly into DISCUSSION.
  // Drop a single "Le village se lève..." line so the first day actually
  // breathes before the chat + HUD fade in.
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.INTRO_CINEMATIC) {
      introToDayFired.current = false;
      return;
    }
    if (phase !== CONSTANTS.PHASE.DISCUSSION) return;
    if ((game?.dayCount || 0) !== 1) return;
    if (introToDayFired.current) return;
    introToDayFired.current = true;
    const variants = i18n.t('game:day_rising_variants', { returnObjects: true });
    const picked = Array.isArray(variants) && variants.length > 0
      ? variants[Math.floor(Math.random() * variants.length)]
      : i18n.t('game:phases.DAY_RISING');
    setDayRisingText(picked);
    const t0 = setTimeout(() => setShowDayText(true), 50);
    const t1 = setTimeout(() => setShowDayText(false), 2600);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [phase, game.dayCount]);

  // Death report sequence — "Le village se lève..." → blood vignette
  // → reveal deaths. Re-rolls flavor variants on each entry so mornings
  // don't feel copy-pasted. Gated on dayCount > 1 (day 1 has no prior
  // night so a stale DEATH_REPORT shouldn't ring the death bell).
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.DEATH_REPORT && (game?.dayCount || 0) > 1) {
      const pickRandom = (key, fallback) => {
        const arr = i18n.t(key, { returnObjects: true });
        if (Array.isArray(arr) && arr.length > 0) {
          return arr[Math.floor(Math.random() * arr.length)];
        }
        return fallback;
      };
      setDayRisingText(pickRandom('game:day_rising_variants', i18n.t('game:phases.DAY_RISING')));
      setPeacefulNightText(pickRandom('game:peaceful_night_variants', i18n.t('game:system.peaceful_night')));

      const killEvents = (events || []).filter(
        (e) => (e.type === 'KILL_RESULT' || e.type === 'disconnect') &&
          e.dayCount === game.dayCount &&
          e.content?.chatMessage,
      );

      // First-fire-per-day gate. Without it, re-entering DEATH_REPORT
      // (e.g. host reconnect) would ring the bell again.
      const firstDeathReportThisDay = morningStartedForDay.current !== game.dayCount;
      if (firstDeathReportThisDay) {
        morningStartedForDay.current = game.dayCount;
      }

      const t0 = setTimeout(() => setShowDayText(true), 800);
      const t1 = setTimeout(() => setShowDayText(false), 3000);
      const t2 = setTimeout(() => setShowBloodEffect(true), 3000);
      const t3 = setTimeout(() => {
        setShowDeathReport(true);
        if (firstDeathReportThisDay && killEvents.length > 0) Audio.playDeathBell();
      }, 3300);

      return () => {
        clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      };
    }
    setShowDeathReport(false);
    setShowBloodEffect(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="main-scene-3d">
      {/* Phase-transition FX — radial pulse on DISCUSSION → VOTING and
          cinematic letterbox bars during the trial (DEFENSE / JUDGMENT
          / LAST_WORDS). Retracts on EXECUTION / SPARED / NO_LYNCH so
          the climax is literally the bars releasing. */}
      <PhaseTransitionFX phase={phase} CONSTANTS={CONSTANTS} />

      {/* Blood effect — only the local player who actually died sees the
          bloody teeth vignette. Every living villager getting it each
          morning flattened the "it's YOU" punch of the effect. */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && showBloodEffect && (() => {
        if (!me?.id) return null;
        const wasKilled = (events || []).some(
          (e) => e.type === 'KILL_RESULT'
            && e.dayCount === game.dayCount
            && e.content?.target === me.id,
        );
        if (!wasKilled) return null;
        return (
          <div className="blood-overlay">
            <div className="blood-overlay-inner">
              <div className="blood-vignette" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
            </div>
          </div>
        );
      })()}

      {/* Lynch role reveal — post-execution suspense moment. 5s dedicated
          phase so the room has time to read "X was judged guilty" and
          the role reveal before the screen fades to night. Skipped
          entirely when the house rule "reveal on death" is off. */}
      {phase === CONSTANTS.PHASE.EXECUTION_REVEAL
        && game?.config?.rules?.revealOnDeath !== false
        && (() => {
          const executed = players.find((p) => p.id === game.accusedId);
          if (!executed?.character) return null;
          const role = executed.character;
          // The card prints the role name and the faction itself, so
          // neither is looked up here any more.
          return (
            <div className="lynch-reveal-overlay">
              <div
                className="lynch-reveal-halo"
                style={{
                  background: `radial-gradient(ellipse at center, ${role.couleur}88 0%, ${role.couleur}44 25%, ${role.couleur}1c 50%, transparent 75%)`,
                }}
              />
              <div
                className="lynch-reveal-card"
                style={{
                  borderColor: role.couleur,
                  boxShadow: `0 0 40px ${role.couleur}55, 0 0 100px ${role.couleur}2a`,
                }}
              >
                <div className="lynch-reveal-verdict">
                  {i18n.t('game:lynch_reveal.verdict', { name: executed.profile?.name || '?', defaultValue: '{{name}} has been found guilty' })}
                </div>
                <div className="lynch-reveal-role-label">
                  {i18n.t('game:lynch_reveal.role_was', { defaultValue: 'Their role was:' })}
                </div>
                {/* The dead player's card, turned face-up. Same object
                    the player met on their own reveal and sees in the
                    deck — the table learns "that was a Piégeur" from an
                    image, not a line of text. */}
                <div className="lynch-reveal-cardslot">
                  <RoleCard role={role} size="lg" showTeam />
                </div>
              </div>
            </div>
          );
        })()}

      {/* Death report — narrative + role card + testament for each victim. */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && showDeathReport && (game?.dayCount || 0) > 1 && (() => {
        const killEvents = (events || []).filter(
          (e) => (e.type === 'KILL_RESULT' || e.type === 'disconnect') && e.dayCount === game.dayCount && e.content?.chatMessage,
        );
        const hasDead = killEvents.length > 0;

        return (
          <div className={`death-report-overlay ${hasDead ? 'has-dead' : 'no-dead'}`}>
            <div className="death-report-card">
              {hasDead ? (
                killEvents.map((entry, i) => {
                  const c = entry.content;
                  const roleLabelI18n = c.roleKey
                    ? i18n.t(`roles:${c.roleKey}.label`, { defaultValue: c.roleLabel })
                    : c.roleLabel;
                  const narrative = c.victimName && c.flavor
                    ? i18n.t('game:death_messages.death_announce', {
                      name: c.victimName,
                      flavor: c.flavor,
                      defaultValue: `${c.victimName} n'a pas survécu à la nuit... ${c.flavor}`,
                    })
                    : (c.chatMessage || '').split(/\n|📜/)[0];
                  return (
                    <div key={i} className="death-report-entry">
                      <div className="death-desc">{narrative}</div>
                      {c.roleKey && (
                        <div
                          className="death-role-card"
                          style={{
                            borderColor: c.roleColor || '#aaa',
                            boxShadow: `0 0 22px ${(c.roleColor || '#aaa')}44`,
                          }}
                        >
                          <div className="death-role-label">
                            {i18n.t('game:lynch_reveal.role_was', { defaultValue: 'Son rôle était :' })}
                          </div>
                          <div className="death-role-body" style={{ color: c.roleColor || '#fff' }}>
                            {c.roleIcon && <i className={`fas ${c.roleIcon}`}></i>}
                            <span>{roleLabelI18n}</span>
                          </div>
                          {c.roleDescription && (
                            <div className="death-role-desc">{c.roleDescription}</div>
                          )}
                        </div>
                      )}
                      {c.lastWill && (
                        <div className="death-will">
                          <i className="fas fa-scroll" aria-hidden="true"></i>
                          <span className="death-will-label">{i18n.t('game:death_messages.will_label', { defaultValue: 'Testament' })}</span>
                          <span className="death-will-text">«&nbsp;{c.lastWill}&nbsp;»</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="death-report-safe">{peacefulNightText || i18n.t('game:system.peaceful_night')}</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Scene announcements */}
      {phase === CONSTANTS.PHASE.NO_LYNCH && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 2.5s ease-out forwards' }}>
          <div className="announcement-text">{noLynchText || i18n.t('game:scene.no_lynch')}</div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.SPARED && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 3s ease-out forwards' }}>
          <div className="announcement-text announcement-spared">
            {i18n.t('game:scene.spared', { name: players.find((p) => p.id === game.accusedId)?.profile.name || '?' })}
          </div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.EXECUTION && (
        <>
          {showExecutionFlash && (
            <div className="blood-overlay" style={{ animation: 'blood-flash 2.5s ease-out forwards' }}>
              <div className="blood-overlay-inner">
                <div className="blood-vignette" />
              </div>
            </div>
          )}
          <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 2.5s ease-out 0.8s both' }}>
            <div className="announcement-text announcement-execution">
              {i18n.t('game:scene.executed', { name: players.find((p) => p.id === game.accusedId)?.profile.name || '?' })}
            </div>
          </div>
        </>
      )}

      {/* Admin pause overlay — shows for 5s then fades */}
      {game.adminFreeRoam && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 5s ease-out forwards' }}>
          <div className="announcement-text" style={{ fontSize: '42px', letterSpacing: '8px', border: '2px solid rgba(255,68,68,0.4)' }}>
            <i className="fas fa-pause" style={{ marginRight: 12 }}></i> PAUSE
          </div>
        </div>
      )}

      {/* Admin custom announcement */}
      {game.adminAnnouncement && !game.adminFreeRoam && (
        <div className="scene-announcement">
          <div className="announcement-text" style={{ borderLeft: '3px solid #ff4444' }}>
            {game.adminAnnouncement}
          </div>
        </div>
      )}

      {/* Night↔Day black fade transition */}
      {nightFade === 'to-black' && <div className="night-fade-to-black" />}
      {nightFade === 'from-black' && <div className="night-fade-from-black" />}
      {showNightText && (
        <div className="night-text-overlay">
          <div className="night-text-content text-night">{nightTransitionText || i18n.t('game:phases.NIGHT_TRANSITION')}</div>
        </div>
      )}
      {showDayText && (
        <div className="night-text-overlay is-day-text">
          <div className="night-text-content">{dayRisingText || i18n.t('game:phases.DAY_RISING')}</div>
        </div>
      )}
      {nightAmbianceMsg && (
        <div className="night-text-overlay" key={nightAmbianceMsg}>
          <div className="night-text-content text-night night-text-ambiance">{nightAmbianceMsg}</div>
        </div>
      )}
    </div>
  );
};

export default MainScene;
