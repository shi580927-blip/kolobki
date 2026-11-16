import R from '@dimforge/rapier3d-compat';
import {EventBus} from '../core/events';
import {NpcSystem} from './NpcSystem';
import {TrainSystem,type TrainOptions} from './TrainSystem';
/** Independent sandbox trains; race ownership stays with MatchSession. */
export class NpcFleet {
 readonly heads=[0,5,10];readonly trains:TrainSystem[];private enabled=false;
 constructor(private npcs:NpcSystem,world:R.World,private playerTrain:TrainSystem,private playerOptions:TrainOptions){
  this.trains=this.heads.map(head=>new TrainSystem(world,npcs.actors[head].physics,
   npcs.actors.slice(head+1,head+5).map(a=>({id:a.entry.id,physics:a.physics})),new EventBus(),
   {manageGroups:false,canRecruit:id=>!playerTrain.has(id)&&!playerTrain.isJoining(id)}));
 }
 controlled(id:number){return this.enabled&&this.trains.some(t=>t.has(id)||t.isJoining(id));}
 internal(a:number,b:number){return this.enabled&&this.trains.some(t=>t.isInternalContact(a,b));}
 reset(){this.trains.forEach(t=>t.reset());this.enabled=false;}
 step(dt:number,active:boolean){
  if(!active){if(this.enabled)this.reset();return;}
  this.enabled=true;this.playerOptions.manageGroups=false;
  this.playerOptions.canRecruit=id=>!this.heads.includes(id)&&!this.controlled(id);
  this.trains.forEach(t=>t.step(dt));
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
 snapshot(){return this.enabled?this.trains.map((t,i)=>({head:this.heads[i],...t.snapshot()})):[];}
}
