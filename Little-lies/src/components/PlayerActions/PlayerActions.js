import React, { memo, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';
import { playVote } from '../../utils/AudioManager';

import './playerActions.scss';

const ACTION_COLORS = {
  KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  MAFIA_KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  VIGILANTE_KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  SK_KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  HEAL: { bg: 'rgba(40,180,80,0.7)', hover: 'rgba(40,180,80,0.9)', color: '#fff' },
  PROTECT: { bg: 'rgba(40,180,80,0.7)', hover: 'rgba(40,180,80,0.9)', color: '#fff' },
  BODYGUARD: { bg: 'rgba(40,180,80,0.7)', hover: 'rgba(40,180,80,0.9)', color: '#fff' },
  VEST: { bg: 'rgba(40,140,180,0.7)', hover: 'rgba(40,140,180,0.9)', color: '#fff' },
  INVESTIGATE: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  LOOKOUT: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  SPY: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  JAIL: { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' },
  ROLEBLOCK: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  FRAME: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  BLACKMAIL: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
};
const getActionStyle = (type) => ACTION_COLORS[type] || { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' };

// Tooltips for night actions — helps new players
const ACTION_TOOLTIPS = {
  KILL: 'Élimine un joueur cette nuit',
  MAFIA_KILL: 'La mafia élimine un joueur cette nuit',
  VIGILANTE_KILL: 'Élimine un joueur (attention aux innocents !)',
  SK_KILL: 'Élimine un joueur en silence',
  HEAL: 'Soigne un joueur pour le protéger cette nuit',
  PROTECT: 'Protège un joueur d\'une attaque',
  BODYGUARD: 'Protège un joueur en risquant ta vie',
  VEST: 'Porte un gilet pare-balles (nombre limité)',
  INVESTIGATE: 'Découvre si ce joueur est suspect ou non',
  LOOKOUT: 'Observe qui visite ce joueur cette nuit',
  SPY: 'Espionne les activités de la mafia',
  JAIL: 'Emprisonne un joueur pour la nuit (bloque ses actions)',
  JAILOR_EXECUTE: 'Exécute le prisonnier (nombre limité)',
  ROLEBLOCK: 'Bloque les actions d\'un joueur cette nuit',
  FRAME: 'Fait paraître un joueur suspect aux enquêteurs',
  BLACKMAIL: 'Empêche un joueur de parler le jour suivant',
};

const PlayerActions = memo(function () {
  const { getPlayers, getMe, game, CONSTANTS, trial, setTrial, setPlayers, setGame, addChatSystem } = useGameEngine();
  const Events = useEvents();
  const players = getPlayers();
  const me = getMe();

  const [isDead, setIsDead] = useState(false);
  const [actionUsed, setActionUsed] = useState(null);
  const prevAliveRef = useRef(me?.isAlive ?? true);

  const phase = game.phase;
  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isLastWordsPhase = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isNightPhase = phase === CONSTANTS.PHASE.NIGHT;
  const isDiscussionPhase = phase === CONSTANTS.PHASE.DISCUSSION;

  useEffect(() => {
    setActionUsed(null);
  }, [game.phase]);

  // Death flash — fires exactly once when player transitions alive → dead
  useEffect(() => {
    const wasAlive = prevAliveRef.current;
    const isNowDead = me && !me.isAlive;
    prevAliveRef.current = me?.isAlive ?? true;

    if (wasAlive && isNowDead) {
      setIsDead(true);
      const timer = setTimeout(() => setIsDead(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [me?.isAlive]);

  if (!me) return null;

  // --- Mayor REVEAL action ---
  const handleReveal = () => {
    if (!me.isAlive || me.isRevealed) return;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === me.id
          ? { ...p, isRevealed: true, voteWeight: 3, canBeHealed: false }
          : p
      )
    );

    Events.add({
      type: 'REVEAL',
      content: {
        by: me.id,
        chatMessage: `${me.profile.name} s'est révélé en tant que Maire ! Ses votes comptent triple.`,
      },
      displayed: false,
    });
  };

  // --- Vote handlers (vote is final, cannot be changed) ---
  const myVoteTarget = trial.suspects && Object.keys(trial.suspects).find((suspectedId) =>
    trial.suspects[suspectedId]?.suspectedBy?.some((voteId) => voteId === me.id)
  );
  const hasVoted = !!myVoteTarget;

  const handleVoteClick = (suspectedPlayerId) => {
    if (!me.isAlive || !isVotingPhase || hasVoted) return;
    playVote();

    const voteWeight = me.voteWeight || 1;

    const newSuspects = { ...(trial.suspects || {}) };

    // Add my votes to the target
    if (!newSuspects[suspectedPlayerId]) {
      newSuspects[suspectedPlayerId] = { id: suspectedPlayerId, suspectedBy: [] };
    }
    for (let i = 0; i < voteWeight; i++) {
      newSuspects[suspectedPlayerId].suspectedBy.push(me.id);
    }

    setTrial({ ...trial, suspects: newSuspects });

    // Chat vote message
    const targetPlayer = players.find(p => p.id === suspectedPlayerId);
    const totalVotes = newSuspects[suspectedPlayerId]?.suspectedBy?.length || 0;
    const aliveCount = players.filter(p => p.isAlive).length;
    if (targetPlayer) {
      addChatSystem(`Vote ${targetPlayer.profile.name} (${totalVotes}/${aliveCount})`, 'vote');
    }
  };

  // --- Judgment handlers ---
  const handleJudgmentVote = (vote) => {
    if (!me.isAlive || !isJudgmentPhase) return;
    if (me.id === game.accusedId) return;

    setTrial({
      ...trial,
      votes: {
        ...trial.votes,
        [me.id]: vote,
      },
    });
  };

  // --- Night action handler (allows changing target) ---
  const handleNightAction = (action, targetPlayer) => {
    // Vest use tracking (only increment on first use, not on change)
    if (action.type === 'VEST' && action.maxUses) {
      const alreadyUsed = Events.hasDoneThisActionTonight(action.type);
      if (!alreadyUsed) {
        const vestUses = me.vestUses || 0;
        if (vestUses >= action.maxUses) return;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === me.id ? { ...p, vestUses: vestUses + 1 } : p
          )
        );
      }
    }

    // Jailor execute use tracking
    if (action.type === 'JAILOR_EXECUTE' && action.maxUses) {
      const alreadyUsed = Events.hasDoneThisActionTonight(action.type);
      if (!alreadyUsed) {
        const execUses = me.jailorExecutes || 0;
        if (execUses >= action.maxUses) return;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === me.id ? { ...p, jailorExecutes: execUses + 1 } : p
          )
        );
      }
    }

    // Night 1: Vigilante can't shoot
    if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return;

    // If same target, do nothing
    const currentTarget = Events.getMyActionTarget(action.type);
    if (currentTarget === targetPlayer.id) return;

    Events.replaceAction({
      type: action.type,
      content: {
        target: targetPlayer.id,
        chatMessage: '',
        by: me.id,
      },
      displayed: false,
    });
    setActionUsed({ type: action.label, targetName: targetPlayer.profile.name });
  };

  const myJudgmentVote = trial.votes?.[me.id];
  const accusedPlayer = players.find((p) => p.id === game.accusedId);

  // Check if Mayor can reveal
  const canReveal = me.isAlive && !me.isRevealed && me.character?.key === 'maire' && (isDiscussionPhase || isVotingPhase);

  return (
    <>
      {isDead && ReactDOM.createPortal(
        <div className="death-flash"></div>,
        document.body
      )}

      <div className="player-list-container">
        {/* Mayor reveal button */}
        {canReveal && (
          <button className="reveal-btn" onClick={handleReveal}>
            <i className="fas fa-landmark"></i> Maire
          </button>
        )}

        {/* Revealed Mayor indicator */}
        {me.isRevealed && me.character?.key === 'maire' && (
          <div className="revealed-banner">
            <i className="fas fa-landmark"></i> Maire révélé — 3 votes
          </div>
        )}

        {/* Judgment phase */}
        {isJudgmentPhase && accusedPlayer && me.id !== game.accusedId && me.isAlive && (
          <div className="judgment-panel">
            <p>{accusedPlayer.profile.name} est-il coupable ?</p>
            <div className="judgment-buttons">
              <button
                className={`primaryBtn judgment-guilty ${myJudgmentVote === 'guilty' ? 'active' : ''}`}
                onClick={() => handleJudgmentVote('guilty')}
                disabled={!!myJudgmentVote}
              >
                Coupable
              </button>
              <button
                className={`primaryBtn judgment-innocent ${myJudgmentVote === 'innocent' ? 'active' : ''}`}
                onClick={() => handleJudgmentVote('innocent')}
                disabled={!!myJudgmentVote}
              >
                Innocent
              </button>
              <button
                className={`primaryBtn judgment-abstain ${myJudgmentVote === 'abstain' ? 'active' : ''}`}
                onClick={() => handleJudgmentVote('abstain')}
                disabled={!!myJudgmentVote}
              >
                Abstention
              </button>
            </div>
          </div>
        )}

        {/* Defense phase */}
        {isDefensePhase && accusedPlayer && (
          <div className="defense-panel">
            <p><strong>{accusedPlayer.profile.name}</strong> est accusé ! C'est le moment de se défendre.</p>
          </div>
        )}

        {/* Last words phase */}
        {isLastWordsPhase && accusedPlayer && (
          <div className="defense-panel">
            <p><strong>{accusedPlayer.profile.name}</strong> — Derniers mots...</p>
          </div>
        )}

        {/* Player list — always show all players */}
        <div className={`player-list-wrapper ${isVotingPhase ? 'highlight-vote' : ''}`}>
        <h4 className="player-list-title"><i className="fas fa-users"></i> Joueurs vivants ({players.filter(p => p.isAlive).length}/{players.length})</h4>
        <ul className="player-list">
          {players.map((player) => {
            const hasActions = me.isAlive && player.isAlive;
            const isNightTarget = isNightPhase && me.isAlive && me.character?.actions?.some(
              (a) => a.type !== 'VOTE' && a.type !== 'REVEAL' && Events.getMyActionTarget(a.type) === player.id
            );
            return (
              <li key={player.id} className={`player-list-item ${player.id === game.accusedId ? 'accused' : ''} ${!player.isAlive ? 'is-dead' : ''} ${player.id === me.id ? 'is-me' : ''} ${isNightTarget ? 'night-target' : ''}`}
                style={player.isAlive ? { background: player.profile.color || '#888' } : undefined}
              >
                <span className="player-name-cell">
                  <i className="fas fa-gem player-color-icon" style={{ color: '#fff' }} />
                  <span style={{ color: '#fff' }}>
                    {player.profile.name}{player.id === me.id ? ' (toi)' : ''}
                  </span>
                  {player.isRevealed && (
                    <span className="revealed-badge" title="Maire révélé">
                      <i className="fas fa-landmark"></i>
                    </span>
                  )}
                </span>

                <div className="vote-container">
                  {player.isAlive ? (
                    <>
                      {/* Vote button during VOTING phase — disabled after voting */}
                      {me.isAlive && player.id !== me.id && isVotingPhase && (
                        <button
                          className={`vote-btn ${myVoteTarget === player.id ? 'vote-btn-active' : ''} ${hasVoted && myVoteTarget !== player.id ? 'vote-btn-disabled' : ''}`}
                          onClick={() => handleVoteClick(player.id)}
                        >
                          Vote
                        </button>
                      )}
                      {isVotingPhase && (
                        <span className={`vote-count ${(trial?.suspects[player.id]?.suspectedBy?.length || 0) > 0 ? 'has-votes' : ''}`}>
                          {trial?.suspects[player.id]?.suspectedBy?.length || 0}/{players.filter(p => p.isAlive).length}
                        </span>
                      )}

                      {/* Night actions — stays visible, pressed when selected */}
                      {me.isAlive && isNightPhase && me.character?.actions?.map((action) => {
                        if (action.type === 'VOTE' || action.type === 'REVEAL') return null;
                        if (!action.require.includes('isNight')) return null;

                        if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return null;
                        if (action.type === 'VEST' && action.maxUses && !Events.hasDoneThisActionTonight(action.type) && (me.vestUses || 0) >= action.maxUses) return null;
                        // Jailor execute: only show on the jailed target, and respect max uses
                        if (action.type === 'JAILOR_EXECUTE') {
                          const jailTarget = Events.getMyActionTarget('JAIL');
                          if (player.id !== jailTarget) return null;
                          if (action.maxUses && (me.jailorExecutes || 0) >= action.maxUses) return null;
                        }

                        if (action.targets === 'notMyTeam' && me.character.team === player.character?.team) return null;
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;
                        if (action.targets === 'jailed') return null; // handled above for JAILOR_EXECUTE

                        const isSelected = Events.getMyActionTarget(action.type) === player.id;
                        return (
                          <button
                            className={`action-btn ${isSelected ? 'action-btn-active' : ''}`}
                            onClick={() => handleNightAction(action, player)}
                            key={action.type}
                            title={ACTION_TOOLTIPS[action.type] || action.description || ''}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <span className="dead-label">mort</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        </div>
      </div>
    </>
  );
});

export default PlayerActions;
