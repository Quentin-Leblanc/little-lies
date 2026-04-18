import React, { useState, useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';

// Speech bubble above a character: shows the player's last chat message
// for ~2s, then fades out in ~0.35s. Forced off during verdict phases so
// the bubble can't linger over someone who was just spared/executed.
//
// Filters messages by dayCount so a returning tab doesn't re-pop bubbles
// from yesterday's chat log.
const VERDICT_PHASES = new Set(['SPARED', 'EXECUTION', 'EXECUTION_REVEAL', 'NO_LYNCH']);
const DISPLAY_MS = 2000;
const FADE_MS = 350;

const ChatBubble = ({ playerId, chatMessages, dayCount, phase }) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [content, setContent] = useState('');
  const lastShownIdRef = useRef(null);
  const timersRef = useRef({ hide: null, clear: null });

  useEffect(() => {
    return () => {
      if (timersRef.current.hide) clearTimeout(timersRef.current.hide);
      if (timersRef.current.clear) clearTimeout(timersRef.current.clear);
    };
  }, []);

  useEffect(() => {
    if (!chatMessages || !playerId) return;
    // Find the most recent visible chat line from this player for the current day.
    // Restrict to default-channel player chat so mafia/cult/whisper/dead lines
    // don't bubble to everyone's view.
    const playerMsgs = chatMessages.filter(
      (m) =>
        m.playerId === playerId &&
        m.type === 'player' &&
        m.dayCount === dayCount &&
        (m.chat === 'default' || !m.chat),
    );
    if (playerMsgs.length === 0) return;

    const last = playerMsgs[playerMsgs.length - 1];
    const key = last.id || `${last.dayCount}:${last.content}`;
    if (key === lastShownIdRef.current) return;
    lastShownIdRef.current = key;

    if (timersRef.current.hide) clearTimeout(timersRef.current.hide);
    if (timersRef.current.clear) clearTimeout(timersRef.current.clear);

    setContent(last.content || '');
    setFading(false);
    setVisible(true);

    timersRef.current.hide = setTimeout(() => {
      setFading(true);
      timersRef.current.clear = setTimeout(() => setVisible(false), FADE_MS);
    }, DISPLAY_MS);
  }, [chatMessages, playerId, dayCount]);

  // Verdict phases: hide immediately — the accused just got their sentence,
  // no reason for a stale bubble to hang over their head.
  useEffect(() => {
    if (phase && VERDICT_PHASES.has(phase)) {
      setVisible(false);
      setFading(false);
      if (timersRef.current.hide) clearTimeout(timersRef.current.hide);
      if (timersRef.current.clear) clearTimeout(timersRef.current.clear);
    }
  }, [phase]);

  if (!visible || !content) return null;

  return (
    <Html
      position={[0, 2.9, 0]}
      center
      distanceFactor={7}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className={`chat-bubble-3d ${fading ? 'chat-bubble-3d-fade' : ''}`}>
        <div className="chat-bubble-3d-text">{content}</div>
        <div className="chat-bubble-3d-tail" />
      </div>
    </Html>
  );
};

export default ChatBubble;
