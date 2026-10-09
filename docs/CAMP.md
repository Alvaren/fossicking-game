# Camp shelters and wash bench

The signed bench on the far side of camp opens with **E** or the phone's **Pick up** action. It combines shelter upgrades, water and power, lapidary work, collection and companion controls, practice, captured tailings and sample storage. You can also open the camp panel by interacting with your shelter. The buyer still sells ordinary equipment and buys your finds.

## Shelter progression

New games start with a roll-out swag. Build a canvas tent for **$250**, a caravan for **$700**, then a prospector’s shed for **$1,200**. Purchases are sequential, charge once, and replace the shelter beside the campfire immediately. The panel shows the current stage, prerequisite and amount still needed. Existing saves without a shelter field retain their old tent for free; an explicitly saved swag stays a swag.

The swag is an open canvas bedroll with a low hood. The tent uses the existing canvas GLB when available and has a local geometry fallback. The caravan has a chassis, wheels, towbar, door, step and windows; it is a stationary shelter stage here, with towing/travel reserved for the separate regions work. The shed is a walk-in corrugated-iron building with an open doorway, bunk, table, covered verandah and lantern. Local geometry is batched by material for lower draw-call cost. No model download is required for the swag or shed. Tent and shed lights turn on after dusk. Collision shapes change with the structure and leave the shed doorway and central aisle open.

All stages let you sleep between 7 pm and 5 am and wake at 6 am. Sleeping advances one dawn, including after midnight, without a second day increment when the world resumes. Sleep is available from the shelter, wash bench or an owned camp facility. There are no fatigue statistics or gold-recovery bonuses.

A purchased sample rack holds **8 parcels with a swag, 12 with a tent, 16 with a caravan, and 20 with a shed**. Upgrading preserves every stored parcel and any active practice or field pan. The shelter and facilities travel with you when moving claims. Shelter costs and capacities are gameplay progression choices.

## Fit-out, workshops and companion

The original camp scope is preserved in [CAMP-ROADMAP.md](CAMP-ROADMAP.md).

| Upgrade | Cost | Behaviour |
| --- | ---: | --- |
| Water tank | $350 | 80 L supply, first fill included; cooling water for lapidary work |
| Generator | $650 | Start/stop power; 2 L starting fuel, 10 L capacity |
| Camp lights | $180 | Two visible camp floodlights; requires generator purchase and running power |
| Lapidary shed | $1,800 | Requires tank and generator; work your own rough stone in a saved skill session |
| Display room | $900 | Walk-in room with three cases showing the first 45 kept specimens; inventory browses the whole collection |
| Kelpie | $180 | Animated companion; pat, follow/stay, dry-ground movement and obstacle avoidance |

Water delivery costs $8 per 40 L, generator fuel $12 per 2 L; partial fills charge proportionally. The generator consumes 0.0008 L per active simulation second. Wet lapidary work consumes 0.015 L per work second. These are game economy values. The world and generator pause in the camp menu; fuel runs while playing or working a pan/stone. Shelter lanterns are independent of the powered camp floodlights.

Lapidary work reserves the actual selected rough stone out of inventory before shaping begins. Shape, refine and polish by following a moving guide, managing pressure and cooling water. Easy demonstrates the same stages; Realistic exposes alignment, pressure and heat damage. Work pauses on pointer/key release or power loss and can be put aside and resumed after reloading. Collecting clears the session before returning exactly one crafted stone. Kept-specimen status and identity survive cutting. The existing town cutter supplies the base cut and intrinsic result; manual finish quality and material loss determine the final value and weight. There are no free extra stones. There is no reset-to-pristine option after starting work.

This is an approachable shaping/polishing exercise, not a calibrated facet-indexing simulator or real-machine operating guide. Stone-specific cutting schedules and precise physical heat/wear are abstracted. Collection and lapidary use existing inventory/cutting systems; the town cutter still works as before.

The kelpie follows on dry ground and avoids camp colliders. During driving or mine work it heads back to camp. It has no hunger meter and does not generate finds. All purchases and operating state persist with the camp when moving claims.

## Practice and comparison

Borrow any of the three pan profiles, choose clean gravel, clay-bound wash or black-sand concentrate, then choose a 0.25, 0.5 or 1.0 load parcel. Every recipe uses the same known training grade (0.1 g per load). This deliberately visible assay is a teaching fixture, not a claim about typical Australian grades. Matching material, parcel size and difficulty produces fair comparisons across pans; the capacity-dependent fill percentage is shown explicitly.

Realistic and Prospector use the existing mouse/touch technique controls. Easy performs and animates the method. Practice difficulty is independent of the claim's difficulty. First passes are compared separately from re-panning and Easy results never count towards the Realistic 95% technique challenge. That threshold is a game goal, not a guaranteed field recovery rate. Challenge badges persist independently of the latest 36 result records.

