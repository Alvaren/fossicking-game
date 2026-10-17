# Northeast Tasmania: Tin Fern River environment

17 October 2026. Branch `codex/northeast-tasmania-fidelity`, base `0fa1029`; plan committed as `a16a961` before implementation. [Scope, inspected sources and checklist](NORTHEAST-TASMANIA-ART-PLAN.md).

## Rainforest correction — 17 October 2026

The user correctly identified that the first overhaul lost the original dense, green, misty rainforest. This correction supersedes its open eucalypt woodland art direction. Branch `codex/tasmania-rainforest-correction`, base `d1b2a83`; correction checklist committed before implementation as `ebe3b1e`.

The authored gum trees have been replaced with four broadleaf rainforest trees, inspired by myrtle and sassafras. Irregular branching crowns overlap at the original trunk anchors. Four separately authored distant variants use fewer, larger leaves to retain canopy cover; Low also uses these models with wider crowns. Green forest ground, stronger moss on rocks and a denser, larger fern layer restore the enclosure. Cool fog remains on every preset, with a base density of 0.016 and stronger mist in rain. Softer direct light, a clouded sky and green reflected ambient light replace the sunny woodland treatment. Water ripples, the visible shallow bed and reflections remain active on High/Ultra.

The official [NRE temperate-rainforest guidance](https://nre.tas.gov.au/conservation/conservation-on-private-land/bush-information-and-management/identify-your-bush-type/bush-with-a-tree-layer-made-up-of-trees-that-are-not-eucalypts/temperate-rainforest) and the visually inspected [Blue Tier Heritage Trail creek photograph](https://parks.tas.gov.au/explore-our-parks/blue-tier-regional-reserve/blue-tier-heritage-trail) informed this correction. These support the regional rainforest character, not a species survey or exact reconstruction of the fictional Tin Fern River.

Only the local Tasmania kit was regenerated in fresh headless Blender: 17 named meshes, 149,000 triangles across all source variants, 8,397,428 bytes. Instancing, separate distant crowns and the existing foliage distance rules remain in use. Gameplay, original trunk colliders, river course, working sites, travel and save schemas are unchanged.

### Correction evidence

- Production build passed (150 modules); [143 unit checks](audits/tasmania-rainforest/unit-tests.txt) and [validation of all 17 named meshes](audits/tasmania-rainforest/asset-check.txt) passed.
- [Matched captures and renderer checks](audits/tasmania-rainforest/final/checks.json): original eye-height viewpoints, no uncaught or shader errors. Compared original, rejected and corrected river/camp views; inspected crown shape, green ground, fern layers, fog depth and water visibility.
- [Offline, missing/corrupt-kit fallback and Low/rain/night/touch checks](audits/tasmania-rainforest/resilience-conditions.json) passed. Low retains broad crowns and mist; high-detail water follows the existing quality setting. Browser contexts are disposable; user saves are untouched.
- [Desktop/touch gameplay and normal control checks](audits/tasmania-rainforest/interaction-checks.json) passed: northeast routes/colliders, movement, jig/flip/collection and partial saves; actual pointer lock, mouse look, wheel/number keys and menus; original-claim touch controls and Western Tasmania gameplay/save/travel regression. Physical-phone performance is not measured.

[Corrected river](audits/tasmania-rainforest/final/hero-river.jpg), [camp](audits/tasmania-rainforest/final/hero-camp.jpg), [matched bend](audits/tasmania-rainforest/final/bend.jpg), [terrace](audits/tasmania-rainforest/final/terrace.jpg), [Low](audits/tasmania-rainforest/conditions/low.jpg). Hero images hide HUD/held tools only. This is the implemented response to the biome correction; user art acceptance is not presumed. Terrain remains the established smooth, compact fictional catchment, and the tree kit is stylised rather than a botanical reconstruction.

### Correction performance and integration

The [120-second whole-frame High/1920×1080 sweep](audits/tasmania-rainforest/performance.json), after 20 seconds of warm-up, measured 16.7 ms median/p95 frame intervals, 3.2/4.6 ms CPU callback/submission and 6.28/6.92 ms GPU on the available RTX 3090/ANGLE D3D11 desktop. No measured frame exceeded 33.5 ms. Median/p95 draw calls across all passes were 465/822. This sample supports the desktop correction; it is not a physical-phone or low-end GPU result. The source kit is larger because it now supplies the canopy as well as the understory.

Main and Claude were clean at pre-integration inspection; fetched origin/main matched local main, and Claude had no unmerged commits. Only Codex's 5191 static production preview was listening. The correction is ready for the standing authorised publication; live verification follows after deployment.

## Initial scene — art direction rejected by user

Tin Fern River now uses the established New England foliage/material/water pipeline and Uralla granite meshes. A separate nine-model Tasmania kit adds three ground ferns, three tree ferns and three leafy understory variants. Eucalypts retain their original anchors with varied taller crowns. Jointed granite shoulders and connected low shelves frame the working reaches, with basalt/cobble wash, lichen and wet margins, ground-following roots, branches, sedges and patchy leaf litter. The portable camp tarp has poles, stakes and guy ropes; the surrounding track and forest use the same detail treatment.

High/Ultra reuse the existing scene reflection/refraction pass, shallow-bed visibility and animated ripple treatment. The regional recipe retains flowing foam and leaves and adds local rock-contact turbulence. Lighting uses the shared sky/day-night cycle. Low/Medium use the existing simple-water option and reduced leaf density/small-detail distances. No separate controller, tool, panning or sieving system was introduced.

The generator is an additive `tasmania-ne` recipe in `blender/build_newengland_environment.py`, run in a fresh headless Blender 5.2 process. Only `public/models/tasmania-ne/` was regenerated: 9 named models, 35,256 triangles, 1,990,212-byte GLB. Existing NSW/Uralla assets are reused without regeneration. The original world remains playable if any optional kit is unavailable or corrupt, and warmed assets reload offline.

## Authenticity and preserved behaviour

Official Mineral Resources Tasmania geology/locality mapping and visually inspected PMAT field-trip photos of Weld River near Moorina informed the granite/basalt wash, rock shelves, wet edges and fern/eucalypt vegetation. Sources and their limitations are in the plan. No source photographs are copied into the assets.

**Tin Fern remains the established fictional compact catchment**, not a surveyed recreation of Weld River. Existing river course, heights, route, sites, capacities, fixed assays, travel destination and map pin are unchanged. The old terrain/site/route fixture is checked exactly. Added solid scenery uses the same records for rendering and collision and keeps the original route and work sites clear. A saved player position moves to the nearest clear route point only if a newly added boulder occupies it. Finds, pending pans/sieves, cash, home claim and other expedition data are retained.

Western Tasmania receives no scenery or gameplay changes. Both regions retain shared pointer lock, mouse/wheel/number keys, touch toolbar, original held models, always-on topographic journal map and travel flow.

## Checks and evidence

- `npm ci` and production `npm run build` passed (150 modules).
- Full `npm test`: 143 passing checks; [output](audits/tasmania-ne/unit-tests.txt). Focused new checks cover unchanged terrain/site/route data, seeded art/working clearances and safe legacy positions.
- [Local-kit validation](audits/tasmania-ne/asset-check.txt): all 9 named meshes have finite, nonempty geometry and match the manifest.
- Existing northeast desktop and emulated-touch suite passed: real movement/scoop/jig/release, actual colliders on the whole route in both directions, partial sieve save/reload, flip/recovery, exactly-once banking, home-state preservation and direct western travel. [Report and captures](audits/tasmania-ne/game/checks.json).
- Existing Western Tasmania desktop/touch regression passed: movement, generated route/colliders, sampling, pan input/reload/recovery, camp, preserved home state and repeated travel.
- Normal desktop controls without the test bypass passed in northeast Tasmania: pointer lock, mouse look, wheel/number selection while walking, map/pause/tool transitions, denied-lock recovery and no stale input. Existing original-claim touch control regression also passed.
- [Resilience and conditions](audits/tasmania-ne/resilience-conditions.json): cached authored world reloads offline; missing and corrupt new kits retain the original world/colliders; movement/journal remain usable. Low, rain, night and emulated-touch views render with no uncaught or shader errors. Expected missing-file HTTP errors are excluded only in the intentional failure case.
- Existing cold-cache offline travel regression passed: mainland travel/maps, Western movement, northeast Easy sieve/collection and cached return home.
- Browser tests use disposable contexts. User storage and other servers were not touched. The older gameplay scripts were adapted to test the production build without depending on Vite source-module URLs; real input paths remain exercised.

[Before](audits/tasmania-ne/before/bend.jpg), [after](audits/tasmania-ne/final/bend.jpg), [working terrace](audits/tasmania-ne/final/terrace.jpg), [camp](audits/tasmania-ne/final/camp.jpg), [walking track](audits/tasmania-ne/final/track.jpg). Captures use the actual production renderer and normal eye height. Hero captures hide HUD/held tools only. The matched upstream comparison is partially occluded by new rock geometry; additional hero viewpoints explicitly check solid clearances.

### Visual review

Inspected all three reaches, camp and track plus Low, rain, night and touch captures. Fixed GLSL reserved/duplicate identifiers found in the first draft, rooted replacement shrubs at ground height, and added branching/lower foliage to remove the bare-stick fan appearance. Final shader-console checks are part of the capture scripts. The authoring fallback also removes its added colliders if setup fails.

Compared with the baseline, trees have continuous trunks/branches/crowns, fern fronds have actual shape, granite replaces repeated coarse blobs, and the water reflects the forest while retaining visible ripples and the shallow bed. The low banks and overall corridor remain the original terrain, with connected rock shelves supplying local variation.

The initial overhaul was rejected for its open gum woodland, brown ground and weak fog. The technical checks below are historical evidence, not visual acceptance. It does **not** establish full parity with the six original promotional references. The preserved banks are smoother than the inspected Weld River bed, the forest distribution is procedural rather than a botanical survey, and the portable camp remains modest. Reference-art acceptance remains the user's judgment. No physical-phone benchmark or exact real-world river reconstruction is claimed.

## Performance

[120-second High/1920×1080 whole-frame sweep](audits/tasmania-ne/performance.json), after 20 seconds of warm-up: RTX 3090 via ANGLE/D3D11, Windows Chromium 151. The isolated browser measures CPU callback/submission time and asynchronous disjoint GPU timer queries across all world/water/tool passes.

| Metric | Median | p95 |
| --- | ---: | ---: |
| Frame interval | 16.7 ms | 16.7 ms |
| CPU callback/submission | 3.2 ms | 5.4 ms |
| GPU | 6.16 ms | 6.59 ms |
| Draw calls across all passes | 471 | 828 |

This is one available desktop, not a physical phone or low-end GPU. Raw samples and the reproducible harness are beside the report. The capture helper's last-render counters exclude other passes; only this whole-frame benchmark is used for performance figures.

## Publication

Implementation `f200970` was fast-forwarded into clean main and pushed to origin. [Pages run 38996650731](https://github.com/Alvaren/fossicking-game/actions/runs/38996650731) succeeded. [Nine deployed-file comparisons](audits/tasmania-ne/public.json) match the locally tested JS/CSS/GLBs; HTML and JSON differ only in platform line endings. The full [public desktop and emulated-touch gameplay checks](audits/tasmania-ne/public-game/checks.json) passed sampling, partial saves, sieve/recovery, actual route colliders, independent expedition state and travel.

Touched gameplay/render files: `src/tasmania/{main,world,northeast-composition,northeast-environment,northeast-materials}.js`. Also touched the additive Blender generator/new kit, northeast/Western production browser checks, focused environment checks, README, collaboration guide and this plan/audit evidence. No dependencies, original input/tool implementations or regional geology/sampling profiles changed.

Main and Claude were re-inspected clean before integration; Claude had no unmerged commits. Only Codex's isolated 5191 static preview was listening. No user or Claude server/process was stopped. Final evidence is published in the follow-up documentation commit; the game assets are identical to this verified implementation.
