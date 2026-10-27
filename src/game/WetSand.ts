import {heightAt,POND,pondDistance} from '../core/terrain';
import {pondSubmersion} from './WaterPhysics';
/** Trial tuning, not permanent progression: wet body + dry sand + rolling contact. */
export class WetSand {
 wetness=0;sand=0;shed=0;
 reset(){this.wetness=this.sand=this.shed=0;}
 update(dt:number,p:{x:number;y:number;z:number},distance:number,supported:boolean){
  this.shed=0;
  if(pondSubmersion(p)>.0001){this.wetness=1;return;}
  this.wetness=Math.max(0,this.wetness-dt/12);
  const d=pondDistance(p.x,p.z),bridge=Math.abs(p.x-POND.x)<6.65&&Math.abs(p.z-POND.z)<2.5;
  const onSand=!bridge&&d>.9&&d<1.55&&heightAt(p.x,p.z)>=POND.water-.02;
  if(supported&&onSand&&this.wetness>.12&&distance<1){this.sand=Math.min(1,this.sand+Math.max(0,distance)*.20*this.wetness);}
  if(this.wetness<.12){this.shed=Math.min(this.sand,dt*.20);this.sand-=this.shed;}
 }
}
