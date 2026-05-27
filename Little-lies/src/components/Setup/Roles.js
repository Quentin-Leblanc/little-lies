import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';

// Faction ordering. Roles outside these four teams (legacy "evil",
// future expansions) bucket under "neutral" so they still appear
// somewhere instead of vanishing.
const FACTIONS = ['town', 'mafia', 'neutral', 'cult'];

const bucketFor = (team) => (FACTIONS.includes(team) ? team : 'neutral');

// ─────────────────────────────────────────────────────────────────────
// Roles — Mafia-SC2 style draft picker. Two zones, no +/- buttons:
//
//   ┌─────────────────────────────────┬──────────────────────────┐
//   │ ROSTER (4/8)                    │ AVAILABLE ROLES          │
//   │   1. 🛡 Villageois              │ ▸ Town                   │
//   │   2. 🛡 Villageois              │   🛡 V  🔍 Sh  💊 Dr ...  │
//   │   3. 🔍 Sheriff                 │ ▸ Mafia                  │
//   │   4. 🩸 Parrain                 │   🩸 Gf 🔪 Mf  ...        │
//   │   5. + slot vide                │ ▸ Neutre / ▸ Culte       │
//   └─────────────────────────────────┴──────────────────────────┘
//
// Click a catalogue tile → add to roster.
// Click a roster row → remove that instance.
// Unique roles dim out in the catalogue once picked; non-unique stay
// active with a small badge showing how many are already in the roster.
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

  // Remove the role at a specific index in the roster (the slot
  // clicked). Preserves insertion order for the rest of the roster.
  const removeAt = (index) => {
    if (!host) return;
    setRolesSelected(rolesSelected.filter((_, i) => i !== index));
  };

  const slotsLeft = nbPlayers - rolesSelected.length;

  // Group catalogue roles by faction. Villageois anchors first in the
  // town section so the base citizen is always the most reachable pick;
  // the rest sorts alphabetically by label within each faction.
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

  // Build the roster slot list — selected roles first, then empty
  // slots up to nbPlayers so the host can see how many seats remain.
  const rosterSlots = [
    ...rolesSelected.map((role, i) => ({ kind: 'filled', role, index: i })),
    ...Array.from({ length: Math.max(0, slotsLeft) }, (_, i) => ({
      kind: 'empty',
      slotNumber: rolesSelected.length + i + 1,
    })),
  ];

  return (
    <div className="role-draft">
      {/* ── Roster (selected) ───────────────────────────────────── */}
      <aside className="role-roster" aria-label={t('setup:roster_title', { defaultValue: 'Roster' })}>
        <header className="role-roster__head">
          <span className="role-roster__title">
            {t('setup:roster_title', { defaultValue: 'Roster' })}
          </span>
          <span className="role-roster__count">
            {rolesSelected.length}/{nbPlayers}
          </span>
        </header>
        <ul className="role-roster__list">
          {rosterSlots.map((slot, i) => {
            if (slot.kind === 'empty') {
              return (
                <li key={`empty-${i}`} className="role-slot role-slot--empty">
                  <span className="role-slot__num">{slot.slotNumber}</span>
                  <span className="role-slot__placeholder">
                    {t('setup:roster_empty_slot', { defaultValue: '— libre' })}
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

      {/* ── Catalogue (available) ────────────────────────────────── */}
      <section className="role-catalogue" aria-label={t('setup:catalogue_title', { defaultValue: 'Available roles' })}>
        {FACTIONS.map((faction) => {
          const roles = grouped[faction];
          if (!roles.length) return null;
          const picked = rolesSelected.filter((r) => bucketFor(r?.team) === faction).length;
          return (
            <div
              key={faction}
              className={`role-catalogue__section role-catalogue__section--${faction}`}
            >
              <header className="role-catalogue__head">
                <span className={`role-catalogue__chip role-catalogue__chip--${faction}`}>
                  {t(`game:teams.${faction}.short`)}
                </span>
                {picked > 0 && (
                  <span className="role-catalogue__count">{picked}</span>
                )}
                <span className="role-catalogue__divider" aria-hidden="true" />
              </header>
              <ul className="role-catalogue__list">
                {roles.map((role) => {
                  const count = countOf(role.key);
                  const isUniqueTaken = role.unique && count >= 1;
                  const canAdd = host && slotsLeft > 0 && !isUniqueTaken;
                  return (
                    <li key={role.key}>
                      <button
                        type="button"
                        className={`role-tile role-tile--${faction} ${count > 0 ? 'has-count' : ''} ${isUniqueTaken ? 'is-locked' : ''}`}
                        onClick={() => addRole(role)}
                        disabled={!canAdd}
                        title={role.description || role.label}
                      >
                        <span
                          className="role-tile__icon"
                          style={{ color: role.couleur }}
                          aria-hidden="true"
                        >
                          <i className={`fas ${role.icon}`} />
                        </span>
                        <span className="role-tile__name">{role.label}</span>
                        {count > 0 && (
                          <span className="role-tile__badge" aria-label={`${count} sélectionné(s)`}>
                            {count}
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
      </section>
    </div>
  );
};

export default Roles;
