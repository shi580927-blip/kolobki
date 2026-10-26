import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {EventBus} from '../core/events';
import {PhysicsPlayer} from './PhysicsPlayer';

export interface TrainActor {id:number;physics:PhysicsPlayer}
// Trial balance, not approved final design. Five existing NPCs; no extra actors.
export const TRAIN_RULES={limit:5,spacing:2.5,breakSpeed:7.5,recollectDelay:1.6,maxStretch:8};
const FREE_GROUP=0x0001ffff,TRAIN_GROUP=0x0002fffd;
const idle=()=>({x:0,z:0,jump:false,dash:false});

/** Bounded path history + velocity steering. Wagons stay dynamic Rapier spheres:
 * gravity, ground contacts and rolling remain real; no spring chain or teleport. */
export class TrainSystem {
 private wagons:TrainActor[]=[];
 private trail:Vector3[]=[];
 private cooldown=new Map<number,number>();
 private velocities=new Map<number,Vector3>();
 private stretched=new Map<number,number>();
 attachedTotal=0;breakTotal=0;
 constructor(private world:R.World,readonly leader:PhysicsPlayer,private actors:TrainActor[],private bus:EventBus){
  this.reset();
  bus.on('impact_major',()=>this.break('head-impact'));
 }
 get count(){return this.wagons.length;}
 has(id:number){return this.wagons.some(a=>a.id===id);}
 snapshot(){return {ids:this.wagons.map(a=>a.id),count:this.count,limit:TRAIN_RULES.limit,attachedTotal:this.attachedTotal,breakTotal:this.breakTotal,cooldowns:Object.fromEntries(this.cooldown)};}
 private setGroups(){
  this.leader.collider.setCollisionGroups(this.count?TRAIN_GROUP:FREE_GROUP);
  this.actors.forEach(a=>a.physics.collider.setCollisionGroups(this.has(a.id)?TRAIN_GROUP:FREE_GROUP));
 }
 reset(){
  this.wagons=[];this.cooldown.clear();this.stretched.clear();this.velocities.clear();this.attachedTotal=this.breakTotal=0;
  this.trail=[this.leader.current.clone()];this.setGroups();
 }
 private recordPath(){
  const p=this.leader.current;
  // An automatic out-of-bounds respawn must not drag the train through the map.
  if(p.distanceTo(this.trail[0])>12){this.break('respawn');this.trail=[p.clone()];return;}
  if(p.distanceTo(this.trail[0])<.12)return;
  this.trail.unshift(p.clone());
  let length=0;
  for(let i=1;i<this.trail.length;i++){
   length+=this.trail[i].distanceTo(this.trail[i-1]);
   if(length>24){this.trail.length=i+1;break;}
  }
 }
 private target(distance:number){
  for(let i=1;i<this.trail.length;i++){
   const length=this.trail[i].distanceTo(this.trail[i-1]);
   if(distance<=length)return this.trail[i-1].clone().lerp(this.trail[i],distance/length);
   distance-=length;
  }
  const last=this.trail[this.trail.length-1];
  const back=this.trail.length>1?last.clone().sub(this.trail[this.trail.length-2]).setY(0).normalize():new Vector3(-Math.sin(this.leader.heading),0,-Math.cos(this.leader.heading));
  return last.clone().addScaledVector(back,distance);
 }
 step(dt:number){
  for(const [id,time] of this.cooldown){if(time<=dt)this.cooldown.delete(id);else this.cooldown.set(id,time-dt);}
  this.recordPath();
  this.wagons.forEach((actor,i)=>{
   const p=actor.physics,target=this.target((i+1)*TRAIN_RULES.spacing);
   const error=target.clone().sub(p.current).setY(0),distance=error.length();
   this.stretched.set(actor.id,distance>TRAIN_RULES.maxStretch?(this.stretched.get(actor.id)??0)+dt:0);
   // Brake at the target; speed is bounded even when joining from the front.
   const desired=error.multiplyScalar(4).clampLength(0,22),v=p.body.linvel(),blend=1-Math.exp(-10*dt);
   p.body.setLinvel({x:v.x+(desired.x-v.x)*blend,y:v.y,z:v.z+(desired.z-v.z)*blend},true);
   p.body.setAngvel({x:desired.z,y:0,z:-desired.x},true);
   p.step(dt,idle(),new Vector3(0,0,1));
  });
  if([...this.stretched.values()].some(t=>t>.65))this.break('stretch');
  for(const p of [this.leader,...this.actors.map(a=>a.physics)])this.velocities.set(p.collider.handle,new Vector3().copy(p.body.linvel()));
 }
 afterStep(){
  // Only real Rapier contacts can collect or break; proximity alone cannot.
  const members=[this.leader,...this.wagons.map(a=>a.physics)];
  const attachedAtStart=this.count;
  const candidates:TrainActor[]=[];
  let strongContact=false;
  for(const member of members)this.world.contactPairsWith(member.collider,other=>{
   const actor=this.actors.find(a=>a.physics.collider.handle===other.handle);
   if(!actor){
    if(other.handle===this.leader.collider.handle)return;
    // Side-on obstacle strikes can break wagons; ordinary lower ground support
    // must not dismantle the train every physics tick.
    const velocity=this.velocities.get(member.collider.handle)??new Vector3();
    this.world.contactPair(member.collider,other,m=>{
     for(let i=0;i<m.numSolverContacts();i++){
      const point=new Vector3().copy(m.solverContactPoint(i));
      if(m.solverContactDist(i)<.02&&point.y>member.current.y-.6&&velocity.dot(point.sub(member.current).normalize())>=TRAIN_RULES.breakSpeed)strongContact=true;
     }
    });
    return;
   }
   if(this.has(actor.id))return;
   let touching=false;
   this.world.contactPair(member.collider,other,m=>{for(let i=0;i<m.numSolverContacts();i++)if(m.solverContactDist(i)<.02)touching=true;});
   if(!touching)return;
   const delta=actor.physics.current.clone().sub(member.current).normalize();
   const relative=(this.velocities.get(member.collider.handle)??new Vector3()).clone().sub(this.velocities.get(other.handle)??new Vector3());
   const closing=relative.dot(delta);
   if(closing>=TRAIN_RULES.breakSpeed){strongContact=true;this.cooldown.set(actor.id,TRAIN_RULES.recollectDelay);return;}
   if(!this.cooldown.has(actor.id)&&!candidates.includes(actor))candidates.push(actor);
  });
  if(strongContact){if(attachedAtStart)this.break('collision');return;}
  // One contact adds one wagon. A just-released body cannot rejoin in this tick.
  const actor=candidates[0];
  if(actor&&this.count<TRAIN_RULES.limit){
   this.wagons.push(actor);this.attachedTotal++;this.setGroups();
   this.bus.emit('train_attach',{id:actor.id,count:this.count,position:actor.physics.current.clone()});
  }
 }
 break(reason:'head-impact'|'collision'|'stretch'|'respawn'){
  if(!this.count)return;
  const released=this.wagons;this.wagons=[];this.stretched.clear();this.breakTotal++;this.setGroups();
  released.forEach((a,i)=>{
   this.cooldown.set(a.id,TRAIN_RULES.recollectDelay);
   const p=a.physics,side=i%2?1:-1,angle=this.leader.heading+side*(.8+i*.15),mass=p.body.mass();
   // Preserve momentum and add a small comic separation impulse.
   p.body.applyImpulse({x:Math.sin(angle)*mass*3.5,y:mass*3.5,z:Math.cos(angle)*mass*3.5},true);
  });
  this.bus.emit('train_break',{ids:released.map(a=>a.id),count:released.length,reason,position:this.leader.current.clone()});
 }
}
