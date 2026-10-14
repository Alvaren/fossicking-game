# New England environment: first implementation

13 October 2026. Branch `codex/nsw-environment-build`, base `dfa9a09`, implementation commit `de0d1e3`. This is the first delivery against the [build checklist](NSW-ENVIRONMENT-BUILD-PLAN.md), not completion of the whole-map visual standard. The supplied references remain the target; phone scaling does not set the art ceiling.

## Delivered

- A deterministic, original Blender kit: 42 named assets, 62,336 prototype triangles, 3,808,508 GLB bytes. Connected gum crowns, shrubs, tussocks/sedges, fractured host rock with enclosed quartz seams, granite corestones, cobbles, basalt/rhyolite/slabs and branch/root prototypes. Generator and bounds manifest are checked in together.
- New England uses the kit for existing tree, grass and scenery-rock rendering. Original instance transforms, source objects, terrain and collision data remain intact. Independent small-scenery composition covers the first creek section, z=0..28 with a short margin, using actual creek coordinates rather than a seed-specific layout.
- Plant/stone placement protects camp, sources, finds, targets, boulders, excavation overlays and equipment. Nearby dressing disappears when digging invalidates its ground contact. Nothing new is solid or changes recovery probabilities.
- Quieter grus/wash/organic ground colours, matching distant ground and matching fine excavation patches. Exposed cut material still follows the actual removed depth. Granite and host/quartz retain distinct mineral texture roles.
- New England daylight/fog treatment and scene-aware water at High/Ultra. Environment detail and Water detail are independent advanced settings; old stored presets receive defaults. Low/Medium use the original cheaper water treatment and reduced foliage/dressing.
- Missing/corrupt optional art retains the original scenery and does not break the separate tool/find loader. No dependencies, saved fields, controller or terrain-generation rules were replaced.

The kit/rendering changes span New England, but **composed bank dressing is limited to the first section**. Young trees/root prototypes are not a claim that all intended plantings have been placed. The final quartz-float/spoil asset sets, woodland transitions, full camp surrounds and other source approaches remain in B5.

## Water and rendering decisions

A local tangent-plane reflection follows the existing creek profile at the camera. Its contribution fades where the real surface departs from that plane by roughly 3.5–13 cm and beyond the local reach. This avoids claiming a single flat mirror fits the whole sloping creek. Opaque-scene colour/depth provides refraction; foreground-depth rejection reduces bank bleeding. The original hydrology, velocity/depth/foam data and cheaper reflection remain authoritative/fallback.

The optional treatment adds two world passes. Targets are capped at 768 pixels per dimension and resized for orientation/photo captures; reflected HUD and held tools are excluded. It currently captures while above the creek level even when the river is off screen: tighter visibility scheduling remains an optimisation task. At the maximum square size, two RGBA16F colour targets alone are about 9 MiB; depth buffers and driver overhead are additional. This is a storage estimate, not measured total GPU residency. No AO pass was added.

The shared renderer now explicitly requests supported PCF shadows instead of the removed soft-PCF constant which Three already fell back from. Normal rendering must allocate a directional shadow map before reflection capture, including after switching shadows on. This was checked with live option changes. Original weather, night, held tools and photo render ordering remain in use.

## Evidence and reproduction

Before: [baseline report and images](audits/nsw-environment/baseline.json). After: [capture report](audits/nsw-build/build.json), [upstream](audits/nsw-build/high-upstream.jpg), [opposite bank](audits/nsw-build/high-reverse.jpg), [kneeling](audits/nsw-build/high-kneel.jpg), [reef](audits/nsw-build/high-reef.jpg), [granite](audits/nsw-build/high-granite.jpg), [Low](audits/nsw-build/low-creek.jpg), [touch layout](audits/nsw-build/touch-medium-creek.jpg). The ordinary-play [clip](audits/nsw-build/walkthrough.webm) uses actual pointer lock, keyboard and mouse after one initial placement. Still captures use direct camera relocation and must not be described as walked routes.

Run from the Codex worktree with its strict 5191 preview. Set `PLAYWRIGHT_MODULE` to the installed Playwright package if needed. `tests/newengland-suite.mjs` selects the available Windows D3D11 GPU for existing suites; `NSW_SOFTWARE=1` retains Chromium's software path. No dependency is added.

```powershell
npm test
npm run build
node tests/newengland-suite.mjs controls.game.mjs newengland.game.mjs
$env:ROCK_CASES='[["new-england",false],["new-england",true]]'
$env:LAND_CASES='[["new-england",false],["new-england",true]]'
node tests/newengland-suite.mjs rocks.game.mjs landscape.game.mjs environment.offline.mjs shelter.game.mjs facilities.game.mjs maptravel.game.mjs
$env:CAPTURE_MODES='high,low,touch-medium'
$env:CAPTURE_VIEWS='upstream,downstream,reverse,kneel,creek,bank,reef,granite,basalt,rhyolite,fossil,opal,dawn,storm'
node docs/audits/nsw-build/capture.mjs
$env:AUDIT_SUPPLEMENT='1'
node docs/audits/nsw-build/capture.mjs
Remove-Item Env:AUDIT_SUPPLEMENT
node docs/audits/nsw-build/profile.mjs
```

Run the profile alone after other graphics checks finish. It records a separate normal-input clip and then a ten-minute scripted camera route after 15 seconds warm-up. The camera benchmark is not evidence of traversal. All contexts use disposable saves; the user's storage is untouched.

## Verification record

