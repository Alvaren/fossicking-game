# Golden Triangle fidelity delivery — 16 October 2026



Branch `codex/golden-triangle-fidelity`, base `dd0450963a39762f8049b3fd5ea1a8aefe0f923c`. Scope: [the authorised plan](GOLDEN-TRIANGLE-ART-PLAN.md), plus the user's request for much taller, more varied trees in Golden Triangle and the original New England map.



## What changed



Ironbark Gully uses an authored four-tree box/ironbark kit with three low shrub variants, closed roots, uneven branching, folded leaves and furrowed dark bark. Existing tree anchors, instance scales and collision footprints remain fixed. New England reuses its existing models with four distinct stature adjustments; the upper branches and crown rise, while roots, trunk width and individual leaf dimensions stay fixed. The original instance scale variation adds further variation within each species silhouette.



The former NSW environment adapter is now the shared `src/rendering/regionalenvironment.js`; each map supplies a small recipe. Golden Triangle reuses the current water/reflection/ripple renderer, rock geometry/materials, bank-root placement, excavation/spoil detail, instancing, exact vertex indexing, spatial LOD and cached terrain/equipment invalidation. Original controls, pointer lock, tool switching, difficulty, yields, save format and travel remain shared and unchanged.



Goldfield dressing follows the existing gully, reef and seven shallow diggings. It adds irregular grass/shrub islands, branch litter, stream-worn cobbles, angular ironstone and small quartz float, with clearances around camp, finds, workings and equipment. The existing physical reef rocks remain solid beneath removable connected exposures. Rusty ironstone keeps its material when a shared rounded cobble shape is used. The gully and old-diggings colour transitions shade the actual terrain: a trial using separate thin soil meshes was rejected after visible edge intersections in screenshots.



