import React from 'react';

// ─────────────────────────────────────────────────────────────────────
// RoleArt — one illustration per role, drawn as inline SVG.
//
// Style brief: bold silhouette portraits, not cartoon faces. A dark bust
// against a faction-coloured glow, with the role's identifying prop and
// the eyes picked out in the accent colour. Deliberately "vague" — the
// player should read *what the role does* in a glance, not study a
// character's face. It also survives being rendered at 90px in a setup
// grid and at 380px on the death reveal, which a detailed portrait
// would not.
//
// Every piece of art draws inside the same 100×130 viewBox and shares
// the same bust construction, so the twenty cards read as one deck.
//
// Colours come in as props so a role can be tinted by its faction:
//   accent  — the role colour from roles.js
//   ink     — silhouette fill
//   skin    — the small amount of lit surface on the face
// ─────────────────────────────────────────────────────────────────────

const INK = '#14101f';
const INK_SOFT = '#241c36';
const SKIN = '#e8c9a8';

// Shared bust: shoulders + neck + head oval. Every role builds on this
// so the deck keeps one silhouette language.
const Bust = ({ ink = INK, cloth = INK_SOFT }) => (
  <>
    {/* shoulders */}
    <path d="M12 130 C14 104 30 92 50 92 C70 92 86 104 88 130 Z" fill={cloth} />
    {/* neck */}
    <rect x="43" y="76" width="14" height="16" rx="5" fill={ink} />
    {/* head */}
    <ellipse cx="50" cy="60" rx="21" ry="24" fill={ink} />
  </>
);

// Glowing eyes — the one consistent "this is a person" cue.
const Eyes = ({ color, y = 58, spread = 8, r = 2.6, glow = true }) => (
  <>
    {glow && (
      <>
        <circle cx={50 - spread} cy={y} r={r * 2.4} fill={color} opacity="0.22" />
        <circle cx={50 + spread} cy={y} r={r * 2.4} fill={color} opacity="0.22" />
      </>
    )}
    <circle cx={50 - spread} cy={y} r={r} fill={color} />
    <circle cx={50 + spread} cy={y} r={r} fill={color} />
  </>
);

// Lit cheek/jaw so the silhouette doesn't read as a flat blob.
const FaceLight = ({ tone = SKIN, opacity = 0.16 }) => (
  <path d="M50 40 C62 40 71 49 71 61 C71 73 62 84 50 84 Z" fill={tone} opacity={opacity} />
);

// ── Town ────────────────────────────────────────────────────────────

const Villageois = ({ accent }) => (
  <>
    <Bust cloth="#3a2c1e" />
    <FaceLight />
    {/* flat cap */}
    <path d="M28 50 C30 36 40 30 50 30 C60 30 70 36 72 50 Z" fill="#4a3722" />
    <path d="M26 50 L76 50 L74 54 L28 54 Z" fill="#5c4529" />
    <Eyes color={accent} glow={false} r={2.2} />
    {/* pitchfork over the shoulder */}
    <rect x="80" y="52" width="3" height="78" rx="1.5" fill="#6b4f2c" />
    <path d="M74 52 L74 40 M81.5 52 L81.5 36 M89 52 L89 40" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
  </>
);

const Sheriff = ({ accent }) => (
  <>
    <Bust cloth="#2c3a4a" />
    <FaceLight />
    {/* wide brim hat */}
    <path d="M20 46 L80 46 L80 51 L20 51 Z" fill="#3a2b1c" />
    <path d="M32 46 C33 32 42 26 50 26 C58 26 67 32 68 46 Z" fill="#4a3722" />
    {/* moustache */}
    <path d="M40 70 Q50 76 60 70" stroke="#0d0a15" strokeWidth="4" fill="none" strokeLinecap="round" />
    <Eyes color={accent} glow={false} r={2.2} />
    {/* star badge */}
    <path d="M50 104 l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill={accent} />
  </>
);

