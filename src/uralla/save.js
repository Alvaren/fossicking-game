import { URALLA_CAMP } from './course.js';
import { RiverCourse } from '../rivercourse.js';
import { URALLA_COURSE } from './course.js';
export function migrateUrallaSave(saved) {
  if(saved.activeRegion!=='uralla'||saved.layoutVersion>=2)return saved;
  const next={...saved,layoutVersion:2};
  // Retain exact original coordinates for recovery; the packed dig/patch data,
  // collected IDs, camp upgrades, carried material and funds are untouched.
  next.layoutMigration={from:1,player:saved.player,ute:saved.ute,sluice:saved.sluice};
  if(saved.player)next.player={...saved.player,x:URALLA_CAMP.x-5,z:URALLA_CAMP.z+4};
  if(saved.ute)next.ute={...saved.ute,x:URALLA_CAMP.x-7,z:URALLA_CAMP.z-5};
  if(saved.sluice?.placed&&saved.sluice.spot) {
    const course=new RiverCourse(URALLA_COURSE),p=course.at(Math.max(course.min+10,Math.min(course.max-10,saved.sluice.spot.z)),0);
    next.sluice={...saved.sluice,spot:{...saved.sluice.spot,x:p.x,z:p.z,dir:Math.atan2(-p.ux,-p.uz)}};
  }
  return next;
}
