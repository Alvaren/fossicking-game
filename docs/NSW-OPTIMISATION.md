# NSW optimisation — 16 October 2026

The user authorised the full pass: “you can do the full optimisation pass now”. Preserve published build 947414e0d0a848849c553d7433f7e0f4416a979a, including the restored water ripples. This advances the performance phase; it does not claim that every earlier reference-art gap has disappeared.

Branch: codex/nsw-optimisation. Base/main and Claude worktrees were clean; Claude's released branch remains untouched. Shared file ownership is recorded locally. No other agent is launched.

## Execution checklist

- [x] Record authorisation, branch and immutable production baseline; retain exact build/asset hashes in audits/nsw-optimisation/baseline-manifest.json.
- [x] Profile CPU/update/render costs and record three comparable ten-minute baseline routes.
- [x] Implement isolated CPU reductions backed by the diagnostic profile.
- [x] Reduce GPU submission and repeated rendering without lowering quality or removing scenery.
- [x] Check resource ownership, loading, resize/orientation and long-session memory.
- [x] Compare each candidate and retain only measured improvements.
- [x] Verify all existing quality presets and deterministic world/save behavior across three seeds.
- [x] Review matched stills/motion and run relevant controls/recovery/offline regressions across affected regions.
- [ ] Record three comparable ten-minute final routes, publish and verify the exact live build.

## Measurement contract

Production build, High at a real 1920×1080 drawing buffer on the recorded desktop GPU, isolated browser contexts, seed 12345, populated legacy-shaped camp fixture and a worked shovel patch. Route: creek, bank, woodland, reef, granite, camp, dig and downstream, with the same camera motion/time of day. Each sustained run excludes 20 seconds of warm-up and records ten minutes. Report median/p95/p99 frame, CPU and GPU times, per-site results, draw calls, triangles, heap and renderer resources. Diagnostic instrumentation and CPU sampling are separate from sustained runs.

The frozen build is served at /baseline/ and the current production candidate at / on Codex's reserved 5191 port during benchmarking. Both are immutable during their own measurement. Existing test scripts continue to use the same isolated origin. No user browser storage is read or cleared. Physical iPhone/Android hardware is unavailable in this session; emulated touch cannot certify thermal behavior.

## Findings and changes

The short diagnostic identifies render submission/uniform work and repeated scene-matrix traversal as the main CPU costs. Water makes two additional world passes at unchanged 768×432 targets on the 1080p route. NSW dressing and disturbed-ground updates also perform avoidable repeated sampling. See baseline-diagnostic/hotspots.json and the compressed CPU profile. Cold-view compilation spikes in that short diagnostic are not sustained GPU results.

Retained implementation (validated and measured below):

- Update world transforms once before reflection, refraction and the main view. Restore auto-update after rendering, including errors; leave the separate tool scene alone.
- Batch explicitly static direct children of old shaft props, claim pegs, the buyer's table and camp facilities by identical material and render settings. Preserve UVs, shadow flags, parent animation and collision records. Leave transparent parts, custom shaders, interactive models and child groups independent. This extends the batching approach already used by camp shelters.
- Index only byte-identical vertices in NSW foliage geometry. Preserve every attribute, triangle order, face normal, colour and silhouette. No tolerance, smoothing, quantisation or reduction of foliage density.
- Skip scene-water captures only when the actual water surface is outside the camera frustum. Keep the original water mesh, ripples, targets and visible-water refresh rate.
- Cache stable ground/dressing/support calculations. Terrain edits, excavation, placed equipment, collected embedded finds, quality changes and crossing the sampled grid invalidate the appropriate work. Upload only affected terrain attribute spans after digging. Keep neutral grass colour in the LOD packing path instead of overwriting/uploading the same colours every frame.

Rejected experiments are retained as measurement records, not shipping code. Spatial tiles reduced triangle counts but increased JavaScript/driver submissions. Larger tiles helped CPU cost but did not deliver the needed GPU saving. Native multi-draw foliage cut triangle submission further but added per-instance culling/texture overhead and regressed frame times on the tested renderer. The final candidate retains the existing instancing and terrain render paths.

