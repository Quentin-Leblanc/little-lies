import { isHost, usePlayersList, myPlayer } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import './Setup.scss';
import Roles from './Roles';
import GameConfig from '../GameConfig/GameConfig';
import { LobbyChat } from '../CustomLobby/CustomLobby';
import { useGameEngine } from '../../hooks/useGameEngine';
import { getRoles } from '../../data/roles.js';

// Role presets by player count — keys map to setup:presets_list translations
const PRESETS = {
  beginner_4: {
    count: 4,
    roles: ['villageois', 'sheriff', 'godfather', 'mafioso'],
  },
  beginner_5: {
    count: 5,
    roles: ['villageois', 'villageois', 'sheriff', 'godfather', 'mafioso'],
  },
  classic_6: {
    count: 6,
    roles: ['villageois', 'villageois', 'sheriff', 'docteur', 'godfather', 'mafioso'],
  },
  classic_8: {
    count: 8,
    roles: ['villageois', 'villageois', 'sheriff', 'docteur', 'lookout', 'godfather', 'mafioso', 'framer'],
  },
  ranked_10: {
    count: 10,
    roles: ['villageois', 'sheriff', 'docteur', 'escort', 'vigilante', 'godfather', 'mafioso', 'blackmailer', 'serial_killer', 'jester'],
  },
  chaos_12: {
    count: 12,
    roles: ['villageois', 'sheriff', 'docteur', 'bodyguard', 'vigilante', 'spy', 'godfather', 'mafioso', 'framer', 'consigliere', 'serial_killer', 'executioner'],
  },
  full_15: {
    count: 15,
    roles: ['villageois', 'sheriff', 'docteur', 'lookout', 'vigilante', 'maire', 'bodyguard', 'escort', 'jailor', 'godfather', 'mafioso', 'framer', 'blackmailer', 'serial_killer', 'survivor'],
  },
};

const Setup = () => {
  const { t } = useTranslation(['setup', 'common']);
  const { startGame, rolesSelected, setRolesSelected, game, setGame } = useGameEngine();
  const players = usePlayersList(true);
  const host = isHost();

  // Find the host player name
  const hostPlayer = players.length > 0 ? players[0] : null;
  const hostName = hostPlayer?.getState?.()?.profile?.name || 'Host';

  const findRole = (key) => {
    const allRoles = getRoles();
    return allRoles.find((r) => r.key === key);
  };

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
  const cultCount = teamCounts.cult || 0;
  const neutralCount = teamCounts.neutral || 0;
  // Unbalanced if combined evil factions (mafia + cult) reach town count.
  const isUnbalanced = rolesSelected.length > 0 && (mafiaCount + cultCount) >= townCount;

  return (
    <div className="setup-screen">
      <div className="setup-card">
        {/* Header */}
        <div className="setup-header">
          <h1 className="setup-title">{t('setup:title')}</h1>
          <div className="setup-header-right">
            <div className="setup-host-badge">
              <i className="fas fa-crown"></i>
              <span>Host : {hostName}</span>
            </div>
            <div className="setup-players-badge">
              <i className="fas fa-users"></i>
              <span>{players.length}</span> {t('common:players')}
              {players.length < MIN_PLAYERS && (
                <span style={{ color: '#ff6666', fontSize: '0.75rem', marginLeft: 6 }}>
                  ({t('common:min_players', { count: MIN_PLAYERS })})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Host indicator for non-host */}
        {!host && (
          <div className="setup-host-notice">
            <i className="fas fa-crown"></i> {t('setup:host_configuring', { host: hostName })}
          </div>
        )}

        {/* Game config — visible to all, editable by host only */}
        <GameConfig config={game.config} onConfigChange={handleConfigChange} />

        {/* Presets — visible to all, clickable by host only */}
        {matchingPresets.length > 0 && (
          <div className="setup-presets">
            <span className="presets-label">{t('setup:presets')}</span>
            <div className="presets-list">
              {matchingPresets.map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-btn ${key.startsWith('beginner') ? 'preset-beginner' : ''}`}
                  onClick={() => applyPreset(preset)}
                  title={t(`setup:presets_list.${key}.desc`)}
                  disabled={!host}
                >
                  {key.startsWith('beginner') && <i className="fas fa-graduation-cap" style={{ marginRight: 4 }}></i>}
                  {t(`setup:presets_list.${key}.label`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Team counter — always rendered, content fades in */}
        <div className="setup-team-counter">
          <span style={{ color: '#78ff78', opacity: rolesSelected.length > 0 ? 1 : 0.3 }}>
            <i className="fas fa-users"></i> {t('setup:team_counter.village', { count: townCount })}
          </span>
          <span style={{ color: '#ff4444', opacity: rolesSelected.length > 0 ? 1 : 0.3 }}>
            <i className="fas fa-user-secret"></i> {t('setup:team_counter.mafia', { count: mafiaCount })}
          </span>
          {cultCount > 0 && (
            <span style={{ color: '#a96edd', opacity: 1 }}>
              <i className="fas fa-hat-wizard"></i> {t('setup:team_counter.cult', { count: cultCount })}
            </span>
          )}
          <span style={{ color: '#9370db', opacity: rolesSelected.length > 0 ? 1 : 0.3 }}>
            <i className="fas fa-star"></i> {t('setup:team_counter.neutral', { count: neutralCount })}
          </span>
          {isUnbalanced && (
            <span className="setup-warning">
              <i className="fas fa-exclamation-triangle"></i> {t('setup:team_counter.unbalanced')}
            </span>
          )}
        </div>

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
                ? t('common:roles_assigned', { current: rolesSelected.length, total: players.length })
                : players.length < MIN_PLAYERS
                ? t('common:min_players_required', { count: MIN_PLAYERS })
                : t('common:start_game')
              }
            </button>
          ) : (
            <div className="setup-waiting">
              <i className="fas fa-hourglass-half"></i> {t('setup:waiting_host', { host: hostName })}
            </div>
          )}
        </div>
      </div>

      {/* Persistent chat — same multiplayer state as the lobby */}
      <LobbyChat />
    </div>
  );
};

export default Setup;
