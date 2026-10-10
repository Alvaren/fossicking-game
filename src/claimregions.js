// Mainland destinations extend the original claim engine. New England keeps
// its default generator and its legacy top-level world snapshot.
export const CLAIM_PROFILES = {
  'new-england': {id:'new-england',name:'New England',title:'New England claim',startTool:'detector'},
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
  const world=root.claims?.[id]||{seed:(root.seed^profile.salt)>>>0,camp:{shelter:'swag'}};
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
