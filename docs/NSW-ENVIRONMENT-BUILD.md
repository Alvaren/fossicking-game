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

## Visual review and remaining work

This is a visible improvement over the baseline, but it does **not yet pass the full reference-quality gate**. The first reviewed stills show fuller branching/crowns, useful bank detail and actual tree reflections. The reef reads as host rock and quartz instead of a white pile, and granite has broad weathered joint faces. The excavation patch no longer forms a conspicuous mismatched square; distant ground no longer uses the old orange palette.

The current review remains conservative: geological form **1** (hero outcrop assemblies need more natural bedding and integration), grounding **2** in the reviewed first section, vegetation **2** nearby but legacy undergrowth needs work, water **2** in the reviewed shallows, lighting **1** (contact/depth still flatter than the references), composition **1** (sparse slopes and repeated source arrangements), close-up work **2** for the reviewed soil/stone views, whole-map consistency **1**. Temporal stability is judged separately from the clip/performance evidence. These are review judgments, not objective measurements, and do not certify every seed/zone.

Next art work is to improve the reef assemblies, contact depth and woodland transitions in B3/B4 before expanding B5. Keep all still-open IDs in the checklist. Also pending: full reverse-approach/temporal coverage, a full populated legacy-save visual tour, UV/drying-ground checks, final asset/GPU budgets, and physical iPhone/Safari and Android/Chrome measurements. Desktop touch emulation establishes layout/input only.

## Handoff

Owned code: `src/newengland/`, the optional loader, ground/rock materials, terrain/excavation render adapters, narrow main-loop/settings hooks and foliage statistics. Owned art: the new Blender generator and its `public/models/newengland/` output. Owned checks/docs: the NSW tests/evidence, pointer-lock harness timing, offline-kit assertion and linked plans. No other agent was launched or messaged. Main and Claude were clean when inspected; final integration and deployment identifiers are recorded in the coordination handoff.

## Publication

Implementation `de0d1e3` and evidence `2e98aeb` were fast-forwarded into clean main and pushed. [Pages run 38397556111](https://github.com/Alvaren/fossicking-game/actions/runs/38397556111) succeeded. The live page references the tested `index-CvZfiV4S.js` bundle; the 3,808,508-byte public GLB exactly matches the local asset (SHA-256 `5adb7bd7e44ad599a802afe3ca65c36ef948f76eff023a70fddee7be5939f29c`). Public New England High desktop and emulated-touch rendering/tool input pass; desktop digging/save/reload, dawn/night and flood checks pass in that public suite. No page/console errors were recorded. Main and Claude were clean, Claude's commits were already integrated, and only Codex's 5191 preview was listening. A final documentation-only commit records this result; its deployment is checked before handoff.
