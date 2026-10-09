# Camp upgrade roadmap — recovered scope

Source: Fossicking planning conversation with Claude Code, 9 October 2026 at 16:38:07 UTC, session `98710e5f-9097-47b4-9bb4-c09fa111abb3`. The user explicitly reaffirmed this camp-upgrade scope in this Codex chat on 10 October 2026. The list below transcribes the camp portion; regions and additional pan types remain separate work.

## Required camp upgrades

- [x] Shelter chain: **swag → tent → caravan → shed**, each visible on the claim.
- [x] **Water tank**, with a useful water supply for camp work.
- [x] **Generator**, with an operating control and power for camp equipment.
- [x] **Lights**, visibly illuminating the camp when powered.
- [x] **Lapidary shed**, where the player cuts their own stones in a skill game.
- [x] **Display room**, showing the player's actual collection.
- [x] **Kelpie companion**, visible and interactive at camp.

The existing recovery tub, sample rack, portable tailings kit and training bench complement this plan. They do not replace the shelter, fit-out, workshop, display or companion upgrades.

## Implementation constraints

Keep the existing claim and saves, distinguish new-game starter gear from migration of the old tent, prevent repeat charges or duplicated stones, preserve mouse and phone controls and Easy assistance, and retain fallback geometry. Camp purchases buy facilities and space; they do not generate gold or grant arbitrary prospecting bonuses. Document gameplay simplifications. Do not add regions or international travel as part of this slice.

## Current work

Implemented on `codex/camp-shelters`, based on `0a16aa8`, for local integration. See [CAMP.md](CAMP.md) for controls, prices, persistence and simulation limits. Prices are gameplay balancing choices. Caravan towing and travel remain part of the separate regions work.