const Docteur = ({ accent }) => (
  <>
    <Bust cloth="#e8ecef" />
    <FaceLight />
    {/* head mirror band */}
    <rect x="29" y="42" width="42" height="5" rx="2.5" fill="#2a2f38" />
    <circle cx="50" cy="38" r="8" fill="#dfe6ea" />
    <circle cx="50" cy="38" r="4" fill={accent} />
    <Eyes color={accent} glow={false} r={2.2} y={60} />
    {/* stethoscope */}
    <path d="M36 96 C36 116 50 118 50 106" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M64 96 C64 116 50 118 50 106" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx="50" cy="108" r="4.5" fill={accent} />
  </>
);

const Lookout = ({ accent }) => (
  <>
    <Bust cloth="#2f4034" />
    <FaceLight />
    <path d="M29 48 C31 34 40 28 50 28 C60 28 69 34 71 48 Z" fill="#3c4f3f" />
    {/* binoculars */}
    <rect x="30" y="52" width="17" height="14" rx="5" fill="#1b2430" />
    <rect x="53" y="52" width="17" height="14" rx="5" fill="#1b2430" />
    <rect x="46" y="56" width="8" height="5" rx="2" fill="#1b2430" />
    <circle cx="38.5" cy="59" r="4" fill={accent} />
    <circle cx="61.5" cy="59" r="4" fill={accent} />
  </>
);

const Vigilante = ({ accent }) => (
  <>
    <Bust cloth="#3a2f28" />
    <FaceLight />
    {/* bandana over the brow */}
    <path d="M28 50 C30 38 40 32 50 32 C60 32 70 38 72 50 Z" fill="#6b3a2c" />
    <path d="M72 44 L86 40 L84 52 Z" fill="#6b3a2c" />
    <Eyes color={accent} r={2.4} />
    {/* revolver held up */}
    <rect x="66" y="94" width="22" height="7" rx="2" fill="#20262f" />
    <rect x="70" y="101" width="7" height="10" rx="2" fill="#20262f" />
    <circle cx="72" cy="97.5" r="3.6" fill={accent} />
  </>
);

const Maire = ({ accent }) => (
  <>
    <Bust cloth="#2b2438" />
    <FaceLight />
    {/* tricorn */}
    <path d="M22 46 C30 30 42 26 50 26 C58 26 70 30 78 46 C66 42 34 42 22 46 Z" fill="#241d33" />
    <Eyes color={accent} glow={false} r={2.2} />
    {/* chain of office */}
    <path d="M34 96 Q50 112 66 96" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx="50" cy="108" r="6" fill={accent} />
    <circle cx="50" cy="108" r="2.6" fill={INK} />
  </>
);

const Escort = ({ accent }) => (
  <>
    <Bust cloth="#4a2740" />
    <FaceLight />
    {/* tall coiffure */}
    <path d="M27 56 C25 32 38 22 50 22 C62 22 75 32 73 56 C70 44 62 38 50 38 C38 38 30 44 27 56 Z" fill="#2e1c2b" />
    <Eyes color={accent} r={2.4} y={60} />
    {/* fan */}
    <path d="M62 104 L92 92 L94 108 Z" fill={accent} opacity="0.85" />
    <path d="M62 104 L92 92 M62 104 L93 100 M62 104 L94 108" stroke={INK} strokeWidth="1.2" />
  </>
);

const Bodyguard = ({ accent }) => (
  <>
    {/* broader shoulders than the standard bust */}
    <path d="M6 130 C9 100 28 88 50 88 C72 88 91 100 94 130 Z" fill="#2b3340" />
    <rect x="43" y="74" width="14" height="16" rx="5" fill={INK} />
    <ellipse cx="50" cy="58" rx="21" ry="23" fill={INK} />
    <FaceLight />
    <Eyes color={accent} glow={false} r={2.2} y={57} />
    {/* shield */}
    <path d="M50 96 L70 102 C70 118 60 126 50 130 C40 126 30 118 30 102 Z" fill={accent} opacity="0.9" />
    <path d="M50 104 L50 122" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <path d="M40 110 L60 110" stroke={INK} strokeWidth="3" strokeLinecap="round" />
  </>
);

