# Tasmania expedition — execution plan

Status: IMPLEMENTED, VERIFIED AND INTEGRATED LOCALLY. Owner: Codex. Branch: `codex/tasmania-expedition`. Base: `7ad5b15`.

## User decision and scope

On 10 October 2026 the user chose Tasmania ahead of Victoria, inspired by Tassie Boys Prospecting: steep mountains, forest and rivers, foot access with no ute in the prospecting area, eventually leading into sniping. The user explicitly requested a written plan followed by execution. This file is the source of truth for this build; update it before handing off or stopping.

Build one fictional western Tasmanian catchment, not a replica of a creator's undisclosed locations. Preserve northeast Tasmania's sapphire rivers as a separate future region. The immediate playable loop is: prepare a pack at home, arrive at a trailhead, descend through rainforest, establish a light riverside camp, sample three connected river reaches, pan the material using existing technique controls, and walk back out with the finds. Home camp upgrades, the current claim and unfinished home pans must survive the round trip.

## Acceptance checklist

- [x] Save-safe region entry and return: existing saves default to New England; Tasmania keeps its own terrain/sample depletion, visited reaches, player position, pack and unfinished pan; rewards transfer exactly once when returning home.
- [x] Accessible departure/loadout panel from the home title/pause menu and camp. Clearly distinguish the active western Tasmania expedition from the future northeast sapphire region.
- [x] Pack selection with visible weight and capacity, using small hand equipment. Classifier and camping equipment change available actions; carried wash affects walking pace. No ute, workshop buildings or heavy processing equipment inside the catchment.
- [x] A deterministic catchment with steep valley sides, a walkable descent, three named reaches, persistent bedrock pockets, shallow crossings, pools and a cascade. The walkable route must be tested, not inferred from a screenshot.
- [x] Distinct rainforest presentation: layered trees, tree ferns, ground ferns, mossy rocks, fallen logs, cool light, mist and river ambience. Local fallback geometry and low graphics support; no dependency or asset download required.
- [x] Real sampling and recovery: limited material at persistent sites, varied grades/material, barren parcels possible, stored assays never reroll on reload. Existing mouse/touch panning and Easy demonstrations produce the actual expedition recovery.
- [x] Route/field notebook shows trailhead, camp, reaches, observations and recorded pan results. All difficulties use the original-style topographic map; Easy automates technique only.
- [x] A packable remote camp supports an overnight stop. Return requires reaching the trailhead; a clearly labelled recovery action can return a stuck player to the trailhead without a find or currency bonus.
- [x] Sniping foundations: stable pocket IDs, bedrock trap geometry, persistent remaining material/gold, and water clarity disturbed by sampling. Underwater interaction, mask/snorkel tools and sniping recovery remain explicitly deferred.
- [x] Tests cover save round trips, exact-once rewards, depletion, loadout limits, deterministic terrain and route grades. Browser checks cover desktop and touch departure, navigation, sampling, panning, save/reload, camp and return. Production build passes; inspect actual screenshots and report limitations.

## Implementation approach

Use an isolated Tasmania scene and boot dispatcher rather than changing the original claim's generator. Reuse three.js, existing panning simulation/UI, pan ownership and difficulty settings. A `src/regions.js` model owns expedition persistence and travel transactions; `src/tasmania/` owns landscape, movement and expedition UI. The normal home save remains intact, with a nested expedition snapshot and an active-region field. A departure first saves the home world; returning banks the expedition haul and clears that haul in the same saved transaction.

Keep hand-worked pockets finite across visits. Panning moves assayed gold out of pockets into parcels, then into recovery or loss; reloads and travel must not create additional gold. Region-grade constants and pack masses are gameplay choices, not measured site data. The scene is a compact catchment, not a geographically scaled journey or a survival simulator.

## Delivery order

1. Commit this plan and record file ownership.
2. Implement and test the region/save/loadout model and deterministic catchment.
3. Build the scene, route, vegetation, water and portable camp.
4. Connect home departure, expedition controls, sampling, shared panning and return.
5. Exercise real desktop/touch flows, inspect visuals, fix failures, update this checklist and commit.
6. Integrate locally only after checking main/Claude work and active servers. Publishing follows the user's current instructions; the earlier completed push is not a standing auto-deploy instruction.

## References and boundaries

