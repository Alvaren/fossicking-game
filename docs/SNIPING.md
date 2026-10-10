# Western Tasmania sniping

## Approved scope — 11 October 2026

Build underwater searching, crevice work, disturbed visibility and direct gold recovery in the three existing western Tasmania pools. Reuse Easy, Prospector and Realistic, the shared pointer lock/wheel/keyboard/touch controls, expedition storage and travel banking. No new location, difficulty selector, swimming controller or world helper markers.

## Execution checklist

- [x] Add an optional mask/snorkel, crevice pick and snuffer kit to the existing pack selector; allow repacking it at the western trailhead.
- [x] Expand existing saved pocket balances into deterministic, finite crevices without replenishing old saves. Preserve exposed material and recovered/lost gold across reload and travel.
- [x] Build a close-up 3D underwater work view entered from the bank beside each reach. Search with mouse/touch look and WASD/stick; use the shared wheel/number selection and held Use input.
- [x] Fan loose cover, pick compacted crevice fill, then snuff exposed gold. Firm strokes cloud the water and can sweep exposed fine gold downstream. Stop working to let visibility return.
- [x] Easy visibly demonstrates the sequence while Use is held; Prospector and Realistic are manual, using the existing difficulty key. Assays never change on switching modes.
- [x] Record each recovered crevice in the field journal and the existing expedition gold balance exactly once. Leaving the pool restores the bank position; menus and browser focus loss release held inputs.
- [x] Verify material/gold conservation, migration, barren cracks, depleted pockets, save/reload and one-time travel banking with focused tests.
- [x] Check real desktop mouse lock, look, wheel, keys and menus; emulated touch search/use/release/layout; visuals at Low/High; existing panning/sieving and all-location controls; production build and offline use.
- [x] Inspect final diff, integrate safely, push main and verify GitHub Pages plus the live feature.

## Model and technique

The basic sequence is informed by Steve Herschbach's first-person account of [sniping at Mills Creek](https://www.detectorprospector.com/magazine/steves-mining-journal/sniping-gold-mills-creek-alaska/): search bedrock cracks with a mask, remove or fan aside covering material, work cracks with a small tool and recover exposed gold with a snuffer/suction bulb. This is technique inspiration, not a reconstruction of a real Tasmanian site.

The close-up pool is an authored working area representing the existing saved bedrock pocket. Entry from the bank abstracts getting into position. It does not simulate diving, breath, immersion safety or swimming. Underwater geometry, magnification of tiny gold, pack weights, gold distribution, sediment settling and force thresholds are game approximations, not measured geology or hydrodynamics. Suspended sediment changes visibility; it is separate from the ledger for material removed from the crevices. Fine gold swept out is tracked as downstream loss and cannot be reclaimed from a separate regenerated pocket.

## Ownership and delivery

Branch `codex/sniping`, base `a4cf4016cfe0d31e0ef51c2c5de8796b71d5d21a`, Codex worktree/port 5191. Main and Claude's checkout were clean and both local ownership claims released before work began. No other agent is launched or messaged. Publishing is authorized by the user's standing instruction.

## Implementation and verification

- `src/sniping.js` owns deterministic crevices, cover removal, sediment, finite gold, migration and recovery transactions. An old pocket's remaining balances are the new ledger's starting balances; neither changing difficulty nor revisiting refills it. Each pool contains twelve cracks, including three barren ones. Prospector tolerates stronger strokes before loss; Realistic is less forgiving. Easy runs the same sequence with gentle work.
- `src/tasmania/snipingview.js` uses the existing renderer, rock textures and gold material. Seeded slate lips, gravel, compacted fill, black-sand heavies and gold are shown in a mask view with moving light and sediment fog. Local geometry supplies the tools; no model downloads or Blender rebuilds are required. Re-entering releases old geometry and instance buffers.
- The shared expedition controller routes its existing mouse lock, wheel, number keys, look, movement and held Use into the work view. No second input listener system was introduced. Walking anchors remain outside deep water. Pausing releases input and freezes work; returning to the bank preserves its position. A portrait test exposed non-cancelable touch events; the shared touch handlers now check `cancelable` before calling `preventDefault`.
- Existing travel banking and save storage are used without changes to the home serializer. Recovery depletes its crack and credits the expedition in one saved object. The sniping kit weighs 1.1 kg, respects the existing pack limit, and can be added/removed at the trailhead. Other equipment defaults are unchanged.

Checks performed on isolated saves, never the player's storage:

- `npm test`: **73 passed**, including seven new conservation, migration, sequencing, difficulty, route-access, pack and travel tests. `npm run build` passed.
- `tests/sniping.game.mjs`: real desktop pointer lock and emulated landscape/portrait touch; look, wheel/keys, tool/strength selection, held fan/pick/snuffer input and release, visible gold, repeat-collection prevention, menu isolation, unchanged bank position, reload and one-time home banking. Reopening a worked pool also preserves it.
- `SNIPE_EXTRAS=1`: actual held Easy input completed a crack; accelerated calls through the rendered work view then demonstrated fan, pick and snuffer across the entire finite pool. This does not claim a full real-time playthrough of every crack.
- `tests/sniping.offline.mjs`: built desktop and landscape-touch recovery, reopening, reload and return home passed with the network disconnected after visiting both scenes online, matching the existing cache-on-use contract.
- `tests/controls.game.mjs`: all five locations passed actual desktop lock/look/wheel/number/menu/failure recovery; original phone toolbar, quick Use, pan and menu release checks passed.
- `tests/northeast.game.mjs`: desktop and portrait touch passed the existing route/collider, movement, sampling, sieve input/reload/collection and direct western-travel checks, preserving independent pan and sieve saves.
- High graphics inspection covered entry from route banks into all three pools. Actual firm fanning removed exposed gold. A dense-silt visual fixture obscured the bed; resting cleared it. Low desktop and both phone-layout screenshots, High pool screenshots and dense-silt presentation were inspected. Seed 12345 work views rendered roughly 21–23k triangles in 46–48 calls; these are draw counts, not physical-device frame rates.

There are no new breath, swimming or survival mechanics. Gold is enlarged for legibility. Each view represents a finite authored bedrock patch, with local settling rather than whole-river sediment transport. Phone checks are browser emulation; physical-phone performance and immersion audio have not been measured.

## Published handoff

Implementation commit `f75019a9abb76485fa83ceb41bbdcd48b5818e33` was integrated into clean, inactive main by fast-forward and pushed under the standing publishing instruction. [GitHub Pages run 38059608472](https://github.com/Alvaren/fossicking-game/actions/runs/38059608472) succeeded. The public game then passed the desktop and landscape-touch sniping checks, including recovery, reopening, reload and return banking, in fresh browser contexts. No outstanding implementation work remains in this slice. This final documentation update does not change the tested game assets.

Touched paths: `README.md`, `docs/SNIPING.md`, `docs/TASMANIA-PLAN.md`, `src/sniping.js`, `src/regions.js`, `src/regionui.js`, `src/tasmania/main.js`, `src/tasmania/snipingview.js`, `src/tasmania/sniping.css`, `src/touch.js`, and the three `tests/sniping.*` files. No dependencies, home gameplay files, terrain generation, Blender sources or exported assets changed. Claude's clean `claude/touch-toolbar` checkout was preserved. Codex preview remains on 5191.
