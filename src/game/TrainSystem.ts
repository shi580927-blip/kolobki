import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {EventBus} from '../core/events';
import {PhysicsPlayer} from './PhysicsPlayer';

export interface TrainActor {id:number;physics:PhysicsPlayer}
// Trial balance, not approved final design. Five existing NPCs; no extra actors.
export const TRAIN_RULES={limit:5,spacing:2.25,breakSpeed:12,recollectDelay:1.6,maxStretch:4.5};
const FREE_GROUP=0x0001ffff;
const idle=()=>({x:0,z:0,jump:false,dash:false});

/** Bounded path history + velocity steering. Wagons stay dynamic Rapier spheres:
 * gravity, ground contacts and rolling remain real. At most five center ropes
 * bound adjacent distance without spring forces or teleporting. */
export class TrainSystem {
 private wagons:TrainActor[]=[];
 private trail:Vector3[]=[];
 private cooldown=new Map<number,number>();
 private velocities=new Map<number,Vector3>();
 private links:R.ImpulseJoint[]=[];
 attachedTotal=0;breakTotal=0;
 constructor(private world:R.World,readonly leader:PhysicsPlayer,private actors:TrainActor[],private bus:EventBus){
  this.reset();
 }
 isInternalContact(first:number,second:number){
  const handles=[this.leader.collider.handle,...this.wagons.map(a=>a.physics.collider.handle)];
  return this.count>0&&handles.includes(first)&&handles.includes(second);
 }
 get count(){return this.wagons.length;}
 has(id:number){return this.wagons.some(a=>a.id===id);}
 snapshot(){return {links:this.links.length,gaps:this.wagons.map((a,i)=>a.physics.current.distanceTo(i?this.wagons[i-1].physics.current:this.leader.current)),ids:this.wagons.map(a=>a.id),count:this.count,limit:TRAIN_RULES.limit,attachedTotal:this.attachedTotal,breakTotal:this.breakTotal,cooldowns:Object.fromEntries(this.cooldown)};}
 private setGroups(){
  this.leader.collider.setCollisionGroups(FREE_GROUP);
  this.actors.forEach(a=>a.physics.collider.setCollisionGroups(FREE_GROUP));
 }
 reset(){
  this.clearLinks();this.wagons=[];this.cooldown.clear();this.velocities.clear();this.attachedTotal=this.breakTotal=0;
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
  const leaderVelocity=this.leader.body.linvel(),speed=Math.hypot(leaderVelocity.x,leaderVelocity.z);
  this.wagons.forEach((actor,i)=>{
   const p=actor.physics,distance=(i+1)*TRAIN_RULES.spacing,target=this.target(distance);
   const error=target.clone().sub(p.current).setY(0);
   // Feed forward the speed along the local path, rather than waiting until a
   // two-body gap develops. Center ropes bound separation; all spheres collide.
   const tangent=this.target(Math.max(0,distance-.35)).sub(target).setY(0).normalize();
   const desired=tangent.multiplyScalar(speed).addScaledVector(error,5).clampLength(0,30);
   p.step(dt,idle(),new Vector3(0,0,1));
   const v=p.body.linvel(),blend=1-Math.exp(-14*dt);
   p.body.setLinvel({x:v.x+(desired.x-v.x)*blend,y:v.y,z:v.z+(desired.z-v.z)*blend},true);
   p.body.setAngvel({x:desired.z,y:0,z:-desired.x},true);
  });
  for(const p of [this.leader,...this.actors.map(a=>a.physics)]){p.captureVelocity();this.velocities.set(p.collider.handle,new Vector3().copy(p.body.linvel()));}
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
      const groundSupport=Math.abs(m.normal().y)>.55&&point.y<member.current.y-.35;
      if(!groundSupport&&m.solverContactDist(i)<.02&&velocity.dot(point.sub(member.current).normalize())>=TRAIN_RULES.breakSpeed)strongContact=true;
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
   const previous=this.wagons.at(-1)?.physics??this.leader;
   const link=this.world.createImpulseJoint(R.JointData.rope(TRAIN_RULES.spacing,{x:0,y:0,z:0},{x:0,y:0,z:0}),previous.body,actor.physics.body,true);
   link.setContactsEnabled(true);this.links.push(link);
   previous.body.setAdditionalSolverIterations(4);actor.physics.body.setAdditionalSolverIterations(4);
   this.wagons.push(actor);this.attachedTotal++;this.setGroups();
   this.bus.emit('train_attach',{id:actor.id,count:this.count,position:actor.physics.current.clone()});
  }
 }
 private clearLinks(){
  for(const link of this.links)if(link.isValid())this.world.removeImpulseJoint(link,true);
  this.links=[];
  for(const p of [this.leader,...this.actors.map(a=>a.physics)])p.body.setAdditionalSolverIterations(0);
 }
 break(reason:'head-impact'|'collision'|'stretch'|'respawn'){
  if(!this.count)return;
  const released=this.wagons;this.clearLinks();this.wagons=[];this.breakTotal++;this.setGroups();
  released.forEach((a,i)=>{
   this.cooldown.set(a.id,TRAIN_RULES.recollectDelay);
   const p=a.physics,side=i%2?1:-1,angle=this.leader.heading+side*(.8+i*.15),mass=p.body.mass();
   // Preserve momentum and add a small comic separation impulse.
   p.body.applyImpulse({x:Math.sin(angle)*mass*3.5,y:mass*3.5,z:Math.cos(angle)*mass*3.5},true);
  });
  this.bus.emit('train_break',{ids:released.map(a=>a.id),count:released.length,reason,position:this.leader.current.clone()});
 }
}
