import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';

// Faction ordering. Roles outside these four teams bucket under
// "neutral" so they still appear somewhere instead of vanishing.
const FACTIONS = ['town', 'mafia', 'neutral', 'cult'];
const bucketFor = (team) => (FACTIONS.includes(team) ? team : 'neutral');

// ─────────────────────────────────────────────────────────────────────
// Roles — two distinct zones, side by side:
//
//   ┌────────────────────────────┬──────────────────────────┐
//   │ DISPONIBLES (gauche)       │ SÉLECTIONNÉS (droite)    │
//   │   ▸ Town                   │   1. 🛡 Villageois       │
//   │     🛡 Villageois  (2)     │   2. 🛡 Villageois       │
//   │     🔍 Sheriff    (1)      │   3. 🔍 Sheriff          │
//   │   ▸ Mafia                  │   — slot 4               │
//   │     🩸 Parrain             │   — slot 5               │
//   │   ...                      │   ...                    │
//   └────────────────────────────┴──────────────────────────┘
//
// Click any row in the catalogue → adds to the roster.
// Click a filled roster slot → removes that instance.
// Both zones are simple vertical lists (no grids, no tiles).
// ─────────────────────────────────────────────────────────────────────
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

  const removeAt = (index) => {
    if (!host) return;
    setRolesSelected(rolesSelected.filter((_, i) => i !== index));
  };

  const slotsLeft = nbPlayers - rolesSelected.length;

  // Group catalogue roles by faction; villageois anchors first in town.
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

  const rosterSlots = [
    ...rolesSelected.map((role, i) => ({ kind: 'filled', role, index: i })),
    ...Array.from({ length: Math.max(0, slotsLeft) }, (_, i) => ({
      kind: 'empty',
      slotNumber: rolesSelected.length + i + 1,
    })),
  ];

  return (
    <div className="role-draft">
      {/* ── Catalogue (left — available roles) ────────────────── */}
      <section
        className="role-catalogue"
        aria-label={t('setup:catalogue_title', { defaultValue: 'Rôles disponibles' })}
      >
        <header className="role-zone__head">
          <span className="role-zone__title">
            {t('setup:catalogue_title', { defaultValue: 'Rôles disponibles' })}
          </span>
        </header>
        <div className="role-zone__body">
          {FACTIONS.map((faction) => {
            const roles = grouped[faction];
            if (!roles.length) return null;
            return (
              <div
                key={faction}
                className={`role-catalogue__section role-catalogue__section--${faction}`}
              >
                <div className="role-catalogue__faction">
                  {t(`game:teams.${faction}.short`)}
                </div>
                <ul className="role-catalogue__list">
                  {roles.map((role) => {
                    const count = countOf(role.key);
                    const isUniqueTaken = role.unique && count >= 1;
                    const canAdd = host && slotsLeft > 0 && !isUniqueTaken;
                    return (
                      <li key={role.key}>
                        <button
                          type="button"
                          className={`role-line role-line--${faction} ${isUniqueTaken ? 'is-locked' : ''}`}
                          onClick={() => addRole(role)}
                          disabled={!canAdd}
                          title={role.description || role.label}
                        >
                          <span
                            className="role-line__icon"
                            style={{ color: role.couleur }}
                            aria-hidden="true"
                          >
                            <i className={`fas ${role.icon}`} />
                          </span>
                          <span className="role-line__name">{role.label}</span>
                          {count > 0 && (
                            <span className="role-line__count" aria-label={`${count} sélectionné(s)`}>
                              ×{count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Roster (right — selected roles, in order) ─────────── */}
      <aside
        className="role-roster"
        aria-label={t('setup:roster_title', { defaultValue: 'Sélectionnés' })}
      >
        <header className="role-zone__head">
          <span className="role-zone__title">
            {t('setup:roster_title', { defaultValue: 'Sélectionnés' })}
          </span>
          <span className="role-zone__count">
            {rolesSelected.length}/{nbPlayers}
          </span>
        </header>
        <ul className="role-zone__body role-roster__list">
          {rosterSlots.map((slot, i) => {
            if (slot.kind === 'empty') {
              return (
                <li key={`empty-${i}`} className="role-slot role-slot--empty">
                  <span className="role-slot__num">{slot.slotNumber}</span>
                  <span className="role-slot__placeholder">
                    {t('setup:roster_empty_slot', { defaultValue: 'libre' })}
                  </span>
                </li>
              );
            }
            const { role, index } = slot;
            const faction = bucketFor(role.team);
            return (
              <li
                key={`filled-${index}`}
                className={`role-slot role-slot--filled role-slot--${faction}`}
              >
                <button
                  type="button"
                  className="role-slot__btn"
                  onClick={() => removeAt(index)}
                  disabled={!host}
                  title={t('setup:roster_remove', { name: role.label, defaultValue: `Retirer ${role.label}` })}
                >
                  <span className="role-slot__num">{index + 1}</span>
                  <span
                    className="role-slot__icon"
                    style={{ color: role.couleur }}
                    aria-hidden="true"
                  >
                    <i className={`fas ${role.icon}`} />
                  </span>
                  <span className="role-slot__name">{role.label}</span>
                  <i className="fas fa-xmark role-slot__remove" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
};

export default Roles;
