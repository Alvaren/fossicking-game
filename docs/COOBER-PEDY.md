# Coober Pedy execution plan

Approved 11 October 2026. The user accepted the Coober Pedy destination proposal and explicitly requested underground homes and workings to explore. Branch `codex/coober-pedy`, base `480d3bc`. Codex owns the files listed in the shared coordination claim. Main and Claude were clean at inspection; Claude's worktree remains untouched. No other agent is involved.

## Scope and implementation order

- [x] Add **Coober Pedy / Painted Ridge** to the existing mainland profiles and $0 travel map. Pale dry terrain, low sparse vegetation, existing opal mullock heaps, old shafts and a camp/ute. Preserve the original topographic map and controls.
- [x] Build **Lantern House**, a furnished dugout with lounge, kitchen, bedroom and specimen nook, and **Old No. 4**, an older rough-cut home with sleeping quarters and a storeroom. Give them separate visible entrances, ventilation pipes, warm lights, believable rock ceilings and doorways. Interiors must be walkable rooms, not journal screens.
- [x] Build **Colour Rise workings**: an underground entrance drive with branching galleries, tool marks, equipment, geological bands and finite opal-bearing faces. Inspect with the headlamp and use the existing hammer to recover seeded potch, milky/crystal opal and occasional opalised shell; some faces are barren. Keep homes separate from extractable rock.
- [x] Reuse `updateUnderground` and the shared mouse lock/wheel/touch inputs. Extend the existing mine interface for multiple entrances and floor-plan collision; do not introduce a replacement player controller. Door interaction transfers between surface entrance and buried interior, then walking is continuous between rooms. This is a bounded interior network, not arbitrary tunnel excavation.
- [x] Save underground position, worked faces and recovered items with the claim. Restore safely, prevent duplicate finds, preserve home/other destinations, and keep camp cutting/polishing/display/selling on the existing collection path. Restrict this region's opal mix to suitable varieties without changing old claims.
- [x] Verify deterministic yields, connected walkable rooms, walls/furniture, saved depletion and travel isolation. Run all logic tests and production build. Exercise actual desktop and emulated-phone entry, walking, look, tools, extraction, reload, surface return and map travel. Inspect interior/exterior screenshots on Low and High; check offline production loading and normal desktop pointer lock.
- [x] Commit completed work, integrate cleanly into main, push and verify Pages under the user's standing publishing instruction. Record actual checks and limitations below.

## Research and abstractions

User correction during implementation: **no inherited riverbed**, and **homes must be underground**. Painted Ridge uses its own dry plain height and colour functions: no creek cut, channel gravels, river boulders or channel vegetation strip. The user further clarified: **these are not hillsides**. Keep the surface low and open. Excavated access cuts descend below the existing ground to the doors; the homes and galleries lie beneath the original ground surface. Do not raise terrain around rooms or add artificial hills. Roof ventilation pipes remain visible above ground. Add explicit cover/no-channel checks and inspect the revised terrain before publishing.

