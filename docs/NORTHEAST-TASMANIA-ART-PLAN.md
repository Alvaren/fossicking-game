# Northeast Tasmania environment overhaul

Owner: Codex. Branch `codex/northeast-tasmania-fidelity`, base `0fa1029`. User authorised one Tasmanian location on 17 October 2026. Selected the existing northeast gem river. Western Tasmania and its sniping scene are outside the art scope.

## Rainforest correction — user review, 17 October 2026

The user rejected the first overhaul: the original map was greener, had denser canopy, no gum-tree character and visible fog. The open, sunny eucalypt woodland is the wrong biome. This correction supersedes the earlier eucalypt/brown-ground art choices; previous technical passes do not constitute visual acceptance.

- [x] R1: Compare original/first-overhaul views and official northeast rainforest references.
- [x] R2: Replace every authored gum with dense broadleaf myrtle/sassafras-inspired rainforest crowns, branching trunks and green foliage; preserve original trunk anchors/colliders. Maintain closed-canopy character on Low.
- [x] R3: Restore green mossy ground, damp fern layers and visible cool fog at all presets; soften open-sky/direct-sun treatment. Keep river working edges readable.
- [x] R4: Inspect matched river, camp and forest views against both earlier scenes; verify no exposed woodland horizon, broken silhouettes or vanished ripples. Run build, asset, gameplay/save/control and fallback/quality checks plus a performance sample.
- [ ] R5: Publish the correction, verify live files/gameplay and share actual final screenshots. User art approval remains separate.

