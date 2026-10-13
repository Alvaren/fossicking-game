# New England environment audit

Date: 13 October 2026 (Australia/Brisbane). Code inspected: `2a319467be058cce5425fdd1041f1c10c8b7058e`. Planning branch: `codex/nsw-environment-plan`.

**Target: the existing New England claim, NSW.** It is the playable NSW destination in `src/regionmap.js`; Lightning Ridge is listed but unavailable. This is an audit and build specification for improving New England, not authorization to build Lightning Ridge or change another destination. The linked [build plan](NSW-ENVIRONMENT-BUILD-PLAN.md) is the execution checklist. No environment upgrade is implemented by this audit.

## User direction and success criterion

The six supplied pictures set the environment quality target: convincing stylised rock formations, layered ground, natural vegetation, attractive lighting, clear shallow water and a landscape whose parts belong together. The target is ordinary playable views, not just a flattering photo-mode shot.

The user clarified the quality hierarchy during this audit: **build to the reference quality first; phones must not define the art ceiling.** Recent iPhones and Android phones, including models a few years old, should scale through graphics settings. No exact device has been nominated. Lower presets may reduce rendering detail and effects; they must keep the same place, interactions and landscape identity.

This work retains the first-person game, original controls, existing difficulty modes, finds and prospecting systems. The pictures do not request third-person controls, helper circles, labels on every geological feature, desert vegetation everywhere, or a new digging mechanic.

## Evidence and limits

- Read the project instructions, README, collaboration history, environment/landscape/material plans and relevant rendering, terrain, vegetation, water, excavation, assets, settings, save and map code.
- Captured and inspected the actual New England game at seed `12345`, using disposable browser storage. Desktop High and Low and landscape touch Medium are covered. Cameras were relocated through the existing debug object; these are not claims of having walked the entire map.
- [Capture script](audits/nsw-environment/capture-baseline.mjs), [machine-readable report](audits/nsw-environment/baseline.json) and the JPEGs in that directory are durable evidence. They are actual game renders, not mock-ups.
- Desktop capture viewport is 1280 x 720 at device pixel ratio 1. High therefore renders at 1280 x 720, despite its 1.5 resolution cap. Low renders at 960 x 540. Touch Medium is 844 x 390 at ratio 1. This is not a retina phone or 1080p performance test.
- Chromium reports **ANGLE/SwiftShader software rendering**. Render counters describe submitted work; timings here would not establish hardware performance. No desktop GPU, physical phone, battery or thermal benchmark was completed.
- The clock/weather were set for inspection. Vegetation, animals and animation continue; images are comparable by position, not pixel-identical snapshots. Counter readings are single explicit world renders, including renderer subpasses such as shadows when performed, excluding the held-tool overlay. They are not full-frame GPU profiles.
- `npm test`: 82 existing logic checks passed. `npm run build`: passed, 112 modules. These establish a working baseline, not reference-level art quality. No new gameplay test suite is claimed.
- All 19 visual captures had no page, console or shader errors. Existing warnings include the Clock deprecation, redundant geometry conversion, and **PCFSoftShadowMap being removed and replaced by PCFShadowMap**. Screenshot readback also produced a SwiftShader stall warning. Additional [map](audits/nsw-environment/high-map.jpg), [dug-ground](audits/nsw-environment/high-dig.jpg), [headlamp/night](audits/nsw-environment/high-night.jpg) and [mine-approach](audits/nsw-environment/high-mine.jpg) captures are recorded separately in `baseline.json`. The dug-ground view uses direct calls to the existing terrain dig method, not a claimed shovel-input test.
- Baseline interactions here were Play and selecting the shovel with number key/touch. The full existing control, recovery, travel and offline browser suites were inspected as future acceptance tools, not all rerun for this documentation task.

## Reference breakdown

Original attachments: conversation batch `2DA63877-D521-4996-B304-3715C0B3B36C`, `1-Photo-1.jpg` through `6-Photo-6.jpg`, under the thread's remote-attachments directory. Their descriptions below remain useful if the temporary attachment paths later disappear. Third-party video images are not copied into shipped game assets.

