# New England environment: action and build plan

Date: 13 October 2026 (Australia/Brisbane). Owner: Codex. Plan base: `2a319467be058cce5425fdd1041f1c10c8b7058e`.

Read the [audit and baseline evidence](NSW-ENVIRONMENT-AUDIT.md) first. This document is the durable task list for bringing **the existing New England, NSW map** toward the six user-supplied environment references. Audit/documentation work is complete; the visual build tasks below have not been implemented. Checked audit items must not be presented as completed graphics work.

## Quality target and scope

Build a coherent, attractive stylised New England woodland and creek environment: deliberate rock forms, soil and gravel that connect them, varied regional vegetation, readable shallow water, grounded lighting and convincing close-up work surfaces. The entire claim should eventually meet that treatment, including reverse views and approaches between attractions.

**High/Ultra and the supplied references define the art quality.** Mobile is a scaling target, not the build-quality benchmark. The user expects relatively recent iPhone/Android models, not necessarily current-year models. Keep that direction if this plan is resumed in another chat.

The first implementation milestone is a finished, playable creek section near camp, with companion reef and granite asset checks at their existing source positions. It establishes a repeatable visual standard before full-map rollout. It is not a separate demo, separate map or replacement controller.

Preserve these throughout:

- Original first-person mouse lock, look, wheel/number tools, movement, touch, menus and tools.
- Existing difficulties and technique-driven prospecting. No invented difficulty mode, altered yields or visual guarantees of gold.
- Terrain seed, source anchors, find IDs, deposits, dug grid, boulder contents, camps, vehicles, unfinished material and saves.
- All existing New England activities, including its legacy geological composite. No removal of opal/fossil content as an unrequested geography correction.
- Original topographic map, discovery, find/test markers and $0 travel. No world helper rings or new mandatory navigation UI.
- Current engine and ES modules, asset fallbacks, local/relative assets and offline play.
- Other regions' existing appearance unless a separately documented shared fix is necessary and checked.

Outside this build: new destinations, a new game engine, an input rewrite, third-person character work, a larger mine, a new excavation simulation, region-wide terrain regeneration, a new progression system or wholesale tool/gem/vehicle remodelling. Photo-only depth of field is optional later; ordinary play must be sharp enough to inspect small finds.

## Checklist convention and evidence

`[ ]` means pending. `[x]` means completed with evidence. Keep stable task IDs. When completing an item, add the commit, screenshot/check link and any limits to the execution log. If scope changes, amend the affected task before coding. Never mark a visual task complete merely because the build or a unit test passes.

For each substantial delivery: record branch/base, owned paths, implementation result, matching screenshots, checks actually run, unresolved issues and publication result. Use a focused commit sequence; keep safe completed work independently publishable. Follow the standing instruction to integrate ready work and publish after each implementation run. Do not ship an unfinished visual experiment to all regions just to satisfy that instruction.

## Completed planning work

- [x] AUD-01 — Read instructions, collaboration history and prior visual plans; inspect main, Codex and Claude worktrees. All were clean at the audit start; other claims released.
- [x] AUD-02 — Select New England, the existing playable NSW claim; inspect its renderer, asset, terrain, water, vegetation, save and interaction contracts.
- [x] AUD-03 — Break down all six supplied references and document the regional interpretation, whole-map zones and concrete visual gaps.
- [x] AUD-04 — Capture and inspect 19 baseline views: 15 initial High/Low/touch views plus High mine approach, dug ground, headlamp night and map. Store the capture script, camera data, renderer counters and images in `docs/audits/nsw-environment/`.
- [x] AUD-05 — Run the existing 82 logic tests and production build; record visual, performance and interaction coverage accurately.
- [x] AUD-06 — Record the user's correction: reference-quality environment first, graphics scaling for phones afterward.
- [x] AUD-07 — Write the audit, asset schedule, dependency order, acceptance gates, compatibility strategy and release checklist in the repository.

## Build sequence and dependencies

