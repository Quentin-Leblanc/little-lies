# Among Liars - Claude Code Configuration

## Permissions

Claude Code is allowed to run the following without asking for confirmation:

### Shell commands
- All basic bash commands: `ls`, `cat`, `head`, `tail`, `echo`, `mkdir`, `cp`, `mv`, `rm` (files only)
- `grep`, `rg`, `find`, `awk`, `sed`
- `node`, `npm`, `npx` (install, build, start, test)

### Git commands
All `git *` and `gh *` commands are pre-authorized (see `.claude/settings.json`).
Covered patterns include `Bash(git *)`, `Bash(git:*)`, and explicit rules for
`git status`, `git diff`, `git log`, `git branch`, `git add`, `git commit`,
`git push`, `git pull`, `git checkout`, `git merge`, `git show`, `git stash`,
`git restore`, `git reset`, `git remote`, `git fetch`.

**Commit workflow — do it autonomously, don't ask:**
When the user asks to commit, run the full flow without pausing for
confirmation on each step:
1. `git status` + `git diff` + `git log --oneline -n 5` in parallel.
2. Draft a commit message in the project's style (French, concise, often
   `Topic : details` or multi-topic comma-separated — see recent log).
3. Stage specific files by name (prefer `git add <paths>` over `-A`/`.`).
4. `git commit -m "$(cat <<'EOF' … EOF)"` with the attribution trailer.
5. Run `git status` after to verify.
6. Only `git push` when the user explicitly asks.

Prefer splitting work into a handful of focused commits when the change set
mixes unrelated themes (refactor, features, perf, docs). If the files are
heavily cross-cutting, one larger well-described commit is fine.

Never amend, never `--no-verify`, never force-push to main unless the user
explicitly asks.

### File operations
- Read, write, and edit any file in this project
- Create new files and directories

## Project Overview

Multiplayer social deduction game — Among Liars.

- **Stack**: React 18, React Three Fiber, PlayroomKit, Framer Motion, SASS
- **Multiplayer**: PlayroomKit (JoinPlayroom) handles networking/lobby/rooms
- **3D**: Three.js via R3F — low-poly procedural village (flat-shaded, no external GLB for buildings)
- **Language**: UI in French
- **Remote**: https://github.com/Quentin-Leblanc/little-lies.git (branch: main)

## Architecture

- `src/hooks/useGameEngine.js` - Core game state, phases, win conditions
- `src/hooks/useEvents.js` - Night action resolution, event system
- `src/components/` - All UI components
- `src/trad/roles.json` - Role definitions
- `public/models/` - Character animations only (Villager_*.glb)

## Conventions

- Commit in French or English, concise messages
- Push at the end of each completed phase/chapter of work
- Component structure: `ComponentName/ComponentName.js` + `ComponentName.scss`
