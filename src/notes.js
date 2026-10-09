import { MILESTONES } from './milestones.js';
import { GEMS, GEM_ORDER, CRYSTAL_ORDER } from './minerals.js';

// The field notebook: how placers work, and what you've found so far.

const RULES = [
  ['Work the pan, one layer at a time',
    'Start around half full, or less with clay and concentrates. Submerge and rub clay clumps apart: bound gold can leave inside a lump. '
    + 'Short level shakes let dense grains settle. Lift to the waterline, tip the coarse riffles forward and wash off a thin top layer. '
    + 'Submerge and re-stratify after each layer. Too much tilt, fast strokes or a crowded pan can carry fine gold over the lip.'],
  ['Concentrates and the reveal',
    'Black sand is heavy mineral concentrate, not proof of gold. Once the light gravel is gone, slow down. Fine riffles suit a small finishing load; '
    + 'the smooth lip lets you roll a shallow film of water across the black sand and fan it back for the reveal. '
    + 'Easy demonstrates the same sequence. Realistic uses your mouse or touch strokes. This is a simplified teaching model, not calibrated fluid dynamics.'],
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
  ['Hard-rock gold',
    'Most of the gold in a reef is too fine to see. Break ore out of the quartz in the old Lucky Strike, then treat it the way the '
    + 'old-timers did. Roast it on the fire first: the heat makes quartz brittle and burns off the sulphides that hold fine gold, so the pan '
    + 'gets far more of it. Crush it in the dolly pot (drive the dolly down when the sapling has lifted it right up) or in a hammer mill, '
    + 'then pan the crushed ore at the creek. Ore beside a show of visible gold runs richer.'],
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
  ['What a flood can move',
    'A stone moves when the water drags on the bed harder than its weight holds it down (the Shields criterion). The drag is roughly '
    + 'water density x gravity x depth x slope, so deeper, steeper water moves bigger stones: a metre of flood on this creek shifts cobbles '
    + 'up to 20-30 cm across, and the big boulders never move. In flood the deep pools and the outsides of bends scour; stones and heavies '
    + 'drop where the drag falls off: riffle tops, point bars, and the slack water behind big boulders. In a bend the water near the bed spirals '
    + 'toward the inside, sweeping stones and heavies onto the point bar: that is how point bars are built. Check those spots after every flood.'],
  ['Settling and sorting',
    'Water sorts what it carries. Fast water keeps sand and light stones moving but drops heavy and big things first (the Hjulstrom curve). '
    + 'Gold is seven times heavier than quartz, so it drops out the moment the current eases and works its way down through the gravel to bedrock.'],
  ['Classifying',
    'Screen your wash before it goes in the pan or the sluice. The fines (gold and small stones) go through; the oversize gets picked '
    + 'over for agates and big gems, then tossed. Unscreened wash rolls over the riffles, stirs the bed up and packs them, and you lose gold.'],
  ['Highbankers',
    'A sluice with its own water: a pump lifts creek water to a spray bar over a hopper with a grizzly (bar screen) on top. You can set one '
    + 'up on the bank right beside the wash you are digging, instead of carrying it to a good run of current.'],
  ['Gem shows',
    'Every third day a gem and mineral show sets up at camp. Enter up to three collection pieces: the judges favour specimen-grade, '
    + 'perfect pieces, and a ribbon brings prize money and makes the collectors keener. Then each piece goes under the hammer. '
    + 'You can knock back any bid and take the piece home.'],
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