| Stage | Deliverable | Depends on | Completion gate |
| --- | --- | --- | --- |
| B1 | Art specification, fixed scene boundaries and asset contracts | Audit | Concrete composition and asset sheet; no unresolved guess about what is being built |
| B2 | First authored rock, vegetation and ground kit | B1 | In-game geometry/material inspection at close, middle and far distances |
| B3 | Complete first creek scene plus reef/granite checks | B2 | Reference-comparable playable views, honest movement clip, preserved access |
| B4 | Integrated lighting, water and atmosphere finish | B3; experiments may begin during B2 | Scene works at noon, dawn, night and in rain; no unstable effect shortcuts |
| B5 | Whole New England claim rollout | B3+B4 visual gate | Every existing surface area and approach follows the same standard |
| B6 | Explicit quality controls and measured optimisation | High-quality scene established; profiling begins early | Same world across presets, measured hardware results and documented tradeoffs |
| B7 | Gameplay/save/offline/cross-region regression | B5+B6 | Acceptance matrix complete; no unexamined integration regressions |
| B8 | Final review, main integration and deployment | All required gates | Published build verified, remaining limitations stated |

Authoring is iterative: B3 may send a rock or tree back to B2. B4 may expose weak materials that need rework. Do not proceed to multiplying an unconvincing scene across the map. Optimisation can begin when a clear waste is measured, but it must not set a low art ceiling in advance.

## B1 — Establish the concrete art specification

- [ ] B1-01 — Create a small reference board with a clearly labelled game target for creek, host rock/quartz, granite, ground, mature trees and shrubs. Keep user references distinct from researched NSW species/geology and from generated concept art, if any is later used.
- [ ] B1-02 — Choose and document the New England plant palette and material palette. Include dry/wet soil, pale granite, darker host rock, quartz, basalt and foliage colours under neutral lighting. Use regional reference sources; do not reuse a desert palette by default.
- [ ] B1-03 — Define the first section around `creek.cx(z)`, approximately z=0..28, with camp access and both bank working spaces protected. Record 3 ground-level views in each direction, one kneeling view and one elevated inspection view. Resolve anchors from the save, not hard-coded seed-12345 coordinates.
- [ ] B1-04 — Define separate reef and granite close-up scenes at their existing anchors. A white seam must belong to the existing source; do not relocate a reef to decorate the creek screenshot.
- [ ] B1-05 — Inventory all protected footprints: camp upgrade extremes, shop, ute route, mine collar, sluice/highbanker, targets, surface finds, crystal/vug sites, excavation patches and existing boulders. Store a reusable placement mask/clearance query, based on those actual objects.
- [ ] B1-06 — Specify mesh names, metre scale, pivot/origin, Y-up game result from Blender Z-up, material slots, LOD names and collision-proxy rules for the environment kit. Keep existing tool/crystal contracts intact.
- [ ] B1-07 — Record asset-source/licence and generator provenance. Start with authored headless Blender work using the existing installation; use a fresh process and absolute paths. Verify availability at build time rather than assuming the old MCP connection works.

**Gate:** the scene layout and asset list describe a concrete result. If the intended appearance is still being invented during integration, finish this stage first.

## Asset schedule

These are initial authoring quantities, not world spawn counts or fixed polygon promises. Adjust only with a recorded visual reason. LOD variants and ground-contact pieces are part of each asset, not optional cleanup.

| Asset ID | Deliverable | Initial set | Needs to show | Integration constraints |
| --- | --- | --- | --- | --- |
| RK-01 | Fractured host-rock outcrop modules | 4 complementary forms | Bedding/joints, broken planes, irregular silhouette, buried base | Assemble at the existing reef; fit walkable/prospectable spaces |
| RK-02 | Quartz seam and broken float | 3 seam forms + 4 fragments | Vein sits inside host fractures, variable width and weathered breaks | Decorative exposure stays consistent with existing source/vein data; no new reward system |
| RK-03 | Granite kit | 4 corestone/tor forms + 2 slabs | Rounded weathering combined with flat joints and occasional splits | Preserve original tor/target anchors and appropriate collision envelopes |
| RK-04 | Creek stone kit | 6 cobbles/boulders + 3 slab forms | Rounded transport shapes, size variation, wet/dry transitions | Keep mobile `bedload` identities/physics; extra stones do not create false collectible targets |
| RK-05 | Basalt and rhyolite kits | 3 forms each | Different fracture character and material scale; no colour-only duplicates | Existing source mix, agate sites and downstream logic retained |
| RK-06 | Shale and spoil dressing | 3 layered slabs + 3 rubble clusters | Thin bedding versus loose excavated debris | Fossil hammer targets and opal work sites stay accessible |
| VG-01 | Mature eucalypts | 3 silhouettes with variations | Branched crowns, credible trunk taper, open foliage masses, roots meeting ground | Stable trunk footprints; leaf animation and shadow motion agree |
| VG-02 | Young trees and shrubs | 2 young-tree + 3 shrub forms | Different age/height/shape; local open space | No blocking critical sight lines or sample positions |
| VG-03 | Ground plants | 3 tussock/grass + 2 sedge forms | Bent blades, patch edges, greener creekline treatment | Scenery density independent of collision and saved content |
| DT-01 | Roots, bark and fallen limbs | 2 root sets + 3 bark/branch pieces | Grounded detail at selected banks/trees | No arbitrary root lattice everywhere; adapt/hide near digging |
| MT-01 | Rock material finishing | Existing types, refined | Metre-scale minerals plus larger weathering/joint variation | Preserve `aRockKind`, wet, split and cavity contracts or provide explicit adapters |
| MT-02 | Ground and exposed-face finishing | Soil, grus, wash, litter, bank face | Macro variation, embedded inclusions, believable material boundaries | Follow current height/bedrock/topsoil and dig state |

