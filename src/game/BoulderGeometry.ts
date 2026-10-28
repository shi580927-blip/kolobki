import * as T from 'three';
import {roundedStone,stoneColors} from './StoneArt';
/** Broad, sloping planes with a rounded asymmetric silhouette; three authored proportions. */
export function makeBoulderGeometry(variant=0){
 const points:T.Vector3[]=[];
 for(let ring=0;ring<3;ring++)for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2+(ring===1?.10:.02),r=(ring===2?.52:.79)+.095*Math.sin(i*2.7+variant*1.7+ring);
  const y=ring===0?-.53+.06*Math.sin(i*3):ring===1?-.08+.10*Math.sin(i*2.1+variant):.44+.11*Math.sin(i*1.3+variant*.8);
  points.push(new T.Vector3(Math.cos(a)*r+(ring===2?-.14:0),y,Math.sin(a)*r*(.91+variant*.035)));
 }
 return stoneColors(roundedStone(points,.14));
}
