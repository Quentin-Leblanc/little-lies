# Among Liars

Multiplayer social-deduction game (mafia / werewolf style) — React 18 +
React Three Fiber + PlayroomKit + Supabase. Plays in the browser, 2 to
15 players, no download.

## Stack

- **UI / logic** — React 18, SASS, i18next (FR/EN)
- **3D scene** — React Three Fiber, three-stdlib, @react-three/drei
- **Multiplayer** — PlayroomKit (rooms, sync, lobby)
- **Auth / XP** — Supabase (optional — guest mode works without it)
- **Deploy** — Netlify (see `netlify.toml` at repo root)

## Local development

```bash
git clone https://github.com/Quentin-Leblanc/little-lies.git
cd little-lies/Little-lies
npm install
cp .env.example .env.local      # then edit .env.local — see below
npm start                       # http://localhost:3000
```

## Environment variables

See `.env.example` for the full list and explanations. Three variables:

| Variable | Required | Purpose |
|---|---|---|
| `REACT_APP_PLAYROOM_GAME_ID` | **yes** | PlayroomKit project id (rooms, sync). App throws at boot if missing. |
| `REACT_APP_SUPABASE_URL` | no | Enables Supabase auth / XP / profile persistence. |
| `REACT_APP_SUPABASE_ANON_KEY` | no | Same. Safe to expose client-side — RLS policies do the protecting. |

## Scripts

```bash
npm start            # dev server (http://localhost:3000)
npm test             # Jest suite (run once: add `-- --watchAll=false`)
npm run build        # production build → build/
```

## Deployment — Netlify

`netlify.toml` lives at the **repo root** (one level above `Little-lies/`)
and sets `base = "Little-lies"` so Netlify knows where to find the app.

Steps:

1. Connect the repo in Netlify — it auto-detects the config from `netlify.toml`.
2. **Site settings → Build & deploy → Environment → Environment variables**
   — add the three vars from `.env.example`. Don't commit them anywhere.
3. Deploy. The SPA redirect, cache headers and CSP are already in the toml.
4. (Optional) configure Supabase RLS policies *before* sending real users
   — without RLS, the anon key leaks your tables.

## Supabase setup (if you enable auth)

Minimum RLS policies recommended:

- `profiles` — `SELECT` and `UPDATE` allowed only when `auth.uid() = id`
- `xp_log` — `INSERT` allowed only when `auth.uid() = user_id`
- any game-history table — same scoped-by-owner pattern

The app gracefully falls back to guest mode if Supabase is unreachable,
so you can ship without it and wire it in later.

## Project layout

```
Little-lies/
├── public/                  # static assets (GLB models, sounds, og-image)
├── scripts/                 # dev/ops helpers (OG image generator, etc.)
├── src/
│   ├── components/          # React UI components
│   ├── hooks/               # useGameEngine, useEvents, nightResolution, …
│   ├── data/                # role definitions
│   ├── trad/                # i18next namespaces (common, game, menu, …)
│   └── utils/               # AudioManager, supabase client, metrics
└── .env.example             # environment variable template
```

## Notes

- **Git conventions** — commit messages in French, format `Topic : details`.
  `git push` only on explicit request. Never `--no-verify`.
- **Tests** — 135 at the time of writing (pure logic: game rules, night
  resolution, phase transitions, role data). Multiplayer flows aren't
  unit-tested.