- 84 logic tests pass; production build passes with 117 modules.
- Original normal-URL pointer lock/look, simultaneous movement/tool switching, wheel/number keys, menu unlock/relock, rejected-lock recovery and tool closing pass across all seven destinations. Original touch toolbar/brief Use taps/pan/map closing pass. The harness now waits for delivered pointer-lock events and allows ordinary play time between lock requests to respect Chromium's request-rate limit; game input was not changed.
- [Three-seed regression](audits/nsw-build/regression.json): seeds 1, 12345 and 798887 preserve physical/saved world hashes across asset loading and live environment-quality changes. Real trowel input changes soil; existing save/reload preserves those exact millimetres and cash. Missing/corrupt kit cases pass. Live shadows/water and portrait target-size checks pass.
- Existing rock tests pass for New England desktop/touch, retaining the original world-layout hash. Existing landscape checks pass for both, including protection, movement/stop/pause, rain, camp and reload.
- Built offline reload passes for New England desktop (including an explicit cache/load assertion for the new GLB) and Northeast Tasmania touch. Desktop/touch shelter progression from swag through shed, capacity/cash, model switching, sleep/reload and full facilities pass. Desktop/touch local map, selection/cancel, $0 round trip, topography and absent helper guides pass.
- Final capture: 22 High/Low/emulated-touch stills, including dawn, flood, mine approach, digging, headlamp night and map; no recorded page/console/shader errors. Existing Clock/toNonIndexed warnings remain. The High capture contexts also log an ANGLE X4122 constant-precision warning; the program links and renders, but its driver-specific origin is not yet isolated. Do not report a warning-free run.
- The first automated trowel attempt after a viewport change aimed away from the patch; the harness now positions the pointer before kneeling, fixes the initial view and waits for actual soil removal. The final three-seed run passes without altering the game controller.
- The 43-second ordinary-input route crossed the creek and walked both sides (signed bank offsets in the report), then returned towards camp. Representative extracted video frames were inspected; the full temporal-art gate remains open. Representative control screenshots in all other destinations were inspected; their regional art recipes were not changed.
- Publication status is kept in the GitHub deployment and coordination handoff.

## Desktop measurement

[Full report](audits/nsw-build/performance.json): implementation `de0d1e3`, RTX 3090 / driver 32.0.15.9186, Ryzen 9 5950X, Chromium 151.0.7922.34 using ANGLE D3D11, actual 1920×1080 drawing buffer, High. After 15 seconds warm-up, the scripted first-section route ran for 600 seconds / 36,013 frames with no recorded page/console/GL errors.

| Measurement | Median | 95th percentile |
| --- | --- | --- |
| Frame interval | 16.7 ms (about 60 fps, refresh capped) | 16.7 ms |
| CPU frame callback | 7.4 ms | 9.5 ms |
| GPU timer query | 6.34 ms | 8.84 ms |

The GPU timer has 1,201 samples. Full-frame medians are 815 submitted calls / 10,701,633 triangles, including additional water/shadow passes and held tools. These differ intentionally from the still-capture report's single explicit world-render counters. Both CPU and GPU fit the measured refresh interval on this machine; that does not identify the limiting part on slower hardware or establish a general supported minimum.

Sampled JS heap ranged 104–187 MiB, ending near 120 MiB; profiler arrays themselves consume some of that memory. Renderer object counts rose from 610 geometries / 32 textures to 763 / 37 as the route ran, with no further increase in the final approximately 165 seconds. This is not a measurement of GPU bytes or a complete leak certification. Repeated long travel sessions and physical-phone thermal/performance measurements remain pending.

## Direct reference comparison audit

13 October 2026, requested after publication. Audited game: implementation `de0d1e3`, screenshots/evidence `2e98aeb`, published documentation `c9e5692`. All six original user images were inspected directly against the game captures below, including the native 1080p walkthrough still. **The game remains substantially short of the references.** The main gap is landscape composition, rock form and a coherent treatment of light/materials; adding texture resolution or more scattered objects will not close it.

The previous review gave grounding, nearby vegetation, water and close-up work a **2 (meets target)**. Those ratings were too generous and are withdrawn. They conflated implemented features and improvement over the baseline with meeting the supplied visual target. Actual reflections, more leaf geometry and a matching excavation colour are useful advances, but do not establish reference quality. The earlier statements about convincing granite joint faces and completed creek composition were also overstated.

This is an audit of the existing captures, not a new art build. The original user photos are identified below rather than republished as game assets. Their engine, hardware, frame rate and rendering method are unknown. Their portrait framing, elevated/third-person cameras and occasional depth of field differ from our first-person screenshots; those differences prevent exact density/scale comparisons, but do not explain away the visible gaps. High is the current evidence; Ultra has not been separately certified. Phone quality settings do not lower this target.

### All six references and their closest game evidence

| Reference | What its environment demonstrates | Closest actual game evidence | Finding |
| --- | --- | --- | --- |
| Photo 1: creek bank | Rounded submerged stones with volume; an irregular exposed bank; grass rooted at its lip; reflections that still leave the shallow bed readable; distant canopy depth | [Bank](audits/nsw-build/high-bank.jpg), [upstream](audits/nsw-build/high-upstream.jpg), [reverse](audits/nsw-build/high-reverse.jpg) | Our bank is a smooth, pebble-patterned slope. Small pale faceted stones and regular ripples dominate. The reference has a much stronger bank/bed structure and balance between reflection and transparency. |
| Photo 2: prospecting slope and holes | Large jointed exposure embedded in the slope; irregular vein; disturbed pits/spoil; clustered grasses and shrubs with contact shadows | [Reef](audits/nsw-build/high-reef.jpg), [dig](audits/nsw-build/high-dig.jpg) | Our reef is isolated wedges on broad empty soil; the dug patch is a smooth bowl without convincing disturbed spoil. Third-person characters and helper rings are not part of the requested target. |
| Photo 3: wide valley | Large outcrops, medium rock groups and small debris form a clear hierarchy; vegetation follows those groups; boulders visibly break up the creek | [Upstream](audits/nsw-build/high-upstream.jpg), [reverse](audits/nsw-build/high-reverse.jpg), [basalt slope](audits/nsw-build/high-basalt.jpg) | Our channel reads as an even trough between smooth slopes. There are many individual assets but few connected landform/rock groups. This is a composition comparison, not a camera-matched density measurement. |
| Photo 4: slope below the seam | A readable connection from exposed host/vein to angular fragments and smaller debris downslope; partial burial and irregular soil patches | [Reef](audits/nsw-build/high-reef.jpg), [granite approach](audits/nsw-build/high-granite.jpg) | Small stones are present, but the source-to-slope relationship is weak. The scatter does not convincingly explain where the debris came from. |
| Photo 5: long quartz-bearing outcrop | One coherent fractured formation; deep joints; variable, chipped quartz inside the host; buried base and associated rubble | [Reef](audits/nsw-build/high-reef.jpg) | Our foreground rock reads as a faceted wedge crossed by a clean white band. Other rocks sit separately. Host plus quartz is implemented, but the formation and fracture character are below target. |
| Photo 6: soil cutaway | Grass/root mat, branching roots, embedded stones, material depth and a broken spoil rim | [Kneeling surface](audits/nsw-build/high-kneel.jpg), [dug ground](audits/nsw-build/high-dig.jpg) | Our pebbles mostly read as a surface print; the hole lacks exposed material structure. Transfer that sense of depth to actual bank/dig faces. A diagram-style deep cutaway, its labels and a new excavation engine are outside this slice. |

