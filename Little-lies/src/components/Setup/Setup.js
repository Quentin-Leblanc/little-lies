import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import './Setup.scss';
import Roles from './Roles';
import HouseRules from './HouseRules';
import Balance from './Balance';
import GameConfig from '../GameConfig/GameConfig';
import { LobbyChat } from '../CustomLobby/CustomLobby';
import { useGameEngine } from '../../hooks/useGameEngine';
import { getRoles } from '../../data/roles.js';

// Role presets by player count — keys map to setup:presets_list translations
const PRESETS = {
  beginner_4: {
    count: 4,
    roles: ['villageois', 'villageois', 'sheriff', 'mafioso'],
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

  // Team counter
  const teamCounts = rolesSelected.reduce((acc, role) => {
    const team = role?.team || 'neutral';
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {});
  const townCount = teamCounts.town || 0;
  const mafiaCount = teamCounts.mafia || 0;
  const cultCount = teamCounts.cult || 0;
  const isUnbalanced = rolesSelected.length > 0 && (mafiaCount + cultCount) >= townCount;

  const hasThreatFaction = rolesSelected.some((r) => (
    r?.team === 'mafia' ||
    r?.team === 'cult' ||
    r?.team === 'evil' ||
    (r?.team === 'neutral' && r?.category === 'neutral_killing')
  ));
  const missingThreat = allSlotsFilled && !hasThreatFaction;
  const canStart = allSlotsFilled && players.length >= MIN_PLAYERS && hasThreatFaction;

  const startLabel = !allSlotsFilled
    ? t('common:roles_assigned', { current: rolesSelected.length, total: players.length })
    : players.length < MIN_PLAYERS
    ? t('common:min_players_required', { count: MIN_PLAYERS })
    : missingThreat
    ? t('setup:team_counter.no_threat_short')
    : t('setup:seal_the_roster');

  return (
    <div className="setup-screen">
      <div className="setup-stage">
        {/* ── Header (one line) ───────────────────────────────────
            The host name and players count both already appear in
            the persistent TopBar — keep the title here, drop the
            badges, only flash a "min N" hint if the room is short
            on players. */}
        <header className="setup-heading">
          <h1 className="setup-title">{t('setup:assemble_title')}</h1>
          {players.length < MIN_PLAYERS && (
            <span className="setup-min-hint">
              {t('common:min_players_required', { count: MIN_PLAYERS, defaultValue: `Minimum ${MIN_PLAYERS} joueurs` })}
            </span>
          )}
        </header>

        {!host && (
          <div className="setup-host-notice">
            <i className="fas fa-crown"></i> {t('setup:host_configuring', { host: hostName })}
          </div>
        )}

        {/* ── Presets row ────────────────────────────────────────── */}
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
                  {key.startsWith('beginner') && <i className="fas fa-graduation-cap"></i>}
                  {t(`setup:presets_list.${key}.label`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── The draft table: deck left, bag right ──────────────── */}
        <Roles />

        {/* Rules + advanced config. Sits between the table and the
            footer rather than after it: the stage is bounded to the
            viewport and the table is the flexible row, so opening this
            takes height from the table (whose panels scroll) instead of
            pushing the start button off screen. */}
        {host && (
          <details className="setup-advanced">
            <summary>
              <i className="fas fa-sliders" aria-hidden="true"></i>
              <span>{t('setup:advanced_config', { defaultValue: 'Configuration & règles' })}</span>
              <i className="fas fa-chevron-down setup-advanced__chevron" aria-hidden="true"></i>
            </summary>
            {/* Two named sections, read top to bottom: what the game
                allows, then how long each phase lasts. Before this both
                landed in the same undifferentiated stack — the rules
                chips and the duration fields looked like one list of
                controls with no explanation of what separated them. */}
            <div className="setup-advanced__body">
              <section className="setup-advanced__section">
                <h3 className="setup-advanced__section-title">
                  {t('setup:rules.title', { defaultValue: 'Règles de la partie' })}
                </h3>
                <HouseRules
                  rules={game.config?.rules}
                  onChange={(rules) => handleConfigChange({ ...game.config, rules })}
                  disabled={!host}
                />
              </section>

              <section className="setup-advanced__section">
                <h3 className="setup-advanced__section-title">
                  {t('setup:config.title', { defaultValue: 'Durée des phases' })}
                </h3>
                <GameConfig config={game.config} onConfigChange={handleConfigChange} />
              </section>
            </div>
          </details>
        )}

        {/* ── Footer: balance verdict + CTA. Ordinary flex row at the
                bottom of the bounded stage — always visible, never
                overlapping the deck. ──────────────────────────────── */}
        <footer className="setup-footer">
          <Balance
            town={townCount}
            mafia={mafiaCount}
            cult={cultCount}
            total={rolesSelected.length}
            isUnbalanced={isUnbalanced}
            missingThreat={missingThreat}
          />

          {host ? (
            <button
              className={`seal-btn ${canStart ? 'ready' : ''}`}
              disabled={!canStart}
              onClick={startGame}
            >
              <i className={`fas ${canStart ? 'fa-scroll' : 'fa-lock'}`}></i>
              <span>{startLabel}</span>
            </button>
          ) : (
            <div className="setup-waiting">
              <i className="fas fa-hourglass-half"></i> {t('setup:waiting_host', { host: hostName })}
            </div>
          )}
        </footer>
      </div>

      {/* Persistent chat — same multiplayer state as the lobby */}
      <LobbyChat />
    </div>
  );
};

export default Setup;