Each delivered asset needs a source/generator, intended GLB or native geometry, documented bounds, near/far treatment, fallback and an in-game view. A Blender beauty render alone cannot close an asset item.

## B2 — Build and validate the kit

- [ ] B2-01 — Author RK-01/02 prototypes first. Inspect the host rock and vein together from front, side, above and player eye height; avoid thin decorative white strips hovering above solid rock.
- [ ] B2-02 — Author RK-03/04. Give granite and creek stones their own shape language; show scale beside the existing shovel/player height. Check seams and normals before export.
- [ ] B2-03 — Author VG-01/02/03 prototypes. Review backlit leaves, the underside of canopies and distant silhouettes. Avoid dense sheets, detached branches and uniformly black foliage.
- [ ] B2-04 — Author DT-01 and MT-01/02 with close-view scale references. Use material roughness/normal detail to support the meshes; keep minerals readable without excessive speckle.
- [ ] B2-05 — Add an optional New England environment asset manifest through the existing loader. Load failures must preserve a playable fallback and must not discard successful tool/find loads.
- [ ] B2-06 — Validate GLBs in game: bounds, origin, scale, material colour spaces, normal direction, transparency, shader variants, instancing compatibility and offline paths. Include missing/corrupt asset simulation.
- [ ] B2-07 — Supply initial reduced versions and share textures/materials. Record file bytes, texture dimensions and GPU-memory estimate. Do not freeze arbitrary triangle limits until representative in-game quality is visible.

**Gate:** the first kit looks coherent inside the game, with normal lighting, tools visible and photo filters disabled. New geological formations must already look better than their [baseline](audits/nsw-environment/high-reef.jpg).

## B3 — Compose the first playable section

- [ ] B3-01 — Introduce a New England environment profile/recipe, using an independent decoration seed. Keep global default rendering unchanged elsewhere. Isolate orchestration from `main.js` rather than growing another controller there.
- [ ] B3-02 — Replace selected visible scenery in the first section with the new kit. Retain source objects/IDs where used by old regression data; explicitly hide replaced rendering so it is not doubled.
- [ ] B3-03 — Compose large forms first: bank exposures, a small number of embedded rock groups, mature trees and open working margins. Preserve the original terrain/water surface and crossings.
- [ ] B3-04 — Add medium forms: shrubs, grasses, gravel bars, small stones and exposed roots. Placement follows slope, moisture and parent formations, with deliberate empty areas.
- [ ] B3-05 — Finish soil, gravel, litter and rock transitions. Correct floating bases, texture scale, tiling, hard colour patches and close-up depth. No permanent bank skin across diggable ground unless it updates with the same surface.
- [ ] B3-06 — Integrate camp's existing paths and surroundings. Check the largest existing camp upgrades and ute clearance, not just the empty starter camp.
- [ ] B3-07 — Compose reef/granite companion views at their original positions using the same kit and lighting. Keep geological clues distinct from rewards; barren areas still look natural.
- [ ] B3-08 — Walk both banks and inspect from the opposite side; kneel, point a tool at the ground and inspect small finds. Capture a 30–60 second ordinary-play movement clip and the matched stills.
- [ ] B3-09 — Review the complete scene against Photos 1, 3 and 5 and the rubric below. Record visual shortcomings and revise the kit/composition before wider rollout. Present the concrete results to the user at the milestone; their feedback can change the next stage.

