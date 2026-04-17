import React, { useState, useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';

// Appears for ~2.5s when a player sends a message. Filters by dayCount so
// the bubble only reacts to messages from the current day — prevents old
// chat history from triggering bubbles on re-render.
const ChatBubble = ({ playerId, chatMessages, dayCount }) => {
  const [visible, setVisible] = useState(false);
  const lastMsgCount = useRef(0);

  useEffect(() => {
    if (!chatMessages || !playerId) return;
    const playerMsgs = chatMessages.filter(
      (m) => m.playerId === playerId && m.type === 'player' && m.dayCount === dayCount
    );
    if (playerMsgs.length > lastMsgCount.current) {
      lastMsgCount.current = playerMsgs.length;
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [chatMessages?.length, playerId, dayCount]);

  if (!visible) return null;

  return (
    <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[15, 1]} style={{ pointerEvents: 'none' }}>
      <div className="chat-bubble-3d">
        <span className="chat-bubble-dot" />
        <span className="chat-bubble-dot" />
        <span className="chat-bubble-dot" />
        <div className="chat-bubble-tail" />
      </div>
    </Html>
  );
};

export default ChatBubble;