- [SA Department for Energy and Mining — Opal](https://energymining.sa.gov.au/industry/minerals-and-mining/mineral-commodities/opal): Coober Pedy opal occurs in weathered sedimentary host rocks; productive horizons often lie around the sandstone/claystone transition. The game uses pale host rock, darker clay bands and discontinuous seams, not a guaranteed continuous ore layer.
- [Coober Pedy tourism — underground living](https://www.cooberpedy.com/underground-living-dugouts/): underground homes can contain generous rooms and connected dwellings. Furnished domestic space should feel distinct from narrow mine drives.
- [District Council — community](https://www.cooberpedy.sa.gov.au/community): early dugouts developed from mines; later homes were purpose-built. The two fictional homes reflect that contrast.
- [Coober Pedy tourism — fossicking](https://www.cooberpedy.net/opals/fossicking): noodling searches discarded mullock for overlooked opal. Reuse the game's existing hand excavation and surface chips.

Painted Ridge and its dwellings/workings are fictional, compressed game spaces. Routes, access, support geometry, yields and extraction time are abstractions, not a real mine access or engineering guide. New features in this slice do not include player-built underground housing, freely excavated tunnels, a full town or additional destinations. Development notes stay here, not in player-facing UI.

## Execution and verification

Plan written before gameplay changes. The user rejected the first visual pass: removing the river alone did not make three identical earth mounds and box rooms recognisably Coober Pedy. Do not publish those previews as completed work.

### Reference-based correction

- Use the local [2024/25 visitor guide](https://www.cooberpedy.com/wp-content/uploads/2024/08/2024-VGuide-Final-Web.pdf), [tourism photo gallery](https://www.cooberpedy.com/dt_gallery/coober-pedy-in-images/) and [Faye's historic home](https://www.cooberpedy.com/fayes-historic-underground-home/) as visual references. Use the guide for stony treeless ground, sandstone/siltstone, domestic interiors and mine equipment. The user explicitly rejected hillside entrances for this playable field; do not use that part of the reference to override their direction. The field is a fictional district, not a replica of Faye's or a complete town.
- Remove all three artificial mound shapes. Use broad exposed plain, with descending access cuts into the existing ground; remove all inherited riverbed scenery. Separate white/chalky mullock from ochre stony ground and exposed pale/pink rock. Add distant spoil-field silhouettes and working equipment, without new collectible systems.
- Give each entrance a distinct domestic/mining identity with corrugated shade, recessed doors/windows, vents and modest exterior furnishings. Keep the whole occupied room footprint under actual terrain.
- Replace flat, tiled brown interior walls with continuous pale sandstone, rounded wall/ceiling shoulders, arched doors and cutter/pick marks. Improve domestic furniture and lighting; retain the existing controller, extraction, finite yields, saves and travel.
- Recheck actual exterior/interior screenshots, room cover and route collision before publishing. Record completed tests and deployment below.

### Implemented content and integration

`cooberpedy.js` supplies the below-ground layout, access-cut heights, collision and seeded finite opal faces. `dugouts.js` implements the existing Mine interface, using the original surface and underground movement, tool models, mouse lock, wheel and touch handling in main. It adds two multiroom homes (lounge/kitchen/bedroom/specimens and an older kitchen/sleeping alcove/store) and three connected mine galleries. The entry interaction transfers through a door, then the rooms are continuously walkable. The surface stays at its original elevation outside the excavated approaches. Vent pipes, address boards, distant mullock and a stationary blower provide field context.

`coobermaterials.js` supplies continuous sandstone/cutter-mark and stony-ground materials only to this destination. Rounded roof shoulders and door arches replace the original box-room finish. `cooberlandscape.js` supplies the distant spoil and mining equipment. The original scene, collection, opal cutting/polishing, camp, ute, travel and save systems remain in use. New England's terrain/layers pass the existing byte-for-byte regression. No dependencies or Blender assets changed.

Underground location and depleted seam IDs are saved in the Coober Pedy claim. A worked face cannot pay twice. Old saves continue to use their own ground and camps; only the new destination gets defaults. Preview saves retain digs as relative offsets, so correcting this destination's base terrain does not clear saved progress.

### Verification record

- `npm run build`: passed after the corrected flat-ground layout, new materials and scenery.
- `node --test tests/*.test.js`: 82 passed, including underground roof cover at three seeds, absence of artificial hills/channel cuts, connected rooms, wall/furniture collision, finite seeded assays, cutting compatibility and claim/save isolation.
- `node tests/cooberpedy.offline.mjs`: desktop and landscape emulated-phone runs passed. Actual input walked down all three access cuts, entered/exited both homes and the workings, moved/looked indoors, selected tools, held the hammer for a finite opal find, rejected duplicate recovery, reloaded underground with the network disabled and travelled home/back for $0 without losing the original camp or bucket. No page/console errors. Screenshots of the local map, entrances, domestic rooms, galleries and recovery were inspected. Minor subsequent furniture details and the guard against using a door through rock are covered by final visual/control checks. Normal pointer-lock, High-graphics and publication results follow below.
- Physical-phone performance is not measured. Browser checks use disposable saves; long cross-field travel and specific inspection viewpoints are positioned directly, while entrance ramps, room movement, interaction, hammer extraction, menus, reload and destination travel use game controls.

- `node tests/controls.game.mjs`: passed normal (non-`?test`) pointer lock, mouse look, wheel/number switching while walking, menu release/relock, pause/resume and rejected-lock recovery in all seven destinations. Coober Pedy additionally checks that a door cannot be used through rock from the ground above, and retains mouse lock through underground entry, map use and exit. The original portrait touch toolbar/Use/pan-menu regression also passed.
- Final production build passed after the entrance-height guard and kitchen/ceramic details. No new JavaScript or shader errors were observed. Existing three.js deprecation warnings remain.

### Touched paths

- Region/content: `src/claimregions.js`, `src/cooberpedy.js`, `src/dugouts.js`, `src/coobermaterials.js`, `src/cooberlandscape.js`.
- Integration: `src/main.js`, `src/terrain.js`, `src/world.js`, `src/landscape.js`, `src/bedload.js`, `src/audio.js`, `src/crystals.js`, `src/map.js`, `src/regionmap.js`, `src/rocktextures.js`, `src/rockmaterials.js`.
- Checks: `tests/cooberpedy.test.js`, `tests/cooberpedy.game.mjs`, `tests/cooberpedy.offline.mjs`, `tests/controls.game.mjs`. Existing tests in `mainland.test.js`, `northeast.test.js` and `maptravel.game.mjs` now use still-unbuilt Lightning Ridge for their unavailable-destination assertion.
- Records: `README.md`, `docs/COOBER-PEDY.md`, `docs/LOCATION-PLAN.md`, `docs/COLLABORATION.md`.

### Delivery

Branch `codex/coober-pedy`, base `480d3bc`, plan commit `c22900a`. Main and Claude are clean at the pre-integration fetch; remote main remains `480d3bc`. Claude's `aeb026f` is already an ancestor of main. Only the Codex preview on 5191 is listening. Implementation commit `73dde94` was fast-forwarded into main and pushed. GitHub Pages run [38069129027](https://github.com/Alvaren/fossicking-game/actions/runs/38069129027) succeeded. Public-site desktop and emulated-touch smoke checks then rendered the below-ground home, entered/exited through the normal interaction, switched tools and opened the $0 travel map without page/console errors. The final handoff-record commit changes documentation only. No other agent, dependencies, Blender processes or user browser storage were changed.

- Final High-graphics map, below-ground access and furnished sandstone-room captures were inspected after the last source changes; no browser/shader errors. All seven normal desktop control checks and original portrait touch checks passed.
