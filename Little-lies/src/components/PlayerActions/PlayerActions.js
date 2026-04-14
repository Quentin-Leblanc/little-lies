import React, { memo, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';
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
  INVESTIGATE_ROLE: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  LOOKOUT: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  SPY: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  JAIL: { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' },
  JAILOR_EXECUTE: { bg: 'rgba(180,40,40,0.7)', hover: 'rgba(180,40,40,0.9)', color: '#fff' },
  ROLEBLOCK: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  FRAME: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  BLACKMAIL: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
};
const getActionStyle = (type) => ACTION_COLORS[type] || { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' };

const ACTION_TOOLTIPS = {
  KILL: '\u00c9limine un joueur cette nuit',
  MAFIA_KILL: 'La mafia \u00e9limine un joueur cette nuit',
  VIGILANTE_KILL: '\u00c9limine un joueur (attention aux innocents !)',
  SK_KILL: '\u00c9limine un joueur en silence',
  HEAL: 'Soigne un joueur pour le prot\u00e9ger cette nuit',
  PROTECT: 'Prot\u00e8ge un joueur d\'une attaque',
  BODYGUARD: 'Prot\u00e8ge un joueur en risquant ta vie',
  VEST: 'Porte un gilet pare-balles (nombre limit\u00e9)',
  INVESTIGATE: 'D\u00e9couvre si ce joueur est suspect ou non',
  INVESTIGATE_ROLE: 'D\u00e9couvre le r\u00f4le exact d\'un joueur',
  LOOKOUT: 'Observe qui visite ce joueur cette nuit',
  SPY: 'Espionne les activit\u00e9s de la mafia',
  JAIL: 'Emprisonne un joueur pour la nuit (bloque ses actions)',
  JAILOR_EXECUTE: 'Ex\u00e9cute le prisonnier (nombre limit\u00e9)',
  ROLEBLOCK: 'Bloque les actions d\'un joueur cette nuit',
  FRAME: 'Fait para\u00eetre un joueur suspect aux enqu\u00eateurs',
  BLACKMAIL: 'Emp\u00eache un joueur de parler le jour suivant',
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
  const isDayPhase = game.isDay && phase !== CONSTANTS.PHASE.NIGHT_TRANSITION;

  useEffect(() => {
    setActionUsed(null);
  }, [game.phase]);

  // Death flash
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
    // Immediate chat message for reveal
    addChatSystem(`${me.profile.name} s'est r\u00e9v\u00e9l\u00e9 en tant que Maire ! Ses votes comptent triple.`, '#ffd700');
  };

  // --- Vote handlers ---
  const myVoteTarget = trial.suspects && Object.keys(trial.suspects).find((suspectedId) =>
    trial.suspects[suspectedId]?.suspectedBy?.some((voteId) => voteId === me.id)
  );
  const hasVoted = !!myVoteTarget;

  const handleVoteClick = (suspectedPlayerId) => {
    if (!me.isAlive || !isVotingPhase || hasVoted) return;
    const voteWeight = me.voteWeight || 1;
    const newSuspects = { ...(trial.suspects || {}) };
    if (!newSuspects[suspectedPlayerId]) {
      newSuspects[suspectedPlayerId] = { id: suspectedPlayerId, suspectedBy: [] };
    }
    for (let i = 0; i < voteWeight; i++) {
      newSuspects[suspectedPlayerId].suspectedBy.push(me.id);
    }
    setTrial({ ...trial, suspects: newSuspects });
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
    setTrial({ ...trial, votes: { ...trial.votes, [me.id]: vote } });
  };

  // --- Day action handler (Jailor jail) ---
  const handleDayAction = (action, targetPlayer) => {
    if (action.type === 'JAIL') {
      const currentTarget = Events.getMyActionTarget('JAIL');
      if (currentTarget === targetPlayer.id) return;
      Events.replaceAction({
        type: 'JAIL',
        content: { target: targetPlayer.id, chatMessage: '', by: me.id },
        displayed: false,
      });
      setActionUsed({ type: action.label, targetName: targetPlayer.profile.name });
    }
  };

  // --- Night action handler ---
  const handleNightAction = (action, targetPlayer) => {
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

    if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return;

    const currentTarget = Events.getMyActionTarget(action.type);
    if (currentTarget === targetPlayer.id) return;

    Events.replaceAction({
      type: action.type,
      content: { target: targetPlayer.id, chatMessage: '', by: me.id },
      displayed: false,
    });
    setActionUsed({ type: action.label, targetName: targetPlayer.profile.name });
  };

  const myJudgmentVote = trial.votes?.[me.id];
  const accusedPlayer = players.find((p) => p.id === game.accusedId);
  const canReveal = me.isAlive && !me.isRevealed && me.character?.key === 'maire' && (isDiscussionPhase || isVotingPhase);

  // Jailor: get jail target for night display
  const jailTarget = me.character?.key === 'jailor' ? Events.getMyActionTarget('JAIL') : null;

  // Phase header text
  const getPhaseHeader = () => {
    if (isNightPhase) return { text: 'Actions de nuit', icon: 'fa-moon', color: '#8899cc' };
    if (isVotingPhase) return { text: 'Phase de vote', icon: 'fa-gavel', color: '#ffa502' };
    if (isJudgmentPhase) return { text: 'Jugement', icon: 'fa-scale-balanced', color: '#cc88ff' };
    if (isDefensePhase) return { text: 'D\u00e9fense', icon: 'fa-shield', color: '#ff6666' };
    if (isDiscussionPhase) return { text: 'Discussion', icon: 'fa-comments', color: '#78ff78' };
    return null;
  };
  const phaseHeader = getPhaseHeader();

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
            <i className="fas fa-landmark"></i> Maire r\u00e9v\u00e9l\u00e9 \u2014 3 votes
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
            <p><strong>{accusedPlayer.profile.name}</strong> est accus\u00e9 ! C'est le moment de se d\u00e9fendre.</p>
          </div>
        )}

        {/* Last words phase */}
        {isLastWordsPhase && accusedPlayer && (
          <div className="defense-panel">
            <p><strong>{accusedPlayer.profile.name}</strong> \u2014 Derniers mots...</p>
          </div>
        )}

        {/* Action used feedback */}
        {actionUsed && (
          <div className="action-feedback">
            <i className="fas fa-check"></i> {actionUsed.type} \u2192 {actionUsed.targetName}
          </div>
        )}

        {/* Phase header */}
        {phaseHeader && me.isAlive && (
          <div className="phase-header" style={{ color: phaseHeader.color }}>
            <i className={`fas ${phaseHeader.icon}`}></i> {phaseHeader.text}
          </div>
        )}

        {/* Player list */}
        <div className={`player-list-wrapper ${isVotingPhase ? 'highlight-vote' : ''} ${isNightPhase ? 'night-mode' : ''}`}>
        <h4 className="player-list-title"><i className="fas fa-users"></i> Joueurs vivants ({players.filter(p => p.isAlive).length}/{players.length})</h4>
        <ul className="player-list">
          {players.map((player) => {
            const isNightTarget = isNightPhase && me.isAlive && me.character?.actions?.some(
              (a) => a.type !== 'VOTE' && a.type !== 'REVEAL' && Events.getMyActionTarget(a.type) === player.id
            );
            const isDayTarget = isDayPhase && me.isAlive && jailTarget === player.id;
            const voteCount = trial?.suspects?.[player.id]?.suspectedBy?.length || 0;
            const isBlackmailed = player.isBlackmailed && game.isDay;

            return (
              <li key={player.id} className={`player-list-item ${player.id === game.accusedId ? 'accused' : ''} ${!player.isAlive ? 'is-dead' : ''} ${player.id === me.id ? 'is-me' : ''} ${isNightTarget || isDayTarget ? 'night-target' : ''}`}>
                <span className="player-name-cell">
                  <span className={`player-status-dot ${player.connected !== false ? 'dot-online' : 'dot-offline'}`}></span>
                  <span className="player-name-text" style={{ color: player.isAlive ? (player.profile?.color || '#ccc') : '#666' }}>
                    {player.profile.name}{player.id === me.id ? ' (toi)' : ''}
                  </span>
                  {player.isRevealed && (
                    <span className="revealed-badge" title="Maire r\u00e9v\u00e9l\u00e9">
                      <i className="fas fa-landmark"></i>
                    </span>
                  )}
                  {isBlackmailed && (
                    <span className="blackmailed-badge" title="B\u00e2illonn\u00e9">
                      <i className="fas fa-comment-slash"></i>
                    </span>
                  )}
                </span>

                <div className="vote-container">
                  {player.isAlive ? (
                    <>
                      {/* Vote button */}
                      {isVotingPhase && (
                        <button
                          className={`vote-btn ${myVoteTarget === player.id ? 'vote-btn-active' : ''} ${(hasVoted && myVoteTarget !== player.id) || player.id === me.id ? 'vote-btn-disabled' : ''}`}
                          onClick={() => player.id !== me.id && handleVoteClick(player.id)}
                          disabled={player.id === me.id}
                        >
                          Vote
                        </button>
                      )}
                      {isVotingPhase && (
                        <span className="vote-count-num">{voteCount}</span>
                      )}

                      {/* Day actions — Jailor JAIL during Discussion/Voting */}
                      {me.isAlive && isDayPhase && (isDiscussionPhase || isVotingPhase) && me.character?.actions?.map((action) => {
                        if (!action.require.includes('isDay')) return null;
                        if (action.type === 'REVEAL') return null; // handled separately
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;

                        const isSelected = Events.getMyActionTarget(action.type) === player.id;
                        const style = getActionStyle(action.type);
                        return (
                          <button
                            className={`action-btn ${isSelected ? 'action-btn-active' : ''}`}
                            style={{ '--action-bg': style.bg, '--action-hover': style.hover }}
                            onClick={() => handleDayAction(action, player)}
                            key={action.type}
                            title={ACTION_TOOLTIPS[action.type] || action.description || ''}
                          >
                            {action.label}
                          </button>
                        );
                      })}

                      {/* Night actions */}
                      {me.isAlive && isNightPhase && me.character?.actions?.map((action) => {
                        if (action.type === 'VOTE' || action.type === 'REVEAL') return null;
                        if (!action.require.includes('isNight')) return null;

                        if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return null;
                        if (action.type === 'VEST' && action.maxUses && !Events.hasDoneThisActionTonight(action.type) && (me.vestUses || 0) >= action.maxUses) return null;
                        if (action.type === 'JAILOR_EXECUTE') {
                          if (player.id !== jailTarget) return null;
                          if (action.maxUses && (me.jailorExecutes || 0) >= action.maxUses) return null;
                        }

                        if (action.targets === 'notMyTeam' && me.character.team === player.character?.team) return null;
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;
                        if (action.targets === 'jailed') return null;

                        const isSelected = Events.getMyActionTarget(action.type) === player.id;
                        const style = getActionStyle(action.type);
                        return (
                          <button
                            className={`action-btn ${isSelected ? 'action-btn-active' : ''}`}
                            style={{ '--action-bg': style.bg, '--action-hover': style.hover }}
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
