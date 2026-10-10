# Locations and map travel — execution plan

Status: COMPLETE for the confirmed Northeast Tasmania and shared map/travel slice. Branch: `codex/location-travel`. Base: `6ca7a41`.

## User requirements / corrections

The user requested a few more playable locations, visible/selectable through the map, with a travel fee set to $0 for now. Every local map must always show topography like the original claim map. The user rejected the Tasmania sampling rings and world route line: Easy automates technique, and does not authorize added world guidance. Follow the existing game design; do not invent further guidance systems.

The confirmed next location is Northeast Tasmania, the second Tasmanian destination in the existing plan, as clarified by the user. Other regions remain planned. Do not treat a highlighted blip in the planning visualization as a selected build instruction.

## Acceptance checklist

- [x] Remove Tasmania's sampling rings and world route line in every difficulty.
- [x] Reuse the original map's hillshading, 2-metre contours and water treatment for all local maps. No difficulty switch or overlay toggle disables topography.
- [x] Expose destinations through the map on desktop and phone; show the travel fee explicitly as $0. Keep a single configurable fee source and apply the transaction once.
- [x] Record the user's chosen locations here before implementing their distinct terrain, geology and supported prospecting loops.
- [x] Preserve each location's worked ground and unfinished work; travel must neither duplicate rewards nor discard existing home/Tasmania saves.
- [x] Verify selected destinations, fee handling, round trips and topography with focused tests and desktop/touch browser checks. Inspect actual map/scene screenshots and run the production build.

## Execution log

- Read README, collaboration rules and original map code. Main/Codex clean at `6ca7a41`; Claude clean at `ea39cfa`. Reusing the isolated Codex worktree and 5191 preview. No other agent launched.
- Original map uses a cached terrain raster, north-west hillshading, 2-metre contours and water shading. The Tasmania journal used a different coarse shaded raster; replace it with the shared original algorithm.

- Shared work implemented: the original topography algorithm is in src/topography.js and used by New England and Tasmania. Tasmania's world rings and route line are removed in every difficulty.
- The local map opens an Australia destination selector using the earlier planning-map outline and catalog. At that initial shared-map checkpoint, playable destinations were New England and Western Tasmania; other blips explicitly remain Planned and cannot be travelled to. Travel fees are defined once as TRAVEL_FEE = 0 and applied in the saved transition. Both home and Tasmania maps expose the selector.
- User-requested map travel can return home from the Tasmania journal; the older trailhead return remains available. This supersedes the earlier trailhead-only travel restriction. Home/expedition pan, depletion and reward preservation remain unchanged.
- Passed 45 logic tests, production build, and desktop / portrait emulated-touch browser checks for opening travel from the local map, selecting/cancelling destinations, blocked unbuilt locations, a $0 round trip preserving money/gold, detailed topography and absence of world guides. Screenshots inspected. No page errors in those checks.
- The user subsequently confirmed Northeast Tasmania as the next build. Its implementation and verification are recorded below; the earlier pending-selection state is superseded.

## Confirmed next build: Northeast Tasmania (10 October 2026)

The user reminded us that Tasmania was planned as TWO destinations. Build the previously documented northeast sapphire/zircon river next, alongside the existing western gold catchment. This selection completes the two-destination Tasmania plan. Other Australian locations remain planned; they are not authorized by this reminder.

- [x] Distinct fictional northeast alluvial valley inspired by Weld River/Moorina: gentler river terraces, granite/basalt gravel, forest and shallow working banks. Access starts at a roadside track, unlike the western mountain descent. No new driving system in this slice.
- [x] Three reachable sampling reaches with finite, seeded sapphire/zircon/spinel wash and occasional topaz; black-sand heavies include abstracted cassiterite. Real distributions inform the mineral mix, not numerical game yields.
- [x] Classifier choice affects oversize and usable wash. Reuse the original wet-sieve jig/settle/flip technique and recovery rules: hold/release mouse or touch to control intensity, excess jigging loses small stones, Easy visibly performs the correct technique. Retain the existing pan as an alternative.
- [x] Persist partly worked sieves, pans, parcels and depleted ground independently for each destination. Fixed parcel assays prevent reload/reroll exploits. Bank recovered finds exactly once on a travel transaction; retain home camp and unfinished home work.
- [x] Enable Northeast Tasmania's existing blip with $0 travel, including direct travel between both Tasmanian locations. Use the same always-on original topography and no added world helper rings/route lines.
- [x] Verify route traversal, depletion, classifying, sieve outcomes, save/resume and reward conservation; exercise desktop and emulated touch map travel, sampling and sieving; inspect both scene and topographic map; run production build and western-region regression.