| Short candidate (64 seconds, 20-second warm-up) | Median CPU ms | Median GPU query ms | p95 GPU query ms | Median calls |
| --- | ---: | ---: | ---: | ---: |
| Contemporaneous baseline | 15.1 | 10.95 | 25.25 | 1096 |
| 40 m spatial tiles — rejected | 15.6 | 11.61 | 30.13 | 1338 |
| 80 m spatial tiles — rejected | 13.6 | 11.49 | 24.19 | 1313 |
| Native multi-draw — rejected | 16.8 | 12.06 | 30.71 | 1160 |
| CPU/cache changes, experimental culling disabled | 10.1 | 9.21 | 20.68 | 1109 |
| CPU/cache plus static props | 9.5 | 8.69 | 17.52 | 974 |
| Plus exact foliage indexing | 9.2 | 8.47 | 18.14 | 977 |

These short tests select candidates; they do not replace the required three ten-minute final routes. Runtime/system variation is present, so final reporting includes repeated and per-site results. No dependency, preset or model asset file changes are required.

Acceptance targets chosen after the first two sustained baselines: at least a useful 15% reduction in median CPU and GPU work, no material regression in per-site p95 work (investigate >5%), and no worse sustained p99 frame pacing. These are candidate-selection targets, not promises or achieved results. First two baseline medians are 13.5/12.4 ms CPU and 10.01/9.69 ms GPU; p95 CPU is 28.6/28.5 ms. Final reporting retains every run and every route segment.

The desktop refresh cap can hide savings, so frame interval alone is insufficient. GPU timing measures submitted GL work, not device-wide utilisation, power or VRAM. Renderer geometry/texture/program counts and post-GC JS heap checks indicate bounded resources but are not a driver-memory measurement. No physical phone thermal claim is made.

The existing 5,832,052-byte optional environment GLB remains unchanged. Export-time quantisation or mesh/texture compression would add a separate decode/visual-validation change; lossless runtime indexing is included above. This pass removes the measured redundant submission and CPU work. Existing material textures/mipmaps, authored near geometry, original fallback assets and offline paths remain intact. No worker is introduced: the measured simulation cost is small relative to rendering and does not justify transfer/synchronisation overhead.

The completed sustained measurements and visual-preservation checks are recorded below.

## Validation

123 logic/asset/rendering tests and the production build pass. All eight matched High views have been inspected: preserved geometry/materials/shadows and ripples, with small differences from animated tools/leaves/wildlife. Three seeds (1, 12345, 798887) preserve source world data through model loading and quality changes; actual trowel excavation survives save/reload. Missing and corrupt optional kits retain original scenery and working tools. Production service-worker fetching initially bypassed the failure-injection route; the test now blocks service workers only for those two injected failures, with real offline behavior tested separately.

Repeated Low/Medium/High/Ultra cycling and portrait/landscape resizing pass for both builds (14 full cycles each). The last five cycles hold at 756 → 644 geometry resources, 32 → 32 textures and 149 → 149 programs. A SpriteMaterial variant appears once at cycle 4 in both builds, then stays flat; the initial overly early shader-plateau assertion and the extended diagnostic are retained. Post-GC heap is about 127–128 MB baseline and 132–134 MB candidate: bounded CPU caches add roughly 5 MB, rather than claiming a memory reduction. These counts do not measure driver VRAM.

Local production loading (one cold and two cached loads per build): baseline 18.92 s / 3.61 s / 3.48 s, candidate 19.34 s / 3.82 s / 3.72 s. These are observed startup-to-ready times including procedural generation and cold shader work, not network-only timings or a statistical loading-speed claim. The candidate adds roughly 0.2 s on these cached reloads; the optional GLB is unchanged. Actual cached reload resource transfers are zero. Full resource timings are in the two `*-resources.json` files.

The camp regression now advances its existing synthetic completion fixture through the same simulation module in Node, then restores the result into the disposable browser. This removes its Vite-only `/src/lapidary.js` import; real hold/release input, reload, physical-room access, lighting and exactly-once collection remain tested in the built game.

The 12 active High foliage prototypes/LODs retain their 248,688 triangle-index entries but reuse 183,909 exact attribute-identical vertices (26.0% fewer unique vertex records). Combined geometry attribute/index buffers fall from 10,942,272 to 8,589,372 bytes (21.5%). This is a buffer-size calculation, not a claim of total GPU-memory reduction; submitted triangle counts remain essentially unchanged.

Separate short diagnostic (48 s + warm-up, CPU sampling/per-pass timers enabled): main-world median GPU query 4.85 → 4.39 ms, reflection 1.34 → 1.22 ms, refraction 1.68 → 1.33 ms. Refraction p95 varied upward 4.15 → 4.46 ms in this short sample, so whole-frame and per-site sustained measurements remain the acceptance evidence. Tool/environment pass cost is tiny. NSW decoration update p99 fell 5.4 → 2.6 ms; other simulation systems remain unchanged. These instrumented numbers must not be mixed with whole-frame GPU measurements.

