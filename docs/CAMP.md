# Camp wash bench

The signed bench on the far side of camp opens with **E** or the phone's **Pick up** action. It combines practice, captured tailings, sample storage and three functional camp projects. The buyer still sells ordinary equipment and buys your finds.

## Practice and comparison

Borrow any of the three pan profiles, choose clean gravel, clay-bound wash or black-sand concentrate, then choose a 0.25, 0.5 or 1.0 load parcel. Every recipe uses the same known training grade (0.1 g per load). This deliberately visible assay is a teaching fixture, not a claim about typical Australian grades. Matching material, parcel size and difficulty produces fair comparisons across pans; the capacity-dependent fill percentage is shown explicitly.

Realistic and Prospector use the existing mouse/touch technique controls. Easy performs and animates the method. Practice difficulty is independent of the claim's difficulty. First passes are compared separately from re-panning and Easy results never count towards the Realistic 95% technique challenge. That threshold is a game goal, not a guaranteed field recovery rate. Challenge badges persist independently of the latest 36 result records.

Practice gold stays at the bench. Recording or re-panning it never awards money, inventory, discoveries or map tests. A practice pan can be put aside and resumed independently of a live field pan. Returning an unfinished borrowed parcel discards only that practice parcel; starting another completed practice replaces its training tailings. Field contents are not discarded by either action.

The reveal reports fine and coarse gold kept versus washed out. Feedback uses recorded aggressive washing, washing with an unsettled bed, clay-carried losses and the initial load ratio. These observations are not a numerical attribution of each gram lost to a single cause.

## Camp projects

| Project | Price | Function |
| --- | ---: | --- |
| Recovery tub | $75 | Pan actual bucket wash at camp; catch its outflow for another pass |
| Sample rack | $120 | Store eight whole bucket parcels, including partly used assays, finds and source coordinates |
| Portable tailings kit | $240 | Requires the tub; catches outflow from newly loaded creek pans too |

Projects use existing cash earned from selling finds. Purchases are one-time and add visible camp props. Camp titles progress with the number of built facilities; no project adds an automatic gold-retention multiplier. Ordinary owned pans remain available from the existing equipment shop.

Capture is assigned **when a new pan is loaded**. An uncaught pan already in progress does not gain retroactive capture by moving to camp or buying a kit. Collect the pan before reworking its tailings. Each tailings parcel is consumed when loaded, and any fresh outflow can be caught again. A live field pan must be completed before loading another parcel. Field tailings use the best owned pan by default; all profiles can be compared freely in practice.

Tailings transfer actual bulk, fine/coarse gold, clay-bound gold, pickers and unrecovered stones. Re-panning never calls the assay generator. Retained recovery plus tailings equals the original gold within floating-point precision. A recovery percentage on a second pass describes that second input, while practice also displays cumulative recovery from the original parcel. Tailings results do not create duplicate prospecting map tests.

## Saves and implementation

`state.camp` defaults safely for older saves and contains projects, samples, caught field tailings, practice session, history, mastery and recovery totals. Practice and field sessions serialize separately. Collection clears the live session before crediting results. Purchases and transfers save immediately; normal periodic, visibility and unload saves remain in use. Camp facilities and stored samples/tailings travel when moving claims; sample provenance prevents old-claim samples from adding false map tests on the new ground.

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
```

Browser tests use disposable contexts and known saves. Set `PLAYWRIGHT_MODULE` to an available Playwright package if it is not locally installed. `PANNING_TEST_ORIGIN` defaults to the Codex preview. Unit checks cover gold/material conservation, repeated tailings recovery, duplicate collection, practice isolation, purchase prerequisites, storage capacities and save round trips. Full-game checks cover desktop and emulated touch entry, purchases, prop visibility, storage, independent sessions across reload, real rewards and tailings. Completion is accelerated through the same simulation for these integration checks; the separate panning browser check exercises actual mouse and touch strokes. Screenshots are saved under ignored `node_modules/.cache`.
