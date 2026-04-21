import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Graveyard.scss';

const Graveyard = () => {
  const { t } = useTranslation(['game', 'roles']);
  const { getPlayers, game } = useGameEngine();
  const [expandedId, setExpandedId] = useState(null);

  const deadPlayers = getPlayers().filter((player) => !player.isAlive);
  // House rules: when roles are hidden on death, chips show only the name
  // (no role label, no role color dot). When last wills are disabled, a
  // chip never expands — it stays a flat tag.
  const rules = game?.config?.rules || {};
  const revealRoles = rules.revealOnDeath !== false;
  const allowWills = rules.lastWills !== false;

  const expandedWill = expandedId
    ? deadPlayers.find((p) => p.id === expandedId)?.lastWill
    : null;

  return (
    <section className="graveyard-box">
      <header className="graveyard-head">
        <span className="graveyard-head__title">
          <i className="fas fa-skull" aria-hidden="true"></i>
          <span>{t('graveyard.title')}</span>
        </span>
        {deadPlayers.length > 0 && (
          <span className="graveyard-head__count">{deadPlayers.length}</span>
        )}
      </header>

      {deadPlayers.length === 0 ? (
        <p className="graveyard-empty">{t('graveyard.empty')}</p>
      ) : (
        <ul className="graveyard-chips">
          {deadPlayers.map((player) => {
            const canExpand = allowWills && !!player.lastWill;
            const roleLabel = revealRoles
              ? t(`roles:${player.character?.key}.label`, { defaultValue: player.character?.label })
              : null;
            const dotColor = revealRoles ? player.character?.couleur : '#666';
            const isActive = expandedId === player.id;

            return (
              <li key={player.id} className="graveyard-chip-wrap">
                <button
                  type="button"
                  className={`graveyard-chip ${isActive ? 'is-active' : ''} ${canExpand ? 'has-will' : ''}`}
                  onClick={canExpand ? () => setExpandedId(isActive ? null : player.id) : undefined}
                  style={{ '--dot': dotColor }}
                  title={canExpand ? t('game:last_will_placeholder', { defaultValue: 'Last will' }) : undefined}
                  disabled={!canExpand}
                >
                  <span className="graveyard-chip__dot" />
                  <span className="graveyard-chip__name">{player.profile.name}</span>
                  {roleLabel && (
                    <>
                      <span className="graveyard-chip__sep">·</span>
                      <span className="graveyard-chip__role">{roleLabel}</span>
                    </>
                  )}
                  {canExpand && <i className="fas fa-scroll graveyard-chip__scroll" aria-hidden="true"></i>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Last will panel — appears under the chip row when an expandable
          chip is active. Rendered as a single slot at the bottom so the
          chips above stay in a clean horizontal flow instead of pushing
          each other around when a will opens inline. */}
      {expandedId && expandedWill && (
        <div className="graveyard-will-panel">
          <i className="fas fa-scroll" aria-hidden="true"></i>
          <p>{expandedWill}</p>
        </div>
      )}
    </section>
  );
};

export default Graveyard;
