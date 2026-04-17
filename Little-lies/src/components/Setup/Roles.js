import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';

const TEAM_COLORS = {
  town: '#78ff78',
  mafia: '#ff4444',
  cult: '#a96edd',
  neutral: '#9370db',
};

const Roles = () => {
  const { t } = useTranslation(['setup', 'game']);
  const { rolesAvailable, setRolesSelected, rolesSelected } = useGameEngine();
  const { length: nbPlayers } = usePlayersList(true);
  const host = isHost();

  // Group available roles by team
  const rolesByTeam = {};
  rolesAvailable.forEach((role) => {
    if (!rolesByTeam[role.team]) rolesByTeam[role.team] = [];
    rolesByTeam[role.team].push(role);
  });

  const addRole = (role) => {
    if (rolesSelected.length < nbPlayers && isHost()) {
      setRolesSelected([...rolesSelected, role]);
    }
  };

  const removeRole = (index) => {
    if (isHost()) {
      setRolesSelected(rolesSelected.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      <div className="rolesAvailable">
        <div className="rolesSelection">
          <h2>{t('setup:roles_available')}</h2>
          {Object.entries(rolesByTeam).map(([team, roles]) => (
            <div key={team} className="role-team-group">
              <h3 style={{ color: TEAM_COLORS[team] }}>
                {t(`game:teams.${team}.short`)}
              </h3>
              <div className="_buttons">
                {roles.map((role, index) => (
                  <button
                    key={`${role.key}-${index}`}
                    className={`role-pick-btn ${!host ? 'is-viewer' : ''}`}
                    disabled={rolesSelected.length >= nbPlayers || !host}
                    onClick={() => addRole(role)}
                    title={role.description}
                    style={{ borderColor: role.couleur }}
                  >
                    <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="arrow">
        <i className="fas fa-angle-right"></i>
      </div>
      <div className="rolesSelected">
        <h2>{t('setup:roles_selected', { current: rolesSelected.length, total: nbPlayers })}</h2>
        <div className="_buttons selected">
          {rolesSelected.map((role, index) => (
            <button
              key={`selected-${index}`}
              className={`role-selected-btn ${!host ? 'is-viewer' : ''}`}
              disabled={!host}
              onClick={() => removeRole(index)}
              style={{ borderColor: role.couleur }}
            >
              <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
              <span>{role.label}</span>
              {host && <i className="fas fa-times remove-icon"></i>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Roles;
