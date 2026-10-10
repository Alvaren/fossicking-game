# Tasmania expedition — execution plan

Status: IN PROGRESS. Owner: Codex. Branch: `codex/tasmania-expedition`. Base: `7ad5b15`.

## User decision and scope

On 10 October 2026 the user chose Tasmania ahead of Victoria, inspired by Tassie Boys Prospecting: steep mountains, forest and rivers, foot access with no ute in the prospecting area, eventually leading into sniping. The user explicitly requested a written plan followed by execution. This file is the source of truth for this build; update it before handing off or stopping.

Build one fictional western Tasmanian catchment, not a replica of a creator's undisclosed locations. Preserve northeast Tasmania's sapphire rivers as a separate future region. The immediate playable loop is: prepare a pack at home, arrive at a trailhead, descend through rainforest, establish a light riverside camp, sample three connected river reaches, pan the material using existing technique controls, and walk back out with the finds. Home camp upgrades, the current claim and unfinished home pans must survive the round trip.

## Acceptance checklist

- [ ] Save-safe region entry and return: existing saves default to New England; Tasmania keeps its own terrain/sample depletion, visited reaches, player position, pack and unfinished pan; rewards transfer exactly once when returning home.
- [ ] Accessible departure/loadout panel from the home title/pause menu and camp. Clearly distinguish the active western Tasmania expedition from the future northeast sapphire region.
- [ ] Pack selection with visible weight and capacity, using small hand equipment. Classifier and camping equipment change available actions; carried wash affects walking pace. No ute, workshop buildings or heavy processing equipment inside the catchment.
- [ ] A deterministic catchment with steep valley sides, a walkable descent, three named reaches, persistent bedrock pockets, shallow crossings, pools and a cascade. The walkable route must be tested, not inferred from a screenshot.
- [ ] Distinct rainforest presentation: layered trees, tree ferns, ground ferns, mossy rocks, fallen logs, cool light, mist and river ambience. Local fallback geometry and low graphics support; no dependency or asset download required.
- [ ] Real sampling and recovery: limited material at persistent sites, varied grades/material, barren parcels possible, stored assays never reroll on reload. Existing mouse/touch panning and Easy demonstrations produce the actual expedition recovery.
- [ ] Route/field notebook shows trailhead, camp, reaches, observations and recorded pan results. Easy adds clear route/target assistance; Realistic relies on visible country and observations.
- [ ] A packable remote camp supports an overnight stop. Return requires reaching the trailhead; a clearly labelled recovery action can return a stuck player to the trailhead without a find or currency bonus.
- [ ] Sniping foundations: stable pocket IDs, bedrock trap geometry, persistent remaining material/gold, and water clarity disturbed by sampling. Underwater interaction, mask/snorkel tools and sniping recovery remain explicitly deferred.
- [ ] Tests cover save round trips, exact-once rewards, depletion, loadout limits, deterministic terrain and route grades. Browser checks cover desktop and touch departure, navigation, sampling, panning, save/reload, camp and return. Production build passes; inspect actual screenshots and report limitations.

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
- Next: implement region persistence and the deterministic catchment, then connect the playable scene.
