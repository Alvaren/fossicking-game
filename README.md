# Fossicking

A first-person prospecting game set on a creek in Australian gem and gold country, built with three.js.

**Play it:** https://alvaren.github.io/fossicking-game/

Works in any modern browser on PC, Mac, phones and tablets. On a phone, open the link once and use **Add to Home Screen**: it then runs full-screen and keeps working with no signal. Your save stays in your browser on that device.

## What you can do

- Sweep a metal detector for nuggets and gold-in-quartz (and plenty of junk)
- Dig, pan and wet-sieve creek wash for gold, sapphires, zircons, garnets, topaz and agates
- Set a sluice box in the right run of water, clean up and pan the concentrates
- Work a gold pan by hand: choose a load, break clay, stratify, wash over the riffles, repeat and reveal the concentrates. Mouse and touch strokes control Realistic mode; Easy demonstrates the technique.
- Read the creek: heavies settle on the inside of bends, behind boulders and on bedrock
- Trace a gold lead up the creek to its reef by counting colours in the pan
- Kneel and excavate crystal pockets and quartz-vein vugs by hand (amethyst, smoky quartz, fluorite...)
- Noodle the old opal mullock heaps for potch, precious opal and the odd opalised shell
- Split shale slabs with the rock hammer for Permian fossils: Glossopteris leaves, insects and fish
- Night prospecting with a UV torch: scheelite and some agates glow
- Drive the ute around the claim
- Climb down the old Lucky Strike mine with your headlamp: break ore from the quartz reef and pick out visible gold
- Treat reef ore the old way: roast it on the campfire, crush it in the dolly pot (or a petrol hammer mill), pan the grit
- Tap loose boulders for hollow vugs, split them with plug and feathers and prise out the crystals
- Pick up thundereggs below the rhyolite and have them sawn open to see the agate star inside
- Show off your collection in the cabinet at camp, and enter your best pieces at the gem show every third day: judging, ribbons and a live auction
- Photo mode: float the camera about, zoom, tilt, add a film filter and save the shot
- Send rough stones to the gem cutter in town: faceted sapphires, zircons and amethyst, polished opal and agate
- Physically based gold and see-through, light-bending gems; graphics settings (Low to Ultra) for slower devices and phones
- Fill the buyer's special orders for a bonus, and tick off milestones in your field notes
- Difficulty levels: Easy, Prospector, and Realistic, with real gold grades, real detector depths and hot rocks
- A metal detector you swing over the ground, with pinpointing (hold right-click)
- Classify your wash: oversize piles to pick through, shovel straight into a sluice, or set up a highbanker on the bank
- Floods that really move the bed: cobbles roll when the flow beats the Shields threshold and settle on riffles, point bars and behind boulders
- Floods, willy-willies, day and night, kangaroos, galahs and a kookaburra at dawn

## Controls

Keyboard and mouse: **WASD** move, **mouse** look, **1-7** tools, **left click** use, **right click / F** flip sieve, **E** pick up / talk, **C** kneel, **I** inventory, **M** map, **N** field notes, **L** headlamp, **K** photo mode, **H** controls, **P** pause, **F5 / Ctrl+S** save.

Touch screens get an on-screen stick and buttons automatically.

## Running it yourself

```bash
npm install
npm run dev        # local dev server
npm run dev:codex  # isolated Codex preview on 127.0.0.1:5191 (strict port)
npm run dev:lan    # serve to phones and other devices on your network (port 5190)
npm run build      # static build in dist/
```

Models are built headlessly in Blender from the scripts in `blender/` (output goes to `public/models/`).

Every push to `main` builds and publishes the game to GitHub Pages (`.github/workflows/deploy.yml`).

## Working with coding agents

Read [AGENTS.md](AGENTS.md) and [the collaboration guide](docs/COLLABORATION.md) before editing. Codex and Claude Code use separate worktrees and server ports, with file ownership checked before integration.