| Reference | Relevant visual qualities | Translation to this map |
| --- | --- | --- |
| Photo 1: creek bank | Visible submerged stones; clear shallow margin; darker deeper water; wet rock edges; trees framing the scene; a fractured bank exposure | Rework the existing New England creek's presentation and local bank detail using its actual water depth/flow. Do not add a quartz seam where no source exists. |
| Photo 2: digging slope | Cohesive earth palette, convincing fractured outcrops, disturbed soil and spoil, varied shrubs and grass | Use grounded outcrops and disturbed-ground detail at existing work sites. The character and dotted circle are not requested features. |
| Photo 3: wide valley | Large, medium and small forms; outcrops embedded in terrain; vegetation clustered around bare areas; readable watercourse | Compose the full claim, retaining its generated relief and drainage. Detail must work beyond close-up rocks. |
| Photo 4: slope below a vein | Loose angular float and erosion patterns relate to the source above them | Improve existing reef-to-slope-to-creek visual continuity without changing the deposit simulation or implying guaranteed finds. |
| Photo 5: quartz exposure | A pale vein cuts through darker host rock; irregular fracture faces; believable scale; warm/cool lighting separation | Give the existing reef a host-rock structure and a discontinuous embedded vein, rather than representing it only as pale scattered lumps. |
| Photo 6: soil section | Roots, surface layer, gravel inclusions and subsurface structure | Improve visible bank/dig surfaces. A heightfield does not support arbitrary overhangs or a deep cutaway camera; these are not silently added to scope. The video's text is not a geology source. |

## Regional direction

Use a fictional temperate New England woodland claim: muted olive eucalypt foliage, grassy open slopes, patchier shrubs, pale granite country, and greener/damper creek margins. The [NSW bioregion description](https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity/bioregions/bioregions-of-nsw/new-england-tableland) supports open forest/woodland and a temperate to cool-temperate setting. It does not prescribe a single vegetation assemblage for the whole region.

