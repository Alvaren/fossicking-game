import { URALLA_COURSE, URALLA_CAMP } from './uralla/course.js';
// Mainland destinations extend the original claim engine. New England keeps
// its default generator and its legacy top-level world snapshot.
export const CLAIM_PROFILES = {
  uralla: {
    id:'uralla',name:'Uralla',title:'Wooldridge Reserve',salt:0x57a11a,startTool:'shovel',
    description:'Follow the Rocky River through Wooldridge Reserve near Uralla. Massive granite boulders, quiet reed-lined pools and sandy shallows offer different places to sample for fine gold.',
    sources:[],crystalPockets:false,soil:[.50,.46,.35],treeCount:430,treeBank:.65,treeHill:.13,treeTint:0xffffff,tufts:4200,clay:.035,
    creek:{course:URALLA_COURSE,phase:.65,meander:.38,offset:6,width:1.12,depth:.73,slope:.0045,discharge:1.8,lam1:58,lam2:27,ph1:.3,ph2:1.1},
    camp:URALLA_CAMP,layoutVersion:2,poweredSluice:false,
    minerals:{gold:.7,sapphire:.3,zircon:0,spinel:0,garnet:.65,topaz:0,agate:0},
    how:['Follow the footpath from camp to the Rocky River. Sandy Shallows is an open place to load and work a pan.', 'At Boulder Reach, compare small pockets of gravel downstream of the large granite blocks with loose sand beside them.', 'Fine gold is easily lost. Classify the oversize, settle the heavies and wash thin layers over the pan’s riffles.', 'Reed Pool has quieter water for washing. Keep the banks and roots intact; work small samples of loose gravel.', 'Use hand tools here. Your powered highbanker stays packed; tool 5 uses the unpowered sluice box.', 'Press M for the topographic map, river reaches and access path.'],
    notes:'The Rocky River carried fine gold into the Uralla diggings. Heavy grains can collect beneath gravel, in cracks and in slack water behind boulders; the biggest rock is not automatically the richest spot. Compare modest test pans and keep track of where each load came from. Break clay and classify coarse stones, then stratify, wash a thin layer and settle again. Black sand is a useful concentrate to inspect, not proof of gold. Garnets and occasional sapphires may also turn up in the wash. Keep the reeds and bank roots intact and return oversize to your worked patch.',
  },
  'graves-hill': {
    id:'graves-hill',name:'Sapphire Gemfields',title:'Graves Hill',salt:0x6a42e,startTool:'shovel',
    description:'Graves Hill, near Sapphire: red dirt tracks, open woodland and shallow sapphire wash around Mount Clifford and Millionaires Hill. Carry gravel back to your camp tub to wash and sort.',
    sources:['granite'],crystalPockets:false,soil:[.48,.32,.20],treeCount:235,treeBank:.05,treeHill:.055,treeTint:0xb4b190,tufts:4600,clay:.10,
    creek:{dry:true,offset:10000,meander:0,width:1,depth:.2,slope:.003},
    camp:{x:-48,z:29},starterCamp:{shelter:'swag',built:{tub:true}},campSieve:true,
    minerals:{gold:0,sapphire:1.25,zircon:1,spinel:1,garnet:0,topaz:0,agate:0},
    how:['Follow the red dirt track to Mount Clifford. Look for shallow gravel beneath brown surface soil, and compare small test loads.', 'Check the dark-red to chocolate wash around Millionaires Hill. Pale billy boulders, quartz and silicified sandstone occur in the gravel.', 'Classify coarse stones before washing. Return to the water-filled tub beside your Wash Bench and select Sieve (4).', 'Hold and release Use to settle the heavy centre; right-click or F flips the sieve. Easy steadies the jig for you.', 'Ruby Creek runs around the northern and western edge. Its bed is dry on this visit; use the water you brought to camp.', 'Press M for the topographic map, track and named diggings. Your ute is at camp.'],
    notes:'At Mount Clifford the shallow wash contains mixed angular and rounded stones in brown soil. Millionaires Hill has darker red to chocolate soil. Sample through the gravel towards its base and compare patches; pale billy cobbles are useful ground clues, but do not guarantee a sapphire. Break up clay, classify the oversize, then carry the wash to your camp tub. Controlled jigging concentrates dense stones; flip carefully and inspect the heavy centre. The granite exposure is a landmark, not the source of the sapphire wash.',
  },
  'new-england': {id:'new-england',name:'New England',title:'New England claim',startTool:'detector'},
  'coober-pedy': {
    id:'coober-pedy',name:'Coober Pedy',title:'Painted Ridge',salt:0xc00be,startTool:'hammer',
    description:'Painted Ridge: pale mullock heaps and opal country. Noodle the old spoil, explore the dugout homes and follow the drives beneath Colour Rise.',
    sources:['opal'],hillScale:.42,benchHeight:.8,soil:[.77,.68,.52],treeCount:0,tufts:60,clay:.03,
    creek:{dry:true,meander:.2,width:.8,depth:.2,slope:.002},
    opalMix:[['potch',58],['milky opal',29],['crystal opal',12],['opalised shell',1]],
    minerals:{gold:0,sapphire:0,zircon:0,spinel:0,garnet:0,topaz:0,agate:0},
    how:['Kneel at a mullock heap and brush through the loose spoil. Look closely for chips of opal; check their colour in good light.', 'Visit Lantern House and Old No. 4. Their entrances are marked on your map; follow the access cut down to the door and use Interact to enter.', 'Explore Colour Rise workings with your headlamp (L). Follow the galleries and inspect pale seams beside the clay band.', 'Select Hammer (6), then hold Use to take a small sample from a seam. Potch has no play-of-colour; some seams contain no opal.', 'Bring your finds to camp to cut, polish or display them. Press M for the topographic map and travel.'],
    notes:'Noodling means searching discarded mullock for opal missed during mining. Work small patches of loose spoil and inspect chips in good light. Underground, opal can occur in thin, discontinuous seams around changes in the host rock. A pale seam may be barren or contain potch without play-of-colour. Lantern House and Old No. 4 welcome visitors; Colour Rise has branching galleries and opal faces to sample.',
  },
  'wa-goldfields': {
    id:'wa-goldfields',name:'WA Goldfields',title:'Mulga Flat',salt:0xa17d3,startTool:'detector',
    description:'Mulga Flat: red dirt, dry washes and quartz-strewn ridges. Search the shallow old diggings, follow scattered gold patches and bring your samples back to camp.',
    sources:['reef'],hillScale:.5,benchHeight:1.1,soil:[.64,.30,.14],treeCount:0,tufts:900,clay:.04,
    creek:{dry:true,meander:.3,width:1.1,depth:.38,slope:.004},
    minerals:{gold:1,sapphire:0,zircon:0,spinel:0,garnet:0,topaz:0,agate:0},
    how:['Keep your coil low and level. Sweep overlapping lines, then investigate repeatable signals from more than one direction.', 'Look for pale quartz float, stony slopes and old shallow diggings. Gold can occur in scattered patches; ground between them may be barren.', 'After a find, tighten your search around it and recheck the hole and spoil. Iron rubbish and hot rocks can sound promising too.', 'The wash is dry. Build a recovery tub at the Wash Bench to pan your bucket samples and crushed ore.', 'Press M for the topographic map and travel. Your ute and camp are beside the dry wash.'],
    notes:'Search systematically across shallow stony ground. Quartz float can lead towards a reef, but quartz alone does not guarantee gold. Mark your finds on the map, overlap your sweeps and follow a patch until the signals thin out. Old diggings can hold missed gold as well as iron rubbish. Take small samples back to the camp recovery tub; there is no standing water in this wash.',
  },
  'golden-triangle': {
    id:'golden-triangle',name:'Golden Triangle',title:'Ironbark Gully',salt:0x671a9,startTool:'detector',
    description:'Ironbark Gully: quartz-strewn slopes, old shallow diggings and an alluvial gold lead. Sweep for nuggets, follow the reef float and pan small test loads.',
    sources:['reef'],hillScale:.78,benchHeight:1.9,soil:[.53,.36,.22],treeCount:480,treeBank:.32,treeHill:.23,treeTint:0xc2ba97,tufts:3200,clay:.08,
    creek:{meander:.68,width:.7,depth:.76,slope:.006},
    minerals:{gold:1,sapphire:0,zircon:0,spinel:0,garnet:0,topaz:0,agate:0},
    how:['Sweep slowly with the detector. Overlap each pass and keep the coil close to the ground. Hold right-click to pinpoint.', 'Dig repeatable signals; ironstone and old iron can sound promising. Recheck the hole and spoil.', 'Follow pale quartz float towards the reef. Compare slope wash with the gravel at the bottom of the gully.', 'Use the pan in shallow water. Work thin layers and check your concentrates before collecting.', 'Press M for the topographic map. Your ute and camp are beside the gully.'],
    notes:'Work the shallow slopes and old diggings with overlapping detector sweeps. Gold-bearing quartz weathers from the reef; loose gold can remain downslope or collect in the gully gravel. Compare small pan tests above and below the reef gully, and recheck every dug target.',
  },
  'qld-gemfields': {
    id:'qld-gemfields',name:'Central QLD Gemfields',title:'Billystone Wash',salt:0x91dfa,startTool:'shovel',
    description:'Billystone Wash: open woodland, clay-bound sapphire gravel and low wash terraces. Classify the gravel, wash it in the creek and inspect the heavy centre of the sieve.',
    sources:['basalt'],hillScale:.34,benchHeight:1.2,soil:[.66,.32,.17],treeCount:210,treeBank:.28,treeHill:.055,treeTint:0xcac29a,tufts:1800,clay:.22,
    creek:{meander:.4,width:1.3,depth:.68,slope:.0035},
    minerals:{gold:0,sapphire:1.25,zircon:1,spinel:1,garnet:0,topaz:0,agate:0},
    how:['Look for clayey gravel below the surface soil. Compare the low terrace with wash near the basalt outcrop.', 'Dig with the shovel and classify coarse material before washing. Check the oversize pile too.', 'Wade into shallow water and select Sieve (4). Hold and release Use to settle the heavies; right-click or F flips.', 'Inspect the centre for sapphire, zircon and dark spinel. Gems do not produce detector signals.', 'Press M for the topographic map. Your ute and camp sit above the washing creek.'],
    notes:'Sapphire wash can be held in old gravel beds as well as modern drainage. Work shallow clayey gravel down towards its base. Break clay and classify coarse stones before jigging the sieve. Dense stones settle below lighter gravel; use a controlled flip to bring the heavy centre into view.',
  },
};
export const CLAIM_REGIONS = Object.keys(CLAIM_PROFILES);
export const claimProfile = id => CLAIM_PROFILES[id] || CLAIM_PROFILES['new-england'];
const GLOBAL_FIELDS = ['cash','gold','up','gems','nuggets','log','day','orders','milestones','cutting','fuel','difficulty','show','photos'];
const META_FIELDS = ['version','savedAt','activeRegion','expeditions','claims'];
const globals = data => Object.fromEntries(GLOBAL_FIELDS.filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));
const local = data => Object.fromEntries(Object.entries(data).filter(([k])=>!GLOBAL_FIELDS.includes(k)&&!META_FIELDS.includes(k)));
export function readClaim(root) {
  const id=CLAIM_REGIONS.includes(root.activeRegion)?root.activeRegion:'new-england';
  if(id==='new-england')return {...root,activeRegion:id};
  const profile=claimProfile(id);
  const world=root.claims?.[id]||{seed:(root.seed^profile.salt)>>>0,camp:structuredClone(profile.starterCamp||{shelter:'swag'})};
  return {...globals(root),...world,activeRegion:id,savedAt:root.savedAt};
}
// Money/finds/owned gear are shared. Ground, material in work and camp structures
// stay with their claim. No reward banking or copying is needed between claims.
export function saveClaim(root, snapshot, id=snapshot.activeRegion||'new-england') {
  if(!CLAIM_REGIONS.includes(id))throw new Error('Unknown claim');
  if(id==='new-england')return {...globals(root),...snapshot,activeRegion:id,claims:root.claims||{},expeditions:root.expeditions||{}};
  return {...root,...globals(snapshot),version:3,savedAt:snapshot.savedAt,activeRegion:id,
    claims:{...root.claims,[id]:local(snapshot)}};
}
