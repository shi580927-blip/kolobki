import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {EventBus} from '../core/events';
import {NpcSystem} from './NpcSystem';
import {TrainSystem,type TrainOptions} from './TrainSystem';
/** Independent sandbox trains; race ownership stays with MatchSession. */
export class NpcFleet {
 readonly heads=[0,5,10];readonly trains:TrainSystem[];private enabled=false;private clock=0;private forward=new Vector3(0,0,1);
 constructor(private npcs:NpcSystem,private world:R.World,private playerTrain:TrainSystem,private playerOptions:TrainOptions){
  this.trains=this.heads.map(head=>new TrainSystem(world,npcs.actors[head].physics,
   npcs.actors.slice(head+1,head+5).map(a=>({id:a.entry.id,physics:a.physics})),new EventBus(),
   {manageGroups:false,canRecruit:id=>!playerTrain.has(id)&&!playerTrain.isJoining(id)}));
 }
 controlled(id:number){return this.enabled&&(this.heads.includes(id)||this.trains.some(t=>t.has(id)||t.isJoining(id)));}
 internal(a:number,b:number){return this.enabled&&this.trains.some(t=>t.isInternalContact(a,b));}
 reset(){this.trains.forEach(t=>t.reset());this.enabled=false;this.clock=0;}
 step(dt:number,active:boolean){
  if(!active){if(this.enabled)this.reset();return;}
  this.enabled=true;this.playerOptions.manageGroups=false;
  this.playerOptions.canRecruit=id=>!this.heads.includes(id)&&!this.controlled(id);
  this.clock+=dt;
  this.trains.forEach((t,i)=>{
   const p=t.leader.current,v=t.leader.body.linvel();
   const free=this.npcs.actors.slice(this.heads[i]+1,this.heads[i]+5).filter(a=>!t.has(a.entry.id)&&!t.isJoining(a.entry.id)&&!this.playerTrain.has(a.entry.id)&&!this.playerTrain.isJoining(a.entry.id));
   const candidate=t.snapshot().joining===undefined?free.sort((a,b)=>a.physics.current.distanceToSquared(p)-b.physics.current.distanceToSquared(p))[0]:undefined;
   const angle=this.clock*.045+i*Math.PI*2/3;
   const target=candidate?.physics.current??new Vector3(Math.cos(angle)*30,0,Math.sin(angle)*30);
   const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz)||1,speed=candidate?Math.min(3.4,d*.9):3.4;
   let ax=(dx/d*speed-v.x)*.28,az=(dz/d*speed-v.z)*.28;
   const hit=this.world.castRay(new R.Ray(p,{x:dx/d,y:0,z:dz/d}),2.8,true,R.QueryFilterFlags.EXCLUDE_DYNAMIC|R.QueryFilterFlags.EXCLUDE_KINEMATIC,undefined,t.leader.collider,t.leader.body,c=>c.shapeType()!==R.ShapeType.TriMesh);
   if(hit){const x=ax;ax=-az;az=x;}
   const n=Math.max(1,Math.hypot(ax,az));t.leader.step(dt,{x:-ax/n,z:-az/n,jump:false,dash:false},this.forward);t.step(dt);
  });
 }
 afterStep(){
  if(!this.enabled)return;this.trains.forEach(t=>t.afterStep());
  // Each convoy ignores only its own physical group.
  const masks=[4,8,16];
  const group=(member:number)=>((member<<16)|(0xffff^member))>>>0;
  this.playerTrain.leader.collider.setCollisionGroups(group(2));
  this.npcs.actors.forEach(a=>{
   let member=this.playerTrain.has(a.entry.id)||this.playerTrain.isJoining(a.entry.id)?2:1;
   this.trains.forEach((t,i)=>{if(a.entry.id===this.heads[i]||t.has(a.entry.id)||t.isJoining(a.entry.id))member=masks[i];});
   a.physics.collider.setCollisionGroups(member===1?0x0001ffff:group(member));
  });
 }
 releaseFrom(id:number,reason:string){this.trains.forEach(t=>t.releaseFrom(id,reason));}
 snapshot(){return this.enabled?this.trains.map((t,i)=>({head:this.heads[i],...t.snapshot()})):[];}
}