**Gate:** bank, water, rock, vegetation and light form one convincing environment. A material swatch, isolated rock model or flattering camera does not satisfy this stage.

## B4 — Lighting, water and atmosphere

- [ ] B4-01 — Tune the actual day/night/weather update paths: sun/fill ratio, exposure, sky/ground colour and fog. Preserve the existing day clock and weather effects; validate neutral noon before dramatic dawn.
- [ ] B4-02 — Replace the unsupported soft-shadow configuration with a supported, visually tested treatment. Stabilise resolution/filtering at ordinary movement speed. Check leaf animation in shadow maps and contact beneath roots/rocks.
- [ ] B4-03 — Evaluate contact shading with authored crevice detail and, if still useful, a bounded AO pass. Check screen edges, thin foliage, water and camera motion. Add a postprocess pipeline only if its measured visual benefit justifies the extra integration; preserve the held-tool overlay and photo capture.
- [ ] B4-04 — Improve water-bed composition, shallow transparency, wet stone edges, ripple scales and foam placement using existing depth/velocity data. Verify the water still communicates shallow working areas and high-flow hazards.
- [ ] B4-05 — Prototype actual scene-aware water reflection/refraction against the sloping creek. Compare segmented reflection, screen-space sampling and a cheaper approximate fallback. Select and document one after inspecting banks/trees, off-screen objects, close camera angles and moving water; do not assume one flat reflector fits the whole river.
- [ ] B4-06 — Integrate the chosen water method into the existing update/render order, including correct resize and disposal. Avoid reflected HUD/tools, duplicated highlights, transparent sorting artifacts and artificial foam at dry edges.
- [ ] B4-07 — Review noon, dawn, dusk, night/headlamp, UV, rain, peak flood and drying ground. Keep useful night darkness and inspection readability; do not bake one sunny setup into everything.
- [ ] B4-08 — Establish distant terrain/tree grouping and atmospheric depth; avoid fog that conceals missing art or removes useful nearby landmarks.

**Gate:** the scene remains convincing while moving and changing conditions. The expensive effects must add a visible benefit and have a controlled fallback, but the High-quality target remains intact.

## B5 — Apply the standard across New England

- [ ] B5-01 — Extend the creek treatment upstream/downstream: vary bends, shallows, exposed banks, gravel and vegetation rather than repeating the first scene as a stamp.
- [ ] B5-02 — Finish the existing quartz reef, slope float and wash approach; preserve the lead and Lucky Strike access. Improve the collar's terrain contact and nearby work props.
- [ ] B5-03 — Finish granite pavements, tors, existing veins and vug/pocket approaches; validate kneeling proximity and splittable boulders separately from decorative tors.
- [ ] B5-04 — Complete RK-05/06 and integrate basalt, rhyolite, fossil shale and legacy opal workings. Maintain distinctive forms and source-related debris. Preserve every existing specimen/recovery interaction.
- [ ] B5-05 — Extend regional plants to woodland/terrace/open-slope patches with natural transitions. Refine the two existing landscape landmarks; avoid inventing more attractions.
- [ ] B5-06 — Align ground/dig materials: exposed soil and wash follow actual removed depth; roots and stones react appropriately when excavated. Check the seam between the main heightfield and fine hand-work patches.
- [ ] B5-07 — Finish camp surroundings for swag, tent, caravan, shed and full facilities. Keep display specimens and approaches readable. Review mine entrance/interior lighting continuity without expanding mine scope.
- [ ] B5-08 — Audit every zone from front/reverse approaches, the river, camp and boundary. Remove abrupt quality transitions, floating pieces, repeated hero silhouettes, inaccessible pockets and vegetation through working surfaces.
- [ ] B5-09 — Repeat representative views on seeds `1`, `12345` and `798887`, plus a populated legacy save fixture. Seed 12345 cannot be the only good-looking layout.

**Gate:** all rows in the audit's whole-map treatment table have before/after evidence and verified access. Partial rollout must be described as partial.

## B6 — Quality settings and performance

