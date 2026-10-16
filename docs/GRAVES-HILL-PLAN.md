# Graves Hill - locality and build plan

Status: implemented; final publication verification pending. Owner Codex, branch `codex/graves-hill`, base `11ced10`.

The user explicitly selected authenticity over a generic regional reskin and authorised choosing a real Central Queensland locality. Selected: **Graves Hill fossicking area, near Sapphire**, centred on Mount Clifford and Millionaires Hill. Implement a compact playable interpretation of its documented relationships, not a surveyed replica. Do not silently alter NSW/Uralla or other destinations in this slice. Every future locality must have a real reference audit before its landscape recipe is chosen.

## Evidence and reference contract

1. [Queensland Government field notes](https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/central-qld/graves-hill): Mount Clifford shallow workings, generally 300-400 mm; angular/rounded billy, silicified sandstone and quartz in brown soil. Millionaires Hill: 200-300 mm wash in dark-red/chocolate soil. A local granite outcrop; bouldery former-channel wash and deeper workings toward the east. Water is carried from Sapphire.
2. [Official locality map](https://www.qld.gov.au/__data/assets/pdf_file/0029/488045/graves-hill-fossicking-area-map.pdf), visually inspected 16 October 2026: Ruby Creek follows the northern/western boundary, joining Retreat Creek northeast. Graveshill Road crosses SW to NE; Mount Clifford is south of Millionaires Hill; Graves Hill is NE. No central, permanently flowing creek. Preserve these spatial relationships in a compressed map.
3. [Firsthand Graves Hill photograph](https://havehomewilltravel.com/rubyvale/) (caption Graves hill, DSC_1117-Large.jpg), inspected in-browser: irregular open eucalypt woodland, slender rough/dark trunks, sparse crowns and dead limbs, grassy interspaces, red/brown rutted track, modest wooded rises in the background. This is one dated season, not proof of exact tree species or year-round colour.
4. [Firsthand adjacent Gemfields workings](https://havehomewilltravel.com/fossicking-around-rubyvale/): supporting construction/material reference only, explicitly Glenalva, not photographs of Graves Hill. Separate boulder rejects, coarse gravel and fine sieved material; carried wash processed at camp. Do not transplant Glenalva-specific layout/geology.

Do not invent cliffs, quartz reefs, basalt caps or crystal-vug attractions here. Billy/silicified-rock material is pale grey/tan with a weathered rind; some rounded and some angular pieces. Granite is confined to the documented exposure. No giant Uralla boulder field transplanted into Queensland. Exact botany remains unverified: model photographed eucalypt silhouettes without asserting species. Dry-visit Ruby Creek channel is present at the boundary; no standing water is promised. Rain wets ground; seasonal creek flooding is outside this slice.

## Shared foundation and preservation

Use the existing mainland engine, original controllers/tools, camp, ute, difficulty, recovery and always-on topographic map. New region identity `graves-hill` gives this different physical layout independent saves; old `qld-gemfields` / Billystone ground, camps and unfinished parcels remain accessible and unchanged. This avoids relabelling or destructively regenerating an old saved claim. Travel remains $0.

Reuse regional rendering adapter, instancing/LOD, materials, shared stone/plant geometry and real-cut detail. Add local billy forms, modest granite exposures, dry woodland, grass and photographed track character where needed. Camp has a water-filled sieve tub, using the original jig/flip controls and recovery formulas. It is player equipment, not a claim that public facilities exist on site. Other maps keep existing water and workflows.

## Checkable execution

- [x] GH-01 Research actual locality; inspect official map and site photograph; define limits and preservation strategy.
- [x] GH-02 Add isolated, deterministic locality height/geology/track/drainage data and saved destination. Preserve all old region generation.
- [x] GH-03 Build regional dry woodland, billy/silicified-rock assets, gravel patches, shallow workings, reject piles and compact granite exposure to the NSW finish benchmark.
- [x] GH-04 Connect carried-water camp sieving to original controls/recovery; practical field directions and topo labels; no developer text/world helper rings.
- [x] GH-05 Inspect player-height scenes around track, both digging areas, granite, dry Ruby Creek and camp on High; Low/Medium/Ultra and touch checks. Correct clipping, repeated cut rocks, floating scenery and unreadable finds.
- [x] GH-06 Validate deterministic geology, independent old/new saves, digging/sieving/recovery, controls/travel and optional-model fallback. Build and offline checks; record actual performance and limits.
- [ ] GH-07 Commit, integrate ready work into main, push and verify Pages and public desktop/touch smoke under standing publication authorisation.

User visual acceptance remains separate from technical success. Physical phone performance is not certified by browser emulation. Modern phone settings scale detail; the reference art and established NSW finish set the quality target.

Implementation details, exact checks, captures and limits: [GRAVES-HILL-BUILD.md](GRAVES-HILL-BUILD.md).