Practice gold stays at the bench. Recording or re-panning it never awards money, inventory, discoveries or map tests. A practice pan can be put aside and resumed independently of a live field pan. Returning an unfinished borrowed parcel discards only that practice parcel; starting another completed practice replaces its training tailings. Field contents are not discarded by either action.

The reveal reports fine and coarse gold kept versus washed out. Feedback uses recorded aggressive washing, washing with an unsettled bed, clay-carried losses and the initial load ratio. These observations are not a numerical attribution of each gram lost to a single cause.

## Camp projects

| Project | Price | Function |
| --- | ---: | --- |
| Recovery tub | $75 | Pan actual bucket wash at camp; catch its outflow for another pass |
| Sample rack | $120 | Store intact bucket parcels, including partly used assays, finds and source coordinates; shelter determines capacity |
| Portable tailings kit | $240 | Requires the tub; catches outflow from newly loaded creek pans too |

Projects use existing cash earned from selling finds. Purchases are one-time and add visible camp props. The camp heading reports the actual shelter and the number of built panning projects; no project adds an automatic gold-retention multiplier. Ordinary owned pans remain available from the existing equipment shop.

Capture is assigned **when a new pan is loaded**. An uncaught pan already in progress does not gain retroactive capture by moving to camp or buying a kit. Collect the pan before reworking its tailings. Each tailings parcel is consumed when loaded, and any fresh outflow can be caught again. A live field pan must be completed before loading another parcel. Field tailings use the best owned pan by default; all profiles can be compared freely in practice.

Tailings transfer actual bulk, fine/coarse gold, clay-bound gold, pickers and unrecovered stones. Re-panning never calls the assay generator. Retained recovery plus tailings equals the original gold within floating-point precision. A recovery percentage on a second pass describes that second input, while practice also displays cumulative recovery from the original parcel. Tailings results do not create duplicate prospecting map tests.

## Saves and implementation

`state.camp` defaults safely for older saves and contains the shelter stage, projects, samples, caught field tailings, practice session, history, mastery and recovery totals. Practice and field sessions serialize separately. Collection clears the live session before crediting results. Purchases and transfers save immediately; normal periodic, visibility and unload saves remain in use. Camp facilities and stored samples/tailings travel when moving claims; sample provenance prevents old-claim samples from adding false map tests on the new ground.

- `src/campfacilities.js` / `src/campfacilitiesui.js`: facility purchases, supplies, operating controls.
- `src/campbuildings.js` / `src/kelpie.js`: visible fit-out, workshops, display cases and companion.
- `src/lapidary.js` / `src/lapidaryui.js`: reserved stones, skill simulation and pointer/keyboard controls.
- `src/shelter.js`: shelter stages, sequential purchases, storage capacity and sleep hours.
- `src/campshelter.js`: physical shelter models, fallback loading, lighting and collisions.
- `src/camp.js`: DOM-free progression, practice, tailings and diagnostic logic.
- `src/campui.js` / `src/camp.css`: responsive workbench and comparisons.
- `src/campstation.js`: lightweight procedural bench and project props, with no new asset downloads or Blender dependency.
- `src/panning.js` / `src/panningui.js`: existing simulation and input, with diagnostic counters and context-specific session handling.
- `src/main.js`: camp interaction, persistence, real rewards and world integration.

Physical teaching principles and existing model limitations remain in [PANNING.md](PANNING.md). The new prices, recipes, challenge threshold and progression are gameplay choices.

## Checks

Run `npm test` and `npm run build`. With `npm run dev:codex` on port 5191:

```powershell
npm run test:panning:browser
npm run test:panning:game
node tests/camp.game.mjs
node tests/shelter.game.mjs
node tests/facilities.game.mjs
```

Browser tests use disposable contexts and known saves. Set `PLAYWRIGHT_MODULE` to an available Playwright package if it is not locally installed. `PANNING_TEST_ORIGIN` defaults to the Codex preview. Unit checks cover gold/material conservation, repeated tailings recovery, duplicate collection, practice isolation, purchase prerequisites, storage capacities and save round trips. Full-game checks cover desktop and emulated touch entry, purchases, prop visibility, storage, independent sessions across reload, real rewards and tailings. Completion is accelerated through the same simulation for these integration checks; the separate panning browser check exercises actual mouse and touch strokes. Screenshots are saved under ignored `node_modules/.cache`.

Shelter checks cover legacy-save migration, sequential purchases, insufficient cash, exactly-once charges, capacity growth, sample preservation, fallback geometry, collision clearance, late tent loading, and desktop/emulated-touch upgrades, reload and post-midnight sleep.
