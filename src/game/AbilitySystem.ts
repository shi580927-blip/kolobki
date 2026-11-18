import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {AbilityInventory,ComboChain,type AbilityKind,type PhysicalCombo} from './AbilityModel';
import {pondSubmersion} from './WaterPhysics';
import type {PhysicsPlayer} from './PhysicsPlayer';
export interface AbilityActor {id:number;physics:PhysicsPlayer;hit:()=>void}
export interface AbilityResult {kind:PhysicalCombo;count:number;position:T.Vector3}
export class AbilitySystem {
 readonly chain=new ComboChain();time=0;private jumpedAt=-100;private offensiveUntil=-100;private hitAt=new Map<number,number>();
 constructor(readonly inventory:AbilityInventory,private world:R.World,private player:PhysicsPlayer,private actors:()=>AbilityActor[],private ownWagon:(id:number)=>boolean,private releaseOpponent:(id:number)=>void,private combo:(result:AbilityResult)=>void){}
 get successfulAttack(){return this.time<=this.offensiveUntil;}
 step(dt:number){this.time+=dt;this.inventory.step(dt);}
 reset(){this.inventory.reset();this.chain.reset();this.time=0;this.jumpedAt=this.offensiveUntil=-100;this.hitAt.clear();}
 activate(kind:AbilityKind){
  if(!this.inventory.canUse(kind))return {ok:false,message:'Сначала подберите предмет или дождитесь восстановления.'};
  if(this.player.controlsLocked||pondSubmersion(this.player.current)>.015)return {ok:false,message:'Примените предмет, когда снова будете на суше и сможете двигаться.'};
  if(kind==='lemon'&&!this.player.springJump())return {ok:false,message:'Лимон запускает прыжок с земли. Заряд сохранён.'};
  if(kind==='pepper'&&!this.player.speedPower())return {ok:false,message:'Сейчас не получается разогнаться. Заряд сохранён.'};
  if(kind==='lemon')this.jumpedAt=this.time;
  if(kind==='bomb'){
   const targets=this.actors().filter(a=>!this.ownWagon(a.id));let hits=0;
   for(const a of targets){const delta=a.physics.current.clone().sub(this.player.current),distance=delta.length();if(distance>8||distance<.01||!a.physics.body.isDynamic())continue;
    const ray=new R.Ray(this.player.current,delta.clone().normalize());if(distance>1.1&&this.world.castRay(ray,distance-1.05,true,R.QueryFilterFlags.EXCLUDE_DYNAMIC|R.QueryFilterFlags.EXCLUDE_KINEMATIC))continue;
    const amount=8*(1-distance/9),flat=delta.setY(0);if(flat.lengthSq()<.01)flat.set(Math.sin(a.id*2.4),0,Math.cos(a.id*2.4));flat.normalize().multiplyScalar(amount);flat.y=Math.min(2.1,amount*.28);
    this.releaseOpponent(a.id);a.physics.externalKick(flat);a.hit();this.chain.prime(a.id,this.time);hits++;
   }
   if(hits)this.combo({kind:'blast',count:hits,position:this.player.current.clone()});
  }
  this.inventory.spend(kind);return {ok:true,message:''};
 }
 playerContact(actor:AbilityActor,closing:number,normal:T.Vector3){
  if(this.ownWagon(actor.id)||(this.hitAt.get(actor.id)??-100)>this.time-.65||this.player.controlsLocked)return;
  let kind:PhysicalCombo|undefined;
  if(this.time-this.jumpedAt<2.3&&this.player.impactVelocity.y<-1&&normal.y<-.4&&closing>=3){
   kind='air-hit';this.jumpedAt=-100;const v=this.player.body.linvel();this.player.externalKick(new T.Vector3(0,Math.max(0,3-v.y),0));
  }else if((this.player.powerTime>0||this.player.isDashing)&&normal.y>-.35&&closing>=7){
   kind='ram';if(this.player.powerTime>0){const direction=actor.physics.current.clone().sub(this.player.current).setY(0).normalize().multiplyScalar(Math.min(5,closing*.3));direction.y=.6;actor.physics.externalKick(direction);}
  }
  if(!kind)return;this.offensiveUntil=this.time+.08;this.hitAt.set(actor.id,this.time);actor.hit();this.chain.prime(actor.id,this.time);this.combo({kind,count:1,position:actor.physics.current.clone()});
 }
 actorContact(a:AbilityActor,b:AbilityActor,closing:number,internal:boolean){if(internal||this.ownWagon(a.id)||this.ownWagon(b.id))return;const count=this.chain.contact(a.id,b.id,closing,this.time);if(count)this.combo({kind:'domino',count,position:a.physics.current.clone().add(b.physics.current).multiplyScalar(.5)});}
 snapshot(){return {...this.inventory.snapshot(),pepper:this.player.powerTime};}
}