Research: [Mineral Resources Tasmania — Weld River fossicking area](https://www.mrt.tas.gov.au/prospecting_and_fossicking/fossicking_areas/fossicking_areas_in_tasmania/weld_river_fossicking_area) documents sapphire, zircon, spinel, cassiterite and occasional topaz in alluvium derived from granite, basalt and other rocks. Public road/track approaches distinguish this northeast inspiration from the remote west. This is a fictional compressed game river, not a surveyed site or access/permit guide. Sniping remains later western-region work.

## Completed northeast slice / resume here

Both Tasmanian destinations are implemented. Western Tasmania is Fern River gold country (panning now, sniping later); Northeast Tasmania is Tin Fern River gem wash (classifying, wet sieving and the existing pan). New England remains the home claim. All three local maps use the original always-on topography. Travel is selected from the country map and charges the single configured fee, currently $0, once per transition. Other regions remain Planned.

- Northeast has three reaches and 18 finite sampling pockets; its shallower valley, broad river, granite/basalt gravel, forest density and roadside approach differ from the steep western catchment. Existing procedural geometry is reused; no new Blender assets or surveyed terrain are claimed.
- NE parcel assays use the existing gem generator with a seed tied to the exact site and extraction count. Classifying changes the retained material and sieve processing time, not the underlying assay. Clay and unscreened wash take longer. Cassiterite is abstracted as dark heavy material, not a new sellable gem.
- Wet sieving shares the original recovery formula and animated tool. Mouse/touch hold-release and keyboard Space control the jig; F/button flips. Easy demonstrates settling and the flip. A revealed result stays visible until collected. Gem picking and screen-size losses remain simplified; there is no new hand-picking minigame.
- Each expedition retains its own depletion, bucket, pan and sieve. Direct NE ↔ west travel banks the departing haul once and preserves all unfinished work. Recovered stones receive stable IDs/provenance/specimen grading and contribute to the home mineral log when banked. Home camp and unfinished home pan remain intact.

Validation: 51 logic tests pass; production build passes. Northeast desktop and portrait emulated-touch checks cover map entry, all route segments with actual scene colliders, actual move/scoop/jig/release/flip input, saved sieve reload, duplicate-collection rejection, direct west/NE/home travel, and simultaneous unfinished pan/sieve preservation. Western desktop/touch panning/camp/round-trip regression and original map travel checks pass. Scene, local map and sieve screenshots inspected. A production offline check enters both regions, walks in the west, renders Easy wet sieving and collects in the northeast, then returns home after warming the cache online. No page errors in successful checks. Existing three.js deprecation warnings remain. Phone checks are emulated; physical-device performance is not measured.

Commands: npm test; npm run build; node tests/northeast.game.mjs; node tests/tasmania.game.mjs; node tests/maptravel.game.mjs; node tests/tasmania.offline.mjs. Browser scripts accept PLAYWRIGHT_MODULE for the external Playwright installation. They use disposable saves and accelerate route/completion work through the actual simulation after checking real inputs.

Delivery: Codex worktree on codex/location-travel, based on 6ca7a41, preview 5191. Local main integration follows the previously authorized workflow after clean-status/fetch/port checks. No push or deployment is part of this slice. Main and Claude were clean before integration; only Codex's 5191 was listening.

Integration outcome: local main was fast-forwarded to implementation commit `2367bfa` after a successful fetch, clean main/Claude checks and confirmation that no player/Claude/LAN preview was listening. Codex and main contain the same completed location build. Claude remains unchanged at `ea39cfa`; remote main remains `7ad5b15`. Nothing was pushed or deployed.

## Player-facing copy correction

The user rejected development commentary in the field journal. Removed the game-balancing/fictional-site captions, future-sniping section, implementation language about saved state/reward transactions, and the equivalent northeast/sieve/travel commentary. Journals retain route information, map-reading help, real prospecting technique, controls and useful progress. Research, simplifications and future work remain documented here. AGENTS.md now records this copy rule so later additions keep developer notes out of the game.

Copy correction validation: production build passed. Inspected the rendered western desktop journal and northeast portrait-touch journal, wet-sieve text and unavailable-destination message in disposable browser contexts; no page errors. No gameplay or simulation changes.
