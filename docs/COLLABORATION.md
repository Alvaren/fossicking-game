# Codex and Claude collaboration

## Current build: Coober Pedy (11 October 2026)

Codex is implementing the user-approved opal district, underground homes and workings on `codex/coober-pedy`, based on `480d3bc`. Read [COOBER-PEDY.md](COOBER-PEDY.md) for scope, corrections and verification. The user's explicit corrections are **no inherited riverbed, no invented hills/hillsides, and homes below the existing ground**. The final terrain uses descending access cuts into a low open field; do not reinstate the rejected mound terrain. Shared original movement, mouse lock, wheel, touch, collection, camps and $0 travel remain the foundation. Main and Claude were clean when inspected, Claude's committed work is already an ancestor of main, and only Codex's 5191 preview is listening. No other agent was launched or messaged. Publishing remains authorized by the standing instruction below; complete the listed checks before integration.

## Completed build: WA Goldfields (11 October 2026)

The approved WA slice was implemented on `codex/wa-goldfields`, based on `ce4afd3`, and published from main at `362b36c`. Read [WA-GOLDFIELDS.md](WA-GOLDFIELDS.md) for the completed plan, actual checks, touched paths and publication record. Mulga Flat reuses the original mainland engine and existing difficulties/controls, with deterministic gold patches, dry hydrology and camp-tub panning. The user clarified low scrub and dry grass with no tall gums; other destinations retain their vegetation. Main and Claude were inspected before the fast-forward integration; Claude remains untouched and clean at `aeb026f`. No other agent was launched or messaged, and no dependencies or Blender outputs changed. Pages run `38062954102` succeeded, followed by full public-site desktop and emulated-phone recovery/save/travel checks. Codex's preview remains on 5191; the other game ports were inactive at integration.

## Current publishing instruction (10 October 2026)

The user explicitly instructed: "push everything online after every run". Finish each implementation run by validating and committing completed work, integrating all ready changes into main, pushing main and verifying the GitHub Pages deployment. Routine publishing is already authorized. Preserve unfinished or uncommitted work in other checkouts and never force-push. Earlier local-only/no-publishing entries below describe previous runs and are superseded by this instruction. A later user instruction can change it.

The first publication under this instruction includes all integrated work through 525add4: both Tasmania destinations, shared original controls, topographic travel and the two mainland locations, alongside the previously published Claude fixes.

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
## Panning handoff (10 October 2026)

The user authorized the panning slice and confirmed Claude was finished for the night. Codex created `codex/skill-based-panning` and merged local main at `ea39cfa` into its own worktree before implementation. Claude's hydrology, classification and highbanker commits are preserved.

The implemented panning model, controls, pan profiles, saves and tests are documented in [PANNING.md](PANNING.md). Validation passed: 14 simulation tests, the production build, actual emulated-touch and mouse UI checks, and full-game entry/save/reward integration. Browser checks reported no page errors. Existing unrelated three.js warnings remain.

The preview remains on port 5191. Main and Claude's checkout remain unchanged. No push or deployment was performed. Integrate the finished feature branch, including the setup instructions, when the user wants it in the main game; reload CLAUDE.md/AGENTS.md in Claude's checkout then.

## Camp practice and progression handoff (10 October 2026)

The earlier panning feature was integrated into local main at `90a8564` at the user's request. The user then authorized the camp practice, tailings, feedback and camp progression slice. Codex implemented it on `codex/camp-practice`, based on `90a8564`, in its existing isolated worktree. Claude's `realism-1` checkout remained clean at `ea39cfa`; no other agent was launched or messaged.

Touched paths: `src/camp.js`, `src/campui.js`, `src/campstation.js`, `src/camp.css`, `src/main.js`, `src/panning.js`, `src/panningui.js`, `src/notes.js`, `tests/camp.test.js`, `tests/camp.game.mjs`, `README.md`, `docs/CAMP.md`, and this guide. No dependencies or Blender assets changed. See [CAMP.md](CAMP.md) for behavior, persistence, limitations and test commands.

Checks: 23 simulation/progression tests, production build, existing mouse/emulated-touch panning checks and full-game panning save/reward checks. The new full-game camp check exercises desktop and touch entry, purchases, sample storage, independent practice/field sessions across reload, recovery without duplicate awards, tailings reprocessing, comparisons and returning borrowed parcels. Desktop also verifies portable capture through normal creek input. Screenshots of desktop, portrait phone, comparison table and the world bench were inspected. Completion is accelerated through the simulation in integration tests; actual stroke input is covered by the panning UI checks. Existing unrelated three.js deprecation warnings remain; no new page errors were observed.

Integration is authorized into local main after validation. Remote main remains at `ea39cfa` at the pre-integration fetch. No push or deployment is included. The Codex preview remains at port 5191. The player and Claude preview ports were not listening at the pre-integration check, so updating local main will not hot-reload an active game. Resume Claude only in its own checkout and load these instructions before overlapping edits.

## Full camp upgrade handoff (10 October 2026)

The complete documented camp scope is recorded in [CAMP-ROADMAP.md](CAMP-ROADMAP.md). Implemented on `codex/camp-shelters`, based on `0a16aa8`: swag/tent/caravan/shed progression; water tank, fuelled generator and switched lights; a lapidary workshop with saved manual/Easy stonework; an actual-specimen display room; and an animated kelpie with pat and follow/stay controls. Existing panning practice and recovery projects remain available. Old saves retain their tent and receive defaults for new facilities.