Keep the existing Low/Medium/High/Ultra selector as the primary control. Extend what the presets actually change; retain useful advanced settings. High-quality meshes and composition are authored once. Lower settings use reduced rendering of that world, not different geology, different routes or different finds.

| Setting | High / Ultra direction | Medium / Low scaling | Invariant |
| --- | --- | --- | --- |
| Rock detail | Full near shapes and material detail | Earlier LOD and simpler small detail | Major silhouette, physical footprint, interactive targets |
| Vegetation | Richer near crowns and ground layers | Fewer small decorative plants, simpler distant crowns | Trunks/obstacles and protected access |
| Shadows/contact | Better coverage/filtering; optional AO | Lower resolution/range, cheaper contact detail; AO optional/off | Readable terrain and no blacked-out work surfaces |
| Water | Chosen richer reflection/refraction treatment | Lower update rate/resolution or cheaper fallback | River height, depth, flow, working zones and flood state |
| Ground | Full nearby detail, stable distant filtering | Reduced material/detail cost | Actual dug surface and layer boundaries |
| Resolution/AA | Crisp image; measured upper cap | Existing scalable resolution and AA choice | UI legibility, especially small finds |
| Atmosphere/effects | Full restrained effects | Reduced particles/expensive passes | Time, weather, navigation visibility |

- [ ] B6-01 — Record a real desktop hardware/browser baseline at 1920 x 1080, with a fixed route, warm-up and ten-minute run. Log median/p95 frame time, GPU/CPU limitation, memory trend and full-frame render passes. The current SwiftShader counts cannot substitute for this.
- [ ] B6-02 — Define the supported baseline after hardware is recorded. Working goals: smooth 60 fps desktop High where feasible, and a stable 30 fps or better on representative recent phones using a suitable preset. These are targets, not existing measurements or universal guarantees; Ultra can remain a higher-end option.
- [ ] B6-03 — Implement explicit environment quality values and safe defaults for old settings. Separate rendering detail from the `shadows === 'off'` world-generation shortcut. Make live updates work where possible; when restart is necessary, save first and label it accurately.
- [ ] B6-04 — Profile terrain/water submission. If needed, partition render meshes using the original height data and optional distant LOD. Preserve grid indices, `orig`, dig millimetres, `getHeight`, `raycast`, normals, `refresh`, `tuckUnder`, overlays and flood refill. Keep the old single render mesh as a fallback, never concurrently visible.
- [ ] B6-05 — Add appropriate spatial batches/culling to new scenery; tune existing foliage LOD, transitions, bounds and update intervals. Share materials/textures; preserve full near silhouettes. Measure calls and overdraw as well as triangles.
- [ ] B6-06 — Bound reflection/AO/particle cost and render-target memory. Inspect resize, orientation changes, repeated travel/reload and disposal for leaks or accumulating scenes.
- [ ] B6-07 — Test Low/Medium/High/Ultra, individual option changes, fresh settings and old stored settings. Require the same save/interaction outcome and no disappearing major obstacles at lower presets.
- [ ] B6-08 — Measure one recent non-current-generation iPhone/Safari and one comparable Android/Chrome, recording exact models, OS/browser, preset, effective resolution and sustained frame time/thermal behaviour. If devices are unavailable, mark this pending; do not describe desktop touch emulation as physical-device proof.
- [ ] B6-09 — Set final asset/download/GPU-memory budgets from measurements. Record total new bytes, first-load time, cached load and failure fallback. Investigate spikes without degrading the agreed full-quality art standard.

**Gate:** presets provide useful scaling; hardware results are stated honestly. Any unavailable device check stays visible as an unresolved item.

## B7 — Verification matrix

