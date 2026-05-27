import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';

// Faction ordering for the section list. Roles outside these four teams
// (legacy "evil", future expansions) bucket under "neutral" so they still
// appear somewhere instead of vanishing.
const FACTIONS = ['town', 'mafia', 'neutral', 'cult'];

const bucketFor = (team) => (FACTIONS.includes(team) ? team : 'neutral');

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

  const slotsLeft = nbPlayers - rolesSelected.length;

  // Group available roles by faction. Villageois always anchors first in
  // the town section so the base citizen reads as the default pick; the
  // rest sorts alphabetically by label within each faction.
  const grouped = FACTIONS.reduce((acc, f) => ({ ...acc, [f]: [] }), {});
  rolesAvailable.forEach((role) => {
    grouped[bucketFor(role.team)].push(role);
  });
  FACTIONS.forEach((f) => {
    grouped[f].sort((a, b) => {
      if (a.key === 'villageois') return -1;
      if (b.key === 'villageois') return 1;
      return a.label.localeCompare(b.label);
    });
  });

  const factionCount = (f) => rolesSelected.filter((r) => bucketFor(r?.team) === f).length;

  return (
    <div className="role-list">
      {FACTIONS.map((faction) => {
        const roles = grouped[faction];
        if (!roles.length) return null;
        const picked = factionCount(faction);
        return (
          <section
            key={faction}
            className={`role-section role-section--${faction}`}
          >
            <header className="role-section__head">
              <span className={`role-section__chip role-section__chip--${faction}`}>
                {t(`game:teams.${faction}.short`)}
              </span>
              <span className="role-section__count">{picked}</span>
              <span className="role-section__divider" aria-hidden="true" />
            </header>

            <ul className="role-section__list">
              {roles.map((role) => {
                const count = countOf(role.key);
                const isUniqueTaken = role.unique && count >= 1;
                const canAdd = host && slotsLeft > 0 && !isUniqueTaken;
                const canRemove = host && count > 0;

                return (
                  <li
                    key={role.key}
                    className={`role-row role-row--${faction} ${count > 0 ? 'is-selected' : ''}`}
                    title={role.description || role.label}
                  >
                    <span
                      className="role-row__icon"
                      style={{ color: role.couleur }}
                      aria-hidden="true"
                    >
                      <i className={`fas ${role.icon}`} />
                    </span>

                    <div className="role-row__text">
                      <span className="role-row__name">{role.label}</span>
                    </div>

                    <div className="role-row__count" aria-live="polite">
                      {count > 0 ? count : ''}
                    </div>

                    <div className="role-row__stepper">
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
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default Roles;