### Gaps, priorities and acceptance evidence

**P0 means the first scene cannot be accepted with the gap unresolved. P1 follows once that scene is convincing, before whole-map acceptance.** IDs V01..V08 refine the existing build tasks; they do not authorize extra locations or a replacement game system.

| ID / priority | Visible shortfall and required work | Evidence needed to close it | Existing tasks |
| --- | --- | --- | --- |
| V01 / P0 — Large forms and composition | [Upstream/reverse](audits/nsw-build/high-reverse.jpg) show an even channel, smooth banks and thin dressing beside largely empty slopes. Establish a few connected bank/rock groups and deliberate foreground, middle-distance and background masses before adding small scatter. Fit the original terrain, crossings and source positions. | Ordinary midday views in both directions and from both banks show connected forms and useful open working ground. An elevated inspection confirms the arrangement also works outside the chosen camera. No new invisible collision or dig-surface mismatch. | B1-03, B3-03, B3-09 |
| V02 / P0 — Rock formations and vein shape | [Reef](audits/nsw-build/high-reef.jpg): separate polyhedral rocks and a clean white stripe. [Granite](audits/nsw-build/high-granite.jpg): rounded box/pillow shapes in short stacks, with fine speckle overwhelming broad form. Build coherent fractured host assemblies, irregular quartz thickness/breaks and less regular jointed granite groups with buried bases. The references demonstrate form quality, not a granite-specific geology specification. | Front, side, reverse and kneeling views read as an exposed formation instead of a collection of props. Joints have depth; quartz stays inside fractures; granite retains different weathering/form from host rock. Original anchors, working faces and collision envelopes still agree. | B2-01/02/04, B3-07 |
| V03 / P0 — Ground and contact | [Kneel](audits/nsw-build/high-kneel.jpg) has conspicuous repeated pebble shapes; soil micro-noise is stronger than meaningful medium-scale variation. Rocks/plants often appear placed on that surface. Reduce repetition and contrast in fine material detail; establish local grus, wash, litter and partly embedded fragments associated with their parent features. | At standing and kneeling distances, soil supports the larger forms without a dominant stamp pattern. Bases visibly meet ground; loose fragments have shape/contact; the main/fine dig surfaces still join through actual excavation. | B2-04, B3-05, B5-06 technical foundation |
| V04 / P0 — Vegetation | [1080p view](audits/nsw-build/high-1080-walk.jpg): similar upward fan-shaped crowns and mottled trunks repeat; old shrubs are nearly black against pale new trees; sedges expose stiff broad triangles. Refine branching/crown masses, age/silhouette variation, leaf/shrub shading and grass clump edges. Compose patches around moisture, shade and rocks, retaining open ground and the NSW palette. | Normal and backlit views have coherent foliage brightness, distinct tree silhouettes and believable clumps, without blanket density. Ground-level and reverse views do not expose a wall of repeated fans or black shrub cutouts. Motion/LOD needs separate inspection. | B2-03, B3-04, B4-02, B5-05 |
| V05 / P0 — Water and bed | [Bank](audits/nsw-build/high-bank.jpg): real reflection is present, but the water is a broad bright sheet with dense regular ripples, a pale margin and a largely flat patterned bed. Compose selected larger rounded bed stones and wet edges, balance reflected scene/bed visibility by angle and depth, and vary visible surface disturbance around existing flow/obstacles. | Photo-1-like shallow viewing conditions reveal stone volume through the water; looking along the creek still gives coherent reflections. Ripples no longer dominate as a repeated stripe pattern. Moving, reverse-angle and flood checks show no new edge/discontinuity artifacts or false flow cues. | B2-02, B4-04/05/06/07 |
| V06 / P0 — Lighting, palette and depth | Bright, rather uniform grey-tan ground, near-black shrubs and pale busy crowns do not yet form a cohesive image. Contact depth and separation of near/far masses are weaker than the references. Tune material response, sun/fill, shadow contact and distance contrast together after large forms are established. A blanket darkening/AO pass or photographic blur cannot supply missing geometry. | Ordinary midday scenes have readable lit/shaded shapes, grounded objects and quieter distant contrast. Inspection surfaces remain usable. The same assets hold together in dawn/night/rain without relying on a dramatic showcase angle. | B4-01/02/03/07/08 |
| V07 / P1 — Excavation and material depth | [Dig](audits/nsw-build/high-dig.jpg): smooth depression, sparse debris and surface-pattern pebbles. Photo 6's root mat/inclusions/spoil are not represented convincingly. Improve the visible banks and dug margins using geometry/material detail that follows the existing removed surface. | A real hand-dug patch, its rim and any exposed bank show material depth and disturbed fragments; roots/stones do not float after excavation or persist across the removed face. Save/reload preserves the same worked surface. No fixed decorative wall conceals a diggable surface. | B2-04, B3-05, B5-06/08 |
| V08 / P1 — Consistency and review coverage | New creek dressing sits beside legacy black shrubs, sparse source areas and unfinished camp transitions. Several location captures have discovery toasts obscuring the subject because the capture moves between sites quickly. Improve these transitions and evidence before calling the whole map finished. | Clean repeat captures after transient messages expire, while retaining ordinary tools/HUD; complete approach/reverse coverage, three-seed art review and populated-save tour. Full movement review checks popping/shimmer; stills and a passing frame-time test cannot certify this. | B3-06/08/09, B5-07/08/09, B7-03 |

### Corrected visual rubric

Scale from the plan: 0 missing/broken, 1 visibly below target, 2 meets target, 3 exceeds target. These are qualitative review judgments, not percentages of completion.

