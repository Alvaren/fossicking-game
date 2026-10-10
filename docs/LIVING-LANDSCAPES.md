# Living landscapes execution plan

User authorization: “do all of them”, following the six suggestions after the environment pass. Base: `8856eca`; branch: `codex/living-landscapes`. Existing five destinations only. Publish after validation under the standing publishing instruction.

## Scope and order

- [x] Distance detail: retain original tree transforms/colliders and full nearby geometry; render reduced distant foliage with bounded updates and lower phone budgets.
- [x] Regional plants: saplings, shrubs, broken/dead timber and different branching silhouettes. Use independent seeds so existing finds and scenery do not move.
- [x] Two persistent natural landmarks per destination: rooted/snapped trees, fallen timber and rock formations appropriate to the existing geology. Preserve paths, camps, sites and finds; no markers or new collection rewards.
- [x] Walking feedback: distinguish gravel, rock, leaf litter, soil, mud and water through existing movement cadence. Add brief boot splashes/ripples when actually stepping in water, including Tasmania and touch.
- [x] Weather response: river rain impacts, patchy shallow puddles, wet bark and gusts shared across foliage/smoke. Mainland follows existing storms; Tasmania receives cosmetic passing showers without changing water depth or expedition simulation.
- [x] Camp character: terrain-following worn paths, stacked wood at the existing mainland fire, boots/hanging kit and soft wind-drifting smoke. Expedition kit appears only when shelter is pitched; no implied new camp purchases or fires.

## Acceptance and verification

- [x] Build and existing logic suite; focused checks for new surface/LOD logic.
- [x] All five desktop worlds plus mainland/northeast touch: clean shaders/console, visible regional scenery, bounded detail and relevant controls.
- [x] Verify stable landmark placement across reload, protected paths/sites, actual footsteps while moving, no stationary/pause splash spawning, storm/drying transitions and camp visibility.
- [x] Inspect clear, rain, camp and landmark screenshots at low/high detail; record draw/triangle costs, not unmeasured phone FPS.
- [x] Original pointer lock, wheel/number keys, menu/touch controls, original placement/save regression and offline production checks.

Delivery procedure: recheck ownership/main/remote, commit owned files, integrate safely, push and verify Pages plus a public smoke check. The exact delivered commit and Pages run are retained in the shared Codex coordination handoff and chat delivery, avoiding a second deployment solely to write its own commit ID into this file.

## Boundaries

Reuse current rendering, world profiles, movement, weather and saves. No input handler replacement, terrain reshaping, new locations, extra helper UI, yield changes, dependencies or save resets. Landmarks are authored fictional scenery, not claims about real sites. Decorative puddles do not alter the physical water simulation. Physical-phone performance and audio listening require separate device testing; report automated/emulated coverage accurately.

## Execution record

Plan written before implementation. Other worktrees clean and claims released at initial inspection. No agents launched or messaged.

## Implementation

`src/landscape.js` adds independently seeded, batched saplings/shrubs and two named scenery forms per destination. Names are internal records, not new HUD labels or map markers.

| Destination | Landmark forms | Plant treatment |
| --- | --- | --- |
| New England | Split gum bend; Granite shoulder | Pale gums, broad crowns, young stems and olive shrubs |
| Golden Triangle | Broken ironbark; Old timber stack | Dark, rough bark, broken branches and muted understory |
| Central QLD | Dry wash sentinel; Basalt steps | Lower/wider trees, pale dry shrubs and columnar basalt forms |
| Western Tasmania | Root buttress; Fallen forest giant | Broad-leaved young growth, large exposed roots and fallen timber |
| Northeast Tasmania | Granite crown; Split forest gum | Granite boulders and greener mixed young growth |

Landmarks choose clear areas beside the river, avoiding camps, paths, prospects and existing obstructions. Roots/rock bases follow the existing hillside; no heightfield edits. Mainland selection uses original ground heights and static scenery obstacles, excluding moved vehicles, collected states and flood finds. Existing Tasmania scenery density/layout already varies by graphics preset; landmark clearance follows that generated scenery. Within a seed/preset, reloads reproduce the positions. Roots/logs/rocks have bounded physical colliders; low shrubs have none.

`src/vegetationlod.js` keeps original instanced meshes as hidden immutable placement sources. Nearby draw lists retain full geometry; distant leaves thin out while trunks retain their triangles. Low detail switches at about 32 m, higher settings at 55 m, with 4 m hysteresis. Ground vegetation stops at 55/90 m; tree foliage at 160/240 m. Draw lists refresh at most every 0.3 seconds and only after moving 2 m. Landmark silhouettes remain intact. Original scene-source matrix regression still uses its existing hash, excluding only new render-list copies.

