# WA Goldfields: Mulga Flat

Approved 11 October 2026. Branch `codex/wa-goldfields`, base `ce4afd3`.

Build one fictional WA Goldfields claim using the original mainland engine. The user approved this destination and retains the instruction to publish completed work after each run. This plan does not authorize other planned regions.

## Intended experience

Mulga Flat is an open, dry gold claim: red soil, stony ridges, a shallow dry wash, low mulga-like scrub and dry grass, pale quartz float and old shallow diggings. The user clarified the preferred landscape during the build: sparse shrubs, with no tall gum trees. This is a particular dry scrub setting, not a claim that the whole WA Goldfields is treeless. Sweep overlapping lines, investigate repeatable signals, recheck spoil and follow a discovered patch. Nuggets cluster in several irregular patches, with barren ground between them. Quartz specimens, rubbish and the existing difficulty-dependent hot rocks remain part of detecting.

The ute, camp progression, original tools, mouse lock, wheel/number selection and phone controls are reused. Samples can be processed at the existing camp recovery tub. The dry wash is not a water source: no river surface, current, creek sound, wet sieving or sluicing there. Storm rain may wet the ground, but this first dry claim has no runoff/flood simulation or flood-generated finds.

Travel opens from the local map, costs $0 and preserves each claim's worked ground, camp, vehicle and unfinished samples/pan. Money, gear and recovered finds remain shared. The local map retains always-on hillshade/contours; it shows terrain and landmarks, without target markers or helper rings. Player text contains directions and technique only.

## Build checklist

- [x] Register Mulga Flat on the existing Australia map and mainland profile/save path.
- [x] Add deterministic gold patches, shallow cover and old diggings without changing existing destinations' generators.
- [x] Dress the dry claim with the existing geological materials, low scrub, dry grass and recognizable scenery; no tall gums.
- [x] Connect dry water, audio, weather and map behavior; keep all original input and camp systems.
- [x] Test patch/barren behavior, determinism, minerals, dry hydrology and save/travel isolation.
- [x] Test actual desktop mouse lock/wheel, detecting/digging/recovery, camp, ute and map travel; check emulated phone controls/layout and offline reload.
- [x] Inspect Low and High screenshots; run the full logic suite and production build.
- [x] Review other worktrees/main/remote, integrate completed work, push main and verify GitHub Pages.

## Research and model limits

- [DBCA Goldfields region](https://www.dbca.wa.gov.au/management/plans/goldfields-region) describes eucalypt and mulga woodlands. [Goldfields Woodlands landscape](https://exploreparks.dbca.wa.gov.au/park/goldfields-woodlands-national-park) informs woodland, red ground and rocky-outcrop visual references only. This claim is not a park recreation or real prospecting-access guide.
- [GSWA geology of Western Australia](https://www.wa.gov.au/organisation/department-of-mines-petroleum-and-exploration/geological-survey-of-western-australia/geology-of-western-australia) supplies the broader Yilgarn/Eastern Goldfields setting.
- [WA Museum's Wiluna gold-in-quartz specimen](https://museum.wa.gov.au/online-collections/content/quartz-specimen-gold-1930s-wiluna) supports the specimen theme.
- [WA Museum's Goldfields vegetation overview](https://museum.wa.gov.au/explore/wa-goldfields/ancient-land/biodiverse-land) distinguishes eucalypt woodland, mulga-dominated acacia scrub and desert settings. Mulga Flat uses the scrub setting requested during the build.

Patch size, spacing, nugget counts, grades, depths and claim dimensions are gameplay parameters, not measured field data. The inherited terrain is an abstract valley/bedrock model. Dry washes can flood in reality; episodic WA runoff, water hauling, dryblowing and survival mechanics are outside this slice. Existing recovery-tub panning supplies the camp processing loop without inventing a new water economy. Existing difficulty modes remain unchanged.

## Verification and handoff

Implemented on `codex/wa-goldfields`, based on `ce4afd3`, in the isolated Codex worktree on port 5191. No dependencies, Blender generators or exported assets changed. No other agent was launched or messaged. The original engine supplies all movement, input, detection, digging, vehicle, camp, material processing and saves.

Verified locally:

- `npm test`: 77 passing logic tests, including four WA checks for deterministic patch/barren distribution, shallow gold-bearing wash, dry hydrology/topography and independent travel saves. The original New England terrain/layers still match the pre-region byte hashes.
- `npm run build`: production build passed.
- `node tests/controls.game.mjs`: actual browser pointer lock, mouse look, wheel and number keys, moving while switching, menu isolation, rejected-lock recovery and pause/resume passed in all six destinations. The original phone toolbar/brief Use-tap check also passed.
- `node tests/goldfields.game.mjs`: desktop and emulated-phone WA flow passed. It uses the real detector/dig/pickup inputs, buys a tent and recovery tub, works a field pan with mouse/finger strokes, drives the ute with keyboard/stick input, opens portrait topography/travel, reloads unfinished work, collects once and returns home/WA. Home state, WA vehicle, collected target and remaining pan contents persist. Dry tools cannot start creek panning, wet sieving, a sluice or pump, including from a saved partial pan.
- `node tests/goldfields.offline.mjs`: desktop and emulated-phone production checks passed with networking disabled before reload, then camp recovery, return home and re-entry into WA. The complete WA flow also passed with `WA_HIGH=1 WA_DESKTOP_ONLY=1` (home travel uses Low; WA uses High). It warms the existing game assets first and serves only this worktree's `dist` on an ephemeral test port.
- Screenshots of Low/High dry terrain and quartz/ironstone scenery, low shrubs, camp, pan, portrait topography and travel were inspected. The scene contains no tall gums; map contours are always on and the dry wash has no blue water. Browser checks recorded no page/console errors.

Browser scripts accept `PLAYWRIGHT_MODULE` for an external Playwright installation. `WA_BASE_URL` supports public-site verification; `WA_TOUCH_ONLY`, `WA_DESKTOP_ONLY` and `WA_HIGH` select cases. Tests use disposable storage and reposition the player to skip long walks. After actual stroke input, they accelerate the remainder of the same reserved pan through the production simulation. Phone tests are emulated; physical-phone performance remains unmeasured. The touch harness was corrected to send timed strokes within the visible canvas and leave browser fullscreen before changing orientation; game touch code was unchanged. Vehicle checks wait for movement instead of assuming a fixed number of frames in 700 ms.

Touched paths: `src/{audio,claimregions,creek,deposits,goldfields,landscape,main,map,regionmap,targets,terrain,water,weather}.js`; `tests/controls.game.mjs`; `tests/goldfields.{test.js,game.mjs,offline.mjs}`; `README.md`; this plan; `docs/LOCATION-PLAN.md`; `docs/COLLABORATION.md`.

Publication: implementation commit `362b36c69476e00db501cb2e5e77ead501f78dde` was fast-forwarded into main and pushed. [GitHub Pages run 38062954102](https://github.com/Alvaren/fossicking-game/actions/runs/38062954102) completed successfully. The full desktop and emulated-phone WA browser flow then passed against `https://alvaren.github.io/fossicking-game/`, including digging/collection, camp purchases, actual pan input, driving, portrait map/travel, reload and round-trip recovery preservation, with no page/console errors. Before integration, main and origin/main were clean/aligned at `ce4afd3`; Claude's `claude/touch-toolbar` checkout was clean at `aeb026f`, with no commits missing from main. Only Codex's 5191 preview was listening. No player or Claude server was restarted and Claude's checkout remains untouched. A documentation-only follow-up records these successful public checks.
