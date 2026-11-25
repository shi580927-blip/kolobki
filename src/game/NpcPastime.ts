import {randomFrom} from '../core/skin';
export type Pastime='grazer'|'dreamer'|'dancer'|'brawler'|'wanderer';
export type Activity='walk'|'seek'|'eat'|'sleep'|'dance';
export interface Snack {id:number;x:number;z:number}
export class NpcPastime {
 activity:Activity='walk';age=0;private wait:number;private target?:number;private random:()=>number;
 constructor(readonly role:Pastime,private seed:number){this.random=randomFrom(seed);this.wait=1+this.random()*5;}
 reset(){this.random=randomFrom(this.seed);this.wait=1+this.random()*5;this.activity='walk';this.age=0;this.target=undefined;}
 interrupt(){this.activity='walk';this.target=undefined;this.age=0;this.wait=5;}
 step(dt:number,p:{x:number;z:number},snacks:readonly Snack[],nibble:(id:number)=>boolean,blocked=false):Snack|undefined{
  this.wait-=dt;this.age+=dt;
  if(this.activity==='sleep'||this.activity==='dance'||this.activity==='eat'){
   const duration=this.activity==='sleep'?5:this.activity==='dance'?3.6:1.8;
   if(this.age>=duration){if(this.activity==='eat'&&this.target!==undefined)nibble(this.target);this.activity='walk';this.target=undefined;this.age=0;this.wait=5+this.random()*6;}return;
  }
  if(this.role==='grazer'){
   let target=snacks.find(s=>s.id===this.target);
   if(this.activity==='seek'&&(!target||blocked||this.age>12)){this.interrupt();return;}
   if(!target&&this.wait<=0){target=[...snacks].filter(s=>Math.hypot(s.x-p.x,s.z-p.z)<45).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(target){this.target=target.id;this.activity='seek';this.age=0;}}
   if(target){if(Math.hypot(target.x-p.x,target.z-p.z)<1.9){this.activity='eat';this.age=0;return;}return target;}
  }
  if(this.wait<=0&&(this.role==='dreamer'||this.role==='dancer')){this.activity=this.role==='dreamer'?'sleep':'dance';this.age=0;}
 }
}
