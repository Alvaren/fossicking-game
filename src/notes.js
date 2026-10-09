import { MILESTONES } from './milestones.js';
import { GEMS, GEM_ORDER, CRYSTAL_ORDER } from './minerals.js';

// The field notebook: how placers work, and what you've found so far.

const RULES = [
  ['Heavies drop where the water slows',
    'Gold (SG 19), zircon (4.7), sapphire and garnet (about 4) and black spinel (3.8) settle wherever the current loses speed: '
    + 'the upstream head of the point bar on the inside of a bend, the slack water behind boulders, and where a fast riffle runs into a pool.'],
  ['Fast water scours',
    'The outside of a bend is deep and fast. It sweeps the bed clean. Dig the inside of the bend, not the cut bank.'],
  ['Get down to bedrock',
    'Heavy minerals work down through the gravel. The richest layer is the bottom of the wash, sitting on bedrock, and in its cracks. '
    + 'Topsoil is barren. When your shovel rings on slate, scrape the bedrock clean.'],
  ['Read the water',
    'Watch the leaves. Where they hurry, nothing settles. Where they slow, swirl and stall, behind rocks and over the bars, the heavies have dropped too. '
    + 'White water marks the riffles.'],
  ['Heavier stays closer',
    'Gold travels least and stays close to its reef. Gems travel further. Agates are light and tough, so they travel furthest and sit with '
    + 'stones of the same size on the gravel bars. Nothing is carried upstream: work downstream of where a source gully comes in.'],
  ['Read the hills',
    'White quartz reef on a ridge: gold country. Black basalt boulders and dark soil: sapphire, zircon and black spinel. '
    + 'Pink rhyolite: agates. Float rocks downslope point back to the source.'],
  ['Indicators',
    'A heavy streak of black sand in the pan means heavies are concentrating there. Black spinel and zircon in the sieve mean you are in sapphire wash.'],
  ['Pan for gold, sieve for gems',
    'Panning keeps fine gold but loses gems among the gravel. Classify to 1/4" first and check the oversize. '
    + 'A gem sieve jigged under water sends the heavy stones to the bottom; flip it and they sit in the middle of the pile. '
    + 'Fine gold washes straight through the screens.'],
  ['Jig, then flip',
    'Keep the sieve under water and jig with short, even strokes. Too soft and nothing settles; too hard and you scramble the layers '
    + 'and wash the small stones through. When it has settled, flip it over in one go: the heavy stones end up in a tight cluster in the middle.'],
  ['Sluicing',
    'Set the sluice in a fast, shallow run with the tail downstream. You want roughly walking pace: about 0.6 to 1.3 m/s. '
    + 'Slower and the riffles pack with sand; faster and the gold is scoured back out; too deep and the box drowns. '
    + 'The riffles fill as you work, so clean up often and pan the concentrates. Agates go out the tail unless you classify first.'],
  ['Floods',
    'A flood moves the whole bed. It fills old holes in the channel with fresh gravel and drops new heavies in the same traps as before. '
    + 'After the water goes down is the best time to walk the bars for agates. Never leave a sluice in a rising creek.'],
  ['Crystal pockets',
    'In the granite country, pegmatite pockets rot down to soft red-brown pocket clay full of loose crystals: smoky and clear quartz, feldspar, '
    + 'now and then citrine or topaz. Broken shards (float) wash downslope, so follow them uphill. If your shovel turns up pocket clay, stop: kneel and dig by hand.'],
  ['Vugs in the veins',
    'White quartz veins cross the bare granite. Where a vein swells into an open cavity it is lined with crystals growing inward, often amethyst. '
    + 'Look for rusty iron staining on the rock and tap with the hammer: solid rock rings, a vug sounds dull and hollow.'],
  ['Digging crystals out',
    'Kneel and work slowly. Trowel off the soil and clay, but use the brush near crystals: steel chips them. The rock pick is the only thing '
    + 'that breaks rock. Lift a crystal out only when it is mostly free. Pull it early and it snaps.'],
  ['Vugs in boulders',
    'Loose boulders in the granite country, and white reef-quartz boulders up by the reef, sometimes carry a vug: a gas-bubble or '
    + 'late-stage cavity lined with crystals. Tap round a boulder with the rock hammer: solid rock rings bright, a hollow one sounds dull. '
    + 'Split the hollow ones with plug and feathers: drill a line of holes, set the wedges and shims, and tap them in turn until it cracks.'],
  ['Thundereggs',
    'Knobbly brown nodules that weather out of rhyolite. They grew in gas pockets in the lava and filled up later, usually with agate in '
    + 'a star shape, sometimes leaving a hollow full of crystals, and once in a blue moon with opal. The only way to know is to saw one open.'],
  ['Splitting shale for fossils',
    'Shale is mud that settled in still water, layer on layer, and it splits along those layers. Tap along the edge of a slab with the rock hammer '
    + 'to open it. Most are barren, but some hold Glossopteris leaves (the seed fern that covered Gondwana in the Permian), insect wings, or fish. '
    + 'When the loose slabs run out, prise fresh ones off the ledge.'],
  ['Noodling for opal',
    'Opal forms where silica-rich water seeped into cracks and holes in weathered claystone. The old-timers sank shafts down to the opal level and '
    + 'hauled the clay up by windlass; their white mullock heaps still hold chips they missed. Kneel and scratch through a heap: most of it is potch '
    + '(common opal, no colour), but now and then a chip flashes colour. Black opal and harlequin patterns are the big prizes. Keep well clear of the old shafts.'],
  ['Trace the lead',
    'Count the colours (specks of gold) in each pan as you work up the creek. They get fewer the further you go from the source, '
    + 'and stop dead above where the gold comes in. Where they stop, look for a gully coming down from the hills: the reef is up there. '
    + 'Your pan tests go on the map (M) as numbers.'],
  ['UV at night',
    'Scheelite is a heavy, dull cream stone by day, but under shortwave UV it glows bright blue-white. It comes out of the same quartz reefs as gold, '
    + 'so a scatter of glowing scheelite on a slope at night says gold country. Plenty of chalcedony agate glows green too.'],
  ['Old benches',
    'The flat terrace above the creek on one side is an old channel. Its wash is buried under topsoil, but it was sorted by the same water and can be rich.'],
  ['Metal detectors',
    'Detectors only hear metal: nuggets, and a lot of junk. Gems and agates make no sound at all.'],
];

