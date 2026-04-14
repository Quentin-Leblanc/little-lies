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

// Liste d'avatars personnalisés
const avatars = [
  'https://images.vexels.com/media/users/3/145908/raw/52eabf633ca6414e60a7677b0b917d92-male-avatar-maker.jpg',
  'https://www.clipartkey.com/mpngs/m/118-1188761_avatar-cartoon-profile-picture-png.png',
  'https://i.pinimg.com/736x/df/5f/5b/df5f5b1b174a2b4b6026cc6c8f9395c1.jpg',
  'https://cdn2.f-cdn.com/contestentries/1440473/30778261/5bdd02db9ff4c_thumb900.jpg',
];

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
          gameId: 'qxONse5t9p6pZgeX3KkY',
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
    return <div>Chargement du jeu...</div>; // Affichage pendant le chargement de Playroom
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