Reference: [NRE Tasmania temperate rainforest](https://nre.tas.gov.au/conservation/conservation-on-private-land/bush-information-and-management/identify-your-bush-type/bush-with-a-tree-layer-made-up-of-trees-that-are-not-eucalypts/temperate-rainforest) describes rainforest in the northeast highlands, with myrtle and sassafras among canopy trees. [Parks Blue Tier Heritage Trail](https://parks.tas.gov.au/explore-our-parks/blue-tier-regional-reserve/blue-tier-heritage-trail) supplies a nearby forest-creek photo. The Craig Vertigan creek photograph was visually inspected: near-continuous moss over boulders/banks, interlocking trees and layered green foliage enclosing dark clear water. These guide vegetation form and moisture, not a new claim that Tin Fern is a surveyed real river. User direction governs the fictional scene's cold rainforest identity.

## Evidence and fidelity boundary

The established Tin Fern River is a compact fictional catchment inspired by Weld River, Moorina. Keep its route, sampling IDs, bank heights and fixed assays; retain saved positions unless newly added solid scenery occupies them, then move only to the closest clear route point; this pass brings its scenery up to the NSW benchmark. It does not rename a synthetic river as a surveyed real site. The original six supplied environment references and the current Uralla/New England assets set the rendering target, with quality presets providing scaling.

Inspected sources before building:

- [Mineral Resources Tasmania: Weld River](https://www.mrt.tas.gov.au/prospecting_and_fossicking/fossicking_areas/fossicking_areas_in_tasmania/weld_river_fossicking_area): alluvial granite/basalt material, sapphire/spinel/zircon, historic tin wash and road/track access.
- [Official locality map](https://www.mrt.tas.gov.au/__data/assets/image/0005/370778/Weld_Riverdownload.jpg), inspected in browser: Weld flows north/northwest towards Moorina and Ringarooma; access tracks and two collecting areas lie within a larger forested corridor. This is regional evidence, not a survey of the fictional route.
- [PMAT May 2026 field-trip photographs](https://forum.pmat.org.au/t/weldborough-field-trip-saturday-2-may-2026/1588), especially photos `c0cc500d281ad64fc36836b2c514aa79b3a4184f.jpeg` and `74491df56c445e7d771ba9b72b68e5c1b2b4e8b5.jpeg`, visually inspected: interlocking rounded/jointed pink-grey granite, broad exposed rock shelves, dark wet margins, lichen, amber pools, short narrow riffles, fallen limbs, tall eucalypts and dense lower vegetation. The photographer describes unusually low water; do not treat the exposed bed as a permanent river level.

Photos are reference only and are not copied into the game. Individual trees/rocks, their dimensions and distribution remain art interpretation. No new access/permit guidance, mineral yields, roads or historical structures are inferred from photos.

## Existing audit

The northeast still uses cylindrical trunks, separate repetitive canopy sprays, sparse flat ferns, low-detail identical boulders, smooth terrain colours and the older water presentation. It lacks the authored NSW foliage and surface-water passes. Sampling pockets appear as dark discs with isolated pebbles; camp/track surroundings have little continuity with riverbanks. Existing input, wheel/pointer lock, expedition saves and sample/sieve rules are already shared and must be retained.

## Build checklist

- [x] N01: Inspect locality map/geology and photographs; choose one destination; record ownership and baseline.
- [x] N02: Capture current river/camp/track views and save a disposable old expedition fixture before changes.
- [x] N03: Add a local headless Blender kit using an additive recipe in the existing generator: varied tree ferns, ground ferns and leafy understory. Reuse NSW trees, granite/cobbles, roots/logs, materials, foliage LOD and loader contracts; retain fallback scenery on asset failure.
- [x] N04: Compose the whole river corridor: weathered granite shelves/boulders, basalt-rich smaller wash, wet margins/lichen, rooted leaf-litter banks, patchy ferns and open sample edges. Ground meshes follow actual terrain; keep existing colliders and routes usable. No world helper rings or route lines.
- [x] N05: Reuse NSW reflection/refraction and ripples on the existing water mesh; keep shallow-bed visibility, tannin colour and local turbulence. Add soft daylight and less uniform forest depth without obscuring finds.
- [x] N06: Bring camp, trailhead and walking transitions to the same visual standard. Scale dressing/foliage and water passes with existing presets; leave all input/gameplay systems unchanged.
- [x] N07: Build, focused asset/composition tests, actual desktop/touch sampling and sieving, normal pointer lock/wheel/menu checks, old save/reload and travel, Western regression, offline and failed-asset fallback. Inspect baseline-matched river/camp/track screenshots plus Low/rain/night. Measure desktop GPU/CPU/frame time and record hardware; no physical-phone performance claim.
- [x] N08: Final visual audit against inspected photos and NSW benchmark; fix visible defects, capture final hero screenshots, update build record, integrate ready work, push main and verify Pages/public game.

## Implementation constraints

Use isolated modules under `src/tasmania/` and additive asset outputs under `public/models/tasmania-ne/`. Do not change the shared gameplay RNG, ground heights, site capacities, sample assays, route or terrain save schema. Replace render geometry at the original trunk/rock anchors only once optional kits load successfully. Added solid rocks must use shared placement records for both geometry and collision; small ground detail must not block work. Respect route, camp, trailhead and sampling clearances.

Reuse existing `loadEnvironmentKit`, `loadNewEnglandKit`, vegetation shaders/LOD, rock atlas, ground material, surface effects, and `newEnglandWater` reflection/refraction rather than writing new controls or an independent water shader. Reuse the original pan, sieve and shovel. Headless Blender in a fresh process only. Codex owns port 5191 and its dependencies; no user/Claude process is stopped.

Quality acceptance: no sliced rocks, hovering roots, intersecting sample circles, black card bushes, tiled foam sheets, repeated identical-height trees, blocked path, lost ripples or tree-free camp surroundings. High/Ultra are the art benchmark; Low retains landforms and gameplay visibility while reducing optional small detail and water passes. Full reference-art sign-off remains the user's judgment.

## Delivery record

See `NORTHEAST-TASMANIA-BUILD.md` for implementation, exact checks, screenshots, performance, publication and remaining limits. Do not mark an unchecked item done based only on a successful build.