This remains the existing fictional goldfield profile. It is informed by the [Parks Victoria Castlemaine Diggings account](https://www.parks.vic.gov.au/places-to-see/parks/castlemaine-diggings-national-heritage-park) and [national heritage description](https://www.dcceew.gov.au/parks-heritage/heritage/places/national/castlemaine-diggings), rather than a recreation of a real claim or a change to the prospecting model. No new location, helper circles, player-facing roadmap text or alternative controller was added. The circular mark in some dig screenshots is the existing shovel aim indicator.



## Assets and budgets



- Fresh headless Blender 5.2.2 process, fixed seeds, generator `blender/build_newengland_environment.py -- <output> golden-triangle`. The normal invocation still builds the existing NSW recipe. No interactive/shared Blender scene was touched.

- Seven new assets, 81,134 authored triangles total, `public/models/goldentriangle/environment.glb` = 4,965,848 bytes. Runtime exact indexing and near/far foliage reduction are retained.

- Shared NSW kit remains byte-identical. Golden Triangle downloads that shared kit plus its own foliage kit on first visit; later visits/offline play reuse the existing service-worker cache. The added regional download is approximately 4.97 MB. The new kit does not replace or duplicate the shared rock/water/tool assets.

- Seed 12345 on High: 399 New England trees span 6.13–25.40 m (median 13.01 m); 479 Golden Triangle trees span 7.42–24.33 m (median 14.60 m). These are measured transformed render bounds, not a botanical size claim. See [movement evidence](audits/golden-triangle/movement/checks.json).

- Low and Medium reduce foliage and small dressing through the existing Environment detail control; tree stature remains present at every setting. Full water remains bounded to the existing render-target caps. No resolution or quality downgrade is forced.



## Evidence and checks



Captures use the production build at port 5191, isolated browser storage, fixed daylight and animation clocks. Non-home fixtures explicitly store the seed and built camp inside `claims['golden-triangle']`; relying on the root save seed would instead apply the existing regional seed salt. Baseline is the frozen `dd04509` build. Three seeds: 1, 12345 and 798887. Eight views per High route: creek, bank, woodland, reef, workings/granite, built camp, worked ground and downstream. Seed 12345 also covers Low, Medium, Ultra and touch. Before/after camera poses are recorded in each `checks.json`.



- [Golden Triangle three-seed world/save/fallback results](audits/golden-triangle/regression.json).

- [New England three-seed world/save/fallback results](audits/golden-triangle/nsw-regression/regression.json).

- [125 logic/asset tests](audits/golden-triangle/unit-tests.txt), including shipped tree heights, root positions, unscaled leaf dimensions and the existing intact-rock checks.

- Both map invariant suites compare world hashes before and after art loading and live quality changes: terrain/original/bedrock arrays, source transforms, colliders, finds, boulders, targets, camp, saved digs and veins remain unchanged. Actual held trowel input, cut attributes, save/reload, and missing/corrupt regional-kit fallback pass.



Matched three-seed High screenshots and seed-12345 Low/Medium/Ultra/touch captures have no page, shader or WebGL errors. Final Golden Triangle material captures are in `audits/golden-triangle/final-golden-triangle-12345-visual/`; earlier `candidate-*` views preserve the pre-final ironstone-colour comparison. New England has no subsequent visual changes. Real keyboard walks cover 13.90 m in New England and 22.03 m in Golden Triangle; [videos and intermediate frames](audits/golden-triangle/movement/) record the moving canopy. Still captures freeze time; walking clips retain the normal running clock.



[Interaction checks](audits/golden-triangle/interaction-checks.txt) pass: normal desktop pointer lock, mouse look, wheel/number keys, walking while switching, held tools, menu isolation, pause/resume and rejected-lock recovery in all seven regions, plus original touch controls. Desktop and portrait-touch mainland checks pass for $0 travel, detection/digging, nugget pickup, partial pan persistence, classified wash, real sieve jig/flip input, topographic maps, reload and independent location saves.

Night/headlamp, rain/flood, photo export and off-screen water culling pass in [Golden Triangle](audits/golden-triangle/golden-triangle-weather/edge-cases.json) and [New England](audits/golden-triangle/new-england-weather/edge-cases.json), with no page/WebGL/shader errors. [Offline checks](audits/golden-triangle/offline-checks.txt) pass for NSW desktop, Golden Triangle desktop and Golden Triangle touch, including both cached kits, original controls and saved excavations. The [production build](audits/golden-triangle/build.txt) and patch whitespace check pass.



## Measured rendering cost

[Raw summary and run links](audits/golden-triangle/performance-summary.json). Production builds, RTX 3090, Windows Chromium 151 with ANGLE D3D11, 1920 x 1080 viewport at 1.5 pixel ratio (2880 x 1620 render buffer), High environment/shadows, full water and live reflections. Each run has 20 seconds warm-up followed by a 60-second eight-view moving route; two runs per Golden Triangle version and one per NSW version. One GPU workload ran at a time. These are short comparative samples, not a thermal-soak or phone claim.

| Scene | CPU median / p95 (ms) | GPU median / p95 (ms) | Frame median / p95 (ms) |
| --- | --- | --- | --- |
| Golden Triangle before, run 1 | 2.60 / 4.20 | 4.81 / 6.69 | 16.70 / 16.80 |
| Golden Triangle before, run 2 | 2.50 / 4.30 | 4.50 / 6.33 | 16.70 / 16.80 |
| Golden Triangle after, run 1 | 6.00 / 12.30 | 6.23 / 11.16 | 16.70 / 16.80 |
| Golden Triangle after, run 2 | 7.10 / 14.20 | 6.30 / 12.23 | 16.70 / 16.70 |
| NSW before | 12.10 / 35.80 | 9.06 / 25.51 | 16.70 / 33.40 |
| NSW taller trees | 13.60 / 29.10 | 9.99 / 21.21 | 16.70 / 33.40 |

Golden Triangle adds real cost over its former low-detail scene, including the scene-water passes; it stays below the current NSW benchmark's sampled frame costs. NSW median CPU/GPU cost rose modestly with taller visible crowns; its p95 costs did not worsen in this sample. This is not a claim of an optimisation gain. The original exact indexing, spatial batching, cached dressing updates, dirty-grid terrain uploads and bounded water targets are retained. Approximately 18.7 million Golden Triangle and 17.8 million NSW triangles per measured frame include repeated shadow/reflection/refraction submissions, not unique scene geometry. Quality settings still control drawing density and water passes.

## Visual review limits



The pass raises Ironbark Gully to the current shared NSW rendering standard, with a distinct canopy, ground palette and goldfield composition. It does not claim parity with every feature in the user's six reference images. Connected rock faces retain the existing sampled heightfield style, the old diggings remain shallow as defined by the saved terrain, and camp building models are unchanged. The user's aesthetic sign-off is separate from technical checks. Browser touch emulation is not a physical-phone performance certification.



## Integration



Local validation is complete. Before integration, main/origin were still `dd04509`, main and Claude's checkout were clean, and Claude had no commits outside main. Only Codex port 5191 was listening; no other dev server was restarted. Main and Claude's worktrees remained untouched during implementation. No other agent was launched or messaged. Implementation `3d3c799b40146d8f0b16c5ad633cd144a5b24d17` was fast-forwarded into main and pushed. [Pages run 38900407944](https://github.com/Alvaren/fossicking-game/actions/runs/38900407944) succeeded. [Public asset verification](audits/golden-triangle/publication.json) confirms the HTML (line endings normalised), both JS/CSS chunk pairs and both environment GLBs match the tested build. [Public High smoke checks](audits/golden-triangle/public-smoke.txt) pass for NSW desktop, Golden Triangle desktop and Golden Triangle touch, including original tool input and saved excavation reload. This record is committed in the follow-up evidence commit; it does not change the tested runtime.