All four presets have paired stills; the eight High views and three views each at Low, Ultra and Medium touch were inspected. Normal-input walking/turning/wheel switching was recorded for both builds, with seven paired decoded movement samples reviewed (see `motion-review-*.jpg` and `visual-review.json`). This is sampled-frame review, not an exhaustive temporal-art or physical-device certification.

Night/headlamp, high flood, off-screen water and photo capture pass on both builds. Photo capture exercises the extra high-resolution draw from a lower screen resolution and restores the previous resolution. A first night comparison caught mismatched transient environment maps after an artificial hour jump; waiting beyond the existing 1.5-second environment refresh and holding the hour gives matching settled night lighting. Initial evidence is retained; no production lighting change was needed.

Built offline reload of NSW desktop and northeast Tasmania touch passes. Desktop/touch camp facilities pass purchases, live generator/lights, display stones, room entrances/floors, lapidary hold/release, reload and exactly-once collection. Panning passes partial-load persistence and sub-milligram exactly-once rewards. See `validation.json` and `check-9.txt`.

## Coverage decisions

The original terrain mesh and vegetation instance batches are retained after the measured culling experiments regressed GPU time. Static batching is restricted to small props/facilities with matching material/render flags; interactive/grouped/transparent/custom-shader parts remain separate. The map-wide claim pegs are a tiny geometry budget: batching trades their fine-grained bounds for far fewer submissions, covered by route measurements. Source colliders and seeded world-generation RNG calls are unchanged.

No shadow-resolution, coverage, water-target size, visible-water cadence, material roughness, texture or preset values are reduced. Foliage alpha coverage/overdraw is retained to preserve the signed-off look; the vertex reuse and fewer submissions address measured cost without changing coverage. Existing mipmaps stay enabled. Mesh/texture compression and workers were evaluated as separate pipeline/complexity costs with no measured benefit in this slice, so neither was introduced. GPU shadow work is included in the main-world query; separate shadow submission CPU cost is instrumented, not a standalone GPU shadow counter.

Remaining validation limit: all Low/Medium/High/Ultra settings and emulated touch/orientation cases run on desktop Chromium. No recent iPhone/Android device or thermal/power instrumentation is connected. B9-07 keeps that physical-device follow-up explicit; emulation is not used to lower the art benchmark or assert phone performance.

## Reproduction

Run from the owning worktree with lockfile dependencies (`npm ci`), the same recorded Chromium/ANGLE backend and no concurrent GPU workload. Build the base commit separately into the ignored `node_modules/.cache/nsw-optimisation-baseline/` directory; its manifest must match `baseline-manifest.json`. Build the candidate normally with `npm run build`. `serve.mjs` exclusively owns port 5191 and serves the frozen baseline at `/baseline/`. It is a production comparison server, not an extra fallback dev port. Set `PLAYWRIGHT_MODULE` to the installed Playwright package when required.

```text
node docs/audits/nsw-optimisation/serve.mjs
node docs/audits/nsw-optimisation/profile.mjs baseline
node docs/audits/nsw-optimisation/profile.mjs candidate
node docs/audits/nsw-optimisation/compare.mjs
```

The profile defaults to three 600-second runs plus 20 seconds of warm-up each. Do not run baseline and candidate concurrently. Short experiments set `OPT_SECONDS=64`, `OPT_RUNS=1`; diagnostic records additionally set `OPT_DIAG=1` and optionally `OPT_PASS_GPU=1`. Per-pass timer results are not whole-frame GPU results. `capture.mjs`, `motion.mjs`, `resources.mjs`, `edge-cases.mjs` and the serial `validate.mjs` retain test fixtures and commands. All browser fixtures use disposable contexts. Their model-failure cases explicitly block service workers; the separate offline check exercises the real service worker.

Weather-control audit: the fixed fixture selects Realistic before `Weather` is constructed. Its first natural storm is scheduled after `(360 + random*180) * 2.5`, at least 900 simulated seconds. Each fresh context completes roughly 22 seconds of loading plus 620 seconds of warm-up/measurement, below that minimum; the timed route remains in calm weather. This bound cleared an initially suspected ten-minute weather confound without changing or discarding the runs. Rain/flood are exercised separately by the rendering-edge checks.

