import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';

const TEAM_ORDER = ['town', 'mafia', 'cult', 'neutral'];

// Within a team, villageois anchors first so the grid reads "base citizen
// first, everything else after". Falls back to alphabetical for the rest.
const roleSortKey = (role) => {
  if (role.key === 'villageois') return '';
  return role.label;
};

const Roles = () => {
  const { t } = useTranslation(['setup', 'game', 'roles']);
  const { rolesAvailable, setRolesSelected, rolesSelected } = useGameEngine();
  const { length: nbPlayers } = usePlayersList(true);
  const host = isHost();

  const countOf = (key) => rolesSelected.filter((r) => r.key === key).length;

  const addRole = (role) => {
    if (!host || rolesSelected.length >= nbPlayers) return;
    if (role.unique && rolesSelected.some((r) => r.key === role.key)) return;
    setRolesSelected([...rolesSelected, role]);
  };

  // Remove the most recently added instance of this role. `lastIndexOf`
  // keeps every other slot in insertion order so the host's roster view
  // doesn't reshuffle unexpectedly when one role is bumped down.
  const removeRole = (role) => {
    if (!host) return;
    const lastIndex = rolesSelected.map((r) => r.key).lastIndexOf(role.key);
    if (lastIndex === -1) return;
    setRolesSelected(rolesSelected.filter((_, i) => i !== lastIndex));
  };

  const sortedRoles = [...rolesAvailable].sort((a, b) => {
    const ta = TEAM_ORDER.indexOf(a.team);
    const tb = TEAM_ORDER.indexOf(b.team);
    if (ta !== tb) return ta - tb;
    return roleSortKey(a).localeCompare(roleSortKey(b));
  });

  const slotsLeft = nbPlayers - rolesSelected.length;

  return (
    <div className="role-grid">
      {sortedRoles.map((role) => {
        const count = countOf(role.key);
        const isUniqueTaken = role.unique && count >= 1;
        const canAdd = host && slotsLeft > 0 && !isUniqueTaken;
        const canRemove = host && count > 0;

        return (
          <div
            key={role.key}
            className={`role-card role-card--${role.team} ${count > 0 ? 'is-selected' : ''}`}
            title={role.description}
          >
            {count > 0 && <span className="role-card__badge">{count}</span>}

            <div className="role-card__head">
              <span className="role-card__icon" style={{ color: role.couleur }}>
                <i className={`fas ${role.icon}`} />
              </span>
              <span className="role-card__name">{role.label}</span>
            </div>

            <div className="role-card__footer">
              <span className={`team-pill team-pill--${role.team}`}>
                {t(`game:teams.${role.team}.short`)}
              </span>
              {/* Stepper pair — always rendered so the card layout stays
                  stable whether or not the role is picked. − is disabled
                  when count is zero, + is disabled when the roster is
                  full or the role is unique-already-taken. */}
              <div className="role-card__stepper">
                <button
                  type="button"
                  className="stepper-btn stepper-btn--minus"
                  onClick={() => removeRole(role)}
                  disabled={!canRemove}
                  aria-label={`−1 ${role.label}`}
                >
                  −
                </button>
                <button
                  type="button"
                  className="stepper-btn stepper-btn--plus"
                  onClick={() => addRole(role)}
                  disabled={!canAdd}
                  aria-label={`+1 ${role.label}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Roles;
