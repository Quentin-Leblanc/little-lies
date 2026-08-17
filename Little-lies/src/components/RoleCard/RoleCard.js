import React from 'react';
import { useTranslation } from 'react-i18next';
import RoleArt from './RoleArt';
import './RoleCard.scss';

// ─────────────────────────────────────────────────────────────────────
// RoleCard — the game's playing card, used everywhere a role is shown:
// the setup catalogue, the start-of-game reveal, and the death reveal.
//
// Anatomy follows a physical werewolf card:
//
//   ┌───────────────────┐
//   │   LOUP-GAROU      │  ← name banner, faction colour
//   ├───────────────────┤
//   │                   │
//   │    illustration   │
//   │                   │
//   └───────────────────┘
//
// Sizes are driven by a single `--card-w` custom property so the same
// component works at 90px in a grid and at 380px on a reveal without
// any per-context markup.
//
// size:  'sm' | 'md' | 'lg'  — or pass width via style={{'--card-w': …}}
// count: when set, paints a big number over the art (setup picker)
// faded: dims the card (a role at count 0, a dead player)
// ─────────────────────────────────────────────────────────────────────
const RoleCard = ({
  role,
  size = 'md',
  count = null,
  faded = false,
  selected = false,
  showTeam = false,
  className = '',
  ...rest
}) => {
  const { t } = useTranslation(['roles', 'game']);
  if (!role) return null;

  const accent = role.couleur || '#f0b840';
  const label = t(`roles:${role.key}.label`, { defaultValue: role.label || role.key });
  const teamLabel = t(`game:teams.${role.team}.short`, { defaultValue: role.team });

  // A card that does something is a button: it takes focus, Enter and
  // Space fire it, and screen readers announce it as actionable.
  const isButton = typeof rest.onClick === 'function';
  const onKeyDown = isButton
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          rest.onClick(e);
        }
      }
    : undefined;

  return (
    <div
      className={[
        'role-card',
        `role-card--${size}`,
        `role-card--${role.team}`,
        faded ? 'is-faded' : '',
        selected ? 'is-selected' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ '--card-accent': accent }}
      role={isButton ? 'button' : undefined}
      tabIndex={isButton ? 0 : undefined}
      aria-label={isButton ? label : undefined}
      onKeyDown={onKeyDown}
      {...rest}
    >
      <div className="role-card__frame">
        <div className="role-card__banner">
          <span className="role-card__name">{label}</span>
        </div>

        <div className="role-card__art">
          <RoleArt roleKey={role.key} accent={accent} />
          {role.icon && (
            <i className={`fas ${role.icon} role-card__glyph`} aria-hidden="true" />
          )}
        </div>

        {showTeam && <div className="role-card__team">{teamLabel}</div>}
      </div>

      {/* Count badge — the setup picker paints how many of this role are
          in the bag straight onto the card, so the number lives where
          the thing it counts is. */}
      {count != null && count > 0 && (
        <span className="role-card__count" aria-hidden="true">{count}</span>
      )}
    </div>
  );
};

export default RoleCard;
