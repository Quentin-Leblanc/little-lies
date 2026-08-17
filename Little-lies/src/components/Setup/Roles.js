import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';

// Faction ordering. Roles outside these four teams bucket under
// "neutral" so they still appear somewhere instead of vanishing.
const FACTIONS = ['town', 'mafia', 'neutral', 'cult'];
const bucketFor = (team) => (FACTIONS.includes(team) ? team : 'neutral');

// ─────────────────────────────────────────────────────────────────────
// Roles — one list, one stepper per row.
//
//   VILLAGE                                    3
//     🛡  Villageois          −   2   +
//     ⭐  Sheriff             −   1   +
//     💉  Docteur             −   0   +
//   MAFIA                                      1
//     🔫  Mafioso             −   1   +
//
// What this replaces: two side-by-side zones — a catalogue you clicked
// to add from, and a numbered roster you clicked to remove from. Three
// problems with that. It asked the player to hold two lists and their
// relationship in their head. It repeated duplicates as separate rows
// ("1. Villageois", "2. Villageois") instead of counting them. And it
// numbered the roster slots, which encoded nothing at all — roles are
// shuffled and dealt at random, so slot 3 means exactly as much as
// slot 7.
//
// Setting up a werewolf game is one question: how many of each role?
// So there is one list, and each row answers it.
// ─────────────────────────────────────────────────────────────────────
const Roles = () => {
  const { t } = useTranslation(['setup', 'game', 'roles']);
  const { rolesAvailable, setRolesSelected, rolesSelected } = useGameEngine();
  const { length: nbPlayers } = usePlayersList(true);
  const host = isHost();

  const countOf = (key) => rolesSelected.filter((r) => r.key === key).length;
  const slotsLeft = nbPlayers - rolesSelected.length;

  const addRole = (role) => {
    if (!host || slotsLeft <= 0) return;
    if (role.unique && countOf(role.key) >= 1) return;
    setRolesSelected([...rolesSelected, role]);
  };

  // Removes the last instance of that role — with a count-based list
  // there's no meaningful "which one", they're identical.
  const removeRole = (key) => {
    if (!host) return;
    const last = rolesSelected.map((r) => r.key).lastIndexOf(key);
    if (last === -1) return;
    setRolesSelected(rolesSelected.filter((_, i) => i !== last));
  };

  // Group by faction; villageois anchors first in town since it's the
  // filler role people reach for.
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

  const factionTotal = (faction) =>
    rolesSelected.filter((r) => bucketFor(r.team) === faction).length;

  return (
    <div className="role-picker">
      {/* Running total — the one number that decides whether the game
          can start. Sticky so it stays readable while scrolling a long
          faction list. */}
      <div className={`role-picker__tally ${slotsLeft === 0 ? 'is-complete' : ''}`}>
        <span className="role-picker__tally-count">
          {rolesSelected.length}<span className="role-picker__tally-sep">/</span>{nbPlayers}
        </span>
        <span className="role-picker__tally-label">
          {slotsLeft > 0
            ? t('setup:roles_remaining', { count: slotsLeft, defaultValue: `${slotsLeft} rôle(s) à placer` })
            : t('setup:roles_complete', { defaultValue: 'Tous les rôles sont placés' })}
        </span>
      </div>

      {FACTIONS.map((faction) => {
        const roles = grouped[faction];
        if (!roles.length) return null;
        const total = factionTotal(faction);
        return (
          <section key={faction} className={`role-group role-group--${faction}`}>
            <header className="role-group__head">
              <span className="role-group__name">{t(`game:teams.${faction}.short`)}</span>
              <span className={`role-group__count ${total > 0 ? 'is-active' : ''}`}>{total}</span>
            </header>

            <ul className="role-group__list">
              {roles.map((role) => {
                const count = countOf(role.key);
                const atUniqueCap = role.unique && count >= 1;
                const canAdd = host && slotsLeft > 0 && !atUniqueCap;
                const canRemove = host && count > 0;
                return (
                  <li
                    key={role.key}
                    className={`role-row ${count > 0 ? 'is-picked' : ''}`}
                    title={role.description || role.label}
                  >
                    <span className="role-row__icon" style={{ color: role.couleur }} aria-hidden="true">
                      <i className={`fas ${role.icon}`} />
                    </span>
                    <span className="role-row__name">{role.label}</span>
                    {role.unique && (
                      <span className="role-row__unique" title={t('setup:role_unique', { defaultValue: 'Un seul par partie' })}>
                        {t('setup:role_unique_short', { defaultValue: 'unique' })}
                      </span>
                    )}

                    <span className="role-row__stepper">
                      <button
                        type="button"
                        className="role-step role-step--minus"
                        onClick={() => removeRole(role.key)}
                        disabled={!canRemove}
                        aria-label={t('setup:role_remove_one', { name: role.label, defaultValue: `Retirer un ${role.label}` })}
                      >
                        <i className="fas fa-minus" aria-hidden="true" />
                      </button>
                      <span className="role-row__count" aria-live="polite">{count}</span>
                      <button
                        type="button"
                        className="role-step role-step--plus"
                        onClick={() => addRole(role)}
                        disabled={!canAdd}
                        aria-label={t('setup:role_add_one', { name: role.label, defaultValue: `Ajouter un ${role.label}` })}
                      >
                        <i className="fas fa-plus" aria-hidden="true" />
                      </button>
                    </span>
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
