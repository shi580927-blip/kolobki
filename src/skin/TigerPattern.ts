import {randomFrom} from '../core/skin';
import type {SkinDesign} from './SkinDesign';
/** A continuous 3D pigment field: sphere UVs only store the sampled result.
 * No repeated comma stamps or meridian bands pinching together at the poles. */
export function makeTigerField(d:SkinDesign){const r=randomFrom(d.seed^0x7a32),a=r()*6.28,b=r()*6.28,c=r()*6.28,frequency=3.3+d.density*2.3;
 return(x:number,y:number,z:number)=>{
  // Broad flowing stripes with smaller forks and pinched, irregular endings.
  const warp=.46*Math.sin(y*5+z*3+a)+.21*Math.sin(y*10-z*5+b)+.17*Math.sin(x*7+y*4+z*6+c);
  const phase=(x*frequency+warp)*Math.PI;
  const ridge=Math.abs(Math.sin(phase));
  const width=(.43+.19*Math.sin(y*7+z*5+b)+.10*Math.sin(x*8-y*9+z*8+a))*(.7+d.scale*.3);
  const fork=Math.abs(Math.sin(phase+.55*Math.sin(y*8+z*6+c)));
  const branchGate=Math.sin(y*6-z*5+a)>.65;
  return ridge<Math.max(.025,width)||(branchGate&&fork<width*.6)?1:0;
 };
}
export function sphereTexturePoint(u:number,v:number):[number,number,number]{const phi=u*Math.PI*2,theta=v*Math.PI,s=Math.sin(theta);return[-Math.cos(phi)*s,Math.cos(theta),Math.sin(phi)*s];}
