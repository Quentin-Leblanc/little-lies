# Among Liars

Multiplayer social-deduction game (mafia / werewolf style) — React 18 +
React Three Fiber + PlayroomKit + Supabase. Plays in the browser, 2 to
15 players, no download.

## Stack

- **UI / logic** — React 18, SASS, i18next (FR/EN)
- **3D scene** — React Three Fiber, three-stdlib, @react-three/drei
- **Multiplayer** — PlayroomKit (rooms, sync, lobby)
- **Auth / XP** — Supabase (optional — guest mode works without it)
- **Deploy** — Cloudflare Pages (headers/redirects in `public/_headers` and `public/_redirects`)

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

## Deployment — Cloudflare Pages

SPA fallback and security/cache headers live in `Little-lies/public/_redirects`
and `Little-lies/public/_headers` (copied as-is into `build/` by
react-scripts). A legacy `netlify.toml` is kept at the repo root for
reference during the migration — Cloudflare Pages ignores it.

Steps:

1. **Pages → Create project → Connect to Git** → select this repo.
2. **Build settings**:
   - Framework preset: *Create React App*
   - Root directory: `Little-lies`
   - Build command: `npm run build`
   - Build output directory: `build`
3. **Environment variables** (add to both *Production* and *Preview*):
   - `REACT_APP_PLAYROOM_GAME_ID` — your PlayroomKit game id (required)
   - `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` — optional
   - `NODE_VERSION` = `20`
   - `CI` = `false` — react-scripts turns ESLint warnings into errors when
     `CI=true`; this unblocks the build on the legacy useEffect-deps warnings.
4. **Deploy.** CSP, SPA fallback and cache headers are served from
   `public/_headers` + `public/_redirects` (already in the repo).
5. **External allow-lists to update after the first deploy:**
   - PlayroomKit dashboard → *Allowed origins* → add `https://<project>.pages.dev`
     (and any custom domain you attach).
   - Supabase → *Authentication → URL Configuration* → add the same host
     to *Site URL* / *Redirect URLs* (only needed if you enable auth).
6. (Optional) configure Supabase RLS policies *before* sending real users
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