## Final sustained results

Three ten-minute routes per build, each after 20 seconds of warm-up, High at a real 1920×1080 buffer on Ryzen 9 5950X / RTX 3090 / Chromium 151 (ANGLE D3D11). Tables below use the median of the three per-run statistics, not a cherry-picked fastest run. Full distributions, per-site samples and resource histories remain in [`comparison.json`](audits/nsw-optimisation/comparison.json) and the compressed samples beside each run.

| Whole-frame measure | Baseline | Candidate | Reduction |
| --- | ---: | ---: | ---: |
| CPU median ms | 13.50 | 10.50 | 22.2% |
| CPU p95 ms | 28.60 | 24.00 | 16.1% |
| CPU p99 ms | 33.70 | 31.60 | 6.2% |
| GPU median ms | 10.01 | 9.10 | 9.1% |
| GPU p95 ms | 22.16 | 18.00 | 18.8% |
| GPU p99 ms | 26.00 | 22.43 | 13.7% |
| Draw calls median | 1099.00 | 980.00 | 10.8% |
| Draw calls p95 | 2711.00 | 2081.00 | 23.2% |

Frame interval median/p95/p99 is 16.7/33.4/33.4 ms before and 16.7/33.3/33.4 ms after. The refresh cap keeps the median at 60 Hz, so this is reduced frame work rather than a claimed 22% increase in displayed FPS. Worked-ground frame p99 improves 50 → 33.4 ms; downstream improves 33.4 → 16.8 ms. Median submitted triangles remain essentially unchanged (17,814,204 → 17,814,868; +0.004%), with small dynamic visibility/animation differences.

| Run | CPU median / p95 ms | GPU median / p95 ms | Frame p99 ms |
| --- | ---: | ---: | ---: |
| baseline 1 | 13.50 / 28.60 | 10.01 / 22.16 | 33.40 |
| baseline 2 | 12.40 / 28.50 | 9.69 / 21.72 | 33.40 |
| baseline 3 | 15.30 / 37.80 | 10.81 / 26.00 | 50.00 |
| candidate 1 | 10.50 / 24.00 | 9.16 / 18.00 | 33.40 |
| candidate 2 | 10.50 / 23.30 | 9.10 / 17.83 | 33.40 |
| candidate 3 | 10.00 / 28.00 | 8.77 / 20.26 | 33.40 |

| Route section | CPU median before → after ms | CPU p95 before → after ms | GPU median before → after ms | GPU p95 before → after ms |
| --- | ---: | ---: | ---: | ---: |
| creek | 11.60 → 8.50 | 16.80 → 11.40 | 7.43 → 7.00 | 11.32 → 9.80 |
| bank | 11.90 → 9.00 | 17.60 → 12.60 | 9.92 → 8.24 | 12.06 → 10.80 |
| woodland | 9.60 → 6.80 | 14.10 → 9.40 | 6.51 → 5.57 | 9.08 → 8.22 |
| reef | 18.30 → 13.00 | 24.70 → 19.10 | 12.74 → 10.35 | 17.01 → 13.74 |
| granite | 12.10 → 8.70 | 14.90 → 12.20 | 7.61 → 6.88 | 10.40 → 9.77 |
| camp | 27.60 → 22.00 | 32.80 → 31.30 | 20.82 → 16.20 | 25.20 → 21.03 |
| dig | 27.20 → 21.40 | 35.40 → 32.10 | 21.68 → 15.65 | 26.20 → 24.04 |
| downstream | 17.60 → 12.40 | 22.50 → 17.50 | 12.92 → 11.03 | 16.08 → 13.21 |

Decision: retain the candidate. The 15% median CPU target is exceeded; the 15% median GPU target is **not met** (observed 9.1%). GPU p95 improves 18.8%, all eight repeated per-site CPU/GPU p95 figures improve, and frame p99 is unchanged or better. No preset or visible effect is lowered to chase the target. Run-to-run variation remains visible, especially baseline run 3 and candidate run 3; every complete result is retained. These are measured desktop improvements, not universal-device guarantees.

No page/console/GL errors were recorded in the six sustained routes. Resource counts rise as previously unseen objects/material variants warm, with 50 textures and 145 programs at every route endpoint; the separate repeated-preset post-GC checks establish the stable-cache plateau. Timed-run heap includes growing instrumentation arrays, so it is not used as the leak test.