- Inspiration: Tassie Boys Prospecting, [Sniping Gold Nuggets in Tasmania and a NEW RECORD!!](https://www.youtube.com/watch?v=V__2Afyqm3I). The video's description identifies a remote west-coast river. No claim to have inspected its footage or located the river.
- Separate future sapphire area: [MRT Weld River](https://www.mrt.tas.gov.au/prospecting_and_fossicking/fossicking_areas/fossicking_areas_in_tasmania/weld_river_fossicking_area), northeast Tasmania.
- Deferred: sniping tools/recovery, diving/breath mechanics, regional transport economy/ferry/caravan towing, other Australian regions, precise real-world access/permit modelling, full survival mechanics and new Blender assets.

## Execution log / resume here

- Plan created before gameplay edits. Main and Codex start clean at `7ad5b15`; Claude clean at `ea39cfa`. Existing preview belongs to Codex on 5191. No additional agent is authorized or launched.
- Implemented the complete acceptance slice. Fixed a terrain entrance cut and a nearest-segment height discontinuity found during visual and actual-scene route checks. Added a regression for small walking steps at bends.
- Passed 42 logic tests and the production build. Desktop Easy and portrait emulated-touch Realistic round trips passed: departure/loadout, real movement and sampling input, pan input, partial-pan reload, accelerated completion, exactly-once recovery, remote camp/sleep, walk-out, preservation of the home camp/ground/pan and repeated travel.
- Traversed the generated route in both directions with actual scene colliders. Existing desktop/touch camp regression tests passed. Normal pointer lock, Escape and resume worked outside test mode; portrait/landscape, journal, river, trailhead, camp and cascade screenshots were inspected. No game page errors occurred in the successful checks; existing three.js warnings remain.
- Production offline departure, rendered movement and return passed after warming the cache online. No physical-phone performance claim is made.
- Integrated into local main by fast-forward after the clean-worktree/port check: plan `e9cfa2b`, implementation `134b98c`. Main and Codex are clean; Claude remains unchanged at `ea39cfa`. Remote main remains `7ad5b15`; nothing was pushed or deployed. The next gameplay slice is sniping; do not implement it merely because foundations exist.

## Implemented structure and checks

- `src/boot.js` selects the saved region. `src/regions.js` handles immutable departure, expedition saves and atomic return transactions. The home serializer and new-claim action retain nested expeditions.
- `src/regionui.js` is the departure and kit panel. `src/tasmania/model.js` owns terrain, the walking rule, finite deterministic samples and recovery IDs; `world.js` builds instanced vegetation, river, pockets and shelter; `main.js` owns expedition input, journal, shared panning and saves.
- Pocket depletion is saved by stable site ID and sample count. A parcel's assay is fixed from its site seed and extraction index, then stored in `panContents`. Split pans conserve it. Separate submerged sniping pockets retain explicit remaining-gold/material records; bank sampling cannot consume them.
- Returning transfers bottled gold and any kept finds and clears the expedition haul in the same storage write. Gold also contributes to the existing lifetime recovery log. Camp gear is packed on return. Unworked expedition wash and a partly worked pan stay reserved in Tasmania; home samples/pan are untouched.
- Tests use fresh browser contexts, never the player's storage. Run `npm test`, `npm run build`, `node tests/tasmania.game.mjs`, `node tests/tasmania.offline.mjs`, and the existing `node tests/camp.game.mjs`. Browser scripts accept `PLAYWRIGHT_MODULE` when Playwright is installed outside the project. The offline check serves `dist/` on a disposable loopback port and closes it after testing.

## Known limits / next slice

This is a first playable catchment using procedural fallback geometry. Vegetation is stylised; there are no new Blender models or claimed reproductions of a real river. Terrain and current/depth functions are game approximations. There is no flood simulation, swimming, hypothermia or hunger system in this region. River crossings block deep water rather than simulating a dangerous swimming attempt. Pack capacity is a gear/loadout choice plus parcel slots; additional wash increases weight and slows travel rather than being rejected at the departure weight limit.

The journal supplies a route map in every difficulty. The user rejected the added world route line and sample rings; those have been removed in the locations/map-travel follow-up. Easy automates panning technique; no difficulty adds those world guides. Sniping has saved submerged pockets and bedrock geometry only: mask/snorkel handling, underwater visibility interaction, searching and gold extraction are deferred. Hand sampling temporarily clouds the water but does not yet model suspended sediment transport through the full catchment.

Browser verification covers emulated phones, not a physical-phone performance/play session. Route traversal is accelerated through the exact movement rule with the actual scene's tree/rock colliders, in both directions; the initial descent is also driven with real keyboard and CDP touch-stick input. Panning tests use actual touch strokes and Easy demonstration, then accelerate completion through the existing simulation. The production offline test warms the cache online before disconnecting, matching the existing offline support contract.
