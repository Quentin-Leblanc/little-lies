// Player progression : tiers (ranks) and unlockable color skins.
// Pure data + helpers — no React, no side effects.

export const TIERS = [
  { minLevel: 1,   key: 'novice',    name: { fr: 'Novice',     en: 'Novice'     }, icon: 'fa-user',           gradient: ['#78909c', '#b0bec5'] },
  { minLevel: 5,   key: 'apprentice', name: { fr: 'Apprenti',   en: 'Apprentice' }, icon: 'fa-user-shield',    gradient: ['#26a69a', '#80cbc4'] },
  { minLevel: 10,  key: 'investigator', name: { fr: 'Enquêteur', en: 'Investigator' }, icon: 'fa-magnifying-glass', gradient: ['#42a5f5', '#90caf9'] },
  { minLevel: 25,  key: 'master',    name: { fr: 'Maître',     en: 'Master'     }, icon: 'fa-chess-knight',   gradient: ['#ab47bc', '#ce93d8'] },
  { minLevel: 50,  key: 'legend',    name: { fr: 'Légende',    en: 'Legend'     }, icon: 'fa-crown',          gradient: ['#ff7043', '#ffab91'] },
  { minLevel: 100, key: 'myth',      name: { fr: 'Mythe',      en: 'Myth'       }, icon: 'fa-dragon',         gradient: ['#ffd54f', '#fff176'] },
];

export const COLOR_REWARDS = [
  { id: 'slate',   name: { fr: 'Ardoise',   en: 'Slate'   }, gradient: ['#546e7a', '#90a4ae'], unlockLevel: 1  },
  { id: 'forest',  name: { fr: 'Forêt',     en: 'Forest'  }, gradient: ['#2e7d32', '#66bb6a'], unlockLevel: 1  },
  { id: 'ocean',   name: { fr: 'Océan',     en: 'Ocean'   }, gradient: ['#0277bd', '#4fc3f7'], unlockLevel: 3  },
  { id: 'sunset',  name: { fr: 'Crépuscule', en: 'Sunset' }, gradient: ['#ef6c00', '#ffab40'], unlockLevel: 5  },
  { id: 'blood',   name: { fr: 'Sang',      en: 'Blood'   }, gradient: ['#b71c1c', '#e53935'], unlockLevel: 10 },
  { id: 'royal',   name: { fr: 'Royal',     en: 'Royal'   }, gradient: ['#4a148c', '#7b1fa2'], unlockLevel: 15 },
  { id: 'gold',    name: { fr: 'Or',        en: 'Gold'    }, gradient: ['#f57f17', '#ffd600'], unlockLevel: 25 },
  { id: 'void',    name: { fr: 'Néant',     en: 'Void'    }, gradient: ['#000000', '#37474f'], unlockLevel: 50 },
];

// Current tier given a level (walks tiers and returns the last matching).
export const getTierForLevel = (level = 1) => {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (level >= t.minLevel) current = t;
    else break;
  }
  return current;
};

// Next tier (or null if max).
export const getNextTier = (level = 1) => {
  const current = getTierForLevel(level);
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
};

// Progress (0..1) from current tier to next tier, based on level only.
export const getTierProgress = (level = 1) => {
  const current = getTierForLevel(level);
  const next = getNextTier(level);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (level - current.minLevel) / (next.minLevel - current.minLevel)));
};
