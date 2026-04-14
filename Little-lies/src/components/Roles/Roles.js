import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Roles.scss';

const RolesList = () => {
  const { t } = useTranslation('game');
  const { rolesSelected } = useGameEngine();
  const [selectedRole, setSelectedRole] = useState(null);

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

  const renderRole = (role) => (
    <span
      key={role.key}
      className="role-chip"
      style={{ color: role.team === 'town' ? '#78ff78' : '#ff4444', borderColor: role.team === 'town' ? 'rgba(120,255,120,0.2)' : 'rgba(255,68,68,0.2)' }}
      onClick={() => setSelectedRole(selectedRole?.key === role.key ? null : role)}
    >
      {role.label}{role.count > 1 && <span className="role-count">x{role.count}</span>}
    </span>
  );

  return (
    <div className="roles-list-box">
      <h3><i className="fas fa-theater-masks"></i> Roles</h3>
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

      {/* Role detail dialog */}
      {selectedRole && (
        <div className="role-detail-overlay" onClick={() => setSelectedRole(null)}>
          <div className="role-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="role-detail-header">
              <div className="role-detail-title" style={{ color: selectedRole.team === 'town' ? '#78ff78' : '#ff4444' }}>
                {selectedRole.icon && <i className={`fas ${selectedRole.icon}`}></i>}
                <h3>{selectedRole.label}</h3>
              </div>
              <button className="close-button" onClick={() => setSelectedRole(null)}>X</button>
            </div>
            <div className="role-detail-team" style={{ color: selectedRole.team === 'town' ? '#78ff78' : '#ff4444' }}>
              {t(`teams.${selectedRole.team}.short`)}
            </div>
            <p className="role-detail-desc">{selectedRole.description}</p>
            <p className="role-detail-obj">{selectedRole.objectif}</p>
            {selectedRole.actions?.length > 0 && (
              <div className="role-detail-abilities">
                <strong>Abilities:</strong>
                <ul>
                  {selectedRole.actions.map((a, i) => (
                    <li key={i}><strong>{a.label}</strong> — {a.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesList;
