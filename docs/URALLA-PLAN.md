# Uralla — Wooldridge Reserve build plan

Requested 17 October 2026. Branch `codex/uralla`, base `dc1fc3d`. Build a separate saved NSW destination around the real Wooldridge Recreation and Fossicking Reserve on Rocky River near Uralla. Keep the original New England claim and every existing save accessible. Reuse its controls, tools, water, geology/recovery systems and polished rendering.

## Reference evidence inspected before implementation

- [Uralla visitor guide](https://www.uralla.com/Explore/Things-to-Do/Wooldridge-Fossicking-Area): reserve approximately 6 km from Uralla, reached from Kingstown Road via Devoncourt Road; camping, picnic facilities, river fossicking and mature gums.
- [Council reserve photograph](https://www.uralla.nsw.gov.au/files/assets/public/v/1/community/recreation/parks-and-reserves/wooldridgefossickers3.jpg?dimension=pageimagefullwidth&w=1140), visually inspected: a person provides scale beside enormous pale grey, rounded rectangular granite blocks; narrow dark water slots, irregular weathered faces, darker submerged margins, vegetation in gaps. These are not scattered small pebbles or pointed mountain cliffs.
- [Creek photograph by Darlene Collins](https://www.caravanparkphotos.com.au/uralla_fossicking/user1.html), visually inspected: crowded rounded boulders in a wooded reach; tall mixed smooth/rough-barked eucalypts, dense grasses and low green bank cover.
- [Pool photograph by Darlene Collins](https://www.caravanparkphotos.com.au/uralla_fossicking/user3.html), visually inspected: a broad reflective pool, sandy near margin, small emergent rocks, dense tall reeds on the far bank and continuous woodland behind.
- [Photographed reserve sign](https://campedia.s3.ap-southeast-2.amazonaws.com/location/Rocky_River_Fossicking_Area_01673467984511.jpg), visually inspected: treed camping/picnic reserve, narrow river-side parcel, access and walking paths. Small print/map dimensions are not legible enough to claim a surveyed reconstruction.
- [Council fossicking brochure](https://www.uralla.com/files/assets/urallacom/v/1/vic-info-pdfs/wooldridge-fossicking-reserve.pdf): indexed text describes very fine yellow gold and quartz in present/old creek gravel. The PDF itself returned HTTP 403 to the research reader; do not claim its map was inspected. Visitor listings also report garnets and sapphires. Rare diamonds are outside the existing find types and are not being added in this slice.
- [NSW Resources, 11 May 2026](https://www.resources.nsw.gov.au/news-articles/resources-regulator-investigating-illegal-fossicking): distinguishes approved hand fossicking from prohibited powered pumps/mechanised sluices in the Rocky River area. Keep the carried highbanker upgrade owned, but use the unpowered sluice here; no new powered mining attractions.

- [NSW Government reserve entry](https://www.nsw.gov.au/visiting-and-exploring-nsw/locations-and-attractions/wooldridge-recreation-and-fossicking-reserve): confirms the access roads, wooded camp/picnic area and river fossicking. Its linked visitor activity page returned an access error; the page title alone is not evidence of a measured gem grade.
- [GeoNames-derived reserve location](https://mapcarta.com/28670050): latitude -30.6305, longitude 151.4693, used for the national travel pin only. It does not supply the game terrain.

## Visual and gameplay contract

A recognisable boulder-lined river reserve: a large granite choke reach, open sandy sampling margins, slower reed-fringed pools, grassy wooded banks and a modest treed camp with an access track. Boulder groups must feel embedded and massive at eye height, with rounded edges, coherent pale granite grain, lichen and wet lower surfaces. Maintain open walking routes and real colliders. Preserve visible moving surface ripples and reflection detail, and do not fill every pool with foam.

Use a compact interpreted river course and descriptive names such as Boulder Reach and Reed Pool; these are game navigation labels, not asserted official place names. Layout, depths, seasonal water level, deposits and scale are authored game interpretations, not survey data, extraction advice or a promise of real finds. A fine-gold/alluvial sampling focus must not invent a local quartz reef, basalt mine, opal workings, fossil cliff or repeated large nuggets. Research photos remain references, not redistributed game textures.

## Execution checklist

- [x] U01: Inspect local photos and official descriptions; record observed features and uncertainty before changing the game.
- [x] U02: Add independent `uralla` travel/save profile, $0 fee, field notes and always-on topographic map with descriptive river reaches/access route.
- [x] U03: Build pools/shallow runs and grouped large granite boulders; preserve shared physical terrain/water/deposit agreement, collisions and walkable sampling margins.
- [x] U04: Reuse NSW high-fidelity lighting, ground, vegetation LOD and rippled water. Add only the local art/composition needed for pale rounded boulders, reed beds, sandy access and tall varied gums.
- [x] U05: Implement fine-gold alluvial sampling and supported gem mix; keep original panning difficulty, classify/sieve controls, camp and save contracts. No fabricated source attractions.
- [x] U06: Validate build, terrain/deposit/save logic, original-world regressions, desktop mouse lock/wheel/menus, touch layout/actions, panning/recovery, low/high graphics and optional-model fallback/offline reload.
- [x] U07: Inspect actual game captures at boulder reach, pool, camp and work surface against the photos; correct visible defects. Record performance evidence and remaining limitations honestly.
- [ ] U08: Commit completed work, inspect main/Claude, integrate, push main, verify Pages deployment and live files; deliver screenshots and update this checklist.

## Reuse / ownership

Own isolated worktree and port 5191. Main and Claude checked clean before claiming work. No other agent launched or messaged. New modules under `src/uralla/`; minimal integration in claim/travel, Creek/Terrain/World/Deposits, shared rendering recipe and map. Existing worlds retain their RNG/default behaviour. Optional model failure must leave solid fallback rocks and normal gameplay. Any new asset generator is deterministic, run in a fresh headless Blender process, and ships with its GLB and manifest.

## Acceptance gates

- Giant boulder reach is recognisable without helper rings, signs pointing out every find, or developer wording.
- Pools and working shallows coexist; shared mouse/touch sampling works at several accessible spots, not only a staged photograph.
- Colliders match the large visible boulders, trails remain usable, and quality changes do not alter deposits/saved ground.
- Exact old New England terrain remains unchanged; travel/reload preserves independent unfinished pans and worked soil.
- High-fidelity desktop is the art target; Low reduces foliage/detail/reflections. Emulated phone tests are not physical phone performance measurements.

## Build record

See [URALLA-BUILD.md](URALLA-BUILD.md) for the implementation, actual checks, visual comparison, limitations and publication evidence. The checklist describes this requested location slice; it does not sign off the broader six-image reference quality target.
