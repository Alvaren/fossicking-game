# Mainland locations — execution plan

Status: COMPLETE. Validated for local main integration; no publication. Owner: Codex. Branch: `codex/mainland-locations`. Base: `e5c35c8`.

## Scope and selection

The user requested more locations instead of the proposed quality-only/sniping work. Proposed next pair: Golden Triangle (Victoria) and Central Queensland Gemfields. An optional selection question was offered; Codex proceeded with the recommended pair after allowing time for a reply. Any subsequent user selection overrides this default. The earlier highlighted Golden Triangle planning blip is not authorization by itself.

Add two playable locations from the existing Australia catalog. Use the original main game, tool/vehicle/controller/UI implementations, shared topography and travel transaction. Do not fork or copy the main controller. Keep New England and both Tasmania saves and controls intact. Travel remains $0. No sniping, additional countries or unrelated camp expansion.

## Playable identities

- Golden Triangle: a fictional quartz-and-ironstone gully, rolling wooded slopes and shallow old diggings. Detect, pinpoint, dig and recover gold with the original detector and excavation rules; compare slope wash and the alluvial gully using the existing pan. A quartz reef provides the existing gold-in-quartz/ore loop. Region-appropriate resources replace the home claim's all-mineral sampler.
- Central Queensland Gemfields: a fictional broad, lower-relief wash field inspired by Sapphire/Rubyvale. Clay-rich basal gravel, low terraces, basalt outcrops, mixed stony float and sparse woodland. Classify, dig and wet-sieve sapphire/zircon/spinel wash using the original tools. Provide accessible water for the existing washing loop. A separate willoughby machine and underground sapphire mining are not part of this slice.

Names and terrain are fictional/compressed game areas. Physical sources inform material identity, not measured yields or real access directions. Caveats and future work stay here, not in player-facing journals.

## Implementation and acceptance

- [x] Add location profiles to the original terrain/world/deposit generation, preserving the exact default New England path and random streams.
- [x] Use the existing `src/main.js` for both new locations. Shared controls, tools, ute, maps, difficulty and prospecting methods remain the existing implementations.
- [x] Separate local terrain seed, excavations, depletion, structures, bucket/pan, vehicle and player state from shared money, collected finds and owned gear. Preserve home camp/unfinished work and both Tasmania snapshots across every transition, reload and difficulty change.
- [x] Enable both catalog blips and use the existing $0 transaction. Local map always shows contours and hillshade. Show appropriate location names and practical directions.
- [x] Make landscape/resource distribution visibly distinct; exclude unrelated opal/fossil/crystal attractions from the new claims without removing them from New England.
- [x] Add meaningful persistence/resource tests. Verify both new locations with normal pointer lock, wheel/number keys, menu transitions, real digging/tool use, save/reload and return travel; check emulated touch and existing regional transitions.
- [x] Inspect rendered terrain/map/tool screenshots; run production build and affected regressions; record actual results and limitations.

## Research

- Resources Victoria, Gold fever: https://resources.vic.gov.au/geology-and-data/geological-survey-victoria/150-years/gold-fever — quartz-hosted gold and secondary deposits formed through weathering.
- Queensland Government, Sapphire/Rubyvale designated fossicking land: https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/central-qld/rubyvale-saphire — clayey wash, shallow/deep distinctions, basal sapphire runs, basalt/silcrete gravel and washing waterholes. This game does not reproduce permit boundaries or provide real access advice.

## Execution log

- Read original main/save/terrain/creek/deposit/tool/map foundations and existing region catalog. Main and Codex clean at e5c35c8; Claude clean at aeb026f with its claim released. Continue in the attached Codex worktree on 5191. No other agent launched or messaged.

- Added Ironbark Gully and Billystone Wash as profiles of the original claim engine. Both use main.js, Terrain/Creek/Deposits, original tools, ute, camp, map and shared input. No separate controller or scene was built.
- Root save retains the legacy New England world. The claims dictionary stores each new mainland world. Cash, finds, owned gear, difficulty and progression remain shared; terrain, local structures, vehicle placement and material in work remain local. Tasmania keeps its existing expedition snapshots and exactly-once banking.
- New England terrain, bedrock and topsoil arrays match the e5c35c8 generator byte for byte at seed 12345. Regional sources, clay and basal concentrations have focused checks. Known fictional grades/terrain parameters are game approximations.
- Fixed the existing map travel button's missing currency symbol. Shared portrait layout now wraps tool prompts, keeps clock/stats and top buttons separate, and moves the rotation reminder out of the map/tool centre; it is hidden whenever touch controls are hidden. Claude's HUD stacking fix remains intact.

## Verification and limits

- npm test: 56 passing logic tests, including independent mainland/home/Tasmania saves, wallet/find transfer, resets, difficulty, original terrain hashes and regional mineral distribution.
- npm run build: production build passes.
- tests/controls.game.mjs: genuine desktop pointer lock on the normal URL in all five destinations, mouse look, wheel/number keys, walking while changing tools, menu isolation, pause/resume, rejected-lock recovery; original touch toolbar and brief Use taps pass.
- tests/mainland.game.mjs: desktop and portrait touch use actual shovel input to recover a seeded nugget, load/partly work a real dug pan, dig classified sapphire-bearing wash, jig with hold/release input and flip with right-click or the phone Flip button. Checks reload, local contours, five-location travel, collected target depletion, separate partial material, home camp preservation and unchanged travel cash.
- tests/maptravel.game.mjs: original desktop/touch local-map entry, unavailable destination blocking, cancellation, zero-dollar round trip and topography pass. tests/panning.game.mjs: original partial-pan reload and sub-milligram exactly-once collection pass.
- tests/tasmania.offline.mjs: production offline travel, movement and maps in both new mainland destinations, western movement, northeast Easy sieving/collection and returns home pass after initial online cache warming.
- Inspected rendered woodland/red-wash scenes, held tools, both contour maps, destination chooser and portrait phone screenshots. One-off browser layout checks verify visible top buttons, separate stats/clock, prompt bounds, unblocked maps and the currency label.
- Browser tests use disposable saves; no player storage is cleared. Long walks are skipped by positioning the player through existing inspection hooks. The remaining sieve settling is accelerated after real jig input is verified; actual assay and flip/collection paths remain in use. Physical-phone performance and a full-length prospecting session are not claimed. Existing three.js deprecations and occasional Chromium non-cancelable touchstart messages are not game exceptions; successful checks reported no page errors.
- This slice reuses the original manual mainland sieve, including its difficulty behaviour. It does not transplant the northeast expedition's separate sieve into the original game, add a willoughby, build sniping, or authorize more regions. Future method changes need their own scoped request.

## Integration handoff

Branch: codex/mainland-locations. Base: e5c35c8. Preview: 127.0.0.1:5191. Integrate by fast-forward into clean local main after these checks; no push or deployment is included. The shared local ownership record retains the resulting commit. Pre-integration fetch found origin/main at 1fa41d3, already contained in the local base. Claude is clean at aeb026f with its ownership claim released; only Codex's 5191 server is listening.

Touched paths: src/claimregions.js; original scene/save integration in src/main.js; profiles in src/terrain.js, src/creek.js, src/world.js and src/deposits.js; source guards in src/finds.js, src/targets.js, src/crystals.js and src/boulders.js; src/regions.js, src/regionmap.js, src/regionui.js, src/notes.js and src/style.css; mainland tests and affected control/travel/offline tests; README.md, docs/LOCATION-PLAN.md and this plan. Dependencies, Blender generators and models are unchanged.
