// Milestones: a checklist in the field notes of the things worth doing on the
// claim. Most are worked out from what's in your log; a few are ticked off
// the moment they happen.

const n = (log, t) => log[t]?.n || 0;

export const MILESTONES = [
  { key: 'colour', title: 'First colour', desc: 'Pan a speck of gold.', check: (s) => (s.log.goldTotal || 0) > 0.0005 },
  { key: 'nugget', title: 'You beauty', desc: 'Dig a gold nugget.', check: (s) => (s.log.nuggets || 0) >= 1 },
  { key: 'bignugget', title: 'Strewth', desc: 'Find a nugget of 5 g or more.' },
  { key: 'gram10', title: 'Ten grams', desc: 'Recover 10 g of gold in all.', check: (s) => (s.log.goldTotal || 0) >= 10 },
  { key: 'lead', title: 'Traced the lead', desc: 'Follow the gold upstream to its reef.', check: (s) => s.leadTraced },
  { key: 'sapphire', title: 'Blue in the sieve', desc: 'Find a sapphire.', check: (s) => n(s.log, 'sapphire') >= 1 },
  { key: 'agate', title: 'Rockhound', desc: 'Pick up an agate.', check: (s) => n(s.log, 'agate') >= 1 },
  { key: 'sluice', title: 'Running a sluice', desc: 'Clean up a sluice box.' },
  { key: 'crystal', title: 'Pocket hunter', desc: 'Dig a crystal out of a vug by hand.' },
  { key: 'scheelite', title: 'Glows in the dark', desc: 'Find scheelite with the UV torch.', check: (s) => n(s.log, 'scheelite') >= 1 },
  { key: 'opal', title: 'Noodler', desc: 'Find opal with colour.' },
  { key: 'blackopal', title: 'Black opal', desc: 'Find the rarest opal of all.' },
  { key: 'shell', title: 'Opalised shell', desc: 'Find a shell that turned to opal.' },
  { key: 'fossil', title: 'Split one open', desc: 'Find a fossil in the shale.', check: (s) => n(s.log, 'fossil') >= 1 },
  { key: 'fish', title: 'Something fishy', desc: 'Find a fossil fish.' },
  { key: 'specimen', title: 'Collector', desc: 'Find a specimen-grade piece.' },
  { key: 'collection5', title: 'Cabinet of curiosities', desc: 'Have 5 pieces in your collection.', check: (s) => [...s.gems, ...s.nuggets].filter((i) => i.keep).length >= 5 },
  { key: 'explorer', title: 'Know your country', desc: 'Find every rock type on the claim.', check: (s, sources) => Object.keys(sources).every((k) => s.discovered[k]) },
  { key: 'drove', title: 'Took the ute out', desc: 'Go for a drive.' },
  { key: 'cut', title: 'On the wheel', desc: 'Get a stone cut in town.' },
  { key: 'underground', title: 'Down the hole', desc: 'Climb down into the Lucky Strike.' },
  { key: 'reefgold', title: 'Hard-rock miner', desc: 'Pan gold from ore you broke, roasted and crushed yourself.' },
  { key: 'boulder', title: 'Cracked it', desc: 'Split open a boulder with a vug inside.' },
  { key: 'thunderegg', title: 'Thunderstruck', desc: 'Get a thunderegg sawn open.' },
  { key: 'order', title: 'Filled an order', desc: "Hand over a piece for one of the buyer's orders." },
  { key: 'grand', title: 'Grand', desc: 'Have $1,000 in your pocket.', check: (s) => s.cash >= 1000 },
  { key: 'tenGrand', title: 'Flush', desc: 'Have $10,000 in your pocket.', check: (s) => s.cash >= 10000 },
];

// Milestones a find ticks off.
export function findMilestones(item) {
  const out = [];
  if (item.type === 'nugget' && item.grams >= 5) out.push('bignugget');
  if (item.type === 'opal' && item.variety !== 'potch') out.push('opal');
  if (item.variety === 'black opal') out.push('blackopal');
  if (item.variety === 'opalised shell') out.push('shell');
  if (item.type === 'fossil' && (item.variety === 'fish' || item.variety === 'wholefish')) out.push('fish');
  if (item.crystal && !item.crystal.chip && item.type !== 'opal') out.push('crystal');
  if (item.specimen) out.push('specimen');
  return out;
}
