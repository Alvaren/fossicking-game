import { Color } from 'three';

const ground=new Color(0x746e51),haze=new Color(0xb5bdba);
// Called after the clock computes its base, before weather applies storm/night.
export function newEnglandLight(daynight) {
  const b=daynight.base,day=daynight.daylight;
  b.hemi*=1-.22*day;b.env*=1-.3*day;
  b.hemiGround.lerp(ground,day*.65);
  b.fog.lerp(haze,day*.4);
  b.fogNear=30+45*day;b.fogFar=300+140*day;
}
