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

## Handoff

Owned code: `src/newengland/`, the optional loader, ground/rock materials, terrain/excavation render adapters, narrow main-loop/settings hooks and foliage statistics. Owned art: the new Blender generator and its `public/models/newengland/` output. Owned checks/docs: the NSW tests/evidence, pointer-lock harness timing, offline-kit assertion and linked plans. No other agent was launched or messaged. Main and Claude were clean when inspected; final integration and deployment identifiers are recorded in the coordination handoff.

## Publication

Implementation `de0d1e3` and evidence `2e98aeb` were fast-forwarded into clean main and pushed. [Pages run 38397556111](https://github.com/Alvaren/fossicking-game/actions/runs/38397556111) succeeded. The live page references the tested `index-CvZfiV4S.js` bundle; the 3,808,508-byte public GLB exactly matches the local asset (SHA-256 `5adb7bd7e44ad599a802afe3ca65c36ef948f76eff023a70fddee7be5939f29c`). Public New England High desktop and emulated-touch rendering/tool input pass; desktop digging/save/reload, dawn/night and flood checks pass in that public suite. No page/console errors were recorded. Main and Claude were clean, Claude's commits were already integrated, and only Codex's 5191 preview was listening. A final documentation-only commit records this result; its deployment is checked before handoff.
