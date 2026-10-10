# Locations and map travel — execution plan

Status: IN PROGRESS. Branch: `codex/location-travel`. Base: `6ca7a41`.

## User requirements / corrections

The user requested a few more playable locations, visible/selectable through the map, with a travel fee set to $0 for now. Every local map must always show topography like the original claim map. The user rejected the Tasmania sampling rings and world route line: Easy automates technique, and does not authorize added world guidance. Follow the existing game design; do not invent further guidance systems.

Specific next locations are pending the user's selection from the earlier Australia plan. Shared map/travel/topography work can proceed independently. Do not treat a highlighted blip in the planning visualization as a selected build instruction.

## Acceptance checklist

- [x] Remove Tasmania's sampling rings and world route line in every difficulty.
- [x] Reuse the original map's hillshading, 2-metre contours and water treatment for all local maps. No difficulty switch or overlay toggle disables topography.
- [x] Expose destinations through the map on desktop and phone; show the travel fee explicitly as $0. Keep a single configurable fee source and apply the transaction once.
- [ ] Record the user's chosen locations here before implementing their distinct terrain, geology and supported prospecting loops.
- [ ] Preserve each location's worked ground and unfinished work; travel must neither duplicate rewards nor discard existing home/Tasmania saves.
- [ ] Verify selected destinations, fee handling, round trips and topography with focused tests and desktop/touch browser checks. Inspect actual map/scene screenshots and run the production build.

## Execution log

- Read README, collaboration rules and original map code. Main/Codex clean at `6ca7a41`; Claude clean at `ea39cfa`. Reusing the isolated Codex worktree and 5191 preview. No other agent launched.
- Original map uses a cached terrain raster, north-west hillshading, 2-metre contours and water shading. The Tasmania journal used a different coarse shaded raster; replace it with the shared original algorithm.

- Shared work implemented: the original topography algorithm is in src/topography.js and used by New England and Tasmania. Tasmania's world rings and route line are removed in every difficulty.
- The local map opens an Australia destination selector using the earlier planning-map outline and catalog. Current playable destinations are New England and Western Tasmania; other blips explicitly remain Planned and cannot be travelled to. Travel fees are defined once as TRAVEL_FEE = 0 and applied in the saved transition. Both home and Tasmania maps expose the selector.
- User-requested map travel can return home from the Tasmania journal; the older trailhead return remains available. This supersedes the earlier trailhead-only travel restriction. Home/expedition pan, depletion and reward preservation remain unchanged.
- Passed 45 logic tests, production build, and desktop / portrait emulated-touch browser checks for opening travel from the local map, selecting/cancelling destinations, blocked unbuilt locations, a $0 round trip preserving money/gold, detailed topography and absence of world guides. Screenshots inspected. No page errors in those checks.
- Remaining work: user has been asked which 2–3 planned locations to build. No answer received yet. Record those names and their existing-plan scope here before adding their terrain/prospecting loops. Shared changes are committed in Codex's worktree and previewed on 5191; no merge, push or deployment for this incomplete location slice.