| Dimension | Revised result | Principal evidence |
| --- | --- | --- |
| Geological form | **1 — below target** | Separate reef wedges, clean seam band, pillow-like granite stacks |
| Grounding | **1 — below target; previous 2 withdrawn** | Repeated surface stamps and weak embedded/contact treatment |
| Vegetation | **1 — below target; previous 2 withdrawn** | Repeated fan crowns, black legacy shrubs, rigid sedges |
| Water | **1 — below target; previous 2 withdrawn** | Dominant regular ripple pattern, pale margin, weak bed volume |
| Lighting | **1 — below target** | Inconsistent plant values, weak cohesive contact/distance depth |
| Composition | **1 — below target** | Smooth channel/slopes and disconnected source-area scatter |
| Close-up work | **1 — below target; previous 2 withdrawn** | Pebble-print ground and smooth dug bowl lack material depth |
| Whole-map consistency | **1 — below target** | Partial composition, legacy/new-art mismatch and unfinished approaches |
| Temporal stability | **Not established** | Selected clip frames and performance logs do not certify full motion quality |

### Why the first delivery falls short, and build order

The implementation mostly substitutes asset geometry into existing instance placements and adds small bank dressing. That preserves gameplay, but it also retains the old scatter and stacked arrangements. It does not, by itself, compose the connected landforms and geological exposures visible in the references. More detailed textures and extra render passes cannot compensate for that missing stage.

1. Finish the composition for the first creek section and the existing reef/granite companion sites (V01/V02). Establish large forms at normal player height, and fit them to the actual saved world. Do not silently regenerate terrain or change colliders to chase a screenshot.
2. Connect those forms through ground transitions, debris and vegetation patches (V03/V04). Keep purposeful bare working space; increasing scatter everywhere is not acceptance.
3. Resolve shallow-water bed composition and reflection balance (V05), then finalise lighting/material values together (V06). Recheck from the opposite bank and while walking.
4. Prove close-up excavation and transition consistency (V07/V08). Close the first-scene visual gate before extending B5 across the map.

Reopened checklist items: **B2-02, B3-04, B3-06, B3-07 and B4-04**. Their assets, placement or safety checks exist, but their visual requirements are not satisfied. Successful loader, save, control, offline, quality-setting and performance checks remain valid; they are not visual acceptance. B5-06 retains its completed technical material/dig alignment, with its unfulfilled close-up art requirement explicitly tracked above.

Still pending separately: full temporal and reverse-approach coverage, populated legacy-save visual tour, UV/drying-ground checks, final asset/GPU budgets, and physical iPhone/Safari and Android/Chrome measurements. No new game code, assets, settings or screenshots were produced for this comparison audit.

## Correction pass after the reference audit

13 October 2026. Branch `codex/nsw-environment-fix`, base `aedeba5`, implementation `6ba554e`. This pass addresses defects across V01–V08. It does **not** close the reference-quality gate. The original audit and earlier evidence above remain as historical records.

| Area | Corrective work delivered | Remaining visible gap |
| --- | --- | --- |
| V01/V02: composition and rocks | Joint cuts through host/quartz, broader host faces, more weathered granite edges; low embedded aprons and downslope fragments resolve from the existing source anchors. Selected bank stone groups and bed cobbles follow saved terrain. | The reef still reads as separate blocks, granite still exposes the original stacked arrangements, and the creek remains an even channel. The reference's connected long exposure and irregular bank landform are not achieved. Some low connecting pieces look too planar. |
| V03: ground | Greatly reduced the old pebble-stamp contribution and rock micro-noise. Actual small stones, litter and patch-centred plants supply close detail. | Bare soil can now look too smooth. Broad transitions and disturbed ground need stronger authored structure. |
| V04: plants | Lateral branch levels and smaller leaf sprays; bent grass/sedge blades; replaced legacy black shrub sprays at their existing anchors; adjusted leaf lighting. | Repeated crown structure and regular woodland placement remain visible. This is still below the canopy depth and plant composition in the references. |
| V05: water | Diagnosed the bright repeated pattern as foam sampling the ripple texture. Replaced that with broken noise patches carried by the existing flow. Reduced normal distortion/glare, increased bed visibility and retained flood turbidity. | Water is still too mirror-like in some views; pale margins and distant ribbons need further composition/material work. Broken foam does not itself prove natural flow. |
| V06: light | Rebalanced regional sun/fill, ground bounce and distance haze; inspected midday, dawn, storm and headlamp night. | Noon soil/foliage values and contact depth remain weaker than the reference. No AO or photographic blur was used to hide missing form. |
| V07: excavation | Small inclusions, crumbs and root ends follow current exposed soil. Decoration disappears after removal. Main shovel terrain now exposes the existing geological colours instead of being mostly overridden by the regional surface palette. | This is still a heightfield bowl with small details, not convincing spoil/rim/layer volume. Photo 6's material-depth target remains open. No new excavation simulation was introduced. |
| V08: consistency/evidence | Extended grouping through creek reaches and source surrounds; preserved camp clearance. Capture waits for discovery messages to expire. Three-seed captures, Low/touch, all sources, camp, mine, dig, map and weather are recorded. | Camp/workings remain visibly basic; complete reverse-approach and populated legacy-save visual tours are still pending. |

### Correction evidence and acceptance

Current captures: [upstream](audits/nsw-fix/high-upstream.jpg), [opposite bank](audits/nsw-fix/high-reverse.jpg), [bank](audits/nsw-fix/high-bank.jpg), [reef](audits/nsw-fix/high-reef.jpg), [granite](audits/nsw-fix/high-granite.jpg), [dig](audits/nsw-fix/high-dig.jpg), [camp](audits/nsw-fix/high-camp.jpg), [night](audits/nsw-fix/high-night.jpg), [Low](audits/nsw-fix/low-creek.jpg), [emulated touch](audits/nsw-fix/touch-medium-creek.jpg). Additional seed evidence: [seed 1](audits/nsw-fix/seed-1/build.json), [seed 798887](audits/nsw-fix/seed-798887/build.json). [Full capture record](audits/nsw-fix/build.json).

