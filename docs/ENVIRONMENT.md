# Environment improvement plan

Approved scope: ground transitions and litter; natural trees and undergrowth;
rock-to-ground detail and weathering; clearer creek edges and moving water;
softer atmosphere, vegetation movement and location-sensitive ambience.

Base: `85b5871`. Owner: Codex, `codex/environment-polish`, preview port 5191.
Claude's separate checkout was clean and its claim released before ownership.

## Implementation sequence

- [x] Extend the existing terrain material with blended soil, gravel, litter and
  moss detail. Preserve heightfields, excavation, geological colour and saves.
- [x] Improve existing gum and forest geometry/materials with open leaf sprays,
  mottled bark and restrained wind movement. Keep seeded tree placements and
  collision envelopes; use a separate random stream for decoration.
- [x] Add small gravel and fallen bark around existing rocks/trees, and sparse
  bank vegetation. Protect camps, routes and prospecting surfaces.
- [x] Add selective lichen and dirt weathering; improve shallow-water detail,
  damp banks and obstacle ripples using the existing water geometry/flow.
- [x] Balance sun, shade and distance haze; vary existing synthesised ambience
  between dry mainland woodland and sheltered Tasmanian rivers.
- [x] Inspect comparable original-claim views, then all five regions, desktop
  and emulated touch, low/high graphics, existing input and production offline.
- [x] Run simulation tests and build; inspect/save checks.

Delivery follows the standing instruction: commit, integrate, push main and
verify the deployed game. The shared `agent-coordination/codex.json` handoff
records the exact final commit and deployment run after publishing.

## Guardrails

No new destinations, helper rings, player-facing development text or parallel
input/controller systems. No new dependencies or network texture downloads.
Use existing world/terrain/water updates, cache shared textures and instance
small details. Material detail is visual and must not change mineral yields,
find identities, collision locations, pan controls or saved excavation.

New decorative geometry is not collectable; keep it small and away from known
sample sites and camp. Regional differences should retain dry open Queensland,
wooded Victorian slopes and Tasmania's damp forest character. Actual physical
phone performance is not proven by browser emulation.

## Execution and verification

### Implementation

- `environmentmaterials.js`: cached, seeded 512-pixel ground atlas with wrapped
  gutters, soil/gravel/litter/moss blending, relief and damp roughness. The
  original geological vertex colours remain authoritative. Terrain refresh
  updates blend weights when digging; flood level raises the damp band.
- `vegetation.js`: tapered six-point leaf sprays, patchy longitudinal bark,
  slight leaf/grass/fern movement and matching shadow displacement. Existing
  tree trunks, branches, positions, seeded placement calls and colliders stay
  in place. Low graphics uses fewer leaves and details; that density is chosen
  at world load, like the existing Tasmanian vegetation density.
- `environmentdetail.js`: three instanced batches for small boulder fragments,
  fallen bark/twigs and bank sedges. Placement has an independent RNG. It avoids
  camps, tracked paths, specimen sites and excavation overlays; nearby details
  follow the current ground height after digging. These are scenery, not finds.
- Existing rock materials gain sparse upper-surface lichen and a wet/dry band
  on scenery stones that follows the river/flood height. Split faces retain
  their original fresh-face and cavity masks.
- `water.js`: the original flow, depth and foam shader is now shared with both
  Tasmanian catchments. River geometry and physical profiles remain regional.
  Clearer shallows, fine ripples, rock-edge foam and soft drifting foam replace
  the flat Tasmanian water surface; the existing western cascade remains.
- Existing day/night/weather lighting gets gentler sun/fill balance and nearer
  distance haze. Tasmanian fog/background now follows its clock. Water body
  colour and foam darken at night. Existing WebAudio adds a quiet leaf-rustle
  layer and varies wind/creek filtering for dry woodland versus sheltered
  forest; existing wildlife, rain, detector and tool audio remain in use.

No dependencies, generated GLBs, saves, yields, fees, map UI or input handlers
changed. No new asset downloads are required. Textures/materials are shared;
ground-atlas mip storage is approximately 1.33 MiB.

### Validation

- Production build and all 62 existing tests pass. The terrain regression still
  matches the old height/geology generator byte for byte.
- Seven environment cases passed: desktop in all five locations, plus original
  claim and northeast Tasmania emulated touch, with no console/page/shader
  errors. Original-claim digging updates surface detail and restores exactly
  the same saved millimetres after Ctrl+S/reload.
- Original controls check passed on all five locations without the `?test`
  pointer-lock bypass: actual lock, mouse look, wheel/number keys, held-tool
  models, walking while switching, menu isolation, pause/resume, rejected-lock
  recovery, and tool-close transitions. Original portrait-touch toolbar/Use/
  pan/menu checks also pass.
- Rock/layout check passed with high shadows and full gems. Static instance
  transforms, boulder identities and surface-find positions still match the
  earlier published baseline hash
  `66480178c1dd58ac0820151a23f824f6d69a5ce8e48ac8b46f39180971e9236a`.
- Matched 1200x800 Low-graphics creek views measured 207 → 210 world draw calls
  and 1,595,232 → 1,860,739 triangles for New England (+16.6%). Western Tasmania
  measured 20 → 22 calls and 474,200 → 627,883 triangles (+32.4%). These are scene
  workload counts, not a measured phone frame rate. Screenshots are in the
  ignored `node_modules/.cache/env-*.png` folder.

The first render exposed a GLSL reserved identifier and inward-facing Tasmanian
water winding; both were corrected before the successful checks. A development
server reload interrupted an early multi-region run while code was still being
edited; the complete run was repeated against unchanged code and passed.

- High graphics passed in New England and western Tasmania, including custom
  foliage shadow shaders. Dawn, night and the existing peak-flood phase were
  rendered and inspected; damp ground follows the flood level. These weather
  states were accelerated through existing objects, not a full storm playthrough.
- Reviewing those screenshots exposed torn faces in the existing Tasmanian rock
  geometry. Adjacent face vertices now share displacement while consuming the
  same RNG draws. The new browser check requires exactly two faces per edge.
  The corrected western catchment passed again with high graphics.
- Production offline checks use a temporary static server and a fresh browser
  context, cache the built game, disable the network and reload. They cover New
  England desktop (including excavation save/reload) and northeast Tasmania
  touch, with the closed-rock check in the final rerun.

No physical phone frame-time or thermal test has been performed. Synthesised
ambience is exercised through normal browser audio startup; no claim is made
of speaker/headphone listening tests. All screenshots are actual game renders.
