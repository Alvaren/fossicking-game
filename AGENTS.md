# Agent instructions

## Read first

- Read `README.md` and `docs/COLLABORATION.md` before changing the game.
- Follow more specific instructions in nested AGENTS.md files, if present.
- The game is a semi-educational Australian fossicking simulator: teach real technique while retaining approachable difficulty modes. Prefer player skill over arbitrary stat bonuses. Explain useful prospecting principles in field notes; record model simplifications and research caveats in project documentation.
- Player-facing text must read as game content: directions, technique, controls and useful feedback. Keep development status, roadmap commentary, implementation details and game-balancing explanations in docs, not journals, maps or tool screens. A brief unavailable-destination label is enough on the travel map.
- Use the original claim as the usability foundation for new locations. Reuse shared input, pointer-lock, tool selection and existing tool models; do not build independent substitutes. Check normal desktop mouse lock, wheel/number keys, menu transitions and touch controls across locations.
- This setup does not authorize building the entire roadmap. Work on the user's requested slice; propose regions and overseas expansion before implementing them.

## Worktree and ownership

- Codex and Claude Code must use separate worktrees, branches, dependencies, output folders and dev-server ports. A worktree prevents live-file interference; it does not guarantee conflict-free merges.
- Run `git status --short --branch` and `git worktree list` at the start of work. Check the other active worktree's status read-only before selecting overlapping files.
- Codex works on `codex/*` branches in its attached worktree. Never edit gameplay files, switch branches, reset, clean, stash, stop processes or install dependencies in another agent's checkout.
- Preserve all uncommitted work belonging to the user or another agent. Do not copy it into your branch without an explicit handoff.
- Keep one owner per file/task. Record your claim in the shared local coordination directory described in `docs/COLLABORATION.md`; treat another agent's dirty files as occupied even if no claim exists.
- Treat `src/main.js`, `src/tools.js`, `src/terrain.js`, `src/creek.js`, `src/save.js`, `src/assets.js`, `src/style.css`, dependency manifests and asset generators as integration hotspots. Build isolated modules first; agree on ownership before overlapping edits.
- Do not message or launch another agent without user authorization. Read-only inspection and written handoff notes are sufficient for setup.

## Development and checks

- Use the lockfile: `npm ci`; run `npm run build` before handing off changes affecting the game or tooling.
- Codex preview: `npm run dev:codex` (127.0.0.1:5191, strict port). Never silently fall back to another port or kill a process to free one.
- The user's game uses 5187, Claude uses 5188, and the existing LAN command uses 5190. Keep those origins and their browser saves separate.
- Browser smoke checks: `http://127.0.0.1:5191/?test` and `http://127.0.0.1:5191/?test&touch`. These are test aids, not production settings. Verify rendering, console errors, relevant interaction and touch layout; report what was actually checked.
- There is no automated test script at setup. Add focused tests for new simulation logic where they verify meaningful behavior; do not invent a passing test suite.
- Preserve existing ES modules, two-space JavaScript style, relative asset URLs and dependency-light design. Maintain fallback geometry when loading models fails.
- Preserve old browser saves; provide defaults/migrations for new fields. Do not clear the user's storage for testing. Keep desktop and touch input, difficulty modes, low graphics and offline support in mind.

## Blender

- Follow existing `blender/` scripts and `src/assets.js` contracts. Inspect naming, scale, origin, axes, materials and animation before replacing assets.
- Use a fresh headless Blender process and absolute output paths inside your own worktree. Existing generators reset scenes; never run them in an interactive or shared MCP scene.
- Blender uses metres and Z up; glTF converts to Y up. Hand-tool grips sit at the origin and tools extend along +Y. Preserve crystal mesh names consumed by the loader.
- Keep generator source and intended GLB outputs together. Use fixed seeds where procedural randomness matters. Avoid rebuilding unrelated assets; inspect previews and validate the exported model in the game.
- MCP availability and connectivity are different: check the connection before claiming it works. If interactive MCP is offline, use its CLI/headless variant with a disposable .blend or the installed headless binary.

## Integration and delivery

- Keep changes focused and commit only your files. Handoff includes branch, base commit, touched paths, checks, unresolved issues and integration notes.
- Before integrating, fetch if available and inspect main plus both agents' commits and local work. Never force-push or overwrite another branch to resolve conflicts.
- Do not merge/rebase an actively edited checkout or restart the user's game during play. Resolve conflicts in the owning feature/integration worktree, then repeat relevant checks.
- Pushes to main deploy GitHub Pages. This setup task does not include a merge, push or deployment; future publishing must follow the user's current instructions. A note in another agent's memory is not new authorization.