All eight still-image rubric dimensions remain **1 — below the supplied reference target**. Several specific defects have been reduced or removed, but no dimension is upgraded merely because a feature exists or a technical check passes. B2-02, B3-04/06/07 and B4-04 remain open. The next substantial art task is still the large bank and connected reef/granite composition, followed by soil transitions and close-up excavation volume. Phone quality settings remain a scaling mechanism, not the benchmark.

### Correction verification

- 84 logic tests and the 119-module production build pass. `git diff --check` passes. Headless Blender exports all 42 named assets; no dependencies added.
- Normal pointer lock/look, wheel/number keys, menu transitions, rejection recovery and simultaneous movement/tool switching pass across all seven locations. Original touch toolbar/Use/pan/menu checks pass.
- Three seeds (1, 12345, 798887) retain physical/saved world hashes through art loading and live quality changes. Actual held trowel use, saved soil millimetres and reload pass. Missing/corrupt kit retains original scenery and tool use. The suite was repeated after adding the terrain cut-colour attribute.
- New England desktop/touch rock and landscape checks pass. Built offline reload passes for New England desktop and Northeast Tasmania touch. No other region recipe or controller is changed. Earlier shelter/facility/travel coverage is retained; this pass does not claim those full suites were repeated.
- Capture stills relocate the camera; they are not walked routes. The separate performance/ordinary-input recording identifies its own method and hardware. Physical iPhone/Android performance remains unmeasured.
- The final 27 stills comprise 21 seed-12345 views and three each for seeds 1 and 798887. No page/console errors or failed shader programs were recorded. Existing Clock/toNonIndexed warnings and the previously observed ANGLE X4122 constant-precision warning remain; this is not a warning-free run.

### Correction desktop measurement

[Full report](audits/nsw-fix/performance.json), implementation `6ba554e`: RTX 3090, Chromium 151 / ANGLE D3D11, actual 1920×1080 drawing buffer, High. The isolated scripted route measured 180 seconds after a 15-second warm-up (10,802 frames), with no recorded page/console/GL errors. This is a three-minute check, not a repeated ten-minute soak or phone measurement.

| Measurement | Median | 95th percentile |
| --- | --- | --- |
| Frame interval | 16.7 ms (refresh-capped ~60 fps) | 16.7 ms |
| CPU frame callback | 9.3 ms | 13.6 ms |
| GPU timer query (360 samples) | 7.33 ms | 10.63 ms |

Full-frame medians: 887 calls / 17,159,343 submitted triangles including shadow/water passes and tools. Cost is higher than the earlier kit and still needs profiling on weaker hardware; this machine's result does not establish a supported minimum. Geometry objects rose from 631 to 688 and textures from 32 to 36 as the route loaded views. This short run is not a leak certification or a GPU-memory-byte measurement.

The separate [ordinary-input recording](audits/nsw-fix/walkthrough.webm) contains 43 seconds of original pointer-lock/WASD/mouse input after one initial placement, plus startup/title time. The route crosses the creek and returns towards camp; signed bank offsets are logged. [Native 1080p final still](audits/nsw-fix/high-1080-walk.jpg). Representative extracted frames were inspected; full temporal-art acceptance remains open. Do not infer absence of shimmer/popping from a few frames or the timing result.

## Correction publication and handoff

