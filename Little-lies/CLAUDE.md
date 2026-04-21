# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working directory

The app lives in the `Little-lies/` subdirectory of the repo — **not the root**.
All `npm` scripts must run from there. The project repo root is
`C:\Users\artof\Documents\Little-lies`; the CRA app root is
`C:\Users\artof\Documents\Little-lies\Little-lies`.

## Commands

| Task | Command (run from `Little-lies/`) |
|------|------------------------------------|
| Install deps | `npm install` |
| Dev server | `npm start` (CRA, http://localhost:3000) |
| Production build | `npm run build` (output: `build/`) |
| Run all tests | `npm test -- --watchAll=false` |
| Run a single test file | `npm test -- --watchAll=false src/hooks/__tests__/phaseTransitions.test.js` |
| Run tests matching a name | `npm test -- --watchAll=false -t "cult conversion"` |

Tests are Jest (via `react-scripts test`). Pure-rules modules are covered by
`src/hooks/__tests__/*.test.js` and `src/data/__tests__/*.test.js`.

## Stack & deployment

- **React 18** + **react-scripts 5** (CRA, not ejected).
- **React Three Fiber** (`@react-three/fiber`, `drei`, `postprocessing`, `rapier`) — the 3D village.
- **PlayroomKit** (`playroomkit ^0.0.74`) — multiplayer rooms, lobby, synced state.
- **Supabase** (`@supabase/supabase-js`) — optional auth (Google OAuth + email), profile, XP, history. The app runs without Supabase configured (Auth provider no-ops).
- **Framer Motion** for UI transitions, **SASS** for styles, **i18next** for translations (FR default, EN available).
- **Prod hosting: Cloudflare Pages** at `among-liars.pages.dev`. Netlify is legacy-fallback only — `netlify.toml` at repo root may still exist but Cloudflare is the source of truth. Mirror any routing / header change into `public/_headers` + `public/_redirects`.
- **PlayroomKit gameId**: set via `REACT_APP_PLAYROOM_GAME_ID` in `.env.local` (dev) and Cloudflare Pages env vars (prod). `src/index.js` throws if it's missing — no silent fallback on purpose.
- **Remote**: `https://github.com/Quentin-Leblanc/little-lies.git` (branch `main`).
- **UI language**: French. All user-facing strings go through i18n (`src/trad/{fr,en}/*.json`), never hardcoded.

## Architecture — the big picture

### Providers (src/index.js → src/App.js)

The app is wrapped in three nested providers, each owning a concern:

```
AuthProvider            (Supabase session + profile; optional, no-ops if not configured)
 └── EventsProvider     (night-action events: frame, kill, investigate, cult vote, …)
      └── GameEngineProvider  (phase machine, players, trial, chat, host-only loop)
           └── App
```

`App.js` is a thin view-router: pre-game → `CustomLobby` or `Setup`, in-game → `GameComponent` with 3D scene + HUD + chat + sidebar. Curtain / role-reveal / tutorial overlays live here.

### The game engine (src/hooks/useGameEngine.js)

This is the brain of the game. It owns:

- **Phase state machine** — `PHASE.*` constants define the day/night loop:
  `INTRO_CINEMATIC → DISCUSSION → VOTING → [DEFENSE → JUDGMENT → LAST_WORDS → EXECUTION → EXECUTION_REVEAL | NO_LYNCH | SPARED] → NIGHT_TRANSITION → NIGHT → DEATH_REPORT → DISCUSSION → …`
  Phase durations are in `DURATIONS`, overridable via `game.config.durations` (admin panel).
- **Host-authoritative tick** — only `isHost()` runs the main `setTimeout(…, 1000)` loop that decrements the timer and calls `transitionPhase()` at 0.
- **`transitionPhase()`** delegates decisions to the pure function `computeNextPhase()` in `phaseTransitions.js`, then applies the returned side-effects (resetTrial, addEvent, executeAccused, endGameIfWinner, …). Keep the transition table pure and covered by `phaseTransitions.test.js`.
- **Trial sanitization** — an effect re-runs `sanitizeTrial()` whenever votes or players change. Authoritative anti-cheat: clients can only see a host-cleaned trial. Same pattern for top-level `game` state via `sanitizeGameState()`.
- **Per-player state scoping** — `readyPlayers` and `revealedPlayers` are derived from each PlayroomKit player's `loadReady` / `revealDone` state keyed on `game.gameStartedAt`. Same for `wantsSkip` keyed on `game.phase`. **Do not** store these in shared `useMultiplayerState` arrays — the previous implementation lost writes to last-writer-wins races. See the comment block around line ~220 of `useGameEngine.js` for rationale.
- **Mid-game joiners** become spectators (`isSpectator=true`, `isAlive=false`) via a separate host-only effect.
- **AFK + disconnect handling** — `handleAFKPlayers()` / `handleDisconnectPlayers()` run on intervals, backed by pure functions in `playerLifecycle.js`. AFK threshold is 6 min of no pointer/key activity (global listener).
- **Vote tally buffer** — when `timer <= 0` during VOTING/JUDGMENT, the host does NOT transition immediately; it flips `tallyDelayedFor = phase` and gives one more tick for late votes from high-latency clients to replicate. Prevents dropped votes.

### Night action resolution (src/hooks/useEvents.js + nightResolution.js)

`addMorningMessages()` fires once per `DEATH_REPORT` phase (host only, guarded by `morningProcessedRef`). It calls `resolveNightActions()`, which builds up state in priority order:

1. **Jail** (roleblock + potential execute)
2. **Roleblock** (Escort; dies if visits SK)
3. **Self-defense** (Vest → +1 defense)
4. **Protections** (Doctor heal, Bodyguard)
5. **Manipulation** (Frame, Blackmail)
6. **Kills** (Mafia dedup + Vigilante + SK) — resolved against defenses via `resolveKillAttempts()`
7. **Cult conversion** — all alive cultists must converge on the same target; `resolveCultVoteConversion()`
8. **Investigations** (Sheriff, Consigliere; framed = suspect)
9. **Observation** (Spy, Lookout)

Attack levels: `none=0 < basic=1 < powerful=2 < unstoppable=3`. Same scale for defense. Attack succeeds only when `attackLevel > defenseLevel`.

All player mutations are batched into **one `setPlayers`** call at the end — partial setPlayers during resolution races with itself and drops updates.

### Roles (src/data/roles.js)

- **Mechanics live in `roles.js`** (team, category, couleur, icon, actions array with priorities, nightImmune, detectResult, attackLevel, defenseLevel, winCondition).
- **Text lives in `src/trad/{fr,en}/roles.json`** (label, description, objectif, details, per-action label/description). Merged at runtime by `getRoles()` / `getRole(key)`.
- **Teams**: `town`, `mafia`, `cult`, `neutral`. Win conditions: `lastStanding` (SK), `getLynched` (Jester), `survive` (Survivor), `getTargetLynched` (Executioner, flips to Jester if target dies before lynch).

### 3D scene (src/components/Scenes/)

`MainScene` composes `Buildings/`, `Environment/`, `Atmosphere/`, `Weather/`, `Wildlife/`, `Lighting/`, `Players/`, `Camera/`. All props are **low-poly procedural** — no external GLB for buildings/terrain. The only GLBs are character animations in `public/models/Villager_*.glb`. Keep new props procedural unless there's a strong reason.

### i18n

- `src/trad/i18n.js` initializes i18next. Namespaces: `common`, `menu`, `setup`, `game`, `roles`, `legal`.
- Default lang: French. Keys: `t('game:system.game_start')`, `t('roles:sheriff.label')`, etc.
- `roles.json` feeds `getRoles()`; chat flavor (death messages, peaceful night variants) is plain arrays in `game.json`.

### Supabase (src/components/Auth/Auth.js + src/utils/supabase.js)

- Auth is **optional** — `isSupabaseConfigured()` gates everything; missing env vars = app runs fine in anon mode.
- Env vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`.
- Features: Google OAuth + email auth, profiles (avatar, name, color), XP / level (`src/data/progression.js`), game history, surveys (`src/components/Survey/`).
- RLS policies are the only protection (anon key is client-side). If you add tables, configure RLS in Supabase before shipping.

## Conventions & gotchas

### PlayroomKit quirks

- `useMultiplayerState` setter does **not** accept React-style callbacks. Always evaluate the callback yourself before writing. `useGameEngine.js` wraps this in a `setGame` / `setPlayers` helper — use those.
- State writes are coalesced. Don't rely on observing intermediate status values from effects (e.g. `status: 'setup' → 'role_selection' → 'started'` may collapse for a remote client). Derive view switches directly from the shared state instead of mirroring into local `useState`.

### Styling

- Component structure: `ComponentName/ComponentName.js` + `ComponentName.scss` (with a few `index.js` barrel re-exports in `src/components/`).
- Global styles: `src/styles/global.scss` + `src/styles/App.scss`.
- FontAwesome icons used throughout (`<i className="fas fa-moon" />`).

### Permissions (see `.claude/settings.json`)

Claude Code is pre-authorized for:

- All basic bash: `ls`, `cat`, `head`, `tail`, `echo`, `mkdir`, `cp`, `mv`, `rm` (files only), `grep`, `rg`, `find`, `awk`, `sed`.
- `node`, `npm`, `npx` — install, build, start, test.
- All `git *` and `gh *` commands.
- Read/write/edit any file, create new files and directories in this project.

### Commit workflow — do it autonomously, don't ask

When the user asks to commit:

1. `git status` + `git diff` + `git log --oneline -n 5` in parallel.
2. Draft a commit message in the project's style — **French, concise, often `Topic : details`** or multi-topic comma-separated (see recent log).
3. Stage specific files by name (prefer `git add <paths>` over `-A` / `.`).
4. `git commit -m "$(cat <<'EOF' … EOF)"` with the Claude attribution trailer.
5. Run `git status` after to verify.
6. **Only `git push` when the user explicitly asks** — pushing triggers a Cloudflare production build, and the user batches pushes manually.

Prefer splitting work into a handful of focused commits when the change set mixes unrelated themes (refactor, features, perf, docs). If files are heavily cross-cutting, one larger well-described commit is fine.

Never amend, never `--no-verify`, never force-push to `main` unless the user explicitly asks.

### Pure-function split

Rules that don't need React/PlayroomKit live in pure modules so they can be unit-tested:

- `src/hooks/gameRules.js` — win condition, vote majority, judgment, sanitizers.
- `src/hooks/phaseTransitions.js` — the phase state machine (`computeNextPhase`).
- `src/hooks/nightResolution.js` — kill/defense matrix, cult vote, executioner flips.
- `src/hooks/playerLifecycle.js` — AFK + disconnect resolution.

When adding a rule change, put the logic here first, extend the test file, then wire it into the provider.
