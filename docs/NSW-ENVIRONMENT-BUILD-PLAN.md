# New England environment: action and build plan

Date: 13 October 2026 (Australia/Brisbane). Owner: Codex. Plan base: `2a319467be058cce5425fdd1041f1c10c8b7058e`.

Read the [audit and baseline evidence](NSW-ENVIRONMENT-AUDIT.md) first, then the [direct comparison of all six references with the published build](NSW-ENVIRONMENT-BUILD.md#direct-reference-comparison-audit). This document is the durable task list for bringing **the existing New England, NSW map** toward those references. The first implementation is recorded in [NSW-ENVIRONMENT-BUILD.md](NSW-ENVIRONMENT-BUILD.md), with its art contract and before/after evidence. The kit, regional rendering and first creek dressing are implemented; the complete scene/reference-quality gate and whole-map rollout remain open. The direct review withdraws the earlier visual passes for grounding, vegetation, water and close-up work. Checked technical items do not certify visual acceptance.

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

### Landform completion pass — 14 October 2026

Branch `codex/nsw-landforms`, base `4c1c8ea`. The user is playing promoted main. Build and test in the isolated 5191 worktree; keep main and the live deployment stable during play. The user approved extra geometry where it improves form. Increase useful silhouette/surface detail, not indiscriminate subdivision. Continue the existing reference target and preserve sources, saved terrain, inputs and collision footprints.

- [ ] LF-01 — Compose connected host-rock exposures at existing reef anchors; replace repeated detached wedges with shared joint/seam direction and grounded bases.
- [x] LF-02 — Repair the repeated through-cuts and clipped caps in ordinary rocks; reshape granite corestone volume and creek-boulder curvature and compare polygon counts. Granite is now 320 triangles per prototype (previously 208–254). [Repair evidence](NSW-ENVIRONMENT-BUILD.md#intact-rock-repair). This closes the mesh defect, not the connected-formation art gate.
- [ ] LF-03 — Add irregular bank-face detail that follows the actual bank and removed surface; connect lip, roots, gravel and water edge without blocking work areas.
- [ ] LF-04 — Finish exposed layers/inclusions and disturbed rims on real shovel/hand digs, including reload and decoration invalidation.
- [ ] LF-05 — Review water margins, broad ground transitions and source/camp approaches together, with noon/weather/reverse views and three seeds.
- [x] LF-06 — Repeat world/save/input/fallback/quality checks, build and isolated performance measurement for the intact-rock repair. 103 logic/asset tests, seven-location controls/touch, three-seed world/save regression, offline checks and a 60-second measured desktop route pass; evidence and limitations are in [the repair record](NSW-ENVIRONMENT-BUILD.md#intact-rock-repair). Repeat for subsequent polish changes.
- [x] LF-07 — The user finished playing and authorized publication. Repair `0b36e4b` plus evidence `5e120b3` were pushed to main; Pages run 38415766124 and public High desktop/touch checks pass. The remaining polish continues separately.

The user-reported repeated saw cuts were prioritised during this pass. Ordinary-rock slicing is removed, closed-volume checks are added, and flat decorative bank/source slabs are removed. Experimental connected surfaces and new dig/bank geometry were inspected and rejected; they are not shipped. LF-01/03/04/05 remain open. Do not claim the unfinished visual work is complete.

### Creek and exposed-ground continuation — 14 October 2026

Branch `codex/nsw-creek-polish`, base `e779054`. The user confirmed the rest of the polish remains due after the rock fix. Continue LF-03/04/05 using the original terrain, creek, digging and controls.

- [x] CP-01 — Use the rendered bed depth for High water margins/refraction; retain the existing cheaper path and actual hydrology. Replace rectangular floating-leaf silhouettes while preserving flow. Delivered with finer advected foam; reflections and storm streaks still fall below the reference. [Evidence](NSW-ENVIRONMENT-BUILD.md#creek-and-exposed-ground-continuation).
- [x] CP-02 — Improve metre-scale soil/wash/litter transitions and exposed cut materials, without obscuring geological clues or adding repeated stamps. Material changes delivered; broad terrain/plant composition remains unfinished.
- [x] CP-03 — Fit selected tree roots to the actual bank and use sparse angular clods/inclusions at real cut lips; no floating rims, invented holes or decoration over finds. Roots and cut detail follow saved terrain and withdraw after removal; this does not complete LF-03/04's bank and spoil volume.
- [x] CP-05 — Shape compound host-rock prototypes with sloping weathered faces and quartz boundaries on one closed surface; retain anchors and use simpler angular chips for small float. All 23 rock prototypes pass closed connected-volume checks. This is asset improvement; continuous site-wide exposures remain LF-01.
- [x] CP-04 — Inspect matched bank/upstream/reverse/kneeling/dig/noon/weather views, then verify saves, controls, Low/touch/fallback, build and publishing. Implementation `09029c6` and evidence `4b7059a` are on main; Pages run 38424011662 succeeded, public model/bundle match and public High desktop/touch checks pass. [Delivery and open visual gates](NSW-ENVIRONMENT-BUILD.md#creek-and-exposed-ground-continuation).

Nineteen final stills, three-seed world/save/fallback checks, 111 logic/asset tests, the 120-module build, NSW desktop/touch and two-region offline checks pass. The isolated 60-second desktop profile remains refresh-capped at about 60 fps, but CPU/GPU time increased; see the delivery record rather than assuming the extra geometry is free. LF-01/03/04/05 and all full reference-quality gates remain open.

### Current correction pass

Execution branch `codex/nsw-environment-fix`, base `aedeba5`. Work through all eight direct-audit areas, preserving the existing world and controllers. These are implementation/review steps, not automatic reference-quality passes. Record new evidence separately in `docs/audits/nsw-fix/`; retain both previous sets unchanged.

- [ ] FIX-01 / V01–02 — Reshape the rock kit into fractured assemblies with irregular enclosed quartz and weathered granite; compose connected low exposures/debris at existing sites and creek margins.
- [x] FIX-02 / V03 — Remove dominant pebble stamps/micro-noise; connect dry soil, wash, litter and partly embedded stones.
- [x] FIX-03 / V04 — Rework tree crown silhouettes, legacy undergrowth shading and clump forms; keep original trunk/obstacle locations.
- [ ] FIX-04 / V05 — Calm repeated ripple structure, improve submerged bed volume and wet margins, retain real flow/flood behavior.
- [x] FIX-05 / V06 — Balance sun/fill/materials and distant contrast at ordinary midday, then check weather/night.
- [ ] FIX-06 / V07 — Add grounded inclusion/root/spoil detail tied to real exposed/dig surfaces, with invalidation as soil changes.
- [ ] FIX-07 / V08 — Inspect all source/camp transitions, clean unobstructed captures, reverse views, three seeds and movement. Re-score honestly; leave remaining visual gaps open.
- [x] FIX-08 — Build, relevant interaction/save/fallback checks, publish owned ready work and verify Pages. No unrelated region art changes.

Correction status: FIX-01 has a rebuilt jointed kit and low connecting pieces, but the large formations/banks are still unconvincing. FIX-04 removes the repeating bright foam and improves the visible bed; margin/reflection balance remains open. FIX-06 adds surface-following stones/crumbs/root tips and restores actual excavated material colours, but spoil volume remains weak. FIX-07 has clean stills, three seeds and a separate normal-input clip; complete motion/approach acceptance remains open. [Delivered changes and remaining gaps](NSW-ENVIRONMENT-BUILD.md#correction-pass-after-the-reference-audit). Checked correction steps do not override the still-open visual rubric: all eight dimensions remain below target.

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

- [x] B1-01 — Create a small reference board with a clearly labelled game target for creek, host rock/quartz, granite, ground, mature trees and shrubs. Keep user references distinct from researched NSW species/geology and from generated concept art, if any is later used.
- [x] B1-02 — Choose and document the New England plant palette and material palette. Include dry/wet soil, pale granite, darker host rock, quartz, basalt and foliage colours under neutral lighting. Use regional reference sources; do not reuse a desert palette by default.
- [ ] B1-03 — Define the first section around `creek.cx(z)`, approximately z=0..28, with camp access and both bank working spaces protected. Record 3 ground-level views in each direction, one kneeling view and one elevated inspection view. Resolve anchors from the save, not hard-coded seed-12345 coordinates.
- [x] B1-04 — Define separate reef and granite close-up scenes at their existing anchors. A white seam must belong to the existing source; do not relocate a reef to decorate the creek screenshot.
- [x] B1-05 — Inventory all protected footprints: camp upgrade extremes, shop, ute route, mine collar, sluice/highbanker, targets, surface finds, crystal/vug sites, excavation patches and existing boulders. Store a reusable placement mask/clearance query, based on those actual objects.
- [x] B1-06 — Specify mesh names, metre scale, pivot/origin, Y-up game result from Blender Z-up, material slots, LOD names and collision-proxy rules for the environment kit. Keep existing tool/crystal contracts intact.
- [x] B1-07 — Record asset-source/licence and generator provenance. Start with authored headless Blender work using the existing installation; use a fresh process and absolute paths. Verify availability at build time rather than assuming the old MCP connection works.

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
- [ ] B2-02 — Author RK-03/04. Give granite and creek stones their own shape language; show scale beside the existing shovel/player height. Check seams and normals before export. **Reopened by V02/V05:** assets exist, but pillow-like granite stacks and small pale faceted creek stones do not yet satisfy the intended in-game forms.
- [ ] B2-03 — Author VG-01/02/03 prototypes. Review backlit leaves, the underside of canopies and distant silhouettes. Avoid dense sheets, detached branches and uniformly black foliage.
- [ ] B2-04 — Author DT-01 and MT-01/02 with close-view scale references. Use material roughness/normal detail to support the meshes; keep minerals readable without excessive speckle.
- [x] B2-05 — Add an optional New England environment asset manifest through the existing loader. Load failures must preserve a playable fallback and must not discard successful tool/find loads.
- [x] B2-06 — Validate GLBs in game: bounds, origin, scale, material colour spaces, normal direction, transparency, shader variants, instancing compatibility and offline paths. Include missing/corrupt asset simulation.
- [x] B2-07 — Supply initial reduced versions and share textures/materials. Record file bytes, texture dimensions and GPU-memory estimate. Do not freeze arbitrary triangle limits until representative in-game quality is visible.

**Gate:** the first kit looks coherent inside the game, with normal lighting, tools visible and photo filters disabled. New geological formations must already look better than their [baseline](audits/nsw-environment/high-reef.jpg).

## B3 — Compose the first playable section

- [x] B3-01 — Introduce a New England environment profile/recipe, using an independent decoration seed. Keep global default rendering unchanged elsewhere. Isolate orchestration from `main.js` rather than growing another controller there.
- [x] B3-02 — Replace selected visible scenery in the first section with the new kit. Retain source objects/IDs where used by old regression data; explicitly hide replaced rendering so it is not doubled.
- [ ] B3-03 — Compose large forms first: bank exposures, a small number of embedded rock groups, mature trees and open working margins. Preserve the original terrain/water surface and crossings.
- [ ] B3-04 — Add medium forms: shrubs, grasses, gravel bars, small stones and exposed roots. Placement follows slope, moisture and parent formations, with deliberate empty areas. **Reopened by V03/V04:** placement exists, but convincing parent-related groups, roots and patch transitions remain unfinished.
- [ ] B3-05 — Finish soil, gravel, litter and rock transitions. Correct floating bases, texture scale, tiling, hard colour patches and close-up depth. No permanent bank skin across diggable ground unless it updates with the same surface.
- [ ] B3-06 — Integrate camp's existing paths and surroundings. Check the largest existing camp upgrades and ute clearance, not just the empty starter camp. **Reopened by V08:** upgrade/clearance checks pass; finished visual surroundings and coherent transitions are not established by those checks.
- [ ] B3-07 — Compose reef/granite companion views at their original positions using the same kit and lighting. Keep geological clues distinct from rewards; barren areas still look natural. **Reopened by V02:** replaced models still follow disconnected scatter and obvious stacked arrangements.
- [ ] B3-08 — Walk both banks and inspect from the opposite side; kneel, point a tool at the ground and inspect small finds. Capture a 30–60 second ordinary-play movement clip and the matched stills.
- [ ] B3-09 — Review the complete scene against Photos 1, 3 and 5 and the rubric below. Record visual shortcomings and revise the kit/composition before wider rollout. Present the concrete results to the user at the milestone; their feedback can change the next stage.

**Gate:** bank, water, rock, vegetation and light form one convincing environment. A material swatch, isolated rock model or flattering camera does not satisfy this stage.

## B4 — Lighting, water and atmosphere

- [x] B4-01 — Tune the actual day/night/weather update paths: sun/fill ratio, exposure, sky/ground colour and fog. Preserve the existing day clock and weather effects; validate neutral noon before dramatic dawn.
- [ ] B4-02 — Replace the unsupported soft-shadow configuration with a supported, visually tested treatment. Stabilise resolution/filtering at ordinary movement speed. Check leaf animation in shadow maps and contact beneath roots/rocks.
- [ ] B4-03 — Evaluate contact shading with authored crevice detail and, if still useful, a bounded AO pass. Check screen edges, thin foliage, water and camera motion. Add a postprocess pipeline only if its measured visual benefit justifies the extra integration; preserve the held-tool overlay and photo capture.
- [ ] B4-04 — Improve water-bed composition, shallow transparency, wet stone edges, ripple scales and foam placement using existing depth/velocity data. Verify the water still communicates shallow working areas and high-flow hazards. **Reopened by V05:** richer water renders, but repeated ripples, a pale margin and weak shallow-bed volume remain visible.
- [ ] B4-05 — Prototype actual scene-aware water reflection/refraction against the sloping creek. Compare segmented reflection, screen-space sampling and a cheaper approximate fallback. Select and document one after inspecting banks/trees, off-screen objects, close camera angles and moving water; do not assume one flat reflector fits the whole river.
- [x] B4-06 — Integrate the chosen water method into the existing update/render order, including correct resize and disposal. Avoid reflected HUD/tools, duplicated highlights, transparent sorting artifacts and artificial foam at dry edges.
- [ ] B4-07 — Review noon, dawn, dusk, night/headlamp, UV, rain, peak flood and drying ground. Keep useful night darkness and inspection readability; do not bake one sunny setup into everything.
- [ ] B4-08 — Establish distant terrain/tree grouping and atmospheric depth; avoid fog that conceals missing art or removes useful nearby landmarks.

**Gate:** the scene remains convincing while moving and changing conditions. The expensive effects must add a visible benefit and have a controlled fallback, but the High-quality target remains intact.

## B5 — Apply the standard across New England

- [ ] B5-01 — Extend the creek treatment upstream/downstream: vary bends, shallows, exposed banks, gravel and vegetation rather than repeating the first scene as a stamp.
- [ ] B5-02 — Finish the existing quartz reef, slope float and wash approach; preserve the lead and Lucky Strike access. Improve the collar's terrain contact and nearby work props.
- [ ] B5-03 — Finish granite pavements, tors, existing veins and vug/pocket approaches; validate kneeling proximity and splittable boulders separately from decorative tors.
- [ ] B5-04 — Complete RK-05/06 and integrate basalt, rhyolite, fossil shale and legacy opal workings. Maintain distinctive forms and source-related debris. Preserve every existing specimen/recovery interaction.
- [ ] B5-05 — Extend regional plants to woodland/terrace/open-slope patches with natural transitions. Refine the two existing landscape landmarks; avoid inventing more attractions.
- [x] B5-06 — Align ground/dig materials: exposed soil and wash follow actual removed depth; nearby dressing is invalidated when excavation removes its support. Check the seam between the main heightfield and fine hand-work patches. **Technical alignment only:** rooted/layered close-up faces and believable spoil are still pending in V07, B2-04 and B3-05; this does not mark those visual requirements complete.
- [ ] B5-07 — Finish camp surroundings for swag, tent, caravan, shed and full facilities. Keep display specimens and approaches readable. Review mine entrance/interior lighting continuity without expanding mine scope.
- [ ] B5-08 — Audit every zone from front/reverse approaches, the river, camp and boundary. Remove abrupt quality transitions, floating pieces, repeated hero silhouettes, inaccessible pockets and vegetation through working surfaces.
- [ ] B5-09 — Repeat representative views on seeds `1`, `12345` and `798887`, plus a populated legacy save fixture. Seed 12345 cannot be the only good-looking layout.

**Gate:** all rows in the audit's whole-map treatment table have before/after evidence and verified access. Partial rollout must be described as partial.

## B6 — Quality settings and performance

Keep the existing Low/Medium/High/Ultra selector as the primary control. Extend what the presets actually change; retain useful advanced settings. High-quality meshes and composition are authored once. Lower settings use reduced rendering of that world, not different geology, different routes or different finds.

**Sequencing update — 14 October 2026:** continue measurement, compatibility checks and fixes needed to make the ongoing art build usable. The systematic CPU/GPU optimisation work in B6-04/05/06/09 is deferred to [B9](#b9--post-sign-off-optimisation) after the user signs off the finished environment. B6 defines the quality/scaling constraints; B9 records the optimisation work and acceptance evidence. Publishing an incremental build does not start that phase.

| Setting | High / Ultra direction | Medium / Low scaling | Invariant |
| --- | --- | --- | --- |
| Rock detail | Full near shapes and material detail | Earlier LOD and simpler small detail | Major silhouette, physical footprint, interactive targets |
| Vegetation | Richer near crowns and ground layers | Fewer small decorative plants, simpler distant crowns | Trunks/obstacles and protected access |
| Shadows/contact | Better coverage/filtering; optional AO | Lower resolution/range, cheaper contact detail; AO optional/off | Readable terrain and no blacked-out work surfaces |
| Water | Chosen richer reflection/refraction treatment | Lower update rate/resolution or cheaper fallback | River height, depth, flow, working zones and flood state |
| Ground | Full nearby detail, stable distant filtering | Reduced material/detail cost | Actual dug surface and layer boundaries |
| Resolution/AA | Crisp image; measured upper cap | Existing scalable resolution and AA choice | UI legibility, especially small finds |
| Atmosphere/effects | Full restrained effects | Reduced particles/expensive passes | Time, weather, navigation visibility |

- [x] B6-01 — Record a real desktop hardware/browser baseline at 1920 x 1080, with a fixed route, warm-up and ten-minute run. Log median/p95 frame time, GPU/CPU limitation, memory trend and full-frame render passes. The current SwiftShader counts cannot substitute for this.
- [ ] B6-02 — Define the supported baseline after hardware is recorded. Working goals: smooth 60 fps desktop High where feasible, and a stable 30 fps or better on representative recent phones using a suitable preset. These are targets, not existing measurements or universal guarantees; Ultra can remain a higher-end option.
- [x] B6-03 — Implement explicit environment quality values and safe defaults for old settings. Separate rendering detail from the `shadows === 'off'` world-generation shortcut. Make live updates work where possible; when restart is necessary, save first and label it accurately.
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

- [x] B7-01 — Run `npm test` and `npm run build`; add focused tests only for new meaningful logic (placement invariants, quality scaling, terrain-update mapping, save compatibility).
- [x] B7-02 — Run the relevant existing browser suites below and record exactly which cases ran. Adapt old scenery hashes narrowly if rendering changes intentionally; preserve data/placement invariants rather than deleting checks.
- [ ] B7-03 — Complete the matrix's interaction and save cases using disposable saves. Do not clear user browser storage or claim camera teleportation as a walked route.
- [x] B7-04 — Inspect new asset load failures and built offline loading; check relative URLs, cache update behaviour and stale GLB versions.
- [ ] B7-05 — Inspect page, console and shader errors. Resolve warnings touched by the work; distinguish old unrelated warnings from new failures.
- [x] B7-06 — Review the always-on topo map and travel screen at desktop/touch sizes. Baseline 720p map buttons sit at the lower viewport edge: verify scrolling/closing/reopening remains usable; do not replace the map UI.
- [x] B7-07 — Confirm no developer/roadmap prose, unwanted circles or instructional overlays were added to player screens.

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

These release items apply to the first delivery and must be repeated for later milestones. Their completion does not close the open art/whole-map gates. Publication evidence is in [the delivery record](NSW-ENVIRONMENT-BUILD.md#publication).

- [ ] B8-01 — Review diff against scope; remove abandoned experiments and leave any optional unbuilt work explicitly unchecked. Check that completed visuals satisfy the rubric.
- [x] B8-02 — Update audit/build records with delivered tasks, images, actual tests, hardware results and limitations. Retain this plan as the source of unfinished work.
- [x] B8-03 — Recheck worktrees, claims, main, remote commits and active servers; fetch if available. Preserve unfinished work and never force-push.
- [x] B8-04 — Commit owned completed work, integrate ready project changes safely and push main under the standing user instruction. Avoid hot-reloading an actively played user checkout.
- [x] B8-05 — Verify the matching GitHub Pages deployment and a public-game smoke check, including the new assets and controls. Record commit/run URL and any pending device checks.
- [x] B8-06 — Release the coordination claim and provide a concise handoff with what looks different, screenshots, checks and next unfinished milestone.

## B9 — Post-sign-off optimisation

**Deferred until the user signs off the completed New England environment and gameplay.** This section records future work only; adding it does not start optimisation or close any unfinished polish item. The aim is to keep the approved polish while reducing and streamlining GPU and CPU work, improving frame-time consistency and limiting memory/load spikes. High/Ultra remain the visual benchmark; phone presets provide scaling.

Preserve the signed-off silhouettes, composition, near detail, plant coverage, materials, water, lighting and readable small finds. Compare at the **same preset, resolution and scene conditions**. Lowering resolution, removing scenery or silently downgrading effects does not count as an optimisation win. Preserve world generation, collision, saves, recovery outcomes, difficulty, hydrology and original controls. If a proposed change visibly compromises the approved result, reject it or return that specific trade-off for review.

### Checklist and order

- [ ] B9-01 — **Record sign-off and freeze the baseline.** Link the user's acceptance, exact commit, settings, assets, matched screenshots and movement clips. Reuse the B7 matrix and seeds `1`, `12345`, `798887`, including a populated legacy save. Keep a reproducible baseline build for comparisons and rollback; the current below-reference build is not the signed-off baseline.
- [ ] B9-02 — **Profile before choosing changes.** Capture CPU traces and GPU timings where supported, including main view, shadows, water reflection/refraction and tool rendering. Rank measured costs: terrain submission, vegetation/transparent overdraw, material/shader work, simulation, raycasts, placement queries, UI and allocations/garbage collection. Record unavailable counters explicitly. Set numerical improvement targets from that baseline rather than inventing a promised percentage now.
- [ ] B9-03 — **Remove redundant CPU work.** Reuse buffers/temporary objects; cache stable queries; update unchanged geometry, bounds, matrices, UI and dressing only when needed. Use local dirty regions for digging and spatial queries for nearby work. Consider workers only where measured savings exceed transfer/synchronisation cost. Preserve responsive controls and deterministic simulation; do not stop off-screen hydrology or recovery work merely because it is invisible.
- [ ] B9-04 — **Reduce unnecessary GPU submission.** Profile terrain chunks, view/shadow/reflection culling and spatial instance batches; share geometry/materials and avoid duplicate passes. Keep the original terrain and collision data authoritative, including saved digs and excavation overlays. Do not build one oversized batch that defeats useful culling, introduce seams or make meaningful obstacles disappear.
- [ ] B9-05 — **Reduce per-pixel and asset cost without losing the look.** Address foliage overdraw, redundant shader/texture work, shadow coverage and water targets/update scheduling. Use distance/screen-size LOD with stable transitions where it preserves visible form. Evaluate mesh/texture compression and mipmaps against mineral detail, colour, seams and download/decode cost. Retain close-up silhouettes, foliage density and approved lighting/water; inspect motion for popping, shimmer and stale reflections.
- [ ] B9-06 — **Streamline memory and loading.** Reuse and dispose of geometry, materials, textures and render targets correctly. Bound caches and background work; inspect resize, orientation, travel, reload, excavation and long sessions for growth. Measure cold and cached loading, shader-compilation stalls and main-thread pauses. Retain missing-asset fallbacks, relative URLs, offline play and old saves.
- [ ] B9-07 — **Tune the existing presets after the full-quality path.** Verify Low/Medium/High/Ultra and individual options on recorded desktop hardware and available recent, non-current-year iPhone/Android devices. Record sustained behaviour and thermal throttling. Scaling must preserve the same world, tools and outcomes; touch emulation is not physical-device evidence. Link results back to B6-02/07/08/09.
- [ ] B9-08 — **Prove each saving and retain the polish.** Make small, independently reversible changes; compare each against the baseline and keep only demonstrated gains. Repeat matched stills, real-input movement clips and relevant B7 controls/save/recovery/offline checks. Recheck other regions when shared code changes. Reject visual regressions, input lag, delayed dig feedback and performance gains that merely shift a worse bottleneck elsewhere.
- [ ] B9-09 — **Close out with measured results.** Record before/after CPU/GPU/frame-time distributions, memory/load behaviour, tested hardware and remaining limits. Review the final visuals against the signed-off build, then run the applicable checks, integrate, publish and verify Pages through B8. Mark this phase complete only when both the performance improvement and visual/gameplay parity are evidenced.

### Measurement and acceptance

Use the same hardware/browser, drawing-buffer resolution, save, route, weather and time of day before and after. Include creek/water views, dense woodland, reef/granite, camp, excavation and travel/reload. Separate cold-start/loading measurements from warmed gameplay. Run at least three comparable ten-minute routes after warm-up; report median, p95 and p99 frame times, long frames, CPU/main-thread work, GPU time where available, draw calls, submitted triangles and memory trend. Record background-load/thermal conditions and timer limitations. A refresh-capped 60 fps reading alone does not prove reduced CPU/GPU load, and triangle counts are not a substitute for timings.

**Exit gate:** CPU and GPU costs are lower in their targeted workloads beyond measured run-to-run noise, with smoother or unchanged frame pacing and no material regression elsewhere. The signed-off visuals, motion, gameplay, saves and controls remain intact. Any unresolved trade-off or unavailable device check stays explicit. Keep the evidence and conclusions with the build record; do not check off optimisation solely because the game still builds or the FPS counter reaches its cap.

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
| 13 October 2026 | Baseline audit and complete action/build specification | AUD-01..07 complete. 19 inspected screenshots, `baseline.json`, reproducible capture script, 82 passing logic checks and production build. High-quality target explicitly takes precedence over mobile scaling. All B1..B8 tasks remained pending at that point. |
| 13 October 2026 | First environment implementation on `codex/nsw-environment-build`, base `dfa9a09` | Authored 42-asset kit; original-data-preserving regional adapters; first creek dressing; ground/excavation, light and scene water. [Delivery/evidence](NSW-ENVIRONMENT-BUILD.md). Checked task IDs are supported there; first-scene art acceptance and full-map B5 remain open. |
| 13 October 2026 | User-requested direct reference comparison, audited at `c9e5692` | Re-inspected all six original references against published game screenshots. [V01..V08 findings and acceptance evidence](NSW-ENVIRONMENT-BUILD.md#direct-reference-comparison-audit). Earlier grounding/vegetation/water/close-up scores of 2 withdrawn; all eight still-image dimensions remain below target, temporal quality unestablished. Reopened B2-02, B3-04/06/07 and B4-04. No game changes or new captures in this audit. |
| 13 October 2026 | Correction pass `6ba554e` on `codex/nsw-environment-fix`, base `aedeba5` | Corrections across V01..V08, 42 revised assets, original-data-preserving composition/detail, plant/foam fixes and actual cut-material colour. [Current evidence and unfinished art](NSW-ENVIRONMENT-BUILD.md#correction-pass-after-the-reference-audit). All eight still-image dimensions remain below reference; completed corrective work does not close those gates. |
| 14 October 2026 | Intact-rock repair `0b36e4b`, then creek continuation `09029c6` | Published repaired rock topology, compound host shapes, grounded roots, water and cut detail. 111 current tests, matched evidence, world/save/fallback/desktop/touch/offline checks and public Pages verification pass. [Continuation evidence](NSW-ENVIRONMENT-BUILD.md#creek-and-exposed-ground-continuation). LF-01/03/04/05 and whole-scene acceptance remain open. |
| 14 October 2026 | User-requested optimisation planning, branch `codex/nsw-optimisation-plan`, base `63fb4df` | Added B9-01..09 for post-sign-off CPU/GPU optimisation, with fixed visual/gameplay requirements, profiling, measurable savings and regression evidence. Linked deferred B6 optimisation tasks to that phase. Documentation only; no optimisation or game changes performed. |

**Next build task:** V01/V02 remain first: compose the large bank/rock forms and connected reef/granite assemblies at existing sites. The correction improves the kit, debris, plants, foam and cut materials, but still does not meet the reference in any complete rubric dimension. Do not equate wider dressing coverage or more triangles with completed composition. Finish the first-scene art gate before further B5 rollout; then resolve broad ground transitions, reflection/margins and excavation/spoil volume. Hardware results and remaining coverage are in the delivery record.
