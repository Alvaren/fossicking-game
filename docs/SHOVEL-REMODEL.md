# Shared shovel remodel — 16 October 2026

Branch: codex/shovel-remodel. Base: 3fe3cb909a93ac6cc2ed7238b90d6652b8ba0804. User request: rebuild the poor shovel head, and recommend the next map to upgrade using the current New England level as the benchmark.


## Socket correction — user review, 16 October 2026

Branch: codex/shovel-socket. Base: 0c0c12e. The user approved the handle and shaft but rejected their connection to the head. The former capped cylinder and overlapping bent tube looked like separate fittings sitting on the blade. This correction supersedes that junction; the first delivery below remains a historical record.

The socket and blade now form one connected steel pressing. A 39 mm bore with a 2 mm wall surrounds the existing shaft, whose end seats 110 mm into the socket. The neck narrows and flattens into the blade shoulders, with one small transverse rivet. The head has an 18-degree rake; its centre moves 60 mm farther along the unchanged shaft axis to put the wooden end inside the socket, above the blade heel. The attached dirt load follows the head frame. Handle, shaft, D-grip fittings, root pivot, tool controls, animations and gameplay are preserved. Hash comparisons prove the approved wood positions/normals/UVs, wood texture and 2,496 grip-fitting vertices are identical to the base version.

