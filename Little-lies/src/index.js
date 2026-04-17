import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { insertCoin, getRoomCode } from 'playroomkit'; // Ajout de getRoomCode pour obtenir le code de la salle
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GameEngineProvider } from './hooks/useGameEngine';
import { EventsProvider } from './hooks/useEvents';
import { AuthProvider } from './components/Auth/Auth';
import './trad/i18n'; // Initialize i18n
import './index.scss';

// Generic letter avatars as data-URIs — no external CDN dependency,
// no extra HTTP requests at boot. PlayroomKit assigns one per player.
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

// PlayroomKit gameId — required. Set REACT_APP_PLAYROOM_GAME_ID in
// .env.local (dev) and in Netlify env vars (prod). No fallback on
// purpose: a silent shared gameId means rooms live on someone else's
// quota and break when that quota runs out.
const PLAYROOM_GAME_ID = process.env.REACT_APP_PLAYROOM_GAME_ID;
if (!PLAYROOM_GAME_ID) {
  throw new Error(
    'REACT_APP_PLAYROOM_GAME_ID is not set. Define it in .env.local for development or in the Netlify environment variables for production.'
  );
}

// Composant principal pour démarrer Playroom
const Main = () => {
  const [isPlayroomReady, setIsPlayroomReady] = useState(false); // Gestion de l'état pour savoir si Playroom est prêt
  const [roomCode, setRoomCode] = useState(null); // Stocker le code de la salle

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

        const roomCode = await getRoomCode();
        setRoomCode(roomCode);
      } catch (error) {
        // silent fail
      }
    };

    initializePlayroom(); // Lancer l'initialisation de Playroom au chargement
  }, []);

  // Rendre l'application uniquement lorsque Playroom est prêt
  if (!isPlayroomReady) {
    return <div style={{color:'#666',display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,sans-serif'}}>Loading...</div>;
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
};

const root = createRoot(document.getElementById('root')); // Utilisation de createRoot
root.render(<Main />); // Render du composant Main

// Mesure des performances (optionnel)
reportWebVitals();
