# Among Liars - Claude Code Configuration

## Permissions

Claude Code is allowed to run the following without asking for confirmation:

### Shell commands
- All basic bash commands: `ls`, `cat`, `head`, `tail`, `echo`, `mkdir`, `cp`, `mv`, `rm` (files only)
- `grep`, `rg`, `find`, `awk`, `sed`
- `node`, `npm`, `npx` (install, build, start, test)

### Git commands
- `git status`, `git diff`, `git log`, `git branch`
- `git add`, `git commit`, `git push`
- `git checkout`, `git merge`

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
