# Uralla / Wooldridge Reserve delivery

17 October 2026. Branch `codex/uralla`, base `dc1fc3d`; research/plan committed first as `369765d`. The [plan and sources](URALLA-PLAN.md) record actual photographs inspected before implementation. No other agent was launched or messaged. Main and Claude were clean at setup; their work is preserved.

## What is built

A separate destination from Map → Locations & travel → Uralla · Wooldridge, with a $0 fee and independent saved terrain, camp, buckets and partly worked pan. Existing New England stays accessible. The shared hillshade and 2-metre contours remain always visible; Uralla adds the access path, Rocky River and descriptive reach names to that same map.

The river has two large granite reaches, a broad quiet pool, open sampling shallows and a bank footpath. The largest stones are roughly 5–7 metres across at game scale, with conservative circular colliders matching the existing movement system. Four local granite variants have rounded rectangular joints, capped weathered outer faces, pale mineral grain and wet lower surfaces. Six cobble variants accompany them. All ten meshes are closed and connected. The local kit contains 22,632 triangles; the ten assets are replacements within the reused 42-asset NSW kit, not 52 independently loaded scene models.

The shared NSW trees, ground atlas, bank roots, meadow composition, light/weather system, ripples, reflections, instancing, distance culling and quality controls are reused. Local additions are tall mixed-height gums, denser grass around boulder reaches, reed beds and sandy access. The original shovel, hand tools, pointer lock, wheel/number keys, touch handlers, excavation, panning and camp interfaces are used directly.

Fine gold and the supported sapphire/garnet mix use the existing depth, hydraulic trap, classification and difficulty calculations. There is no invented reef, crystal pocket or large-nugget field. Your highbanker upgrade remains owned but tool 5 uses the unpowered sluice in this reserve. Deposit constants and all water depths are gameplay interpretations, not measured local yields.

## Checks and evidence

- `npm ci` and production build passed. No dependencies changed.
- 132 logic tests passed, including deterministic Uralla across three seeds, accessible shallow wash, path clearance, fine-gold trapping and separate old/new saves. Existing original-world geometry regression tests passed.
- Local kit: 11 geometry checks passed, including closed/connected surfaces without through-cuts in every rock.
- Desktop and emulated-touch game checks: actual $0 map travel, keyboard movement stopped by a giant boulder on desktop, shovel/classifier loads, mouse pan strokes / visible Easy panning, partly worked pan persistence, wet sieve agitation/flip, and return to the original saved shed/bucket. No JavaScript errors. Relocation skips walking in this fixture; sieve settling is accelerated only after exercising actual Use. [Results](audits/uralla/game/checks.json).
- Real pointer lock without `?test`, mouse look, wheel and number keys, movement while switching, menu isolation, pause/resume and tool close passed for both Uralla and original New England. Original touch toolbar/brief Use/menu recovery passed.
- Three-seed art/quality tests: loading models and switching Low/Medium/High preserve simulation, source rocks, collisions, saves and targets; actual kneeling trowel, saved cuts and reload pass. [Results](audits/uralla/regression.json).
- Offline cached reload and both 404/corrupt Uralla GLB fallback passed with identical world/collider snapshots and functioning tools. [Results](audits/uralla/resilience.json).

A close-up art audit caught Blender material names suffixed with `.001`, which the loader interpreted as slate. The local generator now exports explicit `granite_...` roles; an asset-contract test and an actual loaded-geometry check guard this. No global loader workaround was needed.

The first game fixture attempted to pan from the nearly dry sampling margin and timed out. The corrected fixture steps into the river for washing and passes. No production input workaround was added.

## Visual comparison and remaining limits

The actual council photo sets the boulder scale and rounded rectangular granite silhouette. The visitor pool photo sets the open water, sandy margin and far-bank reeds. Shared mature gums and variable height keep the reserve wooded. These references do not imply a surveyed replica: the river course, paths, reach names, terrain relief and sample positions are compressed interpretations.

The game remains stylised. Crown detail, soil microstructure and repeated procedural rock forms still differ from the source photographs and the earlier six cinematic references. Camp uses the existing progression and props; it is not a reconstruction of every toilet, picnic table or other reserve facility. Camp building upgrades remain game abstractions. No photo textures were redistributed. Physical phone performance is not measured; emulated touch verifies layout and controls only.

## Performance sample

Final build: 20-second warm-up, then one 120-second route through eight views, with an equipped camp and a worked soil patch. High at a 1920×1080 viewport, 1.5 render scale, Windows Chromium / NVIDIA RTX 3090. Frame median/p95/p99: 16.7/16.7/16.8 ms. CPU median/p95: 4.2/9.8 ms. GPU timer median/p95: 6.07/10.19 ms. 0 measured frames exceeded 50 ms. No reported JavaScript/WebGL errors.

This is a short desktop performance sample, not a long thermal soak or a physical-phone benchmark. Presets retain the large boulders and gameplay while reducing vegetation, resolution and water rendering. [Full measurements and hardware](audits/uralla/final-performance/run-1.json).

## Final screenshots

These are actual production-build captures, not generated concept art. The four working views were inspected at Low, Medium, High and Ultra, plus landscape touch, night and rain. No shader failures or wrong granite material roles remain in [the capture report](audits/uralla/final/checks.json). The Sandy Shallows west bank was cleared after the first review found reeds obscuring the work area.

Hero photographs use the existing photo mode's Natural filter with HUD/grid/stamp disabled. Boulder Reach uses its normal free camera 2.4 metres above the player; the pool, shallows and camp use the ordinary viewpoint. Matching HUD captures remain alongside them.

![Boulder Reach](audits/uralla/hero/hero-boulder-water.jpg)
![Reed Pool](audits/uralla/final/hero-pool.jpg)
![Sandy Shallows](audits/uralla/final/hero-shallows.jpg)
![Camp](audits/uralla/final/hero-camp.jpg)

## Integration

Implementation `81ec2c9` was fast-forwarded into main and published by successful [Pages run 38920322805](https://github.com/Alvaren/fossicking-game/actions/runs/38920322805). All seven live files match the tested production build, including the Uralla GLB and shared NSW GLB (HTML line endings normalised): [byte verification](audits/uralla/public.json). The complete disposable desktop/touch travel, collision, loaded granite roles, digging/classification, pan, sieve and save/return checks pass on the public URL: [public gameplay results](audits/uralla/public-game/checks.json).

Main and Claude were clean before integration. Claude has no commits missing from main; only Codex port 5191 was listening. No other checkout's gameplay files were edited directly, no dependencies changed and no user storage was cleared. This final evidence commit changes documentation/results only; the implementation and asset bytes stay fixed.

Touched code: `src/uralla/*`, shared claim/creek/terrain/world/deposit/map/sluice/rendering hooks, and a generic path-distance helper extracted unchanged from Graves Hill. Assets: only `public/models/uralla/*`, with its headless generator branch. Tests: new Uralla logic/asset/game/resilience checks, region entries in the existing control/art suites, and a Uralla route in the existing performance harness. Source references and caveats remain in documentation rather than player screens.
