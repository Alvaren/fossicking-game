# Gold panning

## Playing

Select the pan with **3**, wade into the creek, then click or tap **Use**. A partly worked pan can be reopened after putting it aside, even when the bucket is empty.

Choose an owned pan and how much of the next bucket load to take. Unloaded material stays in the bucket. Around half full is the default; clay and fine concentrates reward lighter loads. The displayed fill is limited by the material actually available. Easy chooses a half-full-or-less load and demonstrates the same method automatically.

On Realistic, drag directly on the pan with the mouse or a finger. Stroke speed is measured relative to the displayed pan size. The stage buttons select the operation; tilt, submersion and the working lip remain adjustable. Prospector uses the same controls with reduced loss sensitivity.

1. **Break clay:** rub clumps under water to disperse them. Their bound gold becomes available to settle. Washing unbroken clumps out can carry that gold away.
2. **Stratify:** keep the bed submerged and the pan level; use controlled side-to-side or circular strokes. Overloading slows sorting; excessive shaking remixes it.
3. **Wash a layer:** lift to the waterline and tip the coarse-riffled lip slightly forward. Faster strokes and steeper tilt remove material more aggressively. The bed becomes disturbed as layers leave; return to stratifying between washes.
4. **Reveal:** once light material is mostly gone, turn to the smooth lip and use slow strokes with a shallow tilt to fan black sand away from the gold. The reveal remains visible until collected. Barren pans finish with no gold.

Phone portrait mode has quick action buttons immediately below the pan. Pointer release/cancellation, window blur and hiding the tab stop hand input. Keyboard alternative: focus the pan and hold an arrow key for controlled movement; Shift makes it aggressive. Escape puts the pan aside.

## Pan differences

| Pan | Capacity in load units | Behaviour |
| --- | --- | --- |
| Standard riffled | 1.0 | Coarse traps and a smooth finishing edge; starter pan |
| Deep-riffle | 1.4 | Strong coarse retention and more capacity; slower settling and cleanup |
| Dual-riffle finishing | 0.85 | Smaller load, quicker sorting, dedicated fine riffles |

Existing pan upgrade levels unlock these profiles. You can choose an earlier owned pan, rather than automatically replacing it. Pan upgrades no longer multiply generated gold.

## Model and persistence

`src/panning.js` contains the DOM-free model. Bulk material comprises gravel, sand, silt, clay and heavies; clay breakup transfers mass to silt. Gold has fine and coarse fractions, including a bound fraction when clay is present. Retained material plus tailings is conserved. Free gold loss responds to stratification, overfill, speed, tilt, trap strength and packed fine riffles. Fine gold is more mobile than coarse gold. Pickers and stones are discrete finds with retention rules.

An assay is made once when a bucket parcel is first loaded. Partial loads divide that same assay and discrete finds; neither reopening nor splitting rerolls contents. Lean expected grades can produce zero colours. The 0.25 mg assay unit, relative capacities, clay fractions, time compression and retention coefficients are game parameters, not calibrated measurements or a full fluid/particle solver. Visual flecks are enlarged and capped for legibility, not a count of every natural grain. Clay amounts are derived from the existing terrain layer and deposit context, with safe defaults for old saves.

The save gains `panSession`; older saves without it start with an empty pan. Bucket remainders retain `panVolume`, `panMix` and `panContents`. The active pan is saved during work, when put aside, on tab hiding and on unload. Collection clears the session before crediting the result, preserving sub-milligram recoveries without duplicate awards. Crushed ore and sluice concentrates enter the same panning loop. Existing ore liberation assumptions are retained.

The 3D world stays on its last frame during the close-up to avoid spending mobile GPU time on an obscured scene. The pan itself is drawn with Canvas 2D; no new Blender model or runtime dependency is needed.

## Technique references

- [US Forest Service recreational gold-panning guide, pages 14–15](https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5274730.pdf): submerged clay breakup, level shaking, alternating agitation and dipping, and final black-sand separation.
- [BLM Kenai Peninsula gold-panning guide, p. 10](https://www.blm.gov/sites/blm.gov/files/documents/files/PublicRoom_Alaska_kenai-goldpanning-booklet-2018_FINAL.pdf): a half-full submerged pan, classification and using the riffled edge.
- [Garrett pan kit technique](https://garrett.com/garrett-gold-pan-kit/): classification, settling, controlled washing and retrieval.

These support the teaching sequence. They do not validate the game's numerical coefficients or claim that one universal pan fill suits all material.

## Verification

- `npm test`: simulation tests for conservation, clay, losses, loading, profiles, barren material, completion and save round trips.
- `npm run build`: production Vite build.
- Start `npm run dev:codex`, then `npm run test:panning:browser`: mouse and actual emulated-touch gestures, released input, persistence, reveal, duplicate collection and Easy demonstration.
- `npm run test:panning:game`: full game entry at the creek, partial loads, reload/resume and exactly-once sub-milligram rewards.

Browser checks use an available Playwright installation without adding it to the game's runtime dependencies. Set `PLAYWRIGHT_MODULE` to its package directory if it is bundled outside the project. `PANNING_TEST_ORIGIN` defaults to `http://127.0.0.1:5191`. Tests use isolated browser contexts and disposable saves; they never clear a player's existing browser storage. Screenshots are written into the ignored `node_modules/.cache` directory.