For specific form references, the [Watsons Creek management plan, physical environment and flora sections](https://www.environment.nsw.gov.au/sites/default/files/watsons-creek-nature-reserve-plan-of-management-050680.pdf) describes granite sheets/tors, woodland, shrub layers, tussock grasses and local creekline vegetation. These are useful reference categories, not a claim that this game recreates that reserve. Do not copy the reference video's desert shrubs as NSW species. Select a small consistent plant palette and record its sources during asset design.

The existing claim contains reef gold, basalt-related wash, rhyolite, granite, fossil shale and old opal workings within roughly 224 x 224 playable metres. This is a legacy gameplay composite, not a surveyed real district. Preserve its content and saves in this graphics pass. Correcting/removing/reassigning its geological attractions would be a separate gameplay decision. Keep that caveat in documentation, not a developer paragraph in the field journal.

## Current systems worth retaining

| System | Existing implementation | Reuse decision |
| --- | --- | --- |
| Terrain and deposits | `terrain.js`, `creek.js`, `deposits.js`; diggable grid, source-relative grades, terrace/pool/riffle logic | Authoritative gameplay data. Improve presentation around it. |
| Rock surfaces | `rocktextures.js`, `rockmaterials.js`; seven material types, shared atlases, triplanar scale, wetness, lichen, split/cavity masks | Keep geological assignments and contracts. New shapes and better macro detail are the main missing work. |
| Ground | `environmentmaterials.js`; soil/gravel/litter/moss atlas, height/roughness treatment, weather wetness | Extend spatial blending and believable detail; avoid adding another unrelated terrain shader. |
| Plants and wind | `world.js`, `vegetation.js`, `landscape.js`, `vegetationlod.js` | Keep placements/independent seeds, shadow displacement and LOD infrastructure; replace weak silhouettes and distribution rules carefully. |
| Water | `water.js` plus `creek.js` velocity/depth/foam and flood data | Keep hydrology and interaction checks. Improve the surface's optical presentation. |
| Atmosphere | `daynight.js`, `weather.js`, Sky, ACES exposure and fog | Establish an art-directed balance through existing update paths. |
| Environmental response | `environmentmotion.js`, `campdetail.js`, audio | Keep footsteps, wetness, ripples, gusts and smoke. Refine only where they affect the new composition. |
| Usability | `controls.js`, `touch.js`, original `main.js` controller/tool handlers | No replacement controller. |
| Persistence and travel | `save.js`, `claimregions.js`, `regions.js` | Existing local worlds and shared rewards remain intact. |
| Map | `map.js`, `topography.js` | Always-on contours/hillshade, original discovery and find marks remain. |
| Asset loading | `assets.js`, Blender generators, relative GLB URLs, procedural fallback | Extend with a region-specific environment kit and independent load failure handling. |

## Findings and required outcomes

Priority: P0 is a major barrier to the reference look; P1 completes the map and experience; P2 is optional polish after the main result is convincing. This is an art/engineering audit, not a security severity scale.

| ID / priority | Evidence and diagnosis | Required outcome |
| --- | --- | --- |
| A01 / P0 | [Reef](audits/nsw-environment/high-reef.jpg): scattered nearly white angular lumps. `world.js` uses one displaced dodecahedron family for multiple source outcrops. | Connected host-rock exposure with fractured planes and an embedded quartz seam; smaller float supports the landform. |
| A02 / P0 | [Granite](audits/nsw-environment/high-granite.jpg): repeated smooth ovals stacked in similar piles. Granite has a speckled surface but little jointing or distinct silhouette. | A small family of jointed tors, slabs and weathered corestones. Round some edges; preserve fracture faces. Different rock types must differ in shape as well as colour. |
| A03 / P0 | [Creek](audits/nsw-environment/high-creek.jpg): long uniform bank, broad bare ground, weak transitions between river and woodland. | Composed bend with gravel patches, exposed bank sections, rooted vegetation, damp margin and clear working space. Preserve channel shape/width and access. |
| A04 / P0 | [Bank close-up](audits/nsw-environment/high-bank.jpg): repeated gravel image reads as flat pattern. Ground detail exists but carries too much of the scene by itself. | Large-scale soil variation, slope-aware blending and selected real stones/roots with correct size; material detail supports the geometry. |
| A05 / P0 | Creek/camp views: many pale trunks and small similarly shaped canopies; branches meet abruptly, leaf clusters become black flecks at distance. | Distinct mature, spreading and young eucalypt silhouettes; more coherent leaf groups and branch transitions; stable distant crowns. |
| A06 / P0 | [Rhyolite](audits/nsw-environment/high-rhyolite.jpg): evenly sparse pointed tufts and generic small shrubs across broad empty slopes. `world.js` uses one `spinifex()` tuft geometry for the default claim. | NSW-appropriate tussock/grass/sedge and shrub families, arranged by moisture, slope, rock exposure and open space. Preserve gaps for walking and finding specimens. |
| A07 / P0 | Water has visible repetitive ripple stripes and a broad uniform sheen; the bed reads mostly as texture. `water.js` computes a sky/horizon reflection analytically; it does not sample actual reflected trees/banks or refract a rendered scene image. | Convincing shallow bed, depth/clarity variation, restrained reflection, moving highlights and obstacle-relative foam. Implement/test a real scene-aware reflection/refraction approach where needed; merely increasing the current Reflections option cannot create it. |
| A08 / P0 | Daytime screens have light ground, stark dark foliage and limited contact definition. Sky/shadows already exist. The configured soft-shadow enum falls back in the installed three.js version. | Balance sun/fill/exposure/materials; ground rocks, roots and props with local shading. Evaluate supported shadow filtering and optional AO in the real scene; no blanket darkening or bloom to hide poor forms. |
| A09 / P1 | Distant woodland repeats a similar canopy/trunk pattern and the far terrain is plain. | Distinct near/middle/far composition and haze that retains terrain silhouettes and useful sight lines. |
| A10 / P1 | [Camp](audits/nsw-environment/high-camp.jpg): very simple camp props and vehicle contrast with any future detailed environment. | Ground camp into the improved surroundings using existing paths/props, contact shading and a consistent material palette. Audit hero props after the first scene; retain all purchases, structure footprints and interactions. A wholesale vehicle/tool rebuild is outside this pass. |
| A11 / P1 | [Basalt](audits/nsw-environment/high-basalt.jpg), rhyolite and [fossil ledge](audits/nsw-environment/high-fossil.jpg) rely on repeated polygon lumps or regular stacked plates. | Basalt fractures, rhyolite faces and shale bedding should each read as coherent formations, without changing the specimens or how they are worked. |
| A12 / P1 | Excavation uses an existing dynamic patch mesh with colour changes and a skirt. It is not the rooted three-dimensional cutaway in Photo 6. | Add surface/strata/root detail that follows actual excavation. No floating decoration left above a dug hole, no fake removable roots obstructing tools, and no permanent mesh laid across an editable patch. |
| A13 / P1 | [Opal area](audits/nsw-environment/high-opal.jpg) is smooth heaps with simple shaft surrounds. Lucky Strike shares the reef area. | Improve spoil texture, local loose debris and terrain contact around existing works; preserve shaft collars, mine access and all saved depletion. Do not invent more mine buildings or tunnels for this pass. |
| A14 / P0 engineering | 300 m terrain, 560 x 560 cells: **627,200 terrain triangles**, even Low. Far terrain adds 45,000; the long water ribbon adds about 63,444 before other objects/passes. The detailed terrain is one mesh. | Profile real hardware, then reduce unnecessary submitted terrain/water through render-only partitioning/LOD where justified. Keep the original simulation grid. Do not try to solve every cost by lowering screen resolution. |
| A15 / P1 engineering | Current presets adjust resolution, shadows, AA, gems and reflection update frequency. Vegetation density/geometry depends largely on `shadows === 'off'` at world creation. | Make environment detail, distance, water and effects explicit preset-controlled settings. Quality controls must affect rendering, not mineral availability, collisions or gameplay. |
| A16 / P0 integration | Rock, vegetation, water, lighting and terrain modules are shared across destinations. | Route new treatments through New England configuration; legacy defaults elsewhere. Shared refactors need cross-region regression checks. |
| A17 / P0 integration | Digs serialize grid indices and millimetres below `orig`; excavation edits terrain indices through `tuckUnder()`; decorations have separate RNG. | Preserve source/terrain seeds, cell indexing, find IDs and legacy world data. Mesh optimisation must propagate dig/overlay updates and never draw both old and new terrain. |
| A18 / P1 delivery | No dedicated landscape GLB kit is loaded today; the 13 existing GLBs cover tools, finds, camp, ute and wildlife. Offline cache is same-origin/network-first for unversioned files. | New assets need a small explicit manifest, material/name/LOD contracts, fallback shapes, disposal, relative paths and version/cache checks. No silent dependency on remote texture URLs. |

## Whole-map treatment

Coordinates below are landmarks for **seed 12345 only**. Production placement must resolve from each save's own anchors. North is decreasing z. These are documentation references, not new in-world labels or routes.

| Existing area | Baseline anchor x,z (rounded) | Planned treatment and gameplay boundary |
| --- | --- | --- |
| Camp and crossing approach | 16.4, 0 | Integrate the occupied ground with worn paths, litter edges and useful views of the creek. Preserve upgraded buildings, cabinet/workshop access and ute clearance. |
| First creek section | z approximately 0 to 28, relative to `creek.cx(z)` | First complete visual scene: clear shallow water, gravel margin, exposed bank and several mature trees. Both banks remain usable for existing tools. |
| Reef and downslope wash | -41.2, 36.6; wash centre -22.7, 36.6 | Host rock, quartz exposure and scaled float. Keep the existing lead, detector targets and mine approach. |
| Lucky Strike collar | -30.7, 40.4 | Improve surrounding terrain/props without hiding the entry or changing the mine geometry/gameplay. Interior visual parity is reviewed, not expanded into a new mine build. |
| Basalt source and slope | 53.4, 55.5 | Coherent fractured dark cap, weathered debris and its relationship to existing wash. No generic columns unless the chosen exposure design supports them. |
| Rhyolite and agate ground | 38.2, -3.1 | Flow character, fractured ledges and suitable debris. Preserve visible collectible thundereggs/agates. |
| Granite ground | 2.3, -86.7 | Jointed tors, pavements, grus and existing vein/vug locations. Important close-up and kneeling validation area. |
| Fossil shale | 24.3, -48.4 | Irregular bedding and talus; keep hammer targets legible and reachable. |
| Existing opal workings | -47.9, -26.5 | Better spoil and shaft-ground transitions. Retain legacy content; do not imply this is a surveyed New England deposit. |
| Split gum bend / Granite shoulder | -5.7, 38.8 / -37.6, -74 | Refine the existing landmarks; do not add more unrelated attractions to justify the art pass. |
| Remaining creek, woodland and boundary views | Generated per seed | Extend the same visual grammar with natural variation. No abrupt polished-area border or empty reverse views. Keep the playable boundary and far landscape consistent. |

## Workload baseline

Single world-render samples from `baseline.json`; scene state, culling and shadow refresh affect counts. Use a repeatable full-frame capture for optimisation decisions later.

| View/preset | Draw calls | Submitted triangles |
| --- | ---: | ---: |
| Camp / High | 729 | 1,826,553 |
| Creek / High | 468 | 1,781,883 |
| Granite / High | 283 | 1,722,239 |
| Creek / Low | 283 | 1,095,379 |
| Granite / Low | 140 | 1,036,633 |
| Creek / touch Medium | 504 | 1,808,437 |

The two Low views still exceed one million submitted triangles. That is a concrete optimisation lead, not proof of poor physical-phone FPS. Medium retains much of High's geometry. Existing asset files total approximately 0.87 MB uncompressed; an environment kit will need an explicit download and GPU-memory budget rather than indiscriminately adding large textures.

Three.js documents [instancing](https://threejs.org/docs/pages/InstancedMesh.html) and [merging suitable geometry](https://threejs.org/manual/pages/optimize-lots-of-objects.html) as ways to reduce calls, and explains the extra scene renders involved in [shadow maps](https://threejs.org/manual/pages/shadows.html). The appropriate balance must be measured here: one enormous batch saves calls but reduces spatial culling. [GTAOPass](https://threejs.org/docs/pages/GTAOPass.html) is an available option for ambient occlusion, not a requirement to add it before fixing the art.

## Main risks and unresolved decisions

1. **Reference fidelity:** supplied images establish a style, not a known real-time performance profile. Comparable playable quality is the aim; identical pixels/frame rate are not promised.
2. **Geometry versus collision:** larger-looking formations can create invisible walls or let players enter solid rock. Fit replacements to existing stable collision envelopes or introduce matched, stable proxies with explicit traversal tests. Do not move saved targets under new inaccessible rocks.
3. **Diggable ground:** decorative bank skins/roots must yield to holes and excavation overlays. Preserve both rendered and physical surface alignment.
4. **Water optics:** the creek is sloped. A single flat-water reflector is not automatically correct; compare segmented reflection and screen-space alternatives before choosing. Avoid hiding lost reflections with excessive opacity.
5. **Lighting:** day/night and weather write the light values every frame; changing constructor constants alone will not establish a coherent look.
6. **Art authenticity:** select actual regional plant/rock references; the code's `spinifex` name and the video's shrubs are not sufficient justification.
7. **Asset source:** author focused Blender assets first using existing headless workflow. No third-party asset pack purchase or licence assumption is part of this plan. Generator quality must be visually inspected, not inferred from a successful GLB export.
8. **Performance:** actual desktop hardware and representative recent phone models remain to be recorded at measurement time. Physical-device validation is an open acceptance item, not a reason to lower the High/Ultra art target.
9. **Coverage:** this audit examines all existing surface attraction categories, multiple rendering states and their source contracts. It does not claim a full mine playthrough, every seed, every camp upgrade, every browser or a physical-device benchmark. Those are named verification items in the build plan.

## Audit conclusion

The current engine has sufficient foundations for this work. The next investment is a coherent environment asset set, deliberate composition and lighting/water integration, followed by measured quality scaling. Adding more small random details or another texture layer alone will not deliver the supplied reference quality. The [build plan](NSW-ENVIRONMENT-BUILD-PLAN.md) assigns each finding to a checkable work package and separates completed audit work from future implementation.