const $ = (id) => document.getElementById(id);

export class Notes {
  constructor(state, { onClose }) {
    this.state = state;
    this.onClose = onClose;
    this.isOpen = false;
    $('notes-close').addEventListener('click', () => this.close());
  }

  open() {
    this.isOpen = true;
    $('notes').classList.remove('hidden');
    this.render();
  }

  close() {
    this.isOpen = false;
    $('notes').classList.add('hidden');
    this.onClose();
  }

  render() {
    const log = this.state.log;
    const rows = [...GEM_ORDER, ...CRYSTAL_ORDER].map((t) => {
      const e = log[t] || { n: 0 };
      const best = e.best ? `${e.best.label}` : '–';
      return `<tr><td>${GEMS[t].name}</td><td>${e.n}</td><td>${best}</td></tr>`;
    }).join('');
    const finds = `<section><h4>Finds on record</h4><table>
      <tr><td>Gold recovered</td><td colspan="2">${(log.goldTotal || 0).toFixed(2)} g (${log.nuggets || 0} nuggets)</td></tr>
      ${rows}</table></section>`;
    const ms = this.state.milestones || {};
    const done = MILESTONES.filter((m) => ms[m.key]).length;
    const ticks = MILESTONES.map((m) => `<li class="${ms[m.key] ? 'done' : ''}"><b>${m.title}</b> <span>${m.desc}</span></li>`).join('');
    const milestones = `<section><h4>Milestones (${done} of ${MILESTONES.length})</h4><ul class="milestones">${ticks}</ul></section>`;
    $('notes-body').innerHTML = milestones + finds + RULES.map(([h, p]) => `<section><h4>${h}</h4><p>${p}</p></section>`).join('');
  }
}