`src/environmentmotion.js` selects six surface sounds and owns fixed ripple/drop pools. Footstep cadence uses actual movement through the existing controller; Tasmania's held tools and small camera bob now follow that cadence too. Water impacts check actual water depth. Pausing, driving or going underground hides/stops local surface effects. Synthesized sounds use the existing audio engine; no downloaded audio or dependency added.

Existing mainland storm intensity drives wet bark, ground pooling and rain impacts. Forest showers are a local visual/audio cycle: 20-second build, brief shower and 25-second clearing, starting after three minutes of active exploration. They pause with the journal and do not alter river depth, grades, mobility or saved expedition data. Wetness builds over seconds and dries gradually over minutes. Ground puddles are a shader treatment on flat, less organic patches; there is no new water simulation. Gust waves travel across world coordinates and also move the mainland fire smoke.

`src/campdetail.js` batches small belongings by material and follows ground height for worn paths. Existing mainland fires receive wood and soft smoke. Expedition belongings appear with the existing pitched-camp state and disappear when it is absent. No camp progress, purchase, storage or building rules change.

## Verification record

- Initial build and all 62 existing tests passed. Four new surface/weather/LOD tests bring the suite to 66 passing checks.
- Initial browser render check passed New England and western Tasmania without shader/page/console errors. Existing excavation millimetres survived save/reload.
- Early scenery check caught a too-restrictive western hillside placement; expanded clearance search and terrain-following root bases corrected it. Visual review also requested smoothing wet-ground reflections before final verification.
- At the existing low-detail creek camera: New England submitted 1,089,577 triangles / 233 calls (previous 1,860,739 / 210); western Tasmania 225,897 / 29 (previous 627,883 / 22). More material batches, substantially less distant foliage geometry. These are renderer workload counts, not measured device frame rates.
- `node tests/landscape.game.mjs`: all five desktop locations and New England/northeast Tasmania emulated touch passed. Each had two landmarks; checks covered path/find clearance, keyboard or actual CDP touchscreen stick input, water footfalls, stopping, pause, rain impacts, camp state and identical positions after saved reload. Browser logs contained no page, console or shader errors. Test cameras skip walking to locations; storm timing is accelerated through the existing controller (forest cosmetic intensity is overridden for the test).
- Wet-ground finish was refined after inspecting screenshots: interpolated terrain normals soften pool boundaries, and pooled water suppresses grain relief to avoid sharp triangular/specular artifacts.

- Final build and 66 tests passed after the visual refinement. High-detail New England and western Tasmania passed the same scenery/footstep/rain/reload checks, including shadow shader compilation. Their nearby vegetation retains full geometry; submitted tree/grass triangles at the landmark cameras were 441,984 of 1,296,252 and 547,920 of 1,501,200 respectively (before shadow passes).
- `node tests/controls.game.mjs`: actual desktop pointer lock (no test bypass), mouse look, wheel/number keys, held tools, menu isolation, rejected-lock recovery and tool close passed in all five locations; original portrait-touch toolbar/Use/menu checks passed.
- `ROCK_CASES='[["new-england",false]]' node tests/rocks.game.mjs`: geological shaders, split surfaces and original tool input passed. Existing world/find layout hash remains `66480178c1dd58ac0820151a23f824f6d69a5ce8e48ac8b46f39180971e9236a`; only new LOD draw-list copies are excluded from the old source-matrix comparison.
- `node tests/environment.offline.mjs`: built production files loaded offline in disposable New England desktop and northeast Tasmania touch contexts. Blended ground/foliage/water compiled, tool input passed, closed Tasmanian rocks were checked and the mainland excavation snapshot survived save/reload. Final low mainland creek count: 1,089,121 triangles / 233 calls.
- `node tests/shelter.game.mjs`: desktop and touch progression through swag/tent/caravan/shed, charges, storage, model switching, reload and exactly-once dawn passed. Desktop traversed the shed doorway. Caravan/shed and clear/rain/landmark/camp screenshots were inspected; the high western landmark camera is partly occluded by existing foreground rock, while its lower-detail view clearly shows the roots and river setting.
- No dependency, Blender output, find identity, grade, terrain layer, fee, input-binding or save-schema changes. Test storage is isolated. Physical-phone FPS/thermals and listening comparison of the synthesized footsteps were not measured.
- Before integration, main/origin remained at `8856eca`, Claude's clean branch had no unintegrated commits, its claim was released, and only the Codex preview port was listening. No other agent's checkout or server was modified.
