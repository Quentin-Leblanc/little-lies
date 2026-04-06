import { isHost, usePlayersList } from 'playroomkit';
import './Setup.scss';
import Roles from './Roles';
import GameConfig from '../GameConfig/GameConfig';
import { useGameEngine } from '../../hooks/useGameEngine';
import trad from '../../trad/roles.json';

// Role presets by player count
const PRESETS = {
  classic_6: {
    label: 'Classic (6j)',
    count: 6,
    roles: ['villageois', 'villageois', 'sheriff', 'docteur', 'godfather', 'mafioso'],
  },
  classic_8: {
    label: 'Classic (8j)',
    count: 8,
    roles: ['villageois', 'villageois', 'sheriff', 'docteur', 'lookout', 'godfather', 'mafioso', 'framer'],
  },
  ranked_10: {
    label: 'Ranked (10j)',
    count: 10,
    roles: ['villageois', 'sheriff', 'docteur', 'escort', 'vigilante', 'godfather', 'mafioso', 'blackmailer', 'serial_killer', 'jester'],
  },
  chaos_12: {
    label: 'Chaos (12j)',
    count: 12,
    roles: ['villageois', 'sheriff', 'docteur', 'bodyguard', 'vigilante', 'spy', 'godfather', 'mafioso', 'framer', 'consigliere', 'serial_killer', 'executioner'],
  },
  full_15: {
    label: 'Complet (15j)',
    count: 15,
    roles: ['villageois', 'sheriff', 'docteur', 'lookout', 'vigilante', 'maire', 'bodyguard', 'escort', 'jailor', 'godfather', 'mafioso', 'framer', 'blackmailer', 'serial_killer', 'survivor'],
  },
};

const findRole = (key) => trad.roles.find((r) => r.key === key);

const Setup = () => {
  const { startGame, rolesSelected, setRolesSelected, game, setGame } = useGameEngine();
  const players = usePlayersList(true);

  const applyPreset = (preset) => {
    if (!isHost()) return;
    const roles = preset.roles
      .slice(0, players.length)
      .map(findRole)
      .filter(Boolean);
    setRolesSelected(roles);
  };

  // Matching presets for current player count
  const matchingPresets = Object.entries(PRESETS).filter(
    ([, p]) => p.count <= players.length
  );

  const handleConfigChange = (newConfig) => {
    setGame({ ...game, config: newConfig });
  };

  return (
    <div className="rolesSetup">
      <p className="playersNumber">
        <i className="fas fa-user"></i> Joueurs : <span>{players.length}</span>
      </p>

      {/* Game config (host only) */}
      <GameConfig config={game.config} onConfigChange={handleConfigChange} />

      {/* Role presets */}
      {isHost() && matchingPresets.length > 0 && (
        <div className="presets-container">
          <span className="presets-label">Presets :</span>
          {matchingPresets.map(([key, preset]) => (
            <button
              key={key}
              className="preset-btn"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="dualBox">
        <Roles />
      </div>

      {isHost() && (
        <div className="startGame">
          <button
            disabled={rolesSelected.length !== players.length}
            onClick={startGame}
          >
            Débuter la partie ({rolesSelected.length}/{players.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default Setup;