const Spy = ({ accent }) => (
  <>
    <Bust cloth="#232a36" />
    {/* popped collar */}
    <path d="M34 96 L50 110 L66 96 L60 92 L50 100 L40 92 Z" fill="#2e3746" />
    {/* fedora, brim low */}
    <path d="M20 50 L80 50 L80 55 L20 55 Z" fill="#1b212b" />
    <path d="M32 50 C33 34 42 28 50 28 C58 28 67 34 68 50 Z" fill="#242c39" />
    {/* only one eye catches the light under the brim */}
    <circle cx="58" cy="62" r="5.5" fill={accent} opacity="0.2" />
    <circle cx="58" cy="62" r="2.4" fill={accent} />
    {/* listening arc */}
    <path d="M76 58 Q84 66 76 74" stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.9" />
    <path d="M82 52 Q94 66 82 80" stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.5" />
  </>
);

const Jailor = ({ accent }) => (
  <>
    <Bust cloth="#333a42" />
    <FaceLight />
    <path d="M29 48 C31 34 40 28 50 28 C60 28 69 34 71 48 Z" fill="#2a3038" />
    <Eyes color={accent} glow={false} r={2.2} />
    {/* prison bars in front */}
    <g opacity="0.85">
      <rect x="22" y="86" width="4" height="44" fill="#4d565f" />
      <rect x="38" y="86" width="4" height="44" fill="#4d565f" />
      <rect x="54" y="86" width="4" height="44" fill="#4d565f" />
      <rect x="70" y="86" width="4" height="44" fill="#4d565f" />
      <rect x="18" y="86" width="60" height="4" fill="#5a646e" />
    </g>
    {/* key */}
    <circle cx="84" cy="100" r="6" fill="none" stroke={accent} strokeWidth="3" />
    <path d="M84 106 L84 120 M84 113 L90 113" stroke={accent} strokeWidth="3" strokeLinecap="round" />
  </>
);

// ── Mafia ───────────────────────────────────────────────────────────

const Godfather = ({ accent }) => (
  <>
    <Bust cloth="#1d1a24" />
    {/* suit lapels */}
    <path d="M38 94 L50 112 L62 94 L56 90 L50 102 L44 90 Z" fill="#2a2530" />
    <path d="M46 92 L50 130 L54 92 Z" fill={accent} opacity="0.55" />
    {/* fedora */}
    <path d="M18 48 L82 48 L82 54 L18 54 Z" fill="#0f0d15" />
    <path d="M31 48 C32 30 41 24 50 24 C59 24 68 30 69 48 Z" fill="#171420" />
    <path d="M31 44 L69 44 L69 48 L31 48 Z" fill={accent} opacity="0.5" />
    <Eyes color={accent} r={2.6} y={62} />
    {/* cigar */}
    <rect x="56" y="74" width="20" height="4.5" rx="2" fill="#4a3524" />
    <circle cx="78" cy="76" r="2.6" fill={accent} />
  </>
);

const Mafioso = ({ accent }) => (
  <>
    <Bust cloth="#241f2a" />
    <FaceLight opacity={0.12} />
    {/* newsboy cap */}
    <path d="M27 50 C29 36 39 30 50 30 C61 30 71 36 73 50 Z" fill="#1c1822" />
    <path d="M25 50 L75 50 L73 54 L27 54 Z" fill="#282230" />
    {/* scar */}
    <path d="M62 54 L66 68" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    <Eyes color={accent} r={2.4} />
    {/* pistol silhouette */}
    <rect x="60" y="100" width="24" height="6" rx="2" fill="#1a1620" />
    <rect x="64" y="106" width="7" height="11" rx="2" fill="#1a1620" />
  </>
);

