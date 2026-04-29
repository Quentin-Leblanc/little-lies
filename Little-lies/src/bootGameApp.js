// Boot du jeu (chemin "non éditeur"). Tout ce qui touche PlayroomKit /
// Auth / GameEngine est isolé ici pour qu'on ne le charge pas quand on
// ouvre la sandbox SceneEditor (?editor=1). Évite les listeners
// PlayroomKit, le websocket, et le throw `REACT_APP_PLAYROOM_GAME_ID is
// not set`.

import React, { useState, useEffect } from 'react';
import { insertCoin, getRoomCode } from 'playroomkit';
import App from './App';
import { GameEngineProvider } from './hooks/useGameEngine';
import { EventsProvider } from './hooks/useEvents';
import { AuthProvider } from './components/Auth/Auth';
import reportWebVitals from './reportWebVitals';

const svgAvatar = (color, letter) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="${color}"/><text x="40" y="54" font-size="44" fill="#fff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600">${letter}</text></svg>`
  )}`;

const avatars = [
  svgAvatar('#e74c3c', 'A'),
  svgAvatar('#3498db', 'B'),
  svgAvatar('#2ecc71', 'C'),
  svgAvatar('#f39c12', 'D'),
  svgAvatar('#9b59b6', 'E'),
  svgAvatar('#1abc9c', 'F'),
];

const PLAYROOM_GAME_ID = process.env.REACT_APP_PLAYROOM_GAME_ID;
if (!PLAYROOM_GAME_ID) {
  throw new Error(
    'REACT_APP_PLAYROOM_GAME_ID is not set. Define it in .env.local for development or in the Cloudflare Pages environment variables for production.'
  );
}

function GameApp() {
  const [isPlayroomReady, setIsPlayroomReady] = useState(false);
  const [roomCode, setRoomCode] = useState(null);

  useEffect(() => {
    const initializePlayroom = async () => {
      try {
        await insertCoin({
          maxPlayersPerRoom: 15,
          avatars,
          gameId: PLAYROOM_GAME_ID,
          skipLobby: true,
        });
        setIsPlayroomReady(true);
        const code = await getRoomCode();
        setRoomCode(code);
      } catch (error) {
        // silent fail
      }
    };
    initializePlayroom();
  }, []);

  if (!isPlayroomReady) {
    return (
      <div style={{ color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        Loading...
      </div>
    );
  }

  return (
    <React.StrictMode>
      <AuthProvider>
        <EventsProvider>
          <GameEngineProvider>
            <App roomCode={roomCode} />
          </GameEngineProvider>
        </EventsProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}

reportWebVitals();

export default GameApp;
