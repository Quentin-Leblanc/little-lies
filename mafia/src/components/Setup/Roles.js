import { isHost, usePlayersList } from 'playroomkit';
import { useGameEngine } from '../../hooks/useGameEngine';

const TEAM_COLORS = {
  town: '#78ff78',
  mafia: '#ff4444',
  neutral: '#9370db',
};

const TEAM_LABELS = {
  town: 'Village',
  mafia: 'Mafia',
  neutral: 'Neutre',
};

const Roles = () => {
  const { rolesAvailable, setRolesSelected, rolesSelected } = useGameEngine();
  const { length: nbPlayers } = usePlayersList(true);

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
          <h2>Rôles disponibles</h2>
          {Object.entries(rolesByTeam).map(([team, roles]) => (
            <div key={team} className="role-team-group">
              <h3 style={{ color: TEAM_COLORS[team] }}>
                {TEAM_LABELS[team]}
              </h3>
              <div className="_buttons">
                {roles.map((role, index) => (
                  <button
                    key={`${role.key}-${index}`}
                    className="role-pick-btn"
                    disabled={rolesSelected.length >= nbPlayers || !isHost()}
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
        <h2>Sélectionnés ({rolesSelected.length}/{nbPlayers})</h2>
        <div className="_buttons selected">
          {rolesSelected.map((role, index) => (
            <button
              key={`selected-${index}`}
              className="role-selected-btn"
              disabled={!isHost()}
              onClick={() => removeRole(index)}
              style={{ borderColor: role.couleur }}
            >
              <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
              <span>{role.label}</span>
              {isHost() && <i className="fas fa-times remove-icon"></i>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Roles;
