/**
 * Role definitions — mechanical data only (no translations).
 * Labels, descriptions, objectives come from i18n (src/trad/{lang}/roles.json).
 */

import i18n from '../trad/i18n';

export const attackLevels = { none: 0, basic: 1, powerful: 2, unstoppable: 3 };
export const defenseLevels = { none: 0, basic: 1, powerful: 2, invincible: 3 };

// Role mechanics (team, stats, actions structure)
const ROLE_DATA = [
  {
    key: 'villageois', team: 'town', category: 'town_government',
    couleur: '#78ff78', icon: 'fa-user',
    actions: [],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'sheriff', team: 'town', category: 'town_investigative',
    couleur: '#ffff00', icon: 'fa-star',
    actions: [{ type: 'INVESTIGATE', require: ['isNight'], targets: 'notMe', priority: 6 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'docteur', team: 'town', category: 'town_protective',
    couleur: '#00bfff', icon: 'fa-medkit',
    actions: [{ type: 'PROTECT', require: ['isNight'], targets: 'notMe', priority: 2 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'lookout', team: 'town', category: 'town_investigative',
    couleur: '#7fff00', icon: 'fa-eye',
    actions: [{ type: 'LOOKOUT', require: ['isNight'], targets: 'notMe', priority: 7 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'vigilante', team: 'town', category: 'town_killing',
    couleur: '#c8e600', icon: 'fa-crosshairs',
    actions: [{ type: 'VIGILANTE_KILL', require: ['isNight'], targets: 'notMe', priority: 4, maxUses: 2 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 1, defenseLevel: 0,
  },
  {
    key: 'maire', team: 'town', category: 'town_government',
    couleur: '#ffd700', icon: 'fa-landmark',
    actions: [{ type: 'REVEAL', require: ['isDay'], targets: 'self', oneTimeUse: true }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'escort', team: 'town', category: 'town_support',
    couleur: '#ff99cc', icon: 'fa-ban',
    actions: [{ type: 'ROLEBLOCK', require: ['isNight'], targets: 'notMe', priority: 1 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'bodyguard', team: 'town', category: 'town_protective',
    couleur: '#4682b4', icon: 'fa-shield',
    actions: [{ type: 'BODYGUARD', require: ['isNight'], targets: 'notMe', priority: 2 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 2, defenseLevel: 0,
  },
  {
    key: 'spy', team: 'town', category: 'town_investigative',
    couleur: '#20b2aa', icon: 'fa-user-ninja',
    actions: [{ type: 'SPY', require: ['isNight'], targets: 'self', priority: 7 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'jailor', team: 'town', category: 'town_killing',
    couleur: '#b8860b', icon: 'fa-lock',
    actions: [
      { type: 'JAIL', require: ['isDay'], targets: 'notMe', priority: 0 },
      { type: 'JAILOR_EXECUTE', require: ['isNight'], targets: 'jailed', maxUses: 3, priority: 4 },
    ],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 2, defenseLevel: 0,
  },
  {
    key: 'godfather', team: 'mafia', category: 'mafia_killing',
    couleur: '#ff0000', icon: 'fa-user-secret',
    actions: [{ type: 'KILL', require: ['isNight'], targets: 'notMyTeam', priority: 4 }],
    unique: true, nightImmune: true, detectResult: 'non-suspect', attackLevel: 1, defenseLevel: 1,
  },
  {
    key: 'mafioso', team: 'mafia', category: 'mafia_killing',
    couleur: '#cc0000', icon: 'fa-gun',
    actions: [{ type: 'KILL', require: ['isNight'], targets: 'notMyTeam', priority: 4 }],
    nightImmune: false, detectResult: 'suspect', attackLevel: 1, defenseLevel: 0,
  },
  {
    key: 'framer', team: 'mafia', category: 'mafia_deception',
    couleur: '#ff4444', icon: 'fa-mask',
    actions: [{ type: 'FRAME', require: ['isNight'], targets: 'notMyTeam', priority: 3 }],
    nightImmune: false, detectResult: 'suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'blackmailer', team: 'mafia', category: 'mafia_support',
    couleur: '#ff6666', icon: 'fa-comment-slash',
    actions: [{ type: 'BLACKMAIL', require: ['isNight'], targets: 'notMyTeam', priority: 3 }],
    nightImmune: false, detectResult: 'suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'consigliere', team: 'mafia', category: 'mafia_support',
    couleur: '#ff8888', icon: 'fa-binoculars',
    actions: [{ type: 'INVESTIGATE_ROLE', require: ['isNight'], targets: 'notMyTeam', priority: 6 }],
    nightImmune: false, detectResult: 'suspect', attackLevel: 0, defenseLevel: 0,
  },
  {
    key: 'serial_killer', team: 'neutral', category: 'neutral_killing',
    couleur: '#9370db', icon: 'fa-skull',
    actions: [{ type: 'KILL', require: ['isNight'], targets: 'notMe', priority: 4 }],
    nightImmune: true, detectResult: 'suspect', attackLevel: 1, defenseLevel: 1,
    winCondition: 'lastStanding',
  },
  {
    key: 'jester', team: 'neutral', category: 'neutral_benign',
    couleur: '#ff69b4', icon: 'fa-face-grin-tears',
    actions: [],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
    winCondition: 'getLynched',
  },
  {
    key: 'survivor', team: 'neutral', category: 'neutral_benign',
    couleur: '#daa520', icon: 'fa-shield-halved',
    actions: [{ type: 'VEST', require: ['isNight'], targets: 'self', maxUses: 3, priority: 1 }],
    nightImmune: false, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 0,
    winCondition: 'survive',
  },
  {
    key: 'executioner', team: 'neutral', category: 'neutral_evil',
    couleur: '#808080', icon: 'fa-bullseye',
    actions: [],
    nightImmune: true, detectResult: 'non-suspect', attackLevel: 0, defenseLevel: 1,
    winCondition: 'getTargetLynched',
  },
  // ============================================================
  // Cult — inspired by Mafia SC2. The cult is a third evil faction
  // that wins by conversion rather than killing. Every cultist has
  // equal weight: each one picks a target each night, and a target is
  // only converted when ALL the alive cultists' votes converge on the
  // same player. Two cultists picking different targets = no conversion
  // that night. No leader, no tiebreaker.
  // Priority 5 runs after frame/blackmail but before investigations so
  // the converted target's team flip is reflected in the same night.
  // ============================================================
  {
    key: 'cultist', team: 'cult', category: 'cult_evil',
    couleur: '#a96edd', icon: 'fa-hat-wizard',
    actions: [
      { type: 'CULT_VOTE', require: ['isNight'], targets: 'notMyTeam', priority: 5 },
    ],
    nightImmune: false, detectResult: 'suspect',
    attackLevel: 0, defenseLevel: 0,
  },
];

/**
 * Get all roles with translations applied.
 * Call this to get the full role objects with label, description, objectif from i18n.
 */
export const getRoles = () => {
  return ROLE_DATA.map(role => {
    const t = (key) => i18n.t(`roles:${role.key}.${key}`, { defaultValue: '' });
    const tAction = (actionType, field) => i18n.t(`roles:${role.key}.actions.${actionType}.${field}`, { defaultValue: '' });
    // `details` is a bulleted list of role-mechanics notes surfaced in the
    // help dialog ("does framing last?", "does Sheriff see exact role?"...).
    // Comes back as an array when defined; fall back to empty when absent.
    const rawDetails = i18n.t(`roles:${role.key}.details`, { returnObjects: true, defaultValue: [] });
    const details = Array.isArray(rawDetails) ? rawDetails : [];

    return {
      ...role,
      label: t('label') || role.key,
      description: t('description'),
      objectif: t('objectif'),
      details,
      actions: role.actions.map(action => ({
        ...action,
        label: tAction(action.type, 'label') || action.type,
        description: tAction(action.type, 'description') || '',
      })),
    };
  });
};

/**
 * Get a single role by key with translations.
 */
export const getRole = (key) => {
  return getRoles().find(r => r.key === key) || null;
};

export default ROLE_DATA;