Gold panning: select the pan (3) in the creek, then click or tap Use. Drag on the close-up pan; the action buttons select clay breakup, stratification, washing and reveal. Put aside saves the partly worked pan. See [panning controls and model notes](docs/PANNING.md).

At camp, find the signed **Wash Bench**. Practise on known parcels, compare pans, rework caught tailings and build a recovery tub, sample rack and portable tailings kit. See [camp progression and practice](docs/CAMP.md).

Build your home on the claim: **swag → canvas tent ($250) → caravan ($700) → prospector’s shed ($1,200)**. Interact with your shelter or the Wash Bench to upgrade or sleep until morning. Tent and shed lighting and expanded sample storage make camp more useful; older saves keep their existing tent.

Fit out camp with a **water tank, generator and lights**, build a **lapidary shed** to shape and polish your own finds, exhibit kept specimens in a **display room**, and bring a **kelpie** along for company. Water, fuel and partly worked stones persist in your save.

Explore **Western Tasmania → Fern River catchment** from **Expeditions · Tasmania** on the title/pause menu, or **Plan an expedition** at camp. Choose your small pack, walk down to Fern Bend, sample the three river reaches and use the same panning technique controls. An overnight kit enables a portable shelter; a classifier changes your wash; carried material slows walking. No ute enters the catchment.

The expedition keeps its own worked pockets, samples, pan and position. Return at the trailhead to bank recovered finds without replacing your home camp or unfinished home pan. The journal contains the route, observations, recovery results and a labelled recovery option. This is a fictional western gold catchment. Northeast sapphire rivers are a separate playable destination. The durable build checklist, verification and limits are in [the Tasmania execution plan](docs/TASMANIA-PLAN.md).

**Snipe the western Tasmanian bedrock pools:** pack the 1.1 kg sniping kit on the travel map or at the western trailhead. Select **Mask (4)** beside a reach, then **Use** to inspect underwater. Move/look with the normal keyboard/mouse or phone controls; choose **Fan (1), Crevice pick (2), Snuffer (3)** with number keys, wheel or touch buttons. Fan loose gravel, pick packed fill, then snuff visible gold. **F** or the strength buttons select gentle, steady or firm work. Heavy fanning clouds the water and can carry exposed gold away. Easy visibly demonstrates the sequence while Use is held; Prospector and Realistic are manual. **E / Bank** returns to your bank position. Worked cracks, gold and losses persist; the journal records recovery and returning home banks it once. See [sniping controls, model and verification](docs/SNIPING.md).

Open the local **Map → Locations & travel** to select destinations on the Australia map. Travel currently costs **$0**. New England, Golden Triangle, Central QLD Gemfields, Western Tasmania and Northeast Tasmania are playable; other entries are labelled Not yet available until built. All local maps always show the original hillshade and 2-metre contours. The unrequested Tasmania sampling rings and world route line have been removed. See [the locations and travel plan](docs/LOCATION-PLAN.md) for the current scope, implementation and verification record.

Explore **Northeast Tasmania → Tin Fern River** from the same travel map. Walk from the roadside track through Granite Bend, Tin Terrace and Basalt Run. Classify sapphire/zircon/spinel wash, then select **Sieve (4)** at the river edge. Load a parcel, hold/release **Jig** with mouse or touch, then **Flip (F)** and collect. Easy visibly settles and flips the sieve for you. Unfinished sieves and pans stay at their own location; changing destinations banks recovered finds once. See [the northeast execution checklist](docs/LOCATION-PLAN.md).

Visit **Golden Triangle → Ironbark Gully** for wooded quartz-and-ironstone slopes, shallow old diggings, detecting and gold panning. **Central QLD Gemfields → Billystone Wash** has open woodland, low clayey terraces and sapphire/zircon/spinel wash for classifying and wet sieving. Both use the original mainland controls, tools, ute and camp systems. Each keeps its own worked ground, camp structures and unfinished material; money, recovered finds and owned gear travel with you. See [the mainland build plan and verification](docs/MAINLAND-LOCATIONS.md).
