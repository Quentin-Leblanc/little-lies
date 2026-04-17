import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import useEscapeKey from '../../hooks/useEscapeKey';
import './Roles.scss';

const RolesList = () => {
  const { t } = useTranslation(['game', 'common']);
  const { rolesSelected } = useGameEngine();
  const [selectedRole, setSelectedRole] = useState(null);
  useEscapeKey(selectedRole ? () => setSelectedRole(null) : null);

  // Count occurrences of each role
  const roleCounts = {};
  (rolesSelected || []).forEach((role) => {
    const key = role.key;
    if (!roleCounts[key]) {
      roleCounts[key] = { ...role, count: 0 };
    }
    roleCounts[key].count++;
  });

  const uniqueRoles = Object.values(roleCounts);
  const townRoles = uniqueRoles.filter((r) => r.team === 'town');
  const evilRoles = uniqueRoles.filter((r) => r.team === 'mafia' || r.team === 'neutral');

  // Color by faction (not by individual role)
  const FACTION_COLORS = {
    town: '#4ade80',     // green
    mafia: '#ff4757',    // red
    neutral: '#a855f7',  // purple
  };
  const getFactionColor = (role) => FACTION_COLORS[role.team] || '#ccc';

  const renderRole = (role) => {
    const color = getFactionColor(role);
    return (
      <span
        key={role.key}
        className="role-chip"
        style={{ color, borderColor: `${color}55` }}
        onClick={() => setSelectedRole(selectedRole?.key === role.key ? null : role)}
      >
        {role.icon && <i className={`fas ${role.icon}`} style={{ marginRight: 4, fontSize: '0.8em' }}></i>}
        {role.label}{role.count > 1 && <span className="role-count">x{role.count}</span>}
      </span>
    );
  };

  return (
    <div className="roles-list-box">
      <h3><i className="fas fa-theater-masks" aria-hidden="true"></i> {t('game:role_sections.roles_title')}</h3>
      {uniqueRoles.length === 0 ? (
        <p className="roles-empty">-</p>
      ) : (
        <>
          <div className="roles-chips">
            {townRoles.map(renderRole)}
            {evilRoles.map(renderRole)}
          </div>
        </>
      )}

      {/* Role detail dialog — rendered via portal to document.body so it
          escapes the parent `.roles-list-box` (which has backdrop-filter,
          a property that creates a containing block and clips fixed
          descendants). */}
      {selectedRole && ReactDOM.createPortal(
        <div className="role-detail-overlay" onClick={() => setSelectedRole(null)}
             role="dialog" aria-modal="true" aria-label={selectedRole.label}>
          <div className="role-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="role-detail-header">
              <div className="role-detail-title" style={{ color: getFactionColor(selectedRole) }}>
                {selectedRole.icon && <i className={`fas ${selectedRole.icon}`} aria-hidden="true"></i>}
                <h3>{selectedRole.label}</h3>
              </div>
              <button className="close-button" onClick={() => setSelectedRole(null)}
                      aria-label={t('common:close', { defaultValue: 'Close' })}>X</button>
            </div>
            <div className="role-detail-team" style={{ color: getFactionColor(selectedRole) }}>
              {t(`teams.${selectedRole.team}.short`)}
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
        document.body
      )}
    </div>
  );
};

export default RolesList;
