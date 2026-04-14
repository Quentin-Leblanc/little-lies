import { isHost, usePlayersList, myPlayer } from 'playroomkit';
import './Setup.scss';
import Roles from './Roles';
import GameConfig from '../GameConfig/GameConfig';
import { useGameEngine } from '../../hooks/useGameEngine';
import trad from '../../trad/roles.json';

// Role presets by player count
const PRESETS = {
  beginner_4: {
    label: 'D\u00e9butant 4',
    count: 4,
    desc: 'Id\u00e9al pour d\u00e9couvrir le jeu \u2014 r\u00f4les simples',
    roles: ['villageois', 'sheriff', 'godfather', 'mafioso'],
  },
  beginner_5: {
    label: 'D\u00e9butant 5',
    count: 5,
    desc: 'Introduction avec un docteur',
    roles: ['villageois', 'villageois', 'sheriff', 'godfather', 'mafioso'],
  },
  classic_6: {
    label: 'Classic 6',
    count: 6,
    desc: 'Village + Mafia \u00e9quilibr\u00e9',
    roles: ['villageois', 'villageois', 'sheriff', 'docteur', 'godfather', 'mafioso'],
  },
  classic_8: {
    label: 'Classic 8',
    count: 8,
    desc: 'Ajout de r\u00f4les d\'investigation',
    roles: ['villageois', 'villageois', 'sheriff', 'docteur', 'lookout', 'godfather', 'mafioso', 'framer'],
  },
  ranked_10: {
    label: 'Ranked 10',
    count: 10,
    desc: 'Mode comp\u00e9titif avec neutres',
    roles: ['villageois', 'sheriff', 'docteur', 'escort', 'vigilante', 'godfather', 'mafioso', 'blackmailer', 'serial_killer', 'jester'],
  },
  chaos_12: {
    label: 'Chaos 12',
    count: 12,
    desc: 'Tous les r\u00f4les, chaos total',
    roles: ['villageois', 'sheriff', 'docteur', 'bodyguard', 'vigilante', 'spy', 'godfather', 'mafioso', 'framer', 'consigliere', 'serial_killer', 'executioner'],
  },
  full_15: {
    label: 'Complet 15',
    count: 15,
    desc: 'Partie compl\u00e8te avec tous les r\u00f4les',
    roles: ['villageois', 'sheriff', 'docteur', 'lookout', 'vigilante', 'maire', 'bodyguard', 'escort', 'jailor', 'godfather', 'mafioso', 'framer', 'blackmailer', 'serial_killer', 'survivor'],
  },
};

const findRole = (key) => trad.roles.find((r) => r.key === key);

const Setup = () => {
  const { startGame, rolesSelected, setRolesSelected, game, setGame } = useGameEngine();
  const players = usePlayersList(true);
  const host = isHost();

  // Find the host player name
  const hostPlayer = players.length > 0 ? players[0] : null;
  const hostName = hostPlayer?.getState?.()?.profile?.name || 'H\u00f4te';
  const currentPlayerName = myPlayer()?.getState?.()?.profile?.name;

  const applyPreset = (preset) => {
    if (!host) return;
    const roles = preset.roles
      .slice(0, players.length)
      .map(findRole)
      .filter(Boolean);
    setRolesSelected(roles);
  };

  const matchingPresets = Object.entries(PRESETS).filter(
    ([, p]) => p.count <= players.length
  );

  const handleConfigChange = (newConfig) => {
    if (!host) return;
    setGame({ ...game, config: newConfig });
  };

  const allSlotsFilled = rolesSelected.length === players.length;
  const MIN_PLAYERS = 4;
  const canStart = allSlotsFilled && players.length >= MIN_PLAYERS;

  // Team counter
  const teamCounts = rolesSelected.reduce((acc, role) => {
    const team = role?.team || 'neutral';
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {});
  const townCount = teamCounts.town || 0;
  const mafiaCount = teamCounts.mafia || 0;
  const neutralCount = teamCounts.neutral || 0;
  const isUnbalanced = rolesSelected.length > 0 && mafiaCount >= townCount;

  return (
    <div className="setup-screen">
      <div className="setup-card">
        {/* Header */}
        <div className="setup-header">
          <h1 className="setup-title">Configuration de la partie</h1>
          <div className="setup-header-right">
            <div className="setup-host-badge">
              <i className="fas fa-crown"></i>
              <span>{hostName}</span>
            </div>
            <div className="setup-players-badge">
              <i className="fas fa-users"></i>
              <span>{players.length}</span> joueurs
              {players.length < MIN_PLAYERS && (
                <span style={{ color: '#ff6666', fontSize: '0.75rem', marginLeft: 6 }}>
                  (min {MIN_PLAYERS})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Host indicator for non-host */}
        {!host && (
          <div className="setup-host-notice">
            <i className="fas fa-crown"></i> {hostName} configure la partie...
          </div>
        )}

        {/* Game config — visible to all, editable by host only */}
        <GameConfig config={game.config} onConfigChange={handleConfigChange} />

        {/* Presets — visible to all, clickable by host only */}
        {matchingPresets.length > 0 && (
          <div className="setup-presets">
            <span className="presets-label">Presets</span>
            <div className="presets-list">
              {matchingPresets.map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-btn ${key.startsWith('beginner') ? 'preset-beginner' : ''}`}
                  onClick={() => applyPreset(preset)}
                  title={preset.desc}
                  disabled={!host}
                >
                  {key.startsWith('beginner') && <i className="fas fa-graduation-cap" style={{ marginRight: 4 }}></i>}
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Team counter */}
        {rolesSelected.length > 0 && (
          <div className="setup-team-counter">
            <span style={{ color: '#78ff78' }}><i className="fas fa-users"></i> Village: {townCount}</span>
            <span style={{ color: '#ff4444' }}><i className="fas fa-user-secret"></i> Mafia: {mafiaCount}</span>
            <span style={{ color: '#9370db' }}><i className="fas fa-star"></i> Neutre: {neutralCount}</span>
            {isUnbalanced && (
              <span className="setup-warning">
                <i className="fas fa-exclamation-triangle"></i> D\u00e9s\u00e9quilibr\u00e9
              </span>
            )}
          </div>
        )}

        {/* Roles dual box — visible to all, interactive for host only */}
        <div className="dualBox">
          <Roles />
        </div>

        {/* Footer */}
        <div className="setup-footer">
          {host ? (
            <button
              className={`start-btn ${canStart ? 'ready' : ''}`}
              disabled={!canStart}
              onClick={startGame}
            >
              <i className={`fas ${canStart ? 'fa-play' : 'fa-lock'}`}></i>
              {!allSlotsFilled
                ? `${rolesSelected.length}/${players.length} r\u00f4les assign\u00e9s`
                : players.length < MIN_PLAYERS
                ? `Minimum ${MIN_PLAYERS} joueurs requis`
                : 'Lancer la partie'
              }
            </button>
          ) : (
            <div className="setup-waiting">
              <i className="fas fa-hourglass-half"></i> En attente de {hostName}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;