| Test area | Required cases | Evidence |
| --- | --- | --- |
| Visual quality | All baseline viewpoints + new scene reverse views; 3 seeds; native 1080p High; noon/dawn/night/rain/flood | Matched images, short movement clips and rubric scores |
| Desktop control | Normal URL without `?test`: pointer lock, look, walk, wheel, number keys, simultaneous movement/tool switching, menu unlock/relock, rejected lock recovery | Existing controls suite and manual/instrumented scene walk |
| Touch | Look/stick, tool bar, Use/hold/release, map/menu transitions, landscape layout and portrait behaviour | Emulation plus physical-device checks when available |
| Surface prospecting | Detector targets, digging, classify/oversize, pan, sieve, sluice/highbanker setup and access | Existing recovery/tool suites; real pointer interactions at improved sites |
| Rock work | Hammer raycasts, split boulders, geodes, vugs, hand excavation, fossil slabs, opal noodling | Existing asset/rock tests plus before/after state snapshots |
| Camp/transport | Every shelter stage and facilities, display/bench access, ute routes, mine entrance/return | Camp/facilities tests and traversal recordings |
| Saves | Legacy and fresh, dug ground, moved cobbles, worked sites, camp upgrades, vehicle, unfinished pan/ore, travel away/back | Snapshot comparisons; no reset or reseeding |
| Difficulty | Easy demonstration, Prospector, Realistic | Same mechanics and inputs; scenery never changes assay/recovery rules |
| Quality/fallback | Presets, individual options, resize, missing environment model, failed texture, loss of optional effect | Correct fallback, no invisible collider trap, no shader failures |
| Offline/deployment | Built game at Pages base path; cached travel/assets and offline reload | Fresh disposable browser cache, network-disabled check, public smoke |
| Other destinations | At least representative screenshots across all six other worlds; full controls suite for shared changes | No unintended new plants, rock palettes, water or lighting |

- [ ] B7-01 — Run `npm test` and `npm run build`; add focused tests only for new meaningful logic (placement invariants, quality scaling, terrain-update mapping, save compatibility).
- [ ] B7-02 — Run the relevant existing browser suites below and record exactly which cases ran. Adapt old scenery hashes narrowly if rendering changes intentionally; preserve data/placement invariants rather than deleting checks.
- [ ] B7-03 — Complete the matrix's interaction and save cases using disposable saves. Do not clear user browser storage or claim camera teleportation as a walked route.
- [ ] B7-04 — Inspect new asset load failures and built offline loading; check relative URLs, cache update behaviour and stale GLB versions.
- [ ] B7-05 — Inspect page, console and shader errors. Resolve warnings touched by the work; distinguish old unrelated warnings from new failures.
- [ ] B7-06 — Review the always-on topo map and travel screen at desktop/touch sizes. Baseline 720p map buttons sit at the lower viewport edge: verify scrolling/closing/reopening remains usable; do not replace the map UI.
- [ ] B7-07 — Confirm no developer/roadmap prose, unwanted circles or instructional overlays were added to player screens.

Existing checks to reuse selectively: `tests/controls.game.mjs`, `tests/environment.game.mjs`, `tests/environment.offline.mjs`, `tests/landscape.game.mjs`, `tests/rocks.game.mjs`, `tests/rocks.offline.mjs`, `tests/maptravel.game.mjs`, the panning, camp, shelter and facilities browser suites, and `tests/*.test.js`. New browser coverage should exercise the new environment, not duplicate entire unrelated recovery suites.

## Visual acceptance rubric

Score each dimension: 0 missing/broken, 1 visibly below target, 2 meets the agreed stylised target, 3 exceeds it. This is a recorded review judgment, not a model-generated objective metric. Completion requires **at least 2 in every required dimension**, no visible blocker, and the supporting images/clip. User objections reopen the relevant item; technical passes do not override them.

| Dimension | Required evidence of a 2 |
| --- | --- |
| Geological form | Reef has host rock and vein; granite has joints/weathering; basalt/rhyolite/shale read differently without labels |
| Grounding | Rock/tree bases and camp props meet soil; no floating dressing, conspicuous repeated stamps or unrelated terrain colour patches |
| Vegetation | Varied branching/crowns/ages and natural plant groupings; useful clear ground; stable moving/distant foliage |
| Water | Legible shallow bed and wet margin, coherent flow and reflections; no dominant repetitive stripe pattern or edge artifacts |
| Lighting | Useful sun/shade separation and contact depth; readable work surfaces at ordinary noon as well as dramatic conditions |
| Composition | Near/middle/far structure and coherent reverse views; the map works as a walkable environment, not one staged camera |
| Close-up work | Dig layers, inclusions and nearby rock surfaces remain convincing at kneeling distance; small finds remain identifiable |
| Consistency | Camp, workings, major attractions and background belong to the same art style; no unfinished-looking island in the upgraded map |
| Temporal stability | No obvious LOD popping, shadow shimmer, water discontinuity or effect flicker during the normal-play clip |