Touched paths: `src/shelter.js`, `src/campshelter.js`, `src/campfacilities.js`, `src/campfacilitiesui.js`, `src/campbuildings.js`, `src/kelpie.js`, `src/lapidary.js`, `src/lapidaryui.js`, `src/lapidary.css`, `src/camp.js`, `src/campui.js`, `src/camp.css`, `src/main.js`, `src/world.js`, `src/notes.js`, `tests/shelter.test.js`, `tests/shelter.game.mjs`, `tests/facilities.test.js`, `tests/lapidary.test.js`, `tests/facilities.game.mjs`, `README.md`, `docs/CAMP.md`, `docs/CAMP-ROADMAP.md`, and this guide. No dependencies or Blender outputs changed; new geometry is local and the existing tent model still has a fallback.

Validation: 34 logic tests and the production build pass. Desktop and emulated-touch full-game checks exercise the four shelter stages, charges, capacity, save/reload, purchases, live power, specimen cases, companion controls, real lapidary input/release, reserved stones across reload, exactly-once collection and sleep from a workshop. The shed and both workshop doorways were traversed with keyboard input; room decks support the player above sloping terrain. Screenshots of shelters, shed interior, displays and portrait lapidary controls were inspected. The existing camp practice integration check was rerun. Browser checks use disposable saves and accelerate completion through the same simulation; they do not claim a full physical-phone playthrough. Existing three.js deprecation warnings remain.

Limits: prices and resource rates are game balancing values. Lapidary is a shaping/polishing skill exercise with abstracted facet geometry; the caravan is stationary until the separately scoped travel work. Display cases show the first 45 kept finds, with the full collection available in inventory. Companion steering is local obstacle avoidance, not a complete navigation mesh. See CAMP.md for detailed behavior.

The user authorized local integration. Check current worktree status and active preview ports immediately before advancing main. Do not push or publish as part of this handoff. Codex preview remains on 5191; Claude owns its separate checkout on `realism-1`.

## Active build: Tasmania expedition

Read [TASMANIA-PLAN.md](TASMANIA-PLAN.md) before continuing region work. The user has now authorized that specific first catchment and asked for the plan to be executed. Its checklist, execution log and deferred scope supersede earlier proposed ordering. Do not substitute the Golden Triangle or the northeast sapphire fields for the western Tasmania foot-access expedition.

## Tasmania expedition handoff (10 October 2026)

Codex wrote and committed [TASMANIA-PLAN.md](TASMANIA-PLAN.md) before implementing the user-selected western Tasmania slice on `codex/tasmania-expedition`, based on `7ad5b15`. The plan is the durable scope/completion record; read its checklist and limits before further region work. Northeast sapphire country and underwater sniping remain separate later work.

The catchment is isolated from the home generator. Home camp, excavations, samples and pans survive travel; persistent field parcels and collected pan IDs prevent re-assaying or duplicate rewards. Home departure is available from pause/title and camp. The new boot dispatcher loads the Tasmania scene or the existing home scene from the saved active region. No dependencies, asset generators or Blender outputs changed. Codex preview remains on 5191.

Touched paths: `index.html`, `src/main.js`, `src/boot.js`, `src/regions.js`, `src/regionui.js`, `src/region.css`, `src/tasmania/{model,world,main}.js`, `src/tasmania/style.css`, `tests/regions.test.js`, `tests/tasmania.test.js`, `tests/tasmania.game.mjs`, `tests/tasmania.offline.mjs`, `README.md`, this guide and `docs/TASMANIA-PLAN.md`. Existing home camp regression checks are included in validation. Main and Claude were clean at the pre-integration fetch, remote main remained `7ad5b15`, and only Codex's 5191 preview was listening. No other agent was launched or messaged. No push/deployment is part of this build.

## Active follow-up: locations and map travel

Read [LOCATION-PLAN.md](LOCATION-PLAN.md). The user requested a few more locations, map-based travel with a $0 fee, and always-on original-style topography, and rejected the added Tasmania world guidance. Codex is working on codex/location-travel from 6ca7a41. Shared map/topography/travel work is implemented and checked. The user confirmed the documented second Tasmanian location: northeast sapphire/zircon country. That slice is now implemented; see the current checklist and verification in LOCATION-PLAN.md. Do not silently choose a region from visualization selection state or mark planned blips playable. The completed slice was integrated locally at 2367bfa, with its integration record at c262c39. No other agent was launched and nothing was published.

## Northeast Tasmania handoff (10 October 2026)

Branch codex/location-travel, base 6ca7a41; shared map/travel fixes were committed at 8365d90 before this location build. The user corrected the pending selection: TWO Tasmanian destinations were planned. Northeast Tasmania is the authorized next location; other country-map blips remain Planned. No other agent was launched or messaged.

The northeast terrain/assay profile is in src/tasmania/northeast.js and northeast-content.js. The existing expedition renderer/controller now accepts either regional profile. The wet sieve reuses the original Viewmodel animation and shared src/sieverecovery.js formula; session/input code is in src/tasmania/sieving.js and sieveui.js. Region transitions bank exactly once, charge one fee, and preserve both locations' unfinished pans/sieves and home state. Recovered gems receive collection IDs, provenance and specimen grading; banking updates the mineral log.

Touched paths: README.md; docs/LOCATION-PLAN.md, TASMANIA-PLAN.md and this guide; src/boot.js, regions.js, regionui.js, regionmap.js, minerals.js, sieverecovery.js; src/tasmania/main.js, model.js, world.js, style.css, northeast.js, northeast-content.js, sieving.js and sieveui.js; tests/northeast.test.js, northeast.game.mjs and tasmania.offline.mjs. Earlier commits in the same branch also contain src/topography.js, map.js, australia-outline.js, region.css, main.js and their map tests. No dependency, Blender or home terrain changes.

Validation and integration outcome are recorded in LOCATION-PLAN.md. The local preview stays on 5191. Do not infer authorization for more regions or a new push/deployment.
