import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import useEscapeKey from '../../hooks/useEscapeKey';
import './Village.scss';

// ─────────────────────────────────────────────────────────────────────
// Village — the top-left reference panel.
//
// Replaces two separate boxes that sat side by side (Graveyard + Roles)
// and answered the same underlying question: *what's left to figure
// out?*. One title, one border, two rows:
//
//   Rôles en jeu  — every role dealt this match, faction-coloured
//   Morts         — who's gone, their revealed role, their last will
//
// The living players are deliberately NOT listed here: the sidebar
// already carries them with their vote counts and action buttons.
// Duplicating them would force the player to check which of the two
// lists is authoritative.
// ─────────────────────────────────────────────────────────────────────

const FACTION_COLORS = {
  town: '#4ade80',
  mafia: '#ff4757',
  cult: '#a96edd',
  neutral: '#a855f7',
};
const factionColor = (role) => FACTION_COLORS[role?.team] || '#ccc';

const Village = () => {
  const { t } = useTranslation(['game', 'roles', 'common']);
  const { getPlayers, game, rolesSelected } = useGameEngine();
  const [selectedRole, setSelectedRole] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  useEscapeKey(selectedRole ? () => setSelectedRole(null) : null);

  // ── Roles in play — deduplicated with a count ──
  const roleCounts = {};
  (rolesSelected || []).forEach((role) => {
    if (!role?.key) return;
    if (!roleCounts[role.key]) roleCounts[role.key] = { ...role, count: 0 };
    roleCounts[role.key].count++;
  });
  const uniqueRoles = Object.values(roleCounts);
  // Town first, then every threat — reading order matches how players
  // reason about the board ("who's supposed to be good?").
  const orderedRoles = [
    ...uniqueRoles.filter((r) => r.team === 'town'),
    ...uniqueRoles.filter((r) => r.team !== 'town'),
  ];

  // ── The dead ──
  const deadPlayers = getPlayers().filter((p) => !p.isAlive);
  const rules = game?.config?.rules || {};
  const revealRoles = rules.revealOnDeath !== false;
  const allowWills = rules.lastWills !== false;
  const expandedWill = expandedId
    ? deadPlayers.find((p) => p.id === expandedId)?.lastWill
    : null;

  return (
    <section className="village-box">
      {/* ── Roles in play ── */}
      <div className="village-section">
        <h3 className="village-section__title">
          <i className="fas fa-theater-masks" aria-hidden="true"></i>
          <span>{t('game:role_sections.roles_title')}</span>
        </h3>
        {orderedRoles.length === 0 ? (
          <p className="village-empty">—</p>
        ) : (
          <div className="village-chips">
            {orderedRoles.map((role) => {
              const color = factionColor(role);
              return (
                <button
                  type="button"
                  key={role.key}
                  className="village-role-chip"
                  style={{ color, borderColor: `${color}55` }}
                  onClick={() => setSelectedRole(selectedRole?.key === role.key ? null : role)}
                >
                  {role.icon && <i className={`fas ${role.icon}`} aria-hidden="true"></i>}
                  <span>{role.label}</span>
                  {role.count > 1 && <span className="village-role-chip__count">×{role.count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── The dead ── */}
      <div className="village-section village-section--dead">
        <h3 className="village-section__title">
          <i className="fas fa-skull" aria-hidden="true"></i>
          <span>{t('game:graveyard.title')}</span>
          {deadPlayers.length > 0 && (
            <span className="village-section__count">{deadPlayers.length}</span>
          )}
        </h3>
        {deadPlayers.length === 0 ? (
          <p className="village-empty">{t('game:graveyard.empty')}</p>
        ) : (
          <div className="village-chips">
            {deadPlayers.map((player) => {
              const canExpand = allowWills && !!player.lastWill;
              const roleLabel = revealRoles
                ? t(`roles:${player.character?.key}.label`, { defaultValue: player.character?.label })
                : null;
              const dotColor = revealRoles ? player.character?.couleur : '#666';
              const isActive = expandedId === player.id;
              return (
                <button
                  type="button"
                  key={player.id}
                  className={`village-dead-chip ${isActive ? 'is-active' : ''} ${canExpand ? 'has-will' : ''}`}
                  onClick={canExpand ? () => setExpandedId(isActive ? null : player.id) : undefined}
                  style={{ '--dot': dotColor }}
                  title={canExpand ? t('game:last_will_title', { defaultValue: 'Testament' }) : undefined}
                  disabled={!canExpand}
                >
                  <span className="village-dead-chip__dot" />
                  <span className="village-dead-chip__name">{player.profile.name}</span>
                  {roleLabel && (
                    <>
                      <span className="village-dead-chip__sep">·</span>
                      <span className="village-dead-chip__role">{roleLabel}</span>
                    </>
                  )}
                  {canExpand && <i className="fas fa-scroll village-dead-chip__scroll" aria-hidden="true"></i>}
                </button>
              );
            })}
          </div>
        )}

        {/* Last will opens in a slot under the row so the chips above
            keep a clean horizontal flow instead of shoving each other. */}
        {expandedId && expandedWill && (
          <div className="village-will-panel">
            <i className="fas fa-scroll" aria-hidden="true"></i>
            <p>{expandedWill}</p>
          </div>
        )}
      </div>

      {/* Role detail — portaled to body so it escapes the panel's
          backdrop-filter, which creates a containing block and would
          otherwise clip a fixed-position descendant. */}
      {selectedRole && createPortal(
        <div
          className="role-detail-overlay"
          onClick={() => setSelectedRole(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedRole.label}
        >
          <div className="role-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="role-detail-header">
              <div className="role-detail-title" style={{ color: factionColor(selectedRole) }}>
                {selectedRole.icon && <i className={`fas ${selectedRole.icon}`} aria-hidden="true"></i>}
                <h3>{selectedRole.label}</h3>
              </div>
              <button
                className="close-button"
                onClick={() => setSelectedRole(null)}
                aria-label={t('common:close', { defaultValue: 'Fermer' })}
              >X</button>
            </div>
            <div className="role-detail-team" style={{ color: factionColor(selectedRole) }}>
              {t(`game:teams.${selectedRole.team}.short`)}
            </div>
            <p className="role-detail-desc">{selectedRole.description}</p>
            <p className="role-detail-obj">{selectedRole.objectif}</p>
            {selectedRole.actions?.length > 0 && (
              <div className="role-detail-abilities">
                <h4 className="role-detail-abilities-title">
                  <i className="fas fa-bolt" aria-hidden="true"></i> {t('game:role_sections.abilities')}
                </h4>
                <ul>
                  {selectedRole.actions.map((a, i) => (
                    <li key={i}><strong>{a.label}</strong> — {a.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
};

export default Village;
