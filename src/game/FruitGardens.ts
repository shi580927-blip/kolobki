import {heightAt,pondClearance} from '../core/terrain';
export const GARDENS=[
 {name:'Ягодная поляна',x:-126,z:-76,fruit:'berry'},
 {name:'Лимонная роща',x:132,z:56,fruit:'lemon'},
 {name:'Смешанный сад',x:-66,z:138,fruit:'mixed'},
] as const;
const cache=new Map<string,{x:number;z:number}>();
/** Loose clusters, wide gaps, deterministic dry and walkable planting sites. */
export function gardenPoint(garden:number,index:number){
 const key=garden+':'+index,found=cache.get(key);if(found)return found;
 const g=GARDENS[garden%GARDENS.length],a=index*2.39996,r=5+Math.sqrt(index+1)*3.5;
 const base={x:g.x+Math.cos(a)*r,z:g.z+Math.sin(a)*r};
 let best=base,bestSlope=Infinity;
 for(let k=0;k<80;k++){
  const t=k*2.39996,offset=k===0?0:Math.sqrt(k)*3;
  const x=Math.max(-180,Math.min(180,base.x+Math.cos(t)*offset)),z=Math.max(-180,Math.min(180,base.z+Math.sin(t)*offset));
  if(pondClearance(x,z)<6)continue;
  const slope=Math.hypot(heightAt(x+.5,z)-heightAt(x-.5,z),heightAt(x,z+.5)-heightAt(x,z-.5));
  if(slope<bestSlope){best={x,z};bestSlope=slope;}
  if(slope<.38)break;
 }
 cache.set(key,best);return best;
}
