# Fossicking

A first-person prospecting game set on a creek in Australian gem and gold country, built with three.js.

**Play it:** https://alvaren.github.io/fossicking-game/

Works in any modern browser on PC, Mac, phones and tablets. On a phone, open the link once and use **Add to Home Screen**: it then runs full-screen and keeps working with no signal. Your save stays in your browser on that device.

## What you can do

- Sweep a metal detector for nuggets and gold-in-quartz (and plenty of junk)
- Dig, pan and wet-sieve creek wash for gold, sapphires, zircons, garnets, topaz and agates
- Set a sluice box in the right run of water, clean up and pan the concentrates
- Read the creek: heavies settle on the inside of bends, behind boulders and on bedrock
- Trace a gold lead up the creek to its reef by counting colours in the pan
- Kneel and excavate crystal pockets and quartz-vein vugs by hand (amethyst, smoky quartz, fluorite...)
- Noodle the old opal mullock heaps for potch, precious opal and the odd opalised shell
- Split shale slabs with the rock hammer for Permian fossils: Glossopteris leaves, insects and fish
- Night prospecting with a UV torch: scheelite and some agates glow
- Drive the ute around the claim
- Fill the buyer's special orders for a bonus, and tick off milestones in your field notes
- Floods, willy-willies, day and night, kangaroos, galahs and a kookaburra at dawn

## Controls

Keyboard and mouse: **WASD** move, **mouse** look, **1-7** tools, **left click** use, **right click / F** flip sieve, **E** pick up / talk, **C** kneel, **I** inventory, **M** map, **N** field notes, **L** headlamp, **H** controls, **P** pause, **F5 / Ctrl+S** save.

Touch screens get an on-screen stick and buttons automatically.

## Running it yourself

```bash
npm install
npm run dev        # local dev server
npm run dev:lan    # serve to phones and other devices on your network (port 5190)
npm run build      # static build in dist/
```

Models are built headlessly in Blender from the scripts in `blender/` (output goes to `public/models/`).

Every push to `main` builds and publishes the game to GitHub Pages (`.github/workflows/deploy.yml`).
