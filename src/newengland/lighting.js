import { Color } from 'three';

const ground=new Color(0x84795e),haze=new Color(0xc2c5ba);
// Called after the clock computes its base, before weather applies storm/night.
export function newEnglandLight(daynight) {
  const b=daynight.base,day=daynight.daylight;
  b.hemi*=1-.08*day;b.env*=1-.38*day;
  b.sun*=1-.08*day;
  b.hemiGround.lerp(ground,day*.65);
  b.fog.lerp(haze,day*.4);
  b.fogNear=25+20*day;b.fogFar=230+65*day;
}
