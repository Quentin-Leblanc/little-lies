import React, { useEffect, useRef, useState } from 'react';
import { useMultiplayerState, me as prk_me } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import i18n from '../../trad/i18n';
import { useGameEngine } from '../../hooks/useGameEngine';
import Audio from '../../utils/AudioManager';
import './chat.scss';

const MESSAGE_LIMIT = 5;
const TIME_FRAME = 5000;
const TIMEOUT_DURATION = 10000;

function Chat(props) {
  const { t } = useTranslation(['game', 'common']);
  const { game, getMe, getPlayers, updatePlayerName, setPlayers, CONSTANTS, voteSkip, updateActivity } = useGameEngine();
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
  const [inputVisible, setInputVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Play a cue ONLY when a fresh vote lands in the chat (the "Vote Alice
  // (2/5)" system lines pushed by PlayerActions). Everything else —
  // player chat, death reports, day separators, reconnect lines — stays
  // silent. First mount and state reloads are ignored so yesterday's
  // vote lines don't re-trigger the sound when Playroom replays history.
  const prevMsgCountRef = useRef(null);
  useEffect(() => {
    const current = messages || [];
    if (prevMsgCountRef.current === null) {
      prevMsgCountRef.current = current.length;
      return;
    }
    if (current.length > prevMsgCountRef.current) {
      const last = current[current.length - 1];
      const isFreshVote =
        last?.type === 'system' &&
        last?.color === 'vote' &&
        last?.dayCount === game.dayCount;
      if (isFreshVote) {
        Audio.playVote();
      }
    }
    prevMsgCountRef.current = current.length;
  }, [messages, game.dayCount]);

  // Open input on Enter key (global)
  useEffect(() => {
    const onGlobalKey = (e) => {
      if (e.key === 'Enter' && !inputVisible && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setInputVisible(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [inputVisible]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValues.trim()) {
        sendMessage();
        setInputVisible(false);
      }
      // If empty, keep input open
    }
    if (e.key === 'Escape') {
      setInputVisible(false);
      setInputValues('');
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const regex = /^[a-zA-Z0-9\s\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF.,?!'"\-()/:@]+$/;
    if (value === '' || regex.test(value)) {
      setInputError('');
    } else {
      setInputError(t('game:chat.invalid_char'));
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
          content: i18n.t('game:system.name_changed', { oldName: prk_me().state.profile.name, newName }),
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
        setInputError(t('game:chat.player_not_found', { name: targetName }));
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      if (!targetPlayer.isAlive) {
        setInputError(t('game:chat.cannot_whisper_dead'));
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      // Public notice that a whisper was sent
      const whisperNotice = {
        player: 'system',
        color: '#aaa',
        content: i18n.t('game:system.whisper_notice', { sender: myName, receiver: targetPlayer.profile.name }),
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
        setInputError(t('game:chat.dead_no_will'));
        setTimeout(() => setInputError(''), 3000);
        return true;
      }
      const lwContent = args.join(' ');
      if (lwContent.length === 0) {
        setInputError(t('game:chat.lw_usage'));
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
          content: i18n.t('game:system.last_will_updated'),
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
        setInputError(t('game:chat.dead_no_vote'));
        setTimeout(() => setInputError(''), 3000);
        return true;
      }
      if (!game.isDay || (game.phase !== CONSTANTS.PHASE.DISCUSSION && game.phase !== CONSTANTS.PHASE.VOTING)) {
        setInputError(t('game:chat.skip_only_day'));
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      const result = voteSkip(me.id);
      if (!result.success) {
        setInputError(t('game:chat.already_voted_skip'));
        setTimeout(() => setInputError(''), 3000);
        return true;
      }

      setMessages([
        ...allMessages,
        {
          id: `skip-${Date.now()}`,
          player: 'system',
          color: '#aaa',
          content: i18n.t('game:system.skip_vote', { name: myName, count: result.count, total: result.total }),
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
    if (me?.id) updateActivity(me.id);

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
      setInputError(t('game:chat.no_spam'));
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
    } else if (isNight && myTeam === 'cult') {
      chatChannel = 'cult';
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
  const isSpectator = !!me?.isSpectator;
  const isDead = me && !me.isAlive && !isSpectator;
  const isNight = game.phase === CONSTANTS.PHASE.NIGHT;
  const isDefensePhase = game.phase === CONSTANTS.PHASE.DEFENSE || game.phase === CONSTANTS.PHASE.LAST_WORDS;
  const isAnnouncementPhase = game.phase === CONSTANTS.PHASE.NO_LYNCH || game.phase === CONSTANTS.PHASE.SPARED || game.phase === CONSTANTS.PHASE.EXECUTION || game.phase === CONSTANTS.PHASE.EXECUTION_REVEAL;
  const isAccused = me?.id === game.accusedId;
  const isBlackmailed = me?.isBlackmailed && game.isDay;
  const isMutedByPhase = (isDefensePhase && !isAccused && !isDead) || isAnnouncementPhase;
  const BLACKMAIL_MAX_CHARS = 10;

  // Dead players can always chat (in dead chat) unless it's a mute phase
  // Blackmailed players CAN chat but with limited chars
  // Spectators cannot chat at all
  const canChat = isSpectator ? false : (isDead ? true : !isMutedByPhase && !isPlayerInTimeout);

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

    // Cult chat: visible to cult members only
    if (message.chat === 'cult') {
      return myTeam === 'cult';
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
    if (filteredMessages[i].type === 'system' && c?.startsWith('---')) {
      lastSeparatorIndex = i;
      break;
    }
  }

  // Villager night: can see chat (grayed out, read-only) but not write.
  // Mafia and Cult have private night channels, so they write; everyone
  // else (town, neutrals) is locked in read-only during the night.
  const isSpy = me?.character?.key === 'spy';
  const isVillagerNight = props.night && myTeam !== 'mafia' && myTeam !== 'cult' && !isSpy && !isDead;

  // Placeholder text
  let placeholder = t('game:chat.placeholder');
  if (isSpectator) placeholder = t('game:chat.placeholder_spectator', { defaultValue: 'Spectator — read-only' });
  else if (isVillagerNight) placeholder = t('game:chat.placeholder_night');
  else if (isDead) placeholder = t('game:chat.placeholder_dead');
  else if (isBlackmailed) placeholder = t('game:chat.placeholder_blackmailed', { max: BLACKMAIL_MAX_CHARS });
  else if (isMutedByPhase) placeholder = t('game:chat.placeholder_muted');
  else if (isPlayerInTimeout) placeholder = t('game:chat.placeholder_timeout');
  else if (isNight && myTeam === 'mafia') placeholder = t('game:chat.placeholder_mafia');
  else if (isNight && myTeam === 'cult') placeholder = t('game:chat.placeholder_cult');

  const isDisabled = isSpectator || isVillagerNight || !canChat || (isMutedByPhase && !isDead);
  const maxInputLength = isBlackmailed ? BLACKMAIL_MAX_CHARS : undefined;

  // Message CSS class
  const getMessageClass = (message) => {
    if (message.type === 'system' && message.color === 'vote') return 'msg-system msg-vote';
    if (message.type === 'system') return 'msg-system';
    if (message.type === 'whisper_notice') return 'msg-whisper-notice';
    if (message.chat === 'whisper') return 'msg-whisper';
    if (message.chat === 'dead') return 'msg-dead';
    if (message.chat === 'mafia') return 'msg-mafia';
    if (message.chat === 'cult') return 'msg-cult';
    return '';
  };

  // Format message prefix
  const formatPrefix = (message) => {
    if (message.type === 'system') return null;
    if (message.type === 'whisper_notice') return null;
    if (message.chat === 'whisper') {
      if (message.senderId === me?.id) {
        return <span className="whisper-prefix">{t('game:chat.whisper_to', { name: message.receiverName })}</span>;
      }
      return <span className="whisper-prefix">{t('game:chat.whisper_from', { name: message.player })}</span>;
    }
    if (message.chat === 'dead') return <span className="dead-prefix">{t('game:chat.prefix_dead')}</span>;
    if (message.chat === 'mafia') return <span className="mafia-prefix">{t('game:chat.prefix_mafia')}</span>;
    if (message.chat === 'cult') return <span className="cult-prefix">{t('game:chat.prefix_cult')}</span>;
    return null;
  };

  return (
    <>
    <div
      className={`chat-container ${props.night ? 'chat-night' : ''} ${isDead ? 'chat-dead-mode' : ''} ${isVillagerNight ? 'chat-villager-night' : ''} ${props.highlight ? 'highlight-discussion' : ''}`}
      ref={chatContainerRef}
    >
      {isDead && <div className="dead-chat-banner"><i className="fas fa-ghost"></i> {t('game:chat.dead_chat_banner')}</div>}
      <div className="chat-messages">
        {filteredMessages.map((message, index) => {
          // Admin messages are never grayed
          const isAdmin = message.type === 'system' && message.content?.startsWith('[ADMIN]');
          // Gray system messages: before last day separator OR all during night
          const isPastSystem = !isAdmin && message.type === 'system' && (
            index < lastSeparatorIndex || isNight
          );
          const pastClass = isPastSystem ? 'msg-past' : '';

          // Vote messages: special blue background
          if (message.type === 'system' && message.color === 'vote') {
            return (
              <div className={`chat-message-wrapper msg-vote ${pastClass}`} key={message.id || index}>
                <div className="chat-message chat-day-separator">
                  {message.content}
                </div>
              </div>
            );
          }

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

          const isPastPlayer = message.dayCount < game.dayCount;
          return (
            <div className={`chat-message-wrapper ${getMessageClass(message)} ${isPastPlayer ? 'msg-past-player' : ''}`} key={message.id || index}>
              <div
                className="chat-message-background"
                style={isPastPlayer ? {} : { backgroundColor: message.color }}
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
      </div>
      {inputVisible ? (
        <div className="chat-input-outside">
          <span className="chat-input-name" style={{ color: myColor || '#ccc' }}>{myName}:</span>
          <input
            ref={inputRef}
            className={`chat-input ${inputError ? 'invalid-char' : ''} ${isBlackmailed ? 'chat-blackmailed' : ''}`}
            type="text"
            value={inputValues}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!inputValues.trim()) setInputVisible(false); }}
            placeholder={placeholder}
            disabled={isDisabled}
            maxLength={maxInputLength}
            autoFocus
          />
          {inputError && <div className="invalid-char-message">{inputError}</div>}
        </div>
      ) : (
        <div className={`chat-input-hint-outside ${props.night ? 'hint-night' : ''}`}>
          {t('game:chat.press_enter')}
        </div>
      )}
    </>
  );
}

export default Chat;
