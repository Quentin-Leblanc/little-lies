import { useRef } from 'react';
import { isHost, usePlayersList } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import RoleCard from '../RoleCard/RoleCard';

// Faction ordering. Roles outside these four teams bucket under
// "neutral" so they still appear somewhere instead of vanishing.
const FACTIONS = ['town', 'mafia', 'neutral', 'cult'];
const bucketFor = (team) => (FACTIONS.includes(team) ? team : 'neutral');

// ─────────────────────────────────────────────────────────────────────
// Roles — the draft table.
//
//   ┌──────────────────────────────┬────────────────────┐
//   │  LE DECK (toutes les cartes) │  DANS LA PARTIE    │
//   │  grille de cartes par camp   │  cartes choisies   │
//   │  clic → un gros chiffre      │  clic → en retire  │
//   │  s'affiche sur la carte      │  une               │
//   └──────────────────────────────┴────────────────────┘
//
// Left is the deck: every role, always in the same place, so the host
// builds muscle memory for where a card lives. Clicking one adds a copy
// and paints the count straight onto its art.
//
// Right is the bag: only what's actually going into this game. It's a
// different surface on purpose — deck and bag must never be mistaken
// for one another.
// ─────────────────────────────────────────────────────────────────────
const Roles = () => {
  const { t } = useTranslation(['setup', 'game', 'roles']);
  const { rolesAvailable, setRolesSelected, rolesSelected } = useGameEngine();
  const { length: nbPlayers } = usePlayersList(true);
  const host = isHost();

  const countOf = (key) => rolesSelected.filter((r) => r.key === key).length;
  const slotsLeft = nbPlayers - rolesSelected.length;

  // Two clicks inside the same frame both read the same `rolesSelected`
  // from their closure, so the second one writes the same array again
  // and a click is silently lost — exactly what a host does when they
  // double-tap a card to add two villagers. PlayroomKit's setter takes
  // no updater callback (see CLAUDE.md), so the live value is tracked
  // in a ref and every mutation reads through it.
  const liveRef = useRef(rolesSelected);
  liveRef.current = rolesSelected;

  const commit = (next) => {
    liveRef.current = next;
    setRolesSelected(next);
  };

  const addRole = (role) => {
    if (!host) return;
    const live = liveRef.current;
    if (nbPlayers - live.length <= 0) return;
    if (role.unique && live.some((r) => r.key === role.key)) return;
    commit([...live, role]);
  };

  // Removes the last copy — with a count-based deck there is no
  // meaningful "which one", the copies are identical.
  const removeRole = (key) => {
    if (!host) return;
    const live = liveRef.current;
    const last = live.map((r) => r.key).lastIndexOf(key);
    if (last === -1) return;
    commit(live.filter((_, i) => i !== last));
  };

  // Left-click adds, right-click removes. The right panel is the
  // discoverable way to remove; this is the shortcut for people who
  // find it.
  const onCardContext = (e, role) => {
    e.preventDefault();
    removeRole(role.key);
  };

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

  // The bag, collapsed to one entry per role with its count — a bag
  // holding three villagers is one stack of three, not three rows.
  const bagStacks = [];
  rolesSelected.forEach((role) => {
    const found = bagStacks.find((s) => s.role.key === role.key);
    if (found) found.count += 1;
    else bagStacks.push({ role, count: 1 });
  });

  return (
    <div className="draft">
      {/* ── Left: the deck ─────────────────────────────────────── */}
      <section className="draft-deck" aria-label={t('setup:deck_title', { defaultValue: 'Le deck' })}>
        <header className="draft-panel__head">
          <span className="draft-panel__title">{t('setup:deck_title', { defaultValue: 'Le deck' })}</span>
          <span className="draft-panel__hint">
            {host
              ? t('setup:deck_hint', { defaultValue: 'Clic pour ajouter · clic droit pour retirer' })
              : t('setup:deck_hint_guest', { defaultValue: "L'hôte compose la partie" })}
          </span>
        </header>

        <div className="draft-panel__body">
          {FACTIONS.map((faction) => {
            const roles = grouped[faction];
            if (!roles.length) return null;
            const total = factionTotal(faction);
            return (
              <div key={faction} className={`deck-faction deck-faction--${faction}`}>
                <div className="deck-faction__head">
                  <span className="deck-faction__name">{t(`game:teams.${faction}.short`)}</span>
                  <span className={`deck-faction__count ${total > 0 ? 'is-active' : ''}`}>{total}</span>
                </div>
                <div className="deck-faction__grid">
                  {roles.map((role) => {
                    const count = countOf(role.key);
                    const atUniqueCap = role.unique && count >= 1;
                    const canAdd = host && slotsLeft > 0 && !atUniqueCap;
                    return (
                      <RoleCard
                        key={role.key}
                        role={role}
                        size="sm"
                        count={count}
                        faded={count === 0}
                        selected={count > 0}
                        className={host ? 'role-card--clickable' : ''}
                        onClick={canAdd ? () => addRole(role) : undefined}
                        onContextMenu={host ? (e) => onCardContext(e, role) : undefined}
                        title={
                          atUniqueCap
                            ? t('setup:role_unique', { defaultValue: 'Un seul par partie' })
                            : role.description || role.label
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Right: the bag ─────────────────────────────────────── */}
      <aside className="draft-bag" aria-label={t('setup:bag_title', { defaultValue: 'Dans la partie' })}>
        <header className="draft-panel__head">
          <span className="draft-panel__title">{t('setup:bag_title', { defaultValue: 'Dans la partie' })}</span>
          <span className={`draft-bag__tally ${slotsLeft === 0 ? 'is-complete' : ''}`}>
            {rolesSelected.length}<span className="draft-bag__sep">/</span>{nbPlayers}
          </span>
        </header>

        <div className="draft-panel__body">
          {bagStacks.length === 0 ? (
            <p className="draft-bag__empty">
              {t('setup:bag_empty', { defaultValue: 'Choisis des cartes à gauche pour composer la partie.' })}
            </p>
          ) : (
            <div className="draft-bag__grid">
              {bagStacks.map(({ role, count }) => (
                <RoleCard
                  key={role.key}
                  role={role}
                  size="sm"
                  count={count > 1 ? count : null}
                  selected
                  className={host ? 'role-card--clickable' : ''}
                  onClick={host ? () => removeRole(role.key) : undefined}
                  title={t('setup:role_remove_one', { name: role.label, defaultValue: `Retirer un ${role.label}` })}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="draft-bag__foot">
          {slotsLeft > 0
            ? t('setup:roles_remaining', { count: slotsLeft, defaultValue: `${slotsLeft} rôle(s) à placer` })
            : t('setup:roles_complete', { defaultValue: 'Tous les rôles sont placés' })}
        </footer>
      </aside>
    </div>
  );
};

export default Roles;
