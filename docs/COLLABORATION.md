# Codex and Claude collaboration

## Current setup (10 October 2026, Australia/Brisbane)

| Owner | Checkout | Branch at setup | Port |
| --- | --- | --- | --- |
| User / integration | `C:/Users/codex-dev/Documents/Codex/Fossicking - Prospecting Game` | `main` | 5187 |
| Claude Code | `C:/Users/codex-dev/Documents/Codex/Fossicking-dev` | `realism-1` | 5188 |
| Codex | `C:/Users/codex-dev/.codex/worktrees/fossicking-codex/Fossicking - Prospecting Game` | `codex/project-setup` | 5191 |

Codex starts from main commit `fda3a39`. Claude's committed `a81c22a` adds classification, shovel-to-sluice feeding and a highbanker. At inspection Claude also had edits to `src/main.js`, `src/map.js`, `src/notes.js`, `src/water.js`, `src/weather.js` and a new `src/bedload.js`. During setup Claude committed that work as `ea39cfa` and its checkout became clean. These are observations, not a frozen list: recheck before editing or integrating.

The plan recovered from project notes prioritizes realistic methods with forgiving difficulty modes: detector work/classifying/highbanker, then skills/camp upgrades/pan types and panning technique, then Australian regions and eventually overseas. Regions are future proposals, not approved work in this setup.

## Shared claims

Git worktrees share Git metadata, but branch-local documentation does not synchronize automatically. Find the common metadata directory with:

```powershell
git rev-parse --path-format=absolute --git-common-dir
```

Use its `agent-coordination/` directory for machine-local ownership notes. Each agent writes only its own JSON file (`codex.json` or `claude.json`) and reads the others before claiming work. Include agent, branch, worktree, task, status, exact owned paths, port and update time. Do not commit these local files or treat them as an atomic lock. Recheck dirty paths as well; if another agent is active and ownership conflicts, work elsewhere until a handoff resolves it. A stale claim requires investigation, not deletion of another agent's note.

Codex has recorded its setup claim. Claude has not yet acknowledged these rules. The tracked AGENTS.md and CLAUDE.md become shared policy only after integration into the relevant checkout and loading by the agent. Until then, do not assume Claude can see these branch-local instructions.

## Proposed first task: panning technique

Start with an isolated `src/panning.js` simulation and focused behavior tests, then a pan asset/interaction pass. Teach stratification, controlled washing and fine-gold retention, with clear feedback and difficulty-dependent assistance. Research real technique before choosing physical parameters; do not present invented game constants as measured geology.

Acceptance criteria for that future slice:

- Controlled technique changes the outcome; elapsed time alone does not finish the pan.
- Material is conserved across retained, recovered and lost fractions.
- Easy mode remains forgiving; Realistic mode exposes technique and losses clearly.
- Mouse and touch users can perform the same steps.
- Existing saves load with safe defaults.
- Any new Blender pan fits the existing grip, scale and orientation contracts.

This is a recommendation, not implemented gameplay or an agreed reservation. Coordinate edits to `src/main.js`, `src/tools.js`, `src/difficulty.js` and field notes before connecting the new module. Claude's hydrology, bedload and sluice work remains separate.

## Testing and asset workflow

```powershell
npm ci
npm run dev:codex
npm run build
```

Open `http://127.0.0.1:5191/?test` for browser automation and add `&touch` for forced touch controls. Port 5191 has its own browser storage. The local preview is not a phone-accessible publication. Phone access to this chat uses the desktop app's device-pairing settings, independently of the Vite server.

Installed Blender: `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (verified 5.2.2 LTS in background mode). The existing generators accept output and optional preview directories. Pass absolute paths into this worktree. Test exports in a disposable output directory first; only promote intentional assets into `public/models/`. Do not reset a shared Blender scene. Interactive MCP at localhost:9876 was unavailable during setup. Its CLI summary tool also failed because the MCP server cannot find `blender`; that server needs `BLENDER_PATH` set to the installed executable and a restart. Direct headless execution was verified successfully and is the working fallback. No global MCP configuration was changed.

## Handoff and integration

1. Finish and inspect your own diff; record checks and commit only the intended files.
2. Check main, remote changes if available, both feature branches and all dirty worktrees. Agree which agent integrates shared files.
3. Integrate finished commits in a safe feature/integration checkout. Preserve both changes, review conflicts semantically, and rerun build plus affected browser checks.
4. Update main only at the user-authorized integration point; avoid hot-reloading their running game. A push to main automatically publishes through GitHub Pages.
5. Mark your local claim complete/released; retain branch, commit and test notes for the next agent.

## Setup validation

- `npm ci` and `npm run build` completed successfully.
- The Codex dev server returned HTTP 200 at `http://127.0.0.1:5191/?test`.
- Fresh headless browser contexts loaded desktop and forced-touch views with rendered canvases and no JavaScript or console errors. Screenshots were inspected. This checked initial loading, not full gameplay; portrait touch shows the existing rotate-phone guidance.
- Existing three.js warnings remain (Clock deprecation, PCFSoftShadowMap replacement, already non-indexed geometry); no gameplay code was changed in this setup.
- Blender 5.2.2 ran in a fresh headless process and saved a disposable .blend successfully. MCP failures are documented above.
- Remote control was not enabled by the agent: there is no exposed toggle in this session. Pair the phone in Settings > Connections > Control this Mac or PC > Set up/Add, then scan the QR code. Official instructions: https://learn.chatgpt.com/docs/remote-connections
- The user's main checkout and Claude's checkout were left untouched. No merge, push or deployment was performed.