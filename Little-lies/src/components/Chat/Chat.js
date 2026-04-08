import React, { useEffect, useRef, useState } from 'react';
import { useMultiplayerState, me as prk_me } from 'playroomkit';
import { useGameEngine } from '../../hooks/useGameEngine';

import './chat.scss';

const MESSAGE_LIMIT = 5;
const TIME_FRAME = 5000;
const TIMEOUT_DURATION = 10000;

function Chat(props) {
  const { game, getMe, getPlayers, updatePlayerName, setPlayers, CONSTANTS, voteSkip } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  const myName = me?.profile?.name;
  const myColor = me?.profile?.color;
  const myTeam = me?.character?.team;
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useMultiplayerState('chatMessages');
  const [inputValues, setInputValues] = useState('');
  const [inputError, setInputError] = useState('');
  const [timeouts, setTimeouts] = useState({});
  const [messageTimestamps, setMessageTimestamps] = useState({});

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const regex = /^[a-zA-Z0-9\sÀ-ÖØ-öø-ÿ.,?!'"\-()/:@]+$/;
    if (value === '' || regex.test(value)) {
      setInputError('');
    } else {
      setInputError('Caractère non permis.');
    }
    setInputValues(value);
  };

  // --- Command handling (normalized: prefix stripped, lowercase) ---
  const handleCommand = (command, args) => {
    const allMessages = messages || [];

    if (command === 'name' && args.length > 0 && game.isGameSetup) {
      const newName = args.join(' ');
      setMessages([
        ...allMessages,
        {
          player: 'system',
          color: 'white',
          content: `${prk_me().state.profile.name} a changé son pseudo en ${newName}`,
          type: 'system',
          dayCount: game.dayCount,
          chat: 'default',
        },
      ]);
      prk_me().state.profile.name = newName;
      updatePlayerName(prk_me().id, newName);
      return true;
    }

    // Whisper: /pm <playerName> <message>
    if (command === 'pm' && args.length >= 2) {
      const targetName = args[0];
      const whisperContent = args.slice(1).join(' ');
      const targetPlayer = players.find(
        (p) => p.profile.name.toLowerCase() === targetName.toLowerCase()
      );

      if (!targetPlayer) {
        setInputError(`Joueur "${targetName}" introuvable.`);
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      if (!targetPlayer.isAlive) {
        setInputError('Impossible de chuchoter aux morts.');
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      // Public notice that a whisper was sent
      const whisperNotice = {
        player: 'system',
        color: '#aaa',
        content: `${myName} chuchote à ${targetPlayer.profile.name}`,
        type: 'whisper_notice',
        dayCount: game.dayCount,
        chat: 'default',
      };

      // Actual whisper content (only visible to sender and receiver)
      const whisperMsg = {
        player: myName,
        color: '#da70d6',
        content: whisperContent,
        type: 'whisper',
        senderId: me.id,
        receiverId: targetPlayer.id,
        receiverName: targetPlayer.profile.name,
        dayCount: game.dayCount,
        chat: 'whisper',
      };

      setMessages([...allMessages, whisperNotice, whisperMsg]);
      return true;
    }

    // Last will: /lw <message>
    if (command === 'lw' || command === 'lastwill') {
      if (!me?.isAlive) {
        setInputError('Les morts ne peuvent pas écrire de testament.');
        setTimeout(() => setInputError(''), 3000);
        return true;
      }
      const lwContent = args.join(' ');
      if (lwContent.length === 0) {
        setInputError('Usage : -lw <votre testament>');
        setTimeout(() => setInputError(''), 3000);
        return true;
      }
      // Update player's last will
      setPlayers(
        players.map((p) =>
          p.id === me.id ? { ...p, lastWill: lwContent } : p
        )
      );
      setMessages([
        ...allMessages,
        {
          player: 'system',
          color: '#daa520',
          content: `Testament mis à jour.`,
          type: 'system',
          dayCount: game.dayCount,
          chat: 'self',
          senderId: me.id,
        },
      ]);
      return true;
    }

    // Skip day: /skip
    if (command === 'skip') {
      if (!me?.isAlive) {
        setInputError('Les morts ne peuvent pas voter.');
        setTimeout(() => setInputError(''), 3000);
        return true;
      }
      if (!game.isDay || (game.phase !== CONSTANTS.PHASE.DISCUSSION && game.phase !== CONSTANTS.PHASE.VOTING)) {
        setInputError('Skip possible uniquement en discussion ou vote.');
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      const result = voteSkip(me.id);
      if (!result.success) {
        setInputError('Vous avez déjà voté pour skip.');
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      setMessages([
        ...allMessages,
        {
          id: `skip-${Date.now()}`,
          player: 'system',
          color: '#aaa',
          content: `${myName} veut passer — Skip (${result.count}/${result.total})`,
          type: 'system',
          dayCount: game.dayCount,
          chat: 'default',
        },
      ]);
      return true;
    }

    return false;
  };

  // --- Send message ---
  const sendMessage = () => {
    if (inputValues.trim() === '' || inputError !== '') return;

    // Handle commands (both / and - prefixes)
    if (inputValues.startsWith('-') || inputValues.startsWith('/')) {
      const [rawCommand, ...args] = inputValues.split(' ');
      const command = rawCommand.slice(1).toLowerCase();
      if (handleCommand(command, args)) {
        setInputValues('');
        return;
      }
    }

    // Spam check
    const now = Date.now();
    const timestamps = messageTimestamps[myName] || [];
    const recentTimestamps = timestamps.filter((t) => now - t < TIME_FRAME);

    if (recentTimestamps.length >= MESSAGE_LIMIT) {
      setTimeouts({ ...timeouts, [myName]: now + TIMEOUT_DURATION });
      setInputError('Ne spammez pas.');
      setTimeout(() => {
        setTimeouts((prev) => {
          const { [myName]: _, ...rest } = prev;
          return rest;
        });
        setInputError('');
      }, TIMEOUT_DURATION);
      return;
    }

    const isDead = me && !me.isAlive;
    const isNight = game.phase === CONSTANTS.PHASE.NIGHT;

    // Determine chat channel
    let chatChannel = 'default';
    if (isDead) {
      chatChannel = 'dead';
    } else if (isNight && myTeam === 'mafia') {
      chatChannel = 'mafia';
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      player: myName,
      playerId: me?.id,
      color: isDead ? '#666' : myColor,
      content: inputValues.trim(),
      team: myTeam,
      chat: chatChannel,
      type: 'player',
      dayCount: game.dayCount,
      isDead,
    };

    setMessages([...(messages || []), message]);
    setMessageTimestamps({
      ...messageTimestamps,
      [myName]: [...recentTimestamps, now],
    });
    setInputValues('');
  };

  // --- State checks ---
  const isPlayerInTimeout = timeouts[myName] && Date.now() < timeouts[myName];
  const isDead = me && !me.isAlive;
  const isNight = game.phase === CONSTANTS.PHASE.NIGHT;
  const isDefensePhase = game.phase === CONSTANTS.PHASE.DEFENSE || game.phase === CONSTANTS.PHASE.LAST_WORDS;
  const isAnnouncementPhase = game.phase === CONSTANTS.PHASE.NO_LYNCH || game.phase === CONSTANTS.PHASE.SPARED || game.phase === CONSTANTS.PHASE.EXECUTION;
  const isAccused = me?.id === game.accusedId;
  const isBlackmailed = me?.isBlackmailed && game.isDay;
  const isMutedByPhase = (isDefensePhase && !isAccused && !isDead) || isAnnouncementPhase;

  // Dead players can always chat (in dead chat) unless it's a mute phase
  const canChat = isDead ? true : !isMutedByPhase && !isBlackmailed && !isPlayerInTimeout;

  // --- Message filtering ---
  const filterMessage = (message) => {
    // System messages always visible
    if (message.type === 'system') return true;
    // Whisper notices always visible
    if (message.type === 'whisper_notice') return true;

    // Whispers: only visible to sender and receiver (and blackmailer on mafia team)
    if (message.chat === 'whisper') {
      if (message.senderId === me?.id || message.receiverId === me?.id) return true;
      if (me?.character?.key === 'blackmailer') return true;
      return false;
    }

    // Self messages: only visible to the sender
    if (message.chat === 'self') {
      return message.senderId === me?.id;
    }

    // Dead chat: only visible to dead players
    if (message.chat === 'dead') {
      return isDead;
    }

    // Mafia chat: visible to mafia members + Spy (passive ability)
    if (message.chat === 'mafia') {
      if (myTeam === 'mafia') return true;
      if (me?.character?.key === 'spy' && me?.isAlive) return true;
      return false;
    }

    // Default chat: always visible to alive, visible to dead too
    if (message.chat === 'default') return true;

    return false;
  };

  // Show full game history — day separators provide visual breaks
  const filteredMessages = (messages || [])
    .filter(filterMessage);

  // Find last day separator to gray everything before it
  // Only "--- Jour X ---" counts as separator (not "La nuit tombe" which is mid-day)
  let lastSeparatorIndex = -1;
  for (let i = filteredMessages.length - 1; i >= 0; i--) {
    const c = filteredMessages[i].content;
    if (filteredMessages[i].type === 'system' && c?.startsWith('--- Jour')) {
      lastSeparatorIndex = i;
      break;
    }
  }

  // Villager night: can see chat (grayed out, read-only) but not write
  const isSpy = me?.character?.key === 'spy';
  const isVillagerNight = props.night && myTeam !== 'mafia' && !isSpy && !isDead;

  // Placeholder text
  let placeholder = 'Entrez un message...';
  if (isVillagerNight) placeholder = 'La nuit tombe sur le village...';
  else if (isDead) placeholder = 'Chat des morts...';
  else if (isBlackmailed) placeholder = 'Vous avez été bâillonné...';
  else if (isMutedByPhase) placeholder = "Seul l'accusé peut parler...";
  else if (isPlayerInTimeout) placeholder = 'Vous êtes en timeout...';
  else if (isNight && myTeam === 'mafia') placeholder = 'Chat mafia...';

  const isDisabled = isVillagerNight || !canChat || (isMutedByPhase && !isDead);

  // Message CSS class
  const getMessageClass = (message) => {
    if (message.type === 'system') return 'msg-system';
    if (message.type === 'whisper_notice') return 'msg-whisper-notice';
    if (message.chat === 'whisper') return 'msg-whisper';
    if (message.chat === 'dead') return 'msg-dead';
    if (message.chat === 'mafia') return 'msg-mafia';
    return '';
  };

  // Format message prefix
  const formatPrefix = (message) => {
    if (message.type === 'system') return null;
    if (message.type === 'whisper_notice') return null;
    if (message.chat === 'whisper') {
      if (message.senderId === me?.id) {
        return <span className="whisper-prefix">{'[MP → ' + message.receiverName + ']'}</span>;
      }
      return <span className="whisper-prefix">{'[MP ← ' + message.player + ']'}</span>;
    }
    if (message.chat === 'dead') return <span className="dead-prefix">[Mort]</span>;
    if (message.chat === 'mafia') return <span className="mafia-prefix">[Mafia]</span>;
    return null;
  };

  return (
    <div
      className={`chat-container ${props.night ? 'chat-night' : ''} ${isDead ? 'chat-dead-mode' : ''} ${isVillagerNight ? 'chat-villager-night' : ''}`}
      ref={chatContainerRef}
    >
      {isDead && <div className="dead-chat-banner"><i className="fas fa-ghost"></i> Chat des morts</div>}
      <div className="chat-messages">
        {filteredMessages.map((message, index) => {
          // Admin messages are never grayed
          const isAdmin = message.type === 'system' && message.content?.startsWith('[ADMIN]');
          // Gray system messages: before last day separator OR all during night
          const isPastSystem = !isAdmin && message.type === 'system' && (
            index < lastSeparatorIndex || isNight
          );
          const pastClass = isPastSystem ? 'msg-past' : '';

          // System messages: render as clean separator
          if (message.type === 'system') {
            return (
              <div className={`chat-message-wrapper msg-system ${isAdmin ? 'msg-admin' : ''} ${pastClass}`} key={message.id || index}>
                <div className="chat-message chat-day-separator">
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div className={`chat-message-wrapper ${getMessageClass(message)}`} key={message.id || index}>
              <div
                className="chat-message-background"
                style={{ backgroundColor: message.color }}
              ></div>
              <div className="chat-message">
                {formatPrefix(message)}
                {message.type !== 'whisper_notice' && (
                  <strong style={{ color: message.color }}>{message.player}</strong>
                )}
                {message.type === 'whisper_notice' ? (
                  <span className="whisper-notice-text">{message.content}</span>
                ) : (
                  <span>: {message.content}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>
      <div className="chat-input-container">
        <input
          className={`chat-input ${inputError ? 'invalid-char' : ''}`}
          type="text"
          value={inputValues}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
        />
        <button
          className="chat-send-button"
          onClick={sendMessage}
          disabled={inputError !== '' || isDisabled}
        >
          Envoyer
        </button>
        {inputError && <div className="invalid-char-message">{inputError}</div>}
      </div>
    </div>
  );
}

export default Chat;