Correction release: implementation `6ba554e` and evidence `9f24854` were fast-forwarded into clean main and pushed. [Pages run 38407938169](https://github.com/Alvaren/fossicking-game/actions/runs/38407938169) succeeded. The live `index-Bee88vN5.js` bundle and 5,663,244-byte GLB match the local build; SHA-256 `bb108f7fd9ebcc14963f25ffec916993879bee29342e23b53031e3f8ffa71ab0`. [Publication record](audits/nsw-fix/publication.json) and [public High desktop/touch checks](audits/nsw-fix/public-checks.txt). The public suite passes original tool input, desktop digging/save/reload and weather checks without page/console errors. Main and Claude were clean before integration; Claude's commits were already in main. Only Codex's 5191 preview was listening. A documentation-only follow-up records this verification, and its Pages deployment is checked before final handoff.

Correction ownership: generator and its GLB/manifest; `src/newengland/{environment,composition,grounddetail,lighting,water}.js`; NSW-only branches in `environmentmaterials.js`, `rockmaterials.js` and `terrain.js`; one `landscape` argument in `main.js`; the regression-output path override in `tests/newengland.game.mjs`; linked art/checklist/collaboration docs and `docs/audits/nsw-fix/`. Branch `codex/nsw-environment-fix`, base `aedeba5`. No dependencies, controllers, save formats or other agents' work changed. Open art gates and unmeasured physical-phone performance remain as stated above.

### Earlier implementation handoff

Owned code: `src/newengland/`, the optional loader, ground/rock materials, terrain/excavation render adapters, narrow main-loop/settings hooks and foliage statistics. Owned art: the new Blender generator and its `public/models/newengland/` output. Owned checks/docs: the NSW tests/evidence, pointer-lock harness timing, offline-kit assertion and linked plans. No other agent was launched or messaged. Main and Claude were clean when inspected; final integration and deployment identifiers are recorded in the coordination handoff.

## Publication

Implementation `de0d1e3` and evidence `2e98aeb` were fast-forwarded into clean main and pushed. [Pages run 38397556111](https://github.com/Alvaren/fossicking-game/actions/runs/38397556111) succeeded. The live page references the tested `index-CvZfiV4S.js` bundle; the 3,808,508-byte public GLB exactly matches the local asset (SHA-256 `5adb7bd7e44ad599a802afe3ca65c36ef948f76eff023a70fddee7be5939f29c`). Public New England High desktop and emulated-touch rendering/tool input pass; desktop digging/save/reload, dawn/night and flood checks pass in that public suite. No page/console errors were recorded. Main and Claude were clean, Claude's commits were already integrated, and only Codex's 5191 preview was listening. A final documentation-only commit records this result; its deployment is checked before handoff.

## Intact rock repair

14 October 2026. Branch `codex/nsw-landforms`, base `4c1c8ea`, implementation `0b36e4b`. The user's screenshot identified identical straight slots through many boulders. The generator was slicing ordinary rocks into separated solids. That operation is removed, along with plane-clipped caps on rounded rocks. Granite now has a weathered rounded silhouette; quartz remains enclosed in the host-rock variants. Flat decorative shelves at banks/source rocks are also removed.

[Repaired granite at normal playing height](audits/nsw-landforms/high-granite.jpg), [close granite, seed 1](audits/nsw-landforms/seed-1/high-granite.jpg), [host/quartz](audits/nsw-landforms/high-reef.jpg), [touch granite](audits/nsw-landforms/quality/touch-medium-granite.jpg). [Capture metadata and source hashes](audits/nsw-landforms/build.json). Fourteen stills were captured across three seeds and High/Low/emulated-touch settings; selected granite, reef and bank views were inspected. Original supplied reference images remain the benchmark; they are not republished here.

Granite prototypes increase from 208–254 to 320 triangles each. Removing repeated slice faces lowers the complete kit from 90,384 to 89,580 triangles and from 5,663,244 to 5,465,832 bytes. Stable asset names, pivots and original world transforms remain. No controller, terrain generation, save format, dependency or other-region recipe changed.

Verification for this repair:

- 103 logic/asset tests pass, including 19 exported ordinary-rock checks for a single connected closed volume, finite coordinates and non-degenerate triangles. The new checks also caught small clipping remnants, which were welded before export.
- Production build passes (119 modules). World/save regression passes for seeds 1, 12345 and 798887 through loading and quality changes; actual held trowel input/save/reload and missing/corrupt kit fallback pass.
- Original pointer lock/look, wheel/number switching, simultaneous movement/tool switching, menus and rejection recovery pass across seven locations. Original touch toolbar/Use/pan/menu checks pass.
- Built offline reload passes for New England desktop and Northeast Tasmania touch, including rendering and original tool input.
- Capture reports contain no page/console errors or failed shader programs. Existing Three.js/ANGLE warnings are retained in the metadata; this is not a warning-free claim.
- [Isolated desktop measurement](audits/nsw-landforms/performance.json): RTX 3090, High, 1920×1080, 60 measured seconds after a 15-second warm-up. Frame interval 16.7 ms median / 16.8 ms p95; CPU 8.9/12.5 ms; GPU 6.97/9.80 ms (120 timer samples). Median full-frame submission 807 calls / 16,263,895 triangles including extra rendering passes. This is a short desktop check, not a phone result or temporal-art acceptance.

The connected-heightfield outcrop prototype looked rounded and exposed poor contact edges; new bank/dig detail also failed the composition review. Those experiments were removed instead of being promoted as completed work. **LF-01/03/04/05 and the reference-quality gates remain open.** The repair does not complete the outstanding environment polish. Continue connected outcrops, real bank/root contacts, broad ground transitions, water margins and excavation/spoil volume from the durable checklist.

The user finished playing main and explicitly asked to publish the fix. Implementation `0b36e4b` and evidence `5e120b3` were fast-forwarded into clean main and pushed. [Pages run 38415766124](https://github.com/Alvaren/fossicking-game/actions/runs/38415766124) succeeded. The public `index-CeOXkd1_.js` bundle and 5,465,832-byte model match the tested local build (SHA-256 `b178ec269960ce73ce3592fac6454fb184b6b8a8252a75707de423f29cec2f39`). Public High desktop/touch rendering and original tool input pass. [Publication record](audits/nsw-landforms/publication.json), [public checks](audits/nsw-landforms/public-checks.txt). Main and Claude were clean; Claude commits were already integrated. No other agent was launched or messaged.

## Creek and exposed-ground continuation

14 October 2026. Branch `codex/nsw-creek-polish`, base `e779054`, implementation `09029c6`. Continued the authorized polish after publishing the separate through-cut repair. The full reference-quality environment is **still unfinished**.

Delivered changes:

- Host rocks have joined weathered forms, lower sloping faces and narrower quartz boundaries on one closed exterior. The old separate interior caps are removed. Small quartz float uses simpler angular chips. The kit contains 42 assets / 95,672 prototype triangles / 5,832,052 bytes; granite remains 320 triangles per variant. Original placements, colliders, sources and saved data are unchanged.
- Selected existing trees have tapered surface roots fitted to the saved bank. They respect working/find clearances and withdraw if the supporting ground changes. Sparse angular clods, inclusions and root ends follow actual excavation, with larger clearance around uncollected finds.
- Grus, damp wash and litter have broader material contrast; exposed geological colours remain visible. High water uses rendered bed depth for shore/stone contact, less refraction displacement and finer advected foam. Floating leaves have tapered silhouettes. The original flow, flood, leaf movement and lower-cost water path remain intact.

Final evidence: [reef](audits/nsw-creek-polish/high-reef.jpg), [bank roots](audits/nsw-creek-polish/high-roots.jpg), [shallow water](audits/nsw-creek-polish/high-bank.jpg), [upstream](audits/nsw-creek-polish/high-upstream.jpg), [reverse](audits/nsw-creek-polish/high-reverse.jpg), [dug ground](audits/nsw-creek-polish/high-dig.jpg), [kneeling](audits/nsw-creek-polish/high-kneel.jpg), [granite](audits/nsw-creek-polish/high-granite.jpg), [dawn](audits/nsw-creek-polish/high-dawn.jpg), [night](audits/nsw-creek-polish/high-night.jpg), [storm](audits/nsw-creek-polish/high-storm.jpg). [Low](audits/nsw-creek-polish/quality/low-creek.jpg), [emulated touch](audits/nsw-creek-polish/quality/touch-medium-granite.jpg), [seed 1](audits/nsw-creek-polish/seed-1/high-reef.jpg), [seed 798887](audits/nsw-creek-polish/seed-798887/high-roots.jpg).

Nineteen final stills comprise eleven seed-12345 High views, four Low/touch views, and two each for seeds 1 and 798887. Metadata records matching source/model hashes and confirms the actual kit loaded, with no candidate-model override. [Main metadata](audits/nsw-creek-polish/build.json), [quality](audits/nsw-creek-polish/quality/build.json), [seed 1](audits/nsw-creek-polish/seed-1/build.json), [seed 798887](audits/nsw-creek-polish/seed-798887/build.json). Stills use camera relocation; digging in the capture is a disposable surface edit. They are not a walked route or proof of full temporal stability. A normal discovery banner remains in the seed-1 reef view; it was not cropped away.

### Continuation verification

- **111 logic/asset tests pass**. All 23 rock prototypes are closed, connected and non-degenerate. New tests check bank-root ground contact, outward normals, removal/reload and equipment clearance, plus excavation-detail invalidation and find clearance.
- Production build passes with 120 modules; no dependencies added. Three-seed world hashes remain unchanged through art loading and quality changes. Actual held trowel input, saving/reloading and missing/corrupt kit fallback pass. [Regression data](audits/nsw-creek-polish/regression.json), [game checks](audits/nsw-creek-polish/game-checks.txt).
- New England High desktop and emulated-touch rendering/original input pass. Built offline checks ran in a fresh process for New England desktop and Northeast Tasmania touch. [Offline checks](audits/nsw-creek-polish/offline-checks.txt). Seven-location normal controls and original touch checks were run for the preceding rock repair in this session; they were not repeated after this continuation. No controller code changed.
- Final captures record no page/console errors or failed shader programs. Existing Three.js deprecations and ANGLE X4122 warnings remain. Physical iPhone/Android measurements and full populated-legacy-save visual coverage remain pending.

[Isolated desktop profile](audits/nsw-creek-polish/performance.json): RTX 3090, Chromium 151 / ANGLE D3D11, High, actual 1920×1080 drawing buffer. Sixty measured seconds after 15 seconds of warm-up, 3,572 frames, no recorded errors:

| Measurement | Median | 95th percentile |
| --- | --- | --- |
| Frame interval | 16.7 ms | 16.8 ms |
| CPU frame callback | 12.4 ms | 18.3 ms |
| GPU timer query, 119 samples | 8.42 ms | 11.93 ms |

Median full-frame submission is 822 calls / 16,217,385 triangles including extra passes. The preceding repair measured CPU 8.9/12.5 ms and GPU 6.97/9.80 ms: this pass has higher measured cost despite a similar refresh-capped frame rate. Do not generalise this short result to weaker hardware or phones. Geometry objects rise from 639 to 697 and textures from 32 to 35 as views load; this is not a leak certification. No new ordinary-input video was recorded for this continuation.

### Remaining visual work

LF-01/03/04/05 remain open. The reef still reads as separate rocks, granite keeps its stacked source arrangement, banks lack substantial irregular landform, soil and vegetation transitions remain sparse, and digs remain bowls with small detail rather than convincing exposed layers and spoil. Water is still too mirror-like in some views, with streaks in storm conditions. Camp/source approaches, broader woodland composition and full temporal/legacy-save coverage remain unfinished. All eight full still-image rubric dimensions retain their below-reference rating; technical passes do not close them.

Next substantial task: connect the reef and bank composition at the existing sites while preserving authoritative terrain and collision footprints, then integrate broader ground/plant transitions and believable excavation volume. Do not spend another pass adding uniform scatter and call those larger tasks finished.

### Continuation publication

Implementation `09029c6` and evidence `4b7059a` were fast-forwarded into clean main and pushed. [Pages run 38424011662](https://github.com/Alvaren/fossicking-game/actions/runs/38424011662) succeeded. Public `index-Uxx-wkVW.js` is byte-identical to the tested local bundle; the 5,832,052-byte public model is also identical (SHA-256 `4cafbdc860a69075c25d8e7ba530b3a62354736ae0e7e469a4ff3db8b7a5e5e7`). [Publication record](audits/nsw-creek-polish/publication.json), [public High desktop/touch checks](audits/nsw-creek-polish/public-checks.txt). Those public checks passed rendering, original input and desktop dig/save/reload/weather checks with no page/console errors. Main and Claude were clean before promotion, and Claude had no unintegrated commits. A documentation-only follow-up records this result; its matching Pages deployment is verified before final handoff.


## Four-area scene pass

14 October 2026. Branch `codex/nsw-scene-completion`, base `5de1629`, implementation `73b02f1`. This pass implements the four areas the user selected: connected rocks/banks, ground and plant transitions, exposed soil/spoil, and the surroundings of camp and existing sites. It does not constitute user sign-off of the entire reference-quality environment or start B9 optimisation.

| Requested area | Result | Review evidence |
| --- | --- | --- |
| Connected outcrops and natural bank contacts | Reef, basalt and rhyolite gain shared exposed surfaces where their existing rock footprints overlap, with buried boundaries and continuous reef quartz. Granite contacts are fuller and faceted. Banks have interrupted soil layers/rills meeting existing roots and gravel. | [Reef](audits/nsw-scene/high-reef.jpg), [close reef](audits/nsw-scene/high-reef-close.jpg), [basalt](audits/nsw-scene/high-basalt.jpg), [rhyolite](audits/nsw-scene/high-rhyolite.jpg), [granite](audits/nsw-scene/high-granite.jpg), [upstream](audits/nsw-scene/high-upstream.jpg), [reverse bank](audits/nsw-scene/high-reverse.jpg) |
| Ground and vegetation transitions | Plant islands and ground colour use the same broad pattern; larger tree-associated clumps, litter/branches and a worn clearing connect the woodland and camp approaches. Open sampling ground remains legible. | [Starter camp approach](audits/nsw-scene/high-camp-approach.jpg), [fossil approach](audits/nsw-scene/high-fossil.jpg), [opal workings](audits/nsw-scene/high-opal.jpg), [mine approach](audits/nsw-scene/high-mine.jpg) |
| Exposed soil and spoil | Shovel terrain and hand patches shade actual removed depth/topsoil/bedrock. Irregular small spoil lobes, clods and inclusions follow real cuts and avoid unrecovered crystals. The ground rebuilds correctly from saved excavation. | [Shovel cut](audits/nsw-scene/high-dig.jpg), [real held-input trowel cut](audits/nsw-scene/high-hand-dig.jpg) |
| Camp and between-site consistency | The regional treatment extends through the existing claim, around both starter and fully upgraded camp. The full camp reserve and existing activity/entrance clearances remain open. | [Starter camp](audits/nsw-scene/high-camp.jpg), [upgraded camp approach](audits/nsw-scene/upgraded-camp/high-camp-approach.jpg), all source approaches above |

The connecting surfaces are rendering detail over the existing world. **Every solid source rock retains its model and collider**, including when a nearby excavation removes connecting detail. The original source instance matrices, collision lists, find/deposit IDs, terrain heights and saved data remain authoritative. Cut boundaries close into the ground; open sampled edges are explicitly regression-tested. The separate repaired GLB remains unchanged: 42 assets, 23 closed rock prototypes, 5,832,052 bytes, SHA-256 `4cafbdc860a69075c25d8e7ba530b3a62354736ae0e7e469a4ff3db8b7a5e5e7`.

### Scene verification and limits

Evidence in `docs/audits/nsw-scene/` is separate from all previous audits. Capture scripts record poses, source/model hashes, quality, renderer counts, errors and shader failures. Stills use direct camera relocation in disposable contexts. The shovel still uses direct terrain edits; the hand-dig still uses the original held mouse action. Starter screenshots use a swag fixture; the populated camp fixture has a shed and all existing facilities. Discovery/tool hints remain uncropped. The upgraded close view is partly occluded by the existing buildings; the wider approach shows the whole arrangement.

The four areas are materially improved, but the supplied references remain the art target. The old granite distribution is still stacked; retained fossil slabs, headframes and camp buildings remain simple models. The creek still has strong reflections and visible streaks, and its underlying bank profile has not been regenerated. Excavation retains the original rounded heightfield profile; the new spoil is small render-only volume, not a deep cross-section or a new soil simulation. These are explicit limits, not reasons to mark the full visual rubric accepted. No other location recipe, controller, save format, dependency or reward calculation was changed.

There are **27 final stills**: 15 principal High views, four Low/touch views, two fully upgraded camp views, two each for seeds 1 and 798887, and two storm/night views. All six metadata reports match the final source/model hashes, with zero recorded page/console errors and zero failed shader programs. The night view continues the storm fixture. [Metadata](audits/nsw-scene/build.json), [quality](audits/nsw-scene/quality/build.json), [upgraded camp](audits/nsw-scene/upgraded-camp/build.json), [seed 1](audits/nsw-scene/seed-1/build.json), [seed 798887](audits/nsw-scene/seed-798887/build.json), [weather](audits/nsw-scene/weather/build.json).

[Normal-input walkthrough](audits/nsw-scene/walkthrough.webm): 43 seconds of actual pointer lock, mouse and WASD input after one initial placement, on the normal URL. It is an additional movement check, not a whole-map playthrough or a complete temporal-art sign-off. No recorded page/console errors. [Final walking view](audits/nsw-scene/high-1080-walk.jpg).

[Final desktop profile](audits/nsw-scene/performance.json): RTX 3090, Chromium 151 / ANGLE D3D11, High, actual 1920×1080 buffer; 60 measured seconds after 15 seconds of warm-up, 3,531 frames, 118 GPU samples and no recorded errors.

| Measurement | Median | 95th percentile |
| --- | --- | --- |
| Frame interval | 16.7 ms | 16.8 ms |
| CPU frame callback | 11.7 ms | 17.7 ms |
| GPU timer query | 8.95 ms | 12.28 ms |

Median full-frame submission is 969 calls / 18,831,881 triangles, including extra passes. The preceding creek continuation recorded 822 calls / 16,217,385 triangles and GPU 8.42/11.93 ms: the new detail adds rendering work. The lower CPU result in this short run is **not an optimisation claim**. Geometry/texture counts rise from 735/32 to 747/35 as assets appear; heap readings vary from about 149 to 217 MB. This is not a long-session leak, thermal or physical-phone certification. B9 remains deferred and requires repeatable sustained comparisons after visual sign-off.

Final checks:

- **115 logic/asset tests pass** and the 122-module production build passes. Boundary-closure tests prevent sampled rock cuts; spoil tests require real adjacent removed soil, bounded height and crystal clearance. [Logic output](audits/nsw-scene/logic-checks.txt), [build output](audits/nsw-scene/build-checks.txt).
- Three seeds preserve terrain/source matrices, collisions, find IDs, camp and saved work through art loading and live quality changes. Every original source rock retains a visible solid model. Real held trowel input provides finite actual-depth shading data; original save/reload, missing/corrupt kit fallback and tool use pass. [Final regression data](audits/nsw-scene/regression.json).
- All seven locations pass actual normal-URL pointer lock, mouse look, wheel/number tool selection, movement while switching, menus, pause/resume and lock-rejection recovery. Original touch toolbar/Use/menu behaviour passes. [Final control and save checks](audits/nsw-scene/final-regression-checks.txt). An earlier run was interrupted by a source-change reload during development; its error is retained in [the interrupted log](audits/nsw-scene/interrupted-control-checks.txt), not counted as a passing run.
- Desktop/touch shelter progression, cash/capacity, shed/workshop access, facilities, power, specimen displays, kelpie, lapidary, reload and exactly-once results pass. [Camp and regional checks](audits/nsw-scene/game-checks.txt). These ran before the final adjustment that retains the original solid rock models beneath connecting detail; the final world/save/control suite above covers that adjustment.
- The final production build passes cached-offline New England desktop and Northeast Tasmania touch checks in a separate process. [Offline checks](audits/nsw-scene/offline-checks.txt). Existing Three.js deprecations/ANGLE warnings remain. Physical iPhone/Android tests, sustained ten-minute performance and fully populated user-save visual review are still pending.

### Scene publication

Implementation `73b02f1` and evidence `117a5c6` were fast-forwarded into clean main and pushed under the standing user instruction. [Pages run 38500167021](https://github.com/Alvaren/fossicking-game/actions/runs/38500167021) succeeded. The generated public JS/CSS and unchanged environment model are byte-identical to the tested production build; the HTML matches after normalising Windows carriage returns. Both public JS chunks (`index-LAWrUEBJ.js` and `main-Be0DsWP3.js`) were checked. [Six-file publication verification](audits/nsw-scene/publication.json).

Public High desktop and emulated-touch checks pass rendering and original tool input, with desktop dig/save/reload and weather checks, and no page/console errors. [Public checks](audits/nsw-scene/public-checks.txt). Main and Claude were clean before integration, and Claude had no unintegrated commits. SC-06 is complete. The documentation-only follow-up records these verified results; its matching Pages run is checked before final handoff. Full visual acceptance and B9 remain separate.
