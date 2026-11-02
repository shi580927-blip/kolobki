import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {stoneColors} from './StoneArt';

/** A bevelled, leaning six-sided rock. Four irregular rings retain broad faces
 * and a softened crown; the same vertices can be used by the static collider. */
export function scenicStone(x:number,z:number,rx:number,rz:number,base:number,top:number,yaw:number,seed:number,grass=true){
 const points:T.Vector3[]=[],height=Math.max(.3,top-base),c=Math.cos(yaw),s=Math.sin(yaw);
 for(let ring=0;ring<4;ring++)for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2+.09*Math.sin(seed),r=(ring===0?1.05:ring===1?1.10:ring===2?.98:.82)*(1+.11*Math.sin(i*2.1+seed*1.7));
  const t=[0,.18,.85,1][ring],u=Math.cos(a)*rx*r+.22*t*Math.sin(seed),v=Math.sin(a)*rz*r+.18*t*Math.cos(seed);
  points.push(new T.Vector3(x+u*c+v*s,base+height*t+(ring===3?.12*Math.sin(i*1.8+seed):0),z-u*s+v*c));
 }
 const raw=new ConvexGeometry(points),g=toCreasedNormals(raw,.73);raw.dispose();stoneColors(g,grass?top-.18:undefined);return g;
}
