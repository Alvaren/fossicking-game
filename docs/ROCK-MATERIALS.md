# Recognisable rock surfaces

## Requested slice and execution plan

The user requested better in-game rock/boulder textures so granite, rhyolite, basalt and other existing geological rocks look recognisable. Base `1028e21`, branch `codex/rock-materials`. Retain existing geometry, source locations, random streams, collisions, finds, flood transport, boulder splitting, controls and saves.

1. Add one deterministic, shared material library for granite, rhyolite, basalt, reef quartz, ironstone and slate. Granite has interlocking pale/pink feldspar, grey quartz and dark mica; rhyolite has fine pink matrix, subtle flow bands and sparse larger crystals; basalt is dark and fine grained, with occasional small pits rather than pervasive scoria holes. Quartz is cloudy and fractured, ironstone rusty and mottled, slate finely layered.
2. Generate reusable colour and height/roughness texture atlases in code, with padded tiles and distance filtering. Project textures in three directions at a consistent metre scale, avoiding stretched UVs on existing meshes. Retain instancing and share textures; no external requests or new dependency. Existing mesh geometry remains the fallback.
3. Assign rock types in the existing mainland scenery generator without consuming extra random draws. Connect granite tors, splittable granite/quartz boulders and mobile creek cobbles. Reuse the same materials in both Tasmania destinations, including their existing slate slabs and granite/basalt gravels. Preserve split-face and cavity information.
4. Capture the old and new game views, inspect the material close-ups and their appearance at normal walking distance. Check Low/touch, split boulder rendering, all five locations, original controls, browser errors, stable world layout, offline production loading and the build. Document actual results.
5. Commit the completed update, integrate main, publish and verify GitHub Pages under the standing user instruction.

## Reference and limits

[Australian Museum: igneous rock types](https://australian.museum/learn/minerals/shaping-earth/igneous-rock-types/) describes coarse plutonic granite with quartz/feldspar and mica/amphibole, and fine volcanic rhyolite and basalt. [Classification of igneous rocks](https://australian.museum/learn/minerals/shaping-earth/classification-of-igneous-rocks/) distinguishes composition and texture. Textures here are authored approximations with slightly enlarged detail for legibility, not photographs or claims that every specimen of a rock type has an identical colour or texture. Weathered surfaces and fresh split faces differ. Geological labels do not imply guaranteed mineral rewards.

## Validation and handoff

Implemented through the existing scenery, boulder and bedload systems. Six rock types share two 1024 x 512 atlases, 4 MiB of base pixel data total (about 5.33 MiB on the GPU including mipmaps). Atlas generation measured about 221 ms in the local Node runtime; this is not a phone performance benchmark. Grain scale follows metres rather than stretching to fill each boulder. Wrapped gutters and capped mip footprints prevent adjacent rock types bleeding into each other; fine detail fades towards each rock's average colour at distance. Fresh split faces retain grain-dependent roughness; cavity masks retain their darker lining and small crystal glints.

Touched paths: `src/rocktextures.js`, `src/rockmaterials.js`, `src/world.js`, `src/boulders.js`, `src/bedload.js`, `src/tasmania/world.js`, this plan, and `tests/rocks.game.mjs` / `tests/rocks.offline.mjs`. No dependency, saved-data, terrain-generation, collision, control, mesh-generation or Blender changes.

Completed checks:

- `npm test`: all 62 existing logic tests pass. No simulation behavior was added.
- `npm run build`: passes.
- `node tests/rocks.game.mjs`: all five destinations render their rock materials without page/console errors. Desktop wheel/number-key selection and emulated touch selection pass. New England and northeast Tasmania have dedicated touch passes. Captured and inspected a six-rock material gallery, matched original granite views before/after, a split granite boulder with a crystal cavity, and regional/phone screenshots.
- Seed 12345 exactly preserves the deployed `1028e21` static-instance transforms, split-boulder identities/contents/locations and surface-find IDs/positions. Static layout SHA-256: `66480178c1dd58ac0820151a23f824f6d69a5ce8e48ac8b46f39180971e9236a`. Animated leaf planes are excluded; initial mobile cobble transforms were also compared unchanged. Their pre-existing save format rounds positions to centimetres, so offline reload compares their saved snapshot separately.
- `node tests/rocks.offline.mjs`: built game cached through the existing service worker, network disabled, and reload verified for New England desktop and northeast Tasmania touch. Static layout, saved cobbles, geological shader rendering and tool selection pass without errors.
- `node tests/controls.game.mjs`: normal browser pointer lock (no test bypass), look, wheel/number keys, walking while switching, menu isolation, pause/resume, rejected-lock recovery and tool closing pass in all five destinations. The existing touch toolbar/use/menu regression check also passes.

The New England desktop pass also succeeds with high shadows, antialiasing and full gem materials. A redundant high-setting gallery capture failed in headless Chromium after the gameplay screenshots had succeeded; the high-setting pass was rerun successfully without regenerating the already-inspected gallery. Pages deployment and public verification are recorded in the shared local handoff.

Visual checks use actual game materials and meshes. The gallery puts the existing tor mesh in a neutral preview scene for side-by-side comparison. Boulder splitting is posed directly to inspect both face/cavity shaders; the splitting simulation is unchanged. Tests use disposable browser storage, emulated touch and software-driven Chromium, not a measured physical phone GPU. Graphics checks cover the changed surfaces; the soil/terrain texture and silhouettes remain the existing artwork.

Screenshots are ignored local artifacts under `node_modules/.cache`: `rock-materials-gallery.png`, `rocks-granite-before.png`, `rocks-granite-after.png`, `rocks-split-desktop.png`, and regional/touch captures. Codex preview remains on 5191. Main and Claude's worktrees were clean at integration inspection; ports 5187/5188/5190 were inactive. The shared local handoff records the final commit and deployment run.
