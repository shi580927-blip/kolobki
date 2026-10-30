import {pondSubmersion} from './WaterPhysics';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {EventBus} from '../core/events';
import {PhysicsPlayer} from './PhysicsPlayer';

export interface TrainActor {id:number;physics:PhysicsPlayer}
export interface TrainOptions {canRecruit?:(id:number)=>boolean;manageGroups?:boolean;breakOnContact?:boolean}
// Trial balance, not approved final design. Five existing NPCs; no extra actors.
export const TRAIN_RULES={limit:5,spacing:2.25,breakSpeed:12,recollectDelay:1.6,joinTimeout:10};
const FREE_GROUP=0x0001ffff,TRAIN_GROUP=0x0002fffd;
const idle=()=>({x:0,z:0,jump:false,dash:false});

/** Bounded path history + velocity steering. Wagons stay dynamic Rapier spheres:
 * gravity, ground contacts and rolling remain real. Own-body separation and
 * towing are horizontal only: no vertical joints or support from other wagons. */
export class TrainSystem {
 private wagons:TrainActor[]=[];
 private trail:Vector3[]=[];
 private cooldown=new Map<number,number>();
 private velocities=new Map<number,Vector3>();
 private joining:{actor:TrainActor;time:number;side:number}|undefined;
 attachedTotal=0;breakTotal=0;
 constructor(private world:R.World,readonly leader:PhysicsPlayer,private actors:TrainActor[],private bus:EventBus,private options:TrainOptions={}){
  this.reset();
 }
 isInternalContact(first:number,second:number){
  const handles=[this.leader.collider.handle,...this.controlled().map(a=>a.physics.collider.handle)];
  return this.controlled().length>0&&handles.includes(first)&&handles.includes(second);
 }
 get count(){return this.wagons.length;}
 has(id:number){return this.wagons.some(a=>a.id===id);}
 isJoining(id:number){return this.joining?.actor.id===id;}
 private controlled(){return [...this.wagons,...(this.joining?[this.joining.actor]:[])];}
 snapshot(){return {joining:this.joining?.actor.id,links:0,gaps:this.wagons.map((a,i)=>{const p=i?this.wagons[i-1].physics.current:this.leader.current;return Math.hypot(a.physics.current.x-p.x,a.physics.current.z-p.z);}),ids:this.wagons.map(a=>a.id),count:this.count,limit:TRAIN_RULES.limit,attachedTotal:this.attachedTotal,breakTotal:this.breakTotal,cooldowns:Object.fromEntries(this.cooldown)};}
 private setGroups(){
  if(this.options.manageGroups===false)return;
  const active=this.controlled().length>0;
  this.leader.collider.setCollisionGroups(active?TRAIN_GROUP:FREE_GROUP);
  this.actors.forEach(a=>a.physics.collider.setCollisionGroups(this.has(a.id)||this.isJoining(a.id)?TRAIN_GROUP:FREE_GROUP));
 }
 reset(){
  this.joining=undefined;this.wagons=[];this.cooldown.clear();this.velocities.clear();this.attachedTotal=this.breakTotal=0;
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
 private steer(p:PhysicsPlayer,target:Vector3,speed:number,dt:number,side?:number){
  const goal=target.clone();
  // Route a recruit around the bodies between it and the tail, never through
  // the head. A stable side avoids alternating left/right on successive ticks.
  if(side!==undefined){
   const direction=goal.clone().sub(p.current).setY(0),length=direction.length();direction.normalize();
   for(const other of [this.leader,...this.wagons.map(a=>a.physics)]){
    const offset=other.current.clone().sub(p.current).setY(0),along=offset.dot(direction);
    if(along<=0||along>=length||offset.clone().addScaledVector(direction,-along).length()>2.2)continue;
    goal.copy(other.current).add(new Vector3(-direction.z,0,direction.x).multiplyScalar(side*2.7));break;
   }
  }
  const error=goal.sub(p.current).setY(0),desired=error.multiplyScalar(5);
  if(speed>0){const tangent=this.target(Math.max(0,(this.wagons.findIndex(a=>a.physics===p)+1)*TRAIN_RULES.spacing-.35)).sub(target).setY(0).normalize();desired.addScaledVector(tangent,speed);}
  desired.clampLength(0,30);
  p.step(dt,idle(),new Vector3(0,0,1));
  const v=p.body.linvel(),blend=1-Math.exp(-14*dt);
  p.body.setLinvel({x:v.x+(desired.x-v.x)*blend,y:v.y,z:v.z+(desired.z-v.z)*blend},true);
  p.body.setAngvel({x:desired.z,y:0,z:-desired.x},true);
 }
 step(dt:number){
  this.releaseInWater();
  for(const [id,time] of this.cooldown){if(time<=dt)this.cooldown.delete(id);else this.cooldown.set(id,time-dt);}
  this.recordPath();
  const velocity=this.leader.body.linvel(),speed=Math.hypot(velocity.x,velocity.z);
  this.wagons.forEach((a,i)=>this.steer(a.physics,this.target((i+1)*TRAIN_RULES.spacing),speed,dt));
  if(this.joining){
   this.joining.time+=dt;
   const tail=this.wagons.at(-1)?.physics??this.leader;
   const behind=this.target((this.count+1)*TRAIN_RULES.spacing).sub(this.target(this.count*TRAIN_RULES.spacing)).setY(0).normalize();
   const target=tail.current.clone().addScaledVector(behind,TRAIN_RULES.spacing);
   this.steer(this.joining.actor.physics,target,0,dt,this.joining.side);
   if(this.joining.time>TRAIN_RULES.joinTimeout){this.cooldown.set(this.joining.actor.id,TRAIN_RULES.recollectDelay);this.joining=undefined;this.setGroups();}
  }
  for(const p of [this.leader,...this.actors.map(a=>a.physics)]){p.captureVelocity();this.velocities.set(p.collider.handle,new Vector3().copy(p.body.linvel()));}
 }
 private moveHorizontal(p:PhysicsPlayer,dx:number,dz:number){
  if(!p.body.isDynamic())return;
  p.body.setTranslation({x:p.current.x+dx,y:p.current.y,z:p.current.z+dz},true);
  p.current.copy(p.body.translation());
 }
 /** Arcade contact solver for our own train. Corrections and contact impulses
  * have no Y component; they cannot turn a compressed train into a tower. */
 private separate(){
  const bodies=[this.leader,...this.controlled().map(a=>a.physics)];
  for(let iteration=0;iteration<10;iteration++){
   // Bound horizontal link stretch gradually; never pull a remote recruit in.
   for(let i=0;i<this.wagons.length;i++){
    const a=i?this.wagons[i-1].physics:this.leader,b=this.wagons[i].physics;
    const dx=b.current.x-a.current.x,dz=b.current.z-a.current.z,d=Math.hypot(dx,dz);
    if(d>2.4){const correction=Math.min(.12,d-2.4);this.moveHorizontal(b,-dx/d*correction,-dz/d*correction);}
   }
   for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],dx=b.current.x-a.current.x,dz=b.current.z-a.current.z,d=Math.hypot(dx,dz);
    // A very high flying ball can pass above; separation starts before descent
    // could create a standing contact. Own colliders never provide Y support.
    if(Math.abs(b.current.y-a.current.y)>2.5||d>=2.02)continue;
    const nx=d>1e-6?dx/d:Math.cos((i+j)*2.4),nz=d>1e-6?dz/d:Math.sin((i+j)*2.4);
    const wa=a.body.isDynamic()?1:0,wb=b.body.isDynamic()?1:0,total=wa+wb;if(!total)continue;
    const correction=Math.min(.2,2.02-d);
    this.moveHorizontal(a,-nx*correction*wa/total,-nz*correction*wa/total);this.moveHorizontal(b,nx*correction*wb/total,nz*correction*wb/total);
    const va=a.body.linvel(),vb=b.body.linvel(),closing=(va.x-vb.x)*nx+(va.z-vb.z)*nz;
    if(closing>0){if(wa)a.body.setLinvel({x:va.x-nx*closing*wa/total,y:va.y,z:va.z-nz*closing*wa/total},true);if(wb)b.body.setLinvel({x:vb.x+nx*closing*wb/total,y:vb.y,z:vb.z+nz*closing*wb/total},true);}
   }
  }
 }
 private releaseInWater(){
  const headWet=pondSubmersion(this.leader.current)>.015;
  const released=this.wagons.filter(a=>headWet||pondSubmersion(a.physics.current)>.015);
  const joiningWet=this.joining&&(headWet||pondSubmersion(this.joining.actor.physics.current)>.015);
  if(!released.length&&!joiningWet)return;
  if(joiningWet&&this.joining){this.cooldown.set(this.joining.actor.id,TRAIN_RULES.recollectDelay);this.joining=undefined;}
  this.wagons=this.wagons.filter(a=>!released.includes(a));
  for(const a of released)this.cooldown.set(a.id,TRAIN_RULES.recollectDelay);
  this.setGroups();
  if(released.length){this.breakTotal++;this.bus.emit('train_water_release',{ids:released.map(a=>a.id),count:released.length,position:(headWet?this.leader:released[0].physics).current.clone()});}
 }
 afterStep(){
  this.releaseInWater();
  if(pondSubmersion(this.leader.current)>.015)return;
  // Only real Rapier contacts can collect or break; proximity alone cannot.
  const members=[this.leader,...this.controlled().map(a=>a.physics)];
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
   if(this.has(actor.id)||this.isJoining(actor.id)||pondSubmersion(actor.physics.current)>.015)return;
   let touching=false;
   this.world.contactPair(member.collider,other,m=>{for(let i=0;i<m.numSolverContacts();i++)if(m.solverContactDist(i)<.02)touching=true;});
   if(!touching)return;
   const delta=actor.physics.current.clone().sub(member.current).normalize();
   const relative=(this.velocities.get(member.collider.handle)??new Vector3()).clone().sub(this.velocities.get(other.handle)??new Vector3());
   const closing=relative.dot(delta);
   if(closing>=TRAIN_RULES.breakSpeed){strongContact=true;this.cooldown.set(actor.id,TRAIN_RULES.recollectDelay);return;}
   if(!this.cooldown.has(actor.id)&&!candidates.includes(actor))candidates.push(actor);
  });
  if(strongContact&&this.options.breakOnContact!==false){if(attachedAtStart||this.joining)this.break('collision');return;}
  // First recruit on a real contact, then let it approach the tail naturally.
  const actor=candidates.find(a=>this.options.canRecruit?.(a.id)!==false);
  if(actor&&!this.joining&&this.count<TRAIN_RULES.limit){this.joining={actor,time:0,side:actor.id%2?1:-1};this.setGroups();}
  this.separate();
  if(this.joining){
   const p=this.joining.actor.physics,tail=this.wagons.at(-1)?.physics??this.leader;
   const distance=Math.hypot(p.current.x-tail.current.x,p.current.z-tail.current.z);
   if(this.joining.time>.15&&distance<2.7&&Math.abs(p.current.y-tail.current.y)<.8&&p.hasSurfaceSupport()&&tail.hasSurfaceSupport()){
    const recruited=this.joining.actor;this.joining=undefined;this.wagons.push(recruited);this.attachedTotal++;this.setGroups();
    this.bus.emit('train_attach',{id:recruited.id,count:this.count,position:p.current.clone()});
   }
  }
 }
 break(reason:'head-impact'|'collision'|'stretch'|'respawn'){
  if(!this.count&&!this.joining)return;
  const released=this.wagons;
  if(this.joining)this.cooldown.set(this.joining.actor.id,TRAIN_RULES.recollectDelay);
  this.joining=undefined;this.wagons=[];if(released.length)this.breakTotal++;this.setGroups();
  released.forEach((a,i)=>{
   this.cooldown.set(a.id,TRAIN_RULES.recollectDelay);
   const p=a.physics,side=i%2?1:-1,angle=this.leader.heading+side*(.8+i*.15),mass=p.body.mass();
   // Preserve momentum and add a small comic separation impulse.
   p.body.applyImpulse({x:Math.sin(angle)*mass*3.5,y:mass*3.5,z:Math.cos(angle)*mass*3.5},true);
  });
  if(released.length)this.bus.emit('train_break',{ids:released.map(a=>a.id),count:released.length,reason,position:this.leader.current.clone()});
 }
}
