# Codex and Claude collaboration

## Shovel socket correction (16 October 2026)

Codex branch codex/shovel-socket, base 0c0c12e, owns the user-requested correction to the shaft/head join in src/models/shovel.js. The approved handle, shaft and D-grip geometry are hash-identical; the head/socket is now one connected pressing. Original tool controls, animation, saves and all environments are unchanged. [Correction and checks](SHOVEL-REMODEL.md#socket-correction--user-review-16-october-2026). No other agent was launched or messaged. Implementation 5b0d125 is published by successful [Pages run 38889890557](https://github.com/Alvaren/fossicking-game/actions/runs/38889890557). Live files match the tested build; published desktop/touch digging, load and save/reload checks pass.

## Shared shovel and next environment proposal (16 October 2026)

Codex branch codex/shovel-remodel, base 3fe3cb9, rebuilds the shared procedural shovel in src/models/shovel.js and connects it through the existing src/tools.js builder. Grip/pivot, original animation, inputs, digging and saves are preserved. [Model and verification](SHOVEL-REMODEL.md). No region environment changes are included. [Golden Triangle / Ironbark Gully](GOLDEN-TRIANGLE-ART-PLAN.md) is the proposed next fidelity pass, with current NSW quality as the minimum benchmark, explicit reuse boundaries and checkable stages. This is a recommendation and plan, not authorisation to start that full map upgrade. Implementation cb9c6af is published via [Pages run 38887543851](https://github.com/Alvaren/fossicking-game/actions/runs/38887543851); matching live files and public desktop/touch digging/save checks pass. The delivery record retains the original sieve-test timing failure and the successful corrected touch rerun. No other agent was launched or messaged.

## Current NSW optimisation (16 October 2026)

The user authorised the full B9 pass against published `947414e`, including its restored ripples. Codex branch `codex/nsw-optimisation` owns the narrow rendering/cache changes and verification recorded in [NSW-OPTIMISATION.md](NSW-OPTIMISATION.md). Matched visuals, world/save, all-region controls, touch, resource cycling, offline, camp and panning checks pass; the three repeated High/1080p routes show 22% lower median CPU time, 9% lower median GPU time and 19% lower GPU p95. Implementation `5b5636d` is integrated into main and published; [Pages run 38870781163](https://github.com/Alvaren/fossicking-game/actions/runs/38870781163) succeeded, with matching live assets and passing public desktop/touch smoke checks. No other agent was launched or messaged. High/Ultra visuals and original world/input/recovery contracts remain fixed. This performance phase does not close older reference-art acceptance gaps; physical phone performance remains unmeasured.

## Current build: New England environment (13 October 2026)

**Current correction branch:** `codex/nsw-environment-fix`, base `aedeba5`, code `6ba554e`, evidence `9f24854`. [Pages run 38407938169](https://github.com/Alvaren/fossicking-game/actions/runs/38407938169) succeeded; public High desktop/touch checks and the live GLB hash pass. The [correction record](NSW-ENVIRONMENT-BUILD.md#correction-pass-after-the-reference-audit) records changes across V01–V08: revised jointed kit, grouped low dressing, quieter materials, corrected legacy plant shading, broken advected foam, lighting adjustments, and dig-surface inclusions/colour. The original terrain, sources, saved work and inputs are preserved. All eight visual dimensions are still below the supplied reference target; do not mark the whole upgrade complete. Large connected exposures and bank composition remain the next art gate. Exact validation, evidence, deployment and outstanding work live in that record and the shared coordination handoff.

**Latest user-requested review:** the [direct six-reference comparison](NSW-ENVIRONMENT-BUILD.md#direct-reference-comparison-audit), audited against published `c9e5692`, supersedes the first visual scores. The scene is substantially below the reference standard: disconnected formations, smooth banks, repeated ground/crowns, black legacy shrubs, over-patterned water and weak close-up material depth. Earlier scores of 2 for grounding, vegetation, water and close-up work were too generous and are withdrawn. B2-02, B3-04/06/07 and B4-04 are reopened. V01..V08 give concrete acceptance evidence and order; start with large forms and connected geological assemblies, not more scatter or a shader-only pass. This latest request is an audit; no new game changes were made. Preserve successful technical checks without treating them as art acceptance.

Codex delivered the first implementation on `codex/nsw-environment-build`, based on `dfa9a09`. Read [NSW-ENVIRONMENT-BUILD.md](NSW-ENVIRONMENT-BUILD.md), the [art contract](NSW-ENVIRONMENT-ART.md) and the [durable checklist](NSW-ENVIRONMENT-BUILD-PLAN.md). The 42-asset kit, New England rendering adapters, first creek dressing, ground/excavation finish, lighting and optional scene water are implemented. Full-map composition and the complete visual acceptance gate remain open; do not call the whole upgrade complete. The user explicitly requires **reference quality first; phones scale through settings rather than defining the art benchmark**. Original controllers, physical/saved world data and other region recipes are preserved. No agent was launched or messaged. Implementation `de0d1e3` and evidence `2e98aeb` are published on main; Pages run `38397556111` succeeded and public High desktop/touch checks passed. The ten-minute RTX 3090 / 1080p High route held a 16.7 ms median/p95 frame interval; this is not a phone measurement. Validation, images, unresolved visual work and hardware limitations are in the delivery record. Final documentation deployment and exact touched paths are retained in the shared coordination handoff.

## Completed build: Coober Pedy (11 October 2026)

Codex implemented the user-approved opal district, underground homes and workings on `codex/coober-pedy`, based on `480d3bc`. Read [COOBER-PEDY.md](COOBER-PEDY.md) for scope, corrections and verification. The user's explicit corrections are **no inherited riverbed, no invented hills/hillsides, and homes below the existing ground**. The final terrain uses descending access cuts into a low open field; do not reinstate the rejected mound terrain. Shared original movement, mouse lock, wheel, touch, collection, camps and $0 travel remain the foundation. Main and Claude were clean when inspected, Claude's committed work is already an ancestor of main, and only Codex's 5191 preview is listening. No other agent was launched or messaged. Implementation `73dde94` was fast-forwarded into main and published successfully by Pages run `38069129027`. Passed: 82 logic tests, production build, full desktop/emulated-phone offline entry/exploration/extraction/reload/travel, normal shared controls across all seven locations, and public desktop/touch smoke checks. Low/High screenshots inspected; physical-phone performance is unmeasured. No dependencies or Blender outputs changed. The execution plan records exact touched paths and limitations.

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

## NSW rock repair — 14 October 2026

Codex branch `codex/nsw-landforms`, base `4c1c8ea`, implementation `0b36e4b`, removes the user-reported repeated through-cuts and clipped caps from ordinary rock prototypes. Granite geometry is modestly increased; flat decorative bank/source shelves are removed. [Evidence, verification and remaining polish](NSW-ENVIRONMENT-BUILD.md#intact-rock-repair). The user initially played main, then explicitly answered “Finished—publish the fix”; promotion is now authorized. Main/Claude were clean at inspection and no other agent was launched or messaged. The connected outcrop/bank/dig experiments were rejected and removed, so the open visual tasks remain open. This is a focused repair within the continuing environment-polish work, not completion of that work.

## NSW creek continuation — 14 October 2026

Branch `codex/nsw-creek-polish`, base `e779054`, implementation `09029c6`. Delivered compound host-rock shapes and closed quartz boundaries, simpler float, roots following the real bank, finer excavation detail and revised water/ground materials. [Exact checks, screenshots, performance and unfinished work](NSW-ENVIRONMENT-BUILD.md#creek-and-exposed-ground-continuation). 111 logic/asset tests, the production build, three-seed world/save/fallback, NSW desktop/touch and built NSW/NE Tasmania offline checks pass. Current captures and performance are in `docs/audits/nsw-creek-polish/`; do not overwrite earlier evidence.

Owned paths: `blender/build_newengland_environment.py`, `public/models/newengland/{environment.glb,manifest.json}`, `src/newengland/{environment,composition,water,grounddetail,bankroots}.js`, the NSW-only branch in `src/environmentmaterials.js`, `tests/newengland-{rocks,grounddetail}.test.js`, the three NSW environment plan/build/art docs, this guide and the new audit directory. No input, save format, dependency or other region recipe changed. Main and Claude were clean before integration; Claude's commits were already in main. No agents were launched or messaged. User publication authorization remains active; matching deployment/public verification is recorded in the build record after promotion.

LF-01/03/04/05 and the full reference-quality gates remain unfinished. Continue large connected exposures/bank composition, broader ground and vegetation transitions, and real-looking excavation/spoil volume; do not treat this detail pass as completion. Codex's preview remains on 5191.


## NSW scene pass — 14 October 2026

Branch `codex/nsw-scene-completion`, base `5de1629`, implementation `73b02f1`. The user's selected four areas are implemented through connected source exposures, bank layers, coordinated ground/plant patches, real-cut spoil and wider camp/site composition. [Current evidence, checks, performance and limits](NSW-ENVIRONMENT-BUILD.md#four-area-scene-pass). The full art sign-off remains separate; B9 optimisation is deferred until that sign-off.

Owned paths: `src/newengland/{landforms,groundcover,composition,environment,grounddetail}.js`, the NSW rendering branches in `src/{environmentmaterials,terrain,excavation}.js`, `tests/newengland-{landforms,grounddetail}.test.js`, `tests/newengland.game.mjs`, the three NSW environment plan/build/art docs, this guide and `docs/audits/nsw-scene/`. No GLB, generator, dependency, input, simulation yield or save-format changes. Main and Claude were clean at inspection; Claude's commits were already in main. No agent was launched or messaged. Codex preview remains on 5191.

Retain the solid source models beneath removable connecting detail: hiding those models with an excavation would leave invisible original colliders. Hand patches must share the terrain's camp-colour uniform. Only completed, tested work is promoted under the standing publishing instruction; the delivery record contains the exact matching Pages result.

Published implementation `73b02f1` and evidence `117a5c6`: Pages run 38500167021 succeeded, both JS/CSS chunks and the model match the tested build, and public High desktop/touch checks pass. SC-01..06 are implemented/verified; the complete reference-art acceptance and post-sign-off B9 phase remain open.


## Golden Triangle fidelity and taller trees - 16 October 2026

Codex branch `codex/golden-triangle-fidelity`, base `dd0450963a39762f8049b3fd5ea1a8aefe0f923c`. The user approved the next map, then requested taller and more varied trees in both Golden Triangle and the original New England map. Scope and completion gates are in [GOLDEN-TRIANGLE-ART-PLAN.md](GOLDEN-TRIANGLE-ART-PLAN.md); the exact assets, checks, measurements, limits and publication evidence are in [GOLDEN-TRIANGLE-BUILD.md](GOLDEN-TRIANGLE-BUILD.md).

The shared rendering adapter moved from `src/newengland/environment.js` to `src/rendering/regionalenvironment.js`; the NSW entry is now a thin recipe. Golden Triangle supplies its foliage kit, ground/dressing recipe and ironstone material adaptation while reusing water, rocks, LOD, excavation detail and all original input/gameplay systems. New England's only intended art change is tree stature. No simulation/save format, dependency, tool model or other region's gameplay was replaced.

Owned work includes `src/goldentriangle/`, the shared adapter/tree-height utility, the small integration hooks in main/terrain/excavation/assets/environmentmaterials, a default-preserving bank-overlay option in the shared landforms module, the additive Blender recipe and regional GLB, existing audit scripts extended with region parameters, focused tree tests, and the build/audit documentation. Main and Claude were clean at inspection, and all Claude commits were already in main. No other agent was launched or messaged. Only Codex's 5191 preview was used. The standing instruction to publish completed work remains active; use the linked build record for the exact deployment outcome. User visual acceptance and physical-phone performance testing remain separate from browser checks.


## Graves Hill locality - 16 October 2026

Codex branch `codex/graves-hill`, base `11ced10`, plan commit `88864b5`. The user requested a researched real locality near the proposed Queensland destination. [Research and checklist](GRAVES-HILL-PLAN.md) records the actual field-note, map and photograph evidence. [Delivery record](GRAVES-HILL-BUILD.md) lists checks and limitations. Future location work must establish this evidence before choosing landforms; the original claim remains the usability and shared-rendering foundation.

A new `graves-hill` saved region preserves existing Billystone/NSW camps, ground and unfinished material. The local modules supply topography, shallow geological cover, dry boundary creek, track, woodland/billy assets and surface dressing. Small integration hooks use the existing terrain, deposits, camp, original sieve, maps and regional rendering adapter. No other area's terrain recipe is replaced. The local headless Blender kit has 16 assets and shares the NSW kit for remaining geometry. No shared interactive Blender scene was used.

Ownership: `src/graveshill/`, new GLB/manifest, additive generator recipe, listed integration edits, focused tests and audit scripts, README/AGENTS, this guide and the Graves Hill records. Codex used its attached worktree and reserved 5191 production preview. No other agent was launched or messaged. The standing publication instruction remains active. Physical phone testing and the user's visual acceptance remain separate from the recorded browser/logic checks.

Published Graves Hill implementation `00c2454`; Pages run 38911465080 succeeded. Seven public files verified against the tested build, with public desktop/touch smoke passing. The Graves Hill checklist records implementation completion; player art acceptance remains separate.