const Framer = ({ accent }) => (
  <>
    <Bust cloth="#2a1e2c" />
    <FaceLight opacity={0.1} />
    {/* the role holds a second face in front of its own */}
    <ellipse cx="50" cy="58" rx="21" ry="23" fill={INK} />
    <path d="M29 56 C31 40 40 32 50 32 C60 32 69 40 71 56 Z" fill="#241a28" />
    <g>
      <ellipse cx="50" cy="62" rx="17" ry="19" fill="#3b2b40" />
      <path d="M33 62 C33 48 41 42 50 42 C59 42 67 48 67 62 Z" fill="#4a3550" />
      <circle cx="43" cy="60" r="2.6" fill={accent} />
      <circle cx="57" cy="60" r="2.6" fill={accent} />
      <path d="M42 72 Q50 68 58 72" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
    {/* hand holding the mask edge */}
    <path d="M64 78 q8 4 6 12" stroke={SKIN} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
  </>
);

const Blackmailer = ({ accent }) => (
  <>
    <Bust cloth="#2a1f28" />
    <FaceLight opacity={0.12} />
    <path d="M28 50 C30 36 40 30 50 30 C60 30 70 36 72 50 Z" fill="#221a22" />
    <Eyes color={accent} r={2.4} y={57} />
    {/* hand sealing the mouth */}
    <path d="M32 70 C40 64 60 64 68 70 C68 80 60 84 50 84 C40 84 32 80 32 70 Z" fill={SKIN} opacity="0.55" />
    <path d="M38 70 L62 70" stroke={INK} strokeWidth="2" opacity="0.5" strokeLinecap="round" />
    {/* sealed envelope */}
    <rect x="62" y="100" width="26" height="18" rx="2" fill="#2f2733" />
    <path d="M62 100 L75 111 L88 100" stroke={accent} strokeWidth="2.4" fill="none" />
  </>
);

const Consigliere = ({ accent }) => (
  <>
    <Bust cloth="#26202c" />
    <FaceLight opacity={0.13} />
    <path d="M29 48 C31 34 40 28 50 28 C60 28 69 34 71 48 Z" fill="#1f1a25" />
    {/* monocle on one eye */}
    <circle cx="58" cy="60" r="7" fill="none" stroke={accent} strokeWidth="2.2" />
    <circle cx="58" cy="60" r="7" fill={accent} opacity="0.14" />
    <path d="M65 64 L70 76" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="42" cy="60" r="2.4" fill={accent} />
    {/* ledger */}
    <rect x="30" y="98" width="40" height="26" rx="2" fill="#332a38" />
    <path d="M50 98 L50 124" stroke={INK} strokeWidth="2" />
    <path d="M35 106 L45 106 M35 112 L45 112 M55 106 L65 106 M55 112 L65 112" stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
  </>
);

// ── Cult ────────────────────────────────────────────────────────────

const Cultist = ({ accent }) => (
  <>
    {/* hood instead of a head — the cult has no face */}
    <path d="M10 130 C12 100 26 84 50 84 C74 84 88 100 90 130 Z" fill="#2a1f3d" />
    <path d="M24 92 C22 56 34 34 50 34 C66 34 78 56 76 92 C68 80 60 74 50 74 C40 74 32 80 24 92 Z" fill="#1d1530" />
    {/* void inside the hood */}
    <ellipse cx="50" cy="66" rx="15" ry="18" fill="#0b0814" />
    <Eyes color={accent} y={64} spread={6.5} r={2.8} />
    {/* sigil */}
    <circle cx="50" cy="112" r="11" fill="none" stroke={accent} strokeWidth="2" opacity="0.9" />
    <path d="M50 102 L58.7 117 L41.3 117 Z" fill="none" stroke={accent} strokeWidth="2" opacity="0.9" />
  </>
);

// ── Neutral ─────────────────────────────────────────────────────────

const SerialKiller = ({ accent }) => (
  <>
    <Bust cloth="#1f1b26" />
    {/* blank mask */}
    <ellipse cx="50" cy="58" rx="21" ry="24" fill="#d8d2c4" opacity="0.9" />
    <path d="M42 52 L36 60 L44 62 Z" fill={INK} />
    <path d="M58 52 L64 60 L56 62 Z" fill={INK} />
    <path d="M46 74 L54 74" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    {/* knife */}
    <path d="M74 128 L74 92 L80 86 L86 92 L86 128 Z" fill="#c9d0d8" opacity="0.25" />
    <path d="M78 128 L78 94 L82 90 L82 128 Z" fill="#e2e8ee" />
    <rect x="74" y="126" width="12" height="4" rx="2" fill={accent} />
  </>
);

