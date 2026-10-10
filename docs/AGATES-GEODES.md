# More agates and geodes

## Scope and plan

Requested: more agate types and geodes, following the find-visual improvement. Base 6618fdf; branch codex/agates-geodes. Reuse existing surface finds, inventory, collection, town cutter and camp lapidary. No new location or control scheme.

1. Add five agate varieties: dendritic, plume, eye, waterline and brecciated. Give all ten varieties distinct patterns; moss/carnelian/chalcedony should no longer share a banded texture. Keep existing saved palettes and identity.
2. Add collectible geodes with clear-quartz, amethyst, or agate-and-quartz interiors. Keep the contents hidden until sawn. Generate them below the original claim's rhyolite with independent randomness and unique pickup IDs, preserving existing finds and collected flags.
3. Reuse the current sawing service and camp lapidary. Render opened geodes with actual hollow shells, agate rims and inward-growing crystal points; retain an ordinary outer rind before cutting. Upgrade crystal-lined thunderegg interiors through the same renderer, leaving legacy contents intact.
4. Verify deterministic generation, saved rough/cut finds, sawing without rerolling or duplication, collection, existing ground placement, desktop/touch rendering and the production build. Capture a specimen gallery.
5. Commit, integrate and publish main, then verify the public build under the standing publishing instruction.

## Implementation constraints

Procedural meshes and canvas textures extend the existing geode renderer; no unrelated Blender assets or controllers need rebuilding. Texture caches must be bounded by reusable visual variants. Geode contents are assigned once and preserved in saves and cutting queues. Labels reveal the interior only after cutting. Agates remain in the existing recovery/oversize flow; the larger geodes are ground finds, not extra pan rewards.

## Research

- [Australian Museum: quartz](https://australian.museum/learn/minerals/gemstones/quartz/) distinguishes chalcedony varieties and moss-like mineral inclusions.
- [Australian Museum: concretions, thunder eggs and geodes](https://australian.museum/learn/minerals/shaping-earth/concretions-thunder-eggs-and-geodes/) describes hollow crystal-lined geodes, inward-growing crystals, chalcedony shells, volcanic quartz/amethyst and the star-shaped thunderegg structure.
- [Queensland Government: Agate Creek](https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/north-qld/agate-creek) describes agate nodules and geodes in volcanic terrain.

Patterns and occurrence rates are visual/game approximations, not claims about every real-world locality. No overseas or region-specific trade varieties are added.

## Validation and handoff

Implemented on `codex/agates-geodes`, based on `6618fdf`. Five new agate varieties bring the total to ten; three geode interiors are available through 12 independently seeded ground finds below the rhyolite. Geodes use the existing $15 town sawing queue and powered camp lapidary. Both halves remain one collectible. Crystal-lined thundereggs also use the hollow renderer. No dependencies, controllers, regions or Blender assets changed.

Owned paths: `src/agatevisuals.js`, `src/geodevisuals.js`, `src/geodes.js`, `src/minerals.js`, `src/finds.js`, `src/cutting.js`, `src/inventory.js`, `src/cabinet.js`, `src/shop.js`, `src/main.js`, `src/notes.js`, this plan, and the three `tests/agates-geodes.*` files. Inventory and cabinet release each opened geode's private GPU resources while retaining shared point geometry.

Completed checks:

- `npm test`: 62 tests pass, including deterministic agate/geode generation, unchanged assay RNG draw counts, hidden unopened labels, preserved contents/identity through sawing, legacy palettes and thunderegg cores, resumed camp lapidary work and exactly-once collection, and finite hollow meshes below 12,000 triangles per A-grade paired specimen.
- `npm run build`: passes.
- `node tests/agates-geodes.game.mjs`: desktop and emulated touch pickup, inventory, collection, real buyer interaction, $15 fee, queue save/reload, next-day delivery, no duplicate collection, and actual mouse/touch rotation. Sixteen new/legacy specimen renders per mode produced no page or console errors. Inspected desktop, landscape/portrait phone and specimen-gallery screenshots; refined faint inclusions and the initial overly regular brecciated texture after visual review.
- `node tests/agates-geodes.offline.mjs`: serves the production build on an isolated temporary loopback port, caches it through the existing service worker, disables the browser's network and repeats the desktop pickup-to-reveal flow and all 16 specimen renders. Passed without errors.
- Against deployed baseline `6618fdf`, seed 12345 retains all 163 existing ground-find IDs, positions, rotations and weights exactly (SHA-256 `f101bfa488c6d92ed8f23f4e172d8ff5e70cd609a7bf6f6214a77d0b944d2098`). Added IDs are unique and existing collected flags survive reload. New uncollected agates draw from the expanded variety table; saved stones keep their original data.

Browser tests use disposable storage. They skip walking distances and the overnight wait; actual pickup, shop transaction, saved queues, delivery and collection code are exercised. Camp geode completion is tested through its simulation; existing camp controls are reused. Touch is emulated, not a physical-device performance measurement. `PLAYWRIGHT_MODULE` may point to an existing Playwright installation; the project adds no browser dependency.

Screenshots are local ignored artifacts in `node_modules/.cache`: `agates-geodes-gallery.png`, `geode-reveal-desktop.png`, `geode-reveal-touch.png`, and `geode-reveal-portrait.png`. Main and Claude's checkout were clean at the pre-integration check; only Codex's preview port 5191 was listening. Integration and Pages publishing follow the standing user instruction; the deployment run and final live check are recorded in the shared local handoff.

