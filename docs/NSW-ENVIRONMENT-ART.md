# New England environment art specification

13 October 2026. First implementation: `codex/nsw-environment-build`, base `dfa9a09`. Current corrective build: `codex/nsw-environment-fix`, base `aedeba5`. Companion to the [build checklist](NSW-ENVIRONMENT-BUILD-PLAN.md).

## Reference board and interpretation

The six private user photographs remain reference material, not project assets. No image or video UI is copied into the game. The following board maps their visible features to concrete game assets; it is not a claim that their depicted geology is New England.

| Reference | Visible target | New England interpretation | Avoid |
| --- | --- | --- | --- |
| Photo 1, creek | Stones readable through shallow water, interrupted bank edge, layered planting | Rounded grey cobbles in the existing creek, sedges at damp edges, dry tussock behind, open scoop/kneeling spaces | Uniform bank fringe; decorative rocks across work sites |
| Photos 2–5, outcrops | Broad broken rock planes, deep joints and embedded white seams | Jointed dark host rock at the existing reef; white quartz crossing its fracture faces; a little quartz float nearby | White polygon piles; a white ribbon floating outside the rock |
| Photos 3/5, vegetation | Clear foreground/middle/distant layers, clustered shrubs | Open dry-sclerophyll woodland, forked gum crowns, olive shrubs and straw tussocks | Desert vegetation everywhere; pole trunks with tiny crowns |
| Photos 2/3, ground | Large calm soil patches balanced by plants and stones | Ochre-grey grus on slopes, darker organic soil under trees, damp gravel at water | Confetti gravel; saturated peach soil; grass carpet |
| Photo 6, cutaway | Soil and roots with real scale and material depth | Exposed roots at selected trees/banks; existing digging surface remains authoritative | Artificial root lattice over every dig; a new digging simulation |
| NSW regional sources | Granite sheets/tors, woodland and tussock/sedge communities | Rounded jointed corestones, pale bark, grey-green crowns and local shrubs | Treating a real reserve as this fictional claim |

Regional references were read in the [audit](NSW-ENVIRONMENT-AUDIT.md): NSW New England Tableland and Watsons Creek Nature Reserve plan. Palette is a regional art interpretation, not species identification. Trees represent gum/stringybark structure, shrubs the form of wattle/hopbush/geebung communities, dry tussocks and greener creek sedges. Do not label generic meshes as verified botanical species.

## Neutral-light palette

Colours below are sRGB authoring swatches, transformed to linear for vertex colours. Daylight/weather remain dynamic.

| Surface | Main | Variation | Shape treatment |
| --- | --- | --- | --- |
| Soil/grus | `#a38d69` | `#b5a07b`, `#756b55` | Metre-scale patches, fine aggregate at working distance |
| Damp wash | `#777b6c` | `#515c55` | Rounded embedded stones, moisture follows water level |
| Host rock | `#68655e` | `#807a6e`, `#484b49` | Broken slabs and bevelled joint planes |
| Quartz | `#d9d6c9` | `#b9b8ad`, `#efeadc` | Irregular vein inside the host volume |
| Granite | `#9b9181` | `#b2a793`, `#756e63` | Weathered corners, broad joints, subtle mineral texture |
| Basalt | `#535753` | `#6e7068` | Blocky fractures, denser/darker than granite |
| Rhyolite | `#968579` | `#b6a18c` | Broken plates, warm weathered rind |
| Bark | `#b3ad95` | `#777266`, `#d2c9ac` | Connected tapered forks, rough base, lighter upper branches |
| Foliage | `#586d42` | `#788752`, `#465a3e` | Open branched crowns, individual tapered leaves |
| Ground plants | `#98925d` | `#b9ac71`, `#667c50` | Bent blades, mixed dry/green stems, irregular clumps |

## Composition and protected space

First creek section: resolve `creek.cx(z)` and `halfWidth(z)` over z=0..28 for every save. Compose both banks with a few larger embedded stones, grouped sedges, open gravel, and selected exposed roots; maintain continuous working margins. Camp access is kept open using its actual anchor and a 17 m reserve including the existing larger upgrades. No newly solid plant or decorative collider.

Evidence poses resolve from the live terrain: banks at z=4,12,24, facing up/downstream; kneeling at z=12; elevated inspection at z=14. Reef and granite companions resolve from `terrain.sources`, with front/side/reverse views. Seed 12345 is the matched baseline, not a placement template.

The placement query must account for actual finds, targets, field sites, split boulders, mine collar, camp/shop/ute, world colliders and excavation overlays. A separate close-to-ground clearance allows harmless grass while keeping larger dressing out. Recheck dynamic excavation and equipment; hide/reseat decoration where soil changes. World source matrices and collision lists are kept intact when their rendered geometry is replaced. No new veins outside the existing reef field.

## Asset contract and provenance

`blender/build_newengland_environment.py` authors the kit in a fresh Blender process. Output: `public/models/newengland/environment.glb` and a JSON bounds/triangle manifest. Deterministic seeds are specific to art and never consume the game-world RNG. All mesh work is original project work, with no third-party asset/texture dependencies or additional licence obligations.

Blender metres, Z up; GLB result metres, Y up. Trees/shrubs/grass/root assets have ground-origin pivots. Rock assets have a centred, approximately unit-radius envelope so existing instance transforms and collision footprints can be retained. Export parents use stable names: `gum_0..3`, `young_0..1`, `shrub_0..2`, `grass_0..2`, `sedge_0..1`, `host_0..3`, `granite_0..3`, `cobble_0..5`, `basalt_0..2`, `rhyolite_0..2`, `slab_0..2`, `root_0..1`, `branch_0..2`.

Child material names distinguish `bark`, `leaf`, `grass`, `host`, `quartz` and rock types. The optional loader bakes world transforms and material colours into merged geometry, converts plant roles to existing `aFoliage`, and supplies near/far render geometries. No shared tool/crystal names are changed. Host seams are enclosed volume slices of the same block, not stickers. Trees retain the old trunk footprint; larger crowns do not add invisible collisions.

Assets load independently of tools/finds. Validate the complete manifest before replacing render geometry. On a missing/corrupt kit, retain the original scenery. Environment quality changes draw lists and foliage detail only; it never changes terrain, deposits, saved IDs or collision data. Low retains the same silhouettes with reduced leaf density and dressing distance.

The corrective kit contains 42 assets / 90,384 prototype triangles and occupies 5,663,244 GLB bytes. The original names/pivots remain. Its extra geometry primarily supplies lateral crown branches, smaller leaf sprays, bent blades, joint cuts and weathered corners. Existing shared ground/rock atlases are reused; no image textures are shipped with the kit. Material roles become `aAuthoredRockKind` so a host block and its quartz seam sample different mineral detail within one draw. Prototype totals are not scene draw counts or total GPU residency.

The correction adds deterministic groups along creek reaches and low aprons/downslope fragments at existing source rocks, plus selected tree litter. These are render-only and retain the protected camp, finds, target, excavation and equipment margins. Low pieces use a separate clearance query without changing colliders. Surface decoration is removed when its underlying ground changes; exposed inclusion/root detail is rebuilt from the actual cut surface. The main terrain now supplies the same cut-depth material signal as the fine hand patch, allowing the original soil/wash/bedrock colours to show through. Physical heights and saved dig data are unchanged.

This is **not completed whole-map composition**. Low connecting pieces and additional triangles do not satisfy the connected-exposure or irregular-bank reference gates. Final quartz-float/spoil assets, convincing woodland transitions, full camp surrounds and source approaches remain open. See the correction review rather than treating a deployed asset as accepted art.
