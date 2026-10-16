# Golden Triangle — proposed next fidelity upgrade

Status: proposed next map, not an implemented environment upgrade. User asked which existing level should follow New England and explicitly asked to remake the shovel. This run rebuilds the shared shovel; this plan scopes the recommended next environment pass.

## Benchmark and identity

Use New England at published commit 3fe3cb909a93ac6cc2ed7238b90d6652b8ba0804 as the minimum delivered finish, including its restored ripples and measured rendering optimisations. The user's six reference images remain the higher art target; previous reference-art gaps are not declared solved. Compare equivalent daylight, view distance, preset and output resolution. Mobile scales through existing quality settings; it does not set the art benchmark.

Golden Triangle / Ironbark Gully already shares the mainland terrain, water, tools, camp, travel, save and input systems. It offers strong reuse of the NSW rendering techniques while needing a distinct box–ironbark woodland and goldfield treatment. Research basis: [Parks Victoria's Castlemaine Diggings description](https://www.parks.vic.gov.au/places-to-see/parks/castlemaine-diggings-national-heritage-park) describes box–ironbark forest and the historic mining landscape; [the national heritage account](https://www.dcceew.gov.au/parks-heritage/heritage/places/national/castlemaine-diggings) describes the surviving mining and habitation sites. These inform visual identity, not a reproduction of real access boundaries or a new yield model.

The current fictional profile has wooded rolling slopes, shallow diggings, a quartz reef, gold detecting and an alluvial panning gully. Preserve that playable identity. Do not transplant New England's complete mineral sampler or invent unrelated attractions.

## Reuse and new work

| Reuse from the current project | Author or adapt for Ironbark Gully |
| --- | --- |
| Original mainland controller, pointer lock, wheel/keys/touch, tool models and animations | No separate controls or replacement gameplay loop |
| NSW rock/material machinery, terrain-aware roots and dressing masks | Gold-bearing quartz/host-rock compositions, ironstone float and exposed weathered bedrock appropriate to the existing profile |
| Existing leaf/grass shaders, LOD, exact vertex indexing and instancing | Box/ironbark trunks and crown shapes, rough dark bark, regional understorey and ground litter |
| Existing flow/flood/foam data and restored ripple rendering | Gully-bank composition and a regional water/soil palette, without changing saved hydrology |
| Soil-depth and excavation interfaces, spoil placement, equipment/camp clearances | Clay/gravel/litter transitions and disturbed old-workings surfaces |
| Optimised shared matrices, static batching, dirty terrain updates and cache invalidation | A regional rendering recipe, preserving the deterministic world and obstacle positions |
| Original camp/buildings, topographic map, $0 travel and save fields | Matching surrounding clearing, access paths, vegetation edges and coherent site-to-site finish |

Reusable rendering code should be shared only where its input contract really matches. Audit NSW-specific hardcoded species, resource roles and scene dimensions before extracting helpers; keep New England unchanged and checked throughout. Reuse compatible geometry/materials, not an entire NSW scene with a colour tint.

## Build and acceptance checklist

- [ ] GT-01 — Freeze the current Golden Triangle and New England baselines at seeds 1, 12345 and 798887. Capture the entry, gully, reef, old diggings, camp and connecting walks, with existing saved excavations and facilities. Record current frame costs and asset budgets.
- [ ] GT-02 — Audit the regional rendering integration and extract only the helpers needed by both recipes. Preserve source IDs, colliders, terrain arrays, physics, deposits, difficulty and save formats. Demonstrate unchanged NSW fixtures before adding regional art.
- [ ] GT-03 — Establish one convincing first scene: box–ironbark trees, irregular understorey islands, coherent litter/soil, grounded roots and readable quartz/ironstone float. Inspect silhouette, bark, scale and near/far transitions at player height against the NSW benchmark.
- [ ] GT-04 — Compose connected reef exposures, the gully margins and old shallow workings around existing physical anchors. Keep ordinary rocks closed and intact; no repeated saw cuts, helper circles, hidden obstacles or fake traversable surfaces.
- [ ] GT-05 — Extend the same finish through camp and connecting routes. Keep equipment and entrances clear, preserve small-find visibility, and show believable exposed layers/spoil when the original shovel and hand tools remove ground.
- [ ] GT-06 — Inspect matched stills and actual movement on High/Ultra, plus Low/Medium and touch layout. Check day/night, rain/flood, water motion and reflections, photo mode, LOD popping, digging feedback and scenery invalidation. The current NSW level is the minimum whole-route benchmark, not just one attractive screenshot.
- [ ] GT-07 — Run relevant seeded world/save/fallback, seven-region controls, travel, camp, prospecting and offline checks. Measure repeated comparable routes at fixed resolution/hardware; retain rendering optimisations and document any added asset cost. Physical-phone limits remain explicit.
- [ ] GT-08 — Record before/after evidence and remaining issues, integrate only completed work, publish main under the standing instruction and verify exact public assets plus desktop/touch gameplay. User visual review remains distinct from build/test success.

Do not start unrelated map expansion or replace controllers during this pass. This plan becomes execution scope when the user chooses the Golden Triangle upgrade.
