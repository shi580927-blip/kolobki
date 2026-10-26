import {randomFrom} from '../core/skin';
export type Temperament='bully'|'coward'|'sly'|'sleepy'|'chaotic';
export type NpcState='wander'|'chase'|'flee'|'flank'|'rest'|'recover'|'return';
export interface NpcContext {x:number;z:number;vx:number;vz:number;playerX:number;playerZ:number;neighbors:readonly {x:number;z:number}[];blocked:boolean}
export class NpcBrain {
 private random:()=>number;private target={x:0,z:15};private think=0;private time=0;private dashTime=0;private jumpTime=0;private recovering=0;private resting=0;private stuck=0;private side:number;
 state:NpcState='wander';
 constructor(readonly kind:Temperament,private seed:number,private grace=4){this.random=randomFrom(seed);this.side=this.random()<.5?-1:1;}
 reset(){this.random=randomFrom(this.seed);this.side=this.random()<.5?-1:1;this.think=this.time=this.dashTime=this.jumpTime=this.recovering=this.resting=this.stuck=0;this.state='wander';}
 hit(){this.recovering=.65;}
 step(dt:number,c:NpcContext){
  this.time+=dt;this.think-=dt;this.dashTime-=dt;this.jumpTime-=dt;this.recovering=Math.max(0,this.recovering-dt);this.resting=Math.max(0,this.resting-dt);
  const pdx=c.playerX-c.x,pdz=c.playerZ-c.z,distance=Math.hypot(pdx,pdz);
  let dx=this.target.x-c.x,dz=this.target.z-c.z,speed=3.8,jump=false,dash=false;this.state='wander';
  if(this.think<=0||Math.hypot(dx,dz)<2){const a=this.random()*Math.PI*2,r=12+this.random()*20;this.target={x:Math.cos(a)*r,z:Math.sin(a)*r};this.think=.9+this.random()*2.1;dx=this.target.x-c.x;dz=this.target.z-c.z;if(this.kind==='sleepy'&&this.random()<.45)this.resting=1.2+this.random()*2;}
  if(this.kind==='sleepy'){speed=1.65;if(this.resting>0){this.state='rest';speed=0;}}
  if(this.time>=this.grace){
   if(this.kind==='bully'&&distance<23){this.state='chase';dx=pdx;dz=pdz;speed=4.6;if(distance>3.5&&distance<11&&this.dashTime<=0){dash=true;this.dashTime=3.2+this.random()*2;}}
   if(this.kind==='coward'&&distance<12){this.state='flee';dx=-pdx;dz=-pdz;speed=5.5;}
   if(this.kind==='sly'&&distance<19){this.state='flank';dx=c.playerX+this.side*7-c.x;dz=c.playerZ+5-c.z;speed=3.5;}
   if(this.kind==='chaotic'){speed=5.8;if(this.jumpTime<=0){jump=true;this.jumpTime=1.8+this.random()*2.5;}if(this.dashTime<=0){dash=true;this.dashTime=3.5+this.random()*3;}}
  }else if(distance<6){dx=-pdx;dz=-pdz;speed=3;}
  if(Math.hypot(c.x,c.z)>52){this.state='return';dx=-c.x;dz=-c.z;speed=4;dash=false;}
  const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;
  for(const other of c.neighbors){const nx=c.x-other.x,nz=c.z-other.z,d=Math.hypot(nx,nz);if(d>0&&d<3.2){const push=(3.2-d)*.7;dx+=nx/d*push;dz+=nz/d*push;}}
  if(c.blocked&&this.kind!=='chaotic'){const old=dx;dx=dx*.25-dz*this.side;dz=dz*.25+old*this.side;dash=false;}
  if(speed>0&&Math.hypot(c.vx,c.vz)<.2){this.stuck+=dt;if(this.stuck>2){this.think=0;this.stuck=0;}}else this.stuck=0;
  if(this.recovering>0){this.state='recover';return{x:0,z:0,jump:false,dash:false};}
  const n=Math.hypot(dx,dz)||1,ax=(dx/n*speed-c.vx)*.24,az=(dz/n*speed-c.vz)*.24,throttle=Math.max(1,Math.hypot(ax,az));
  return {x:ax/throttle,z:az/throttle,jump,dash};
 }
}
export function npcRoster(seed:number){
 const appearance=randomFrom(seed^0x19fe21),behavior=randomFrom(seed^0x6b0421),kinds:Temperament[]=['bully','coward','sly','sleepy','chaotic'];
 const spots=[[-6,9],[6,12],[-11,4],[13,10],[0,17]];
 for(let i=kinds.length-1;i>0;i--){const j=Math.floor(behavior()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
 return kinds.map((kind,id)=>({id,kind,appearanceSeed:Math.floor(appearance()*0x100000000),behaviorSeed:Math.floor(behavior()*0x100000000),x:spots[id][0],z:spots[id][1]}));
}