Comparison protocol: use the same seed, pose, FOV, hour, weather and comparable resolution; show full screenshots including ordinary tools/HUD, plus unobstructed detail views where useful. Inspect at 100% and while moving. Do not use depth of field, heavy grading or cropped images to hide deficiencies.

## Proposed file ownership and architecture

Names below are planned boundaries, not claims that the files exist. Inspect current ownership again before each implementation run.

| Area | Proposed implementation | Existing integration points |
| --- | --- | --- |
| Region recipe | `src/newengland/environment.js`, `src/newengland/profile.js` | `claimregions.js`, narrow setup/update hook in `main.js` |
| Asset kit | `blender/build_newengland_environment.py`, `public/models/newengland/`, asset manifest | `assets.js`; preserve fallbacks and existing model names |
| Rock/ground finish | Extend parameterised existing materials | `rockmaterials.js`, `rocktextures.js`, `environmentmaterials.js`; preserve defaults outside NSW |
| Composition | New region recipe using existing terrain/source/clearance queries | `world.js`, `landscape.js`, `environmentdetail.js` |
| Plants | Authored kit fed through existing wind/LOD contracts | `vegetation.js`, `vegetationlod.js` |
| Lighting/water | Optional New England treatment in existing update/render order | `daynight.js`, `weather.js`, `water.js`, `materials.js`, `main.js` |
| Quality | Extend current presets; render-only terrain helper if profiling requires it | `settings.js`, `settingsui.js`, `terrain.js` |
| Ground work | Surface treatment and decoration invalidation only | `excavation.js`, `terrain.js`; no new dig simulation |
| Verification | Focused environment checks and existing suites | `tests/`, durable evidence directory and this execution log |

`main.js`, `terrain.js`, `assets.js`, shared materials and generators are integration hotspots. Claim exact touched paths before editing. Codex uses its own worktree and 5191 server. Do not launch/message Claude or any other agent, or change their files/processes, without user authorization.

## B8 — Release and handoff

- [ ] B8-01 — Review diff against scope; remove abandoned experiments and leave any optional unbuilt work explicitly unchecked. Check that completed visuals satisfy the rubric.
- [ ] B8-02 — Update audit/build records with delivered tasks, images, actual tests, hardware results and limitations. Retain this plan as the source of unfinished work.
- [ ] B8-03 — Recheck worktrees, claims, main, remote commits and active servers; fetch if available. Preserve unfinished work and never force-push.
- [ ] B8-04 — Commit owned completed work, integrate ready project changes safely and push main under the standing user instruction. Avoid hot-reloading an actively played user checkout.
- [ ] B8-05 — Verify the matching GitHub Pages deployment and a public-game smoke check, including the new assets and controls. Record commit/run URL and any pending device checks.
- [ ] B8-06 — Release the coordination claim and provide a concise handoff with what looks different, screenshots, checks and next unfinished milestone.

## Reproducing the current audit

Use the isolated Codex worktree, with dependencies from the lockfile and `npm run dev:codex` on 5191. The capture script uses an installed Playwright package; set `PLAYWRIGHT_MODULE` when it is not available as `playwright`. It launches disposable browser contexts, not the user's browser profile.

```powershell
node docs/audits/nsw-environment/capture-baseline.mjs
$env:AUDIT_SUPPLEMENT = '1'
node docs/audits/nsw-environment/capture-baseline.mjs
Remove-Item Env:AUDIT_SUPPLEMENT
```

The first command writes the initial report and 15 screenshots. The supplement appends four additional views. Run from the audited code to reproduce the baseline; during future builds copy the evidence to a new commit-labelled directory rather than overwriting these before images. The dig image uses direct terrain edits in a disposable save, and the night image uses the original headlamp key. See the audit for all methodological limits.

## Execution log

| Date | Work | Status and evidence |
| --- | --- | --- |
| 13 October 2026 | Baseline audit and complete action/build specification | AUD-01..07 complete. 19 inspected screenshots, `baseline.json`, reproducible capture script, 82 passing logic checks and production build. High-quality target explicitly takes precedence over mobile scaling. All B1..B8 tasks remain pending. |

**First build task:** B1-01..07, followed by the fractured host-rock/quartz and mature-eucalypt prototypes in B2. The first playable result to judge is B3's creek section, finished with B4 lighting/water; full-map rollout follows that visual gate.
