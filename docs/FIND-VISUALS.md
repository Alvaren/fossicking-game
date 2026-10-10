# Find visuals

## Request and scope

Improve the models and materials of gems and finds. Build on the existing mesh factories used by the sieve, world, cabinet and inventory. Keep natural rough distinct from professionally cut stones. Base: bc82f97; branch: codex/find-visuals.

## Execution plan (implemented and validated)

1. Capture the current inventory appearance in disposable browser saves.
2. Build a small, deterministic Blender library of worn crystal habits: sapphire, zircon, spinel, garnet, topaz, scheelite and rough opal. Preserve scale, origin and the existing procedural fallbacks. Export only this library using a fresh headless Blender process.
3. Add stable shape variation and restrained colour zoning, inclusions and surface wear. Improve gold silhouettes and agate banding. Preserve saved finds, values, grades and random assay sequences.
4. Improve the existing inspection lighting and framing, keeping its mouse/touch controls. Retain the simple material path without transmission for Low graphics.
5. Check actual game renders on desktop and touch, all new meshes and fallback loading, rough/cut/opal/gold/crystal views, rotation and zoom, console/shader errors, tests and production build.
6. Commit and integrate completed work, push main under the standing publishing instruction, and verify GitHub Pages.

## Asset contract

Blender source uses Z up; glTF exports Y up. Rough gem mesh data is centred at the origin with identity node transforms. Dimensions match the existing gemSize scale; crystal library names and tool models remain untouched. Three variants per mineral share cached geometry. Visual variation derives from existing find fields and does not consume gameplay randomness.

Blender MCP is not connected on localhost:9876. Blender 5.2.2 LTS is available directly for isolated headless builds.

## References and limits

- GIA, [sapphire quality factors](https://www.gia.edu/sapphire-quality-factor): barrel/spindle forms guide the rough corundum silhouette.
- Three.js, [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): transmission, attenuation and clearcoat remain within the existing physical rendering pipeline.
- Wear, inclusions and opal colour are visual approximations, not mineral identification or a simulation of crystal optics. Asset variants do not indicate extra value or change the grade of a saved find.

## Validation and delivery

Implemented 10 October 2026 in the isolated Codex worktree. No dependencies, save fields, assay RNG, find values or controller systems changed.

- New `blender/build_finds.py` exports 21 worn/chipped habits to `public/models/finds.glb` (200,048 bytes; every mesh under 800 triangles). Three cached variants per mineral; existing crystal point and tool assets are unchanged.
- Shared find factories use stable visual identity, colour zoning (including parti sapphire), fine wear and cloudy inclusions. Opal flashes vary with viewing angle and the saved pattern/brightness. Agate contours are continuous; nuggets have unequal lobes and hollows. Cut stones retain their existing cutting geometry.
- The existing inventory uses baked softbox reflections, neutral backlighting and aspect-aware framing. Pointer cancellation releases rotation correctly. Low graphics retains zero-transmission gem materials.
- Surface finds receive the streamed geometry after loading, preserving their positions, pickup IDs, materials and fluorescence. A missing new library falls back to the existing procedural shapes.

Checks completed:

- `npm test`: 56 passed.
- `npm run build`: passed.
- `node tests/finds.game.mjs`: 24 examples in each of desktop HQ, emulated-touch Simple, and missing-model fallback. Verified shader compilation, finite geometry, all 21 mesh bounds/budgets, stable saved identity, unchanged state/find data, streamed ground models, actual drag/wheel input and portrait/landscape framing. No unexpected console or page errors.
- `node tests/finds.offline.mjs`: built production game on an ephemeral loopback port; full-quality sieve result rendering, ground models, service-worker caching of the new GLB, and offline reload/inspection passed without errors.
- Before/after galleries and desktop, phone, sieve and offline screenshots were inspected. GPU performance on a physical phone has not been benchmarked.

The browser checks use Playwright through `PLAYWRIGHT_MODULE` when it is installed outside this repository. Disposable contexts own their saves. `FIND_BASE_URL` runs the game check against a publication, and `FIND_MODES` can select desktop-hq, touch-simple or fallback.

All files in this change belong to Codex. Claude's checkout was clean and remained unchanged. Main integration and publishing use the standing user instruction; no force-push or player-server restart is needed.