Construction reference: [Cyclone Digging & Shifting Shovel](https://cyclone.com.au/products/digging-shifting-shovel), including its front and side photographs showing a socket flowing into a pressed round-mouth blade. This is a generic game model, not a dimensional reproduction of that product. Dimensions above describe the implementation.

- [x] Inspect real construction and diagnose the overlapping geometry.
- [x] Replace the junction while preserving the approved handle and shaft.
- [x] Verify a single connected, closed head with consistent winding, positive volume and finite, non-degenerate triangles.
- [x] Production build and all 123 existing tests pass.
- [x] High/Low desktop and Medium touch landscape/portrait: select shovel, dig with genuine input, see movement and dirt load, release, save and reload collected parcels. No recorded console/page errors or shader failures.
- [x] Inspect front, back, side, held and loaded views of the actual runtime model.
- [ ] Publish main, verify matching deployment/files and run public desktop/touch checks.

[Former junction](audits/shovel-socket/before/head.jpg) · [New junction](audits/shovel-socket/after/junction.jpg) · [Profile](audits/shovel-socket/after/profile.jpg) · [Rear](audits/shovel-socket/after/back.jpg) · [In game](audits/shovel-socket/after/high-held.jpg) · [Input/save checks](audits/shovel-socket/after/checks.json) · [Geometry and preservation hashes](audits/shovel-socket/geometry.json).

Budget: 7,136 visible triangles / 7,216 loaded; 314,200 geometry bytes, 131,072 texture bytes before mipmaps. Still 3 draws / 4 loaded, with no extra textures, downloads, rendering passes or per-frame model work. These are geometry/resource counts, not a fresh GPU benchmark. Studio inspection adds neutral fill lighting to reveal both faces; held screenshots retain normal game lighting. Phone checks use emulation. The prior all-region controls and offline checks were not rerun for this model-only correction.

Only src/models/shovel.js changes production code. Supporting changes are this record, docs/COLLABORATION.md, the reusable capture script's optional output/detail views and docs/audits/shovel-socket/. The Golden Triangle proposal and every environment remain unchanged.

## Delivered model

The original shared shovel was a rectangular box blade with a separate cylindrical socket, straight handle and torus grip. The replacement has a closed, shallow pressed-steel bowl with rounded shoulders, a digging point, a curved neck, rolled foot treads, a tapered wooden shaft, D grip and socket rivets. PBR steel has a restrained brushed finish and lighter cutting-edge wear; the timber has fine longitudinal grain. These generated textures are bundled code with no extra network request.

This is the existing Three.js viewmodel's procedural model path, isolated in src/models/shovel.js. No Blender asset loader or separate tool implementation was needed. src/tools.js calls the builder and keeps the same root position, animation group, load visibility, switching and digging timing. The dirt load is aligned to the new blade face. Digging yields, terrain removal, tool bindings and save data are unchanged. All locations using the shared shovel receive the remodel; no map art was changed.

[Before in game](audits/shovel/before/high-held.jpg) · [After in game](audits/shovel/after/high-held.jpg) · [Complete model](audits/shovel/after/model.jpg) · [Blade close-up](audits/shovel/after/head.jpg) · [Loaded blade](audits/shovel/after/head-loaded.jpg) · [Touch landscape](audits/shovel/after/touch-held.jpg) · [Touch portrait](audits/shovel/after/portrait-held.jpg)

The head is 24.3 cm wide and 33.4 cm long, with a 3.5 mm steel skin. The complete tool uses 3,984 visible triangles, 4,064 with a dirt load, versus the old 284/320. The additional geometry resolves a close-up hero prop; it does not increase environment detail. Matching materials are merged: 3 visible draws / 4 loaded, down from 4 / 5. Geometry occupies 275,992 bytes and the two small textures 131,072 bytes before mipmaps. No new per-frame model work or GPU pass is added. See [geometry budget and topology](audits/shovel/geometry.json).

## Checks

- [x] Lockfile install, production build and 123 existing tests pass.
- [x] The blade has finite non-degenerate triangles, closed edges and consistent winding, with positive enclosed volume. An initially reversed rim winding was found by the geometry audit and corrected before publication; the audit script is retained.
- [x] Inspect final High/Low and desktop/touch/portrait views, plus isolated blade/load views.
- [x] Check genuine mouse/touch digging, visible load animation and saved parcel persistence against the final build.
- [x] Complete existing seven-region normal-control and desktop/touch mainland recovery checks.
- [x] Publish main and verify the matching Pages run, production bytes and public-game smoke checks.

Capture uses disposable saves with seed 12345 and fixed hour 11. Camera placement skips walking; digging uses genuine mouse or touch Use events. Isolated studio shots render the actual runtime model; the loaded studio shot explicitly turns on the same dirt mesh for placement inspection. No user's browser storage is changed. Touch emulation verifies presentation/input, not physical-phone performance. Earlier NSW reference-art gaps are unrelated and remain documented.

## Verification detail

The initial mainland desktop run passed. The initial touch run reached the existing sieve-input assertion before a usable settling sample; its diagnostic state shortly afterwards showed positive stratification and no browser errors. The fixed-count loop and post-release sample were timing-sensitive. The harness now follows the needle for up to 20 seconds and requires an observed settling value above 0.015 during genuine input, rather than testing a later decaying value above 0.005. It still does not write stratification until that input assertion passes. [Initial diagnostic](audits/shovel/mainland-initial.txt). No sieve gameplay code changed. The final touch rerun passes digging/recovery, real jig input/flip, five-location travel, maps, reload and independent saves. [Final mainland checks](audits/shovel/mainland-checks.txt).

The seven-region normal-control suite ran before the final blade-rim normal correction. The exact final build is covered by the geometry audit and High/Low/Medium touch captures with genuine digging, load animation and save/reload. [Capture checks](audits/shovel/after/checks.json), [normal controls](audits/shovel/control-checks.txt), [build](audits/shovel/build-check.txt), [123 tests](audits/shovel/unit-tests.txt).

## Next environment recommendation

[Golden Triangle / Ironbark Gully](GOLDEN-TRIANGLE-ART-PLAN.md) is proposed next. The plan fixes current NSW quality as the minimum benchmark, identifies reusable rendering/input/save machinery and separates regional box–ironbark/reef/old-workings art. It contains checkable stages for baseline, shared helpers, first-scene quality, full-route coverage, regression/performance evidence and publication. This run does not implement that environment upgrade.

## Publication and handoff

Implementation cb9c6af338e381cf55dbc4f82c8ab062c8e59f9c was fast-forwarded into clean main and pushed. [Pages run 38887543851](https://github.com/Alvaren/fossicking-game/actions/runs/38887543851) succeeded. [Six-file public verification](audits/shovel/publication.json) matches generated JS/CSS and the existing NSW model byte-for-byte; HTML matches after line-ending normalisation. [Public High desktop and touch checks](audits/shovel/public/checks.json) pass the new shovel model, genuine digging and dirt animation, parcel persistence and reload, with no recorded page/console errors or failed shaders.

Production changes are limited to src/models/shovel.js and the existing src/tools.js builder. The narrow tests/mainland.game.mjs change makes the genuine-input settling check robust to execution timing. Supporting paths are this record, the Golden Triangle proposal, the collaboration guide and docs/audits/shovel/. Other agents' work and the user's browser storage are untouched; no dependencies, gameplay rules, environment models or save fields changed. Main and Claude were clean, with no additional ready commits to integrate. The final documentation/evidence commit and its successful deployment are retained in the shared local coordination handoff.
