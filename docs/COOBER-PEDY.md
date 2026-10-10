# Coober Pedy execution plan

Approved 11 October 2026. The user accepted the Coober Pedy destination proposal and explicitly requested underground homes and workings to explore. Branch `codex/coober-pedy`, base `480d3bc`. Codex owns the files listed in the shared coordination claim. Main and Claude were clean at inspection; Claude's worktree remains untouched. No other agent is involved.

## Scope and implementation order

- [ ] Add **Coober Pedy / Painted Ridge** to the existing mainland profiles and $0 travel map. Pale dry terrain, low sparse vegetation, existing opal mullock heaps, old shafts and a camp/ute. Preserve the original topographic map and controls.
- [ ] Build **Lantern House**, a furnished dugout with lounge, kitchen, bedroom and specimen nook, and **Old No. 4**, an older rough-cut home with sleeping quarters and a storeroom. Give them separate visible entrances, ventilation pipes, warm lights, believable rock ceilings and doorways. Interiors must be walkable rooms, not journal screens.
- [ ] Build **Colour Rise workings**: an underground entrance drive with branching galleries, tool marks, equipment, geological bands and finite opal-bearing faces. Inspect with the headlamp and use the existing hammer to recover seeded potch, milky/crystal opal and occasional opalised shell; some faces are barren. Keep homes separate from extractable rock.
- [ ] Reuse `updateUnderground` and the shared mouse lock/wheel/touch inputs. Extend the existing mine interface for multiple entrances and floor-plan collision; do not introduce a replacement player controller. Door interaction transfers between surface entrance and buried interior, then walking is continuous between rooms. This is a bounded interior network, not arbitrary tunnel excavation.
- [ ] Save underground position, worked faces and recovered items with the claim. Restore safely, prevent duplicate finds, preserve home/other destinations, and keep camp cutting/polishing/display/selling on the existing collection path. Restrict this region's opal mix to suitable varieties without changing old claims.
- [ ] Verify deterministic yields, connected walkable rooms, walls/furniture, saved depletion and travel isolation. Run all logic tests and production build. Exercise actual desktop and emulated-phone entry, walking, look, tools, extraction, reload, surface return and map travel. Inspect interior/exterior screenshots on Low and High; check offline production loading and normal desktop pointer lock.
- [ ] Commit completed work, integrate cleanly into main, push and verify Pages under the user's standing publishing instruction. Record actual checks and limitations below.

## Research and abstractions

- [SA Department for Energy and Mining — Opal](https://energymining.sa.gov.au/industry/minerals-and-mining/mineral-commodities/opal): Coober Pedy opal occurs in weathered sedimentary host rocks; productive horizons often lie around the sandstone/claystone transition. The game uses pale host rock, darker clay bands and discontinuous seams, not a guaranteed continuous ore layer.
- [Coober Pedy tourism — underground living](https://www.cooberpedy.com/underground-living-dugouts/): underground homes can contain generous rooms and connected dwellings. Furnished domestic space should feel distinct from narrow mine drives.
- [District Council — community](https://www.cooberpedy.sa.gov.au/community): early dugouts developed from mines; later homes were purpose-built. The two fictional homes reflect that contrast.
- [Coober Pedy tourism — fossicking](https://www.cooberpedy.net/opals/fossicking): noodling searches discarded mullock for overlooked opal. Reuse the game's existing hand excavation and surface chips.

Painted Ridge and its dwellings/workings are fictional, compressed game spaces. Routes, access, support geometry, yields and extraction time are abstractions, not a real mine access or engineering guide. New features in this slice do not include player-built underground housing, freely excavated tunnels, a full town or additional destinations. Development notes stay here, not in player-facing UI.

## Execution and verification

Plan written before gameplay changes. Implementation and actual checks to be recorded here.