const Jester = ({ accent }) => (
  <>
    <Bust cloth="#3d2246" />
    <FaceLight />
    {/* three-point cap with bells */}
    <path d="M28 50 C30 34 40 28 50 28 C60 28 70 34 72 50 Z" fill={accent} opacity="0.85" />
    <path d="M28 44 L16 26 M50 30 L50 12 M72 44 L84 26" stroke={accent} strokeWidth="4" strokeLinecap="round" />
    <circle cx="15" cy="24" r="4" fill={accent} />
    <circle cx="50" cy="10" r="4" fill={accent} />
    <circle cx="85" cy="24" r="4" fill={accent} />
    {/* wide grin */}
    <path d="M38 68 Q50 82 62 68" stroke={accent} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <Eyes color={accent} glow={false} r={2.2} y={57} />
  </>
);

const Survivor = ({ accent }) => (
  <>
    <Bust cloth="#3a3326" />
    <FaceLight />
    <path d="M28 48 C30 34 40 28 50 28 C60 28 70 34 72 48 Z" fill="#2d2820" />
    <Eyes color={accent} glow={false} r={2.2} />
    {/* strapped vest */}
    <path d="M30 96 L44 92 L50 106 L56 92 L70 96 L70 130 L30 130 Z" fill="#4a4130" />
    <rect x="30" y="108" width="40" height="6" rx="2" fill={accent} opacity="0.85" />
    <rect x="42" y="114" width="16" height="12" rx="2" fill={accent} opacity="0.6" />
  </>
);

const Executioner = ({ accent }) => (
  <>
    <Bust cloth="#2c2a2e" />
    {/* executioner's hood */}
    <path d="M28 84 C26 50 36 32 50 32 C64 32 74 50 72 84 Z" fill="#1a181d" />
    <rect x="34" y="54" width="32" height="7" rx="3.5" fill="#0b0a0d" />
    <circle cx="42" cy="57.5" r="2.4" fill={accent} />
    <circle cx="58" cy="57.5" r="2.4" fill={accent} />
    {/* axe */}
    <rect x="76" y="40" width="4" height="90" rx="2" fill="#5b452c" />
    <path d="M78 44 C92 46 96 58 92 68 C86 62 82 58 78 58 Z" fill={accent} opacity="0.9" />
    <path d="M78 44 C64 46 60 58 64 68 C70 62 74 58 78 58 Z" fill="#b9c2cc" opacity="0.35" />
  </>
);

// ─────────────────────────────────────────────────────────────────────

const ART = {
  villageois: Villageois,
  sheriff: Sheriff,
  docteur: Docteur,
  lookout: Lookout,
  vigilante: Vigilante,
  maire: Maire,
  escort: Escort,
  bodyguard: Bodyguard,
  spy: Spy,
  jailor: Jailor,
  godfather: Godfather,
  mafioso: Mafioso,
  framer: Framer,
  blackmailer: Blackmailer,
  consigliere: Consigliere,
  cultist: Cultist,
  serial_killer: SerialKiller,
  jester: Jester,
  survivor: Survivor,
  executioner: Executioner,
};

/**
 * Illustration for a role, as an <svg>. Falls back to the villager when
 * a role key has no art yet, so a newly added role renders a card
 * instead of a hole.
 */
const RoleArt = ({ roleKey, accent = '#f0b840', className = '' }) => {
  const Art = ART[roleKey] || Villageois;
  const gradId = `roleart-bg-${roleKey || 'default'}`;
  return (
    <svg
      className={`role-art ${className}`}
      viewBox="0 0 100 130"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="130" fill={`url(#${gradId})`} />
      <Art accent={accent} />
    </svg>
  );
};

export const hasArtFor = (roleKey) => Boolean(ART[roleKey]);
export default RoleArt;
