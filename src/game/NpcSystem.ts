import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {EventBus} from '../core/events';
import {skinFrom} from '../core/skin';
import {designForGame} from './RuntimeAppearance';
import {RuntimeVisual} from './RuntimeVisual';
import {PhysicsPlayer,type DriveInput} from './PhysicsPlayer';
import {NpcBrain,npcRoster} from './NpcBrain';
import type {AnimationAtlas} from '../face/AnimatedAtlas';
export class NpcSystem {
 readonly actors:ReturnType<NpcSystem['createActor']>[]=[];
 collisionsWithPlayer=0;private playerHandle=-1;
 private worldForward=new T.Vector3(0,0,1);private byCollider=new Map<number,number>();
 constructor(private scene:T.Scene,private world:R.World,private events:EventBus,private atlas:AnimationAtlas,private textures:T.Texture[],private environment:T.Texture|undefined,readonly seed:number){
  for(const entry of npcRoster(seed)){const actor=this.createActor(entry);this.byCollider.set(actor.physics.collider.handle,entry.id);this.actors.push(actor);}
 }
 private createActor(entry:ReturnType<typeof npcRoster>[number]){
  const bus=new EventBus(),physics=new PhysicsPlayer(this.world,bus,{x:entry.x,z:entry.z}),brain=new NpcBrain(entry.kind,entry.behaviorSeed),skin=skinFrom(entry.appearanceSeed),visual=new RuntimeVisual(designForGame(skin),this.atlas,this.textures,skin.mood,this.environment),input:DriveInput={x:0,z:0,jump:false,dash:false};
  visual.position.copy(physics.current);visual.name='npc-'+entry.id;this.scene.add(visual);
  let lastState=brain.state;
  bus.on('player_jump',()=>visual.face.play('happy'));bus.on('player_dash',()=>visual.face.play('fury'));
  bus.on('impact_major',e=>{brain.hit();visual.face.play('dazed');this.events.emit('npc_impact',{id:entry.id,position:e.position,strength:e.strength});});
  return {entry,physics,brain,visual,input,lastState};
 }
 step(dt:number,player:PhysicsPlayer){
  this.playerHandle=player.collider.handle;
  for(const a of this.actors){
   const v=a.physics.body.linvel(),ray=new R.Ray(a.physics.body.translation(),{x:Math.sin(a.physics.heading),y:0,z:Math.cos(a.physics.heading)}),hit=this.world.castRay(ray,4,true,undefined,undefined,a.physics.collider,a.physics.body);
   const blocked=!!hit&&!(a.entry.kind==='bully'&&hit.collider.handle===player.collider.handle);
   const intent=a.brain.step(dt,{x:a.physics.current.x,z:a.physics.current.z,vx:v.x,vz:v.z,playerX:player.current.x,playerZ:player.current.z,neighbors:this.actors.filter(b=>b!==a).map(b=>({x:b.physics.current.x,z:b.physics.current.z})),blocked});
   if(a.brain.state!==a.lastState){if(a.brain.state==='flee')a.visual.face.play('scared');if(a.brain.state==='rest')a.visual.face.play('sleepy');a.lastState=a.brain.state;}
   // Fixed +Z control frame: PhysicsPlayer's right is -X, forward input is -Z.
   a.input.x=-intent.x;a.input.z=-intent.z;a.input.jump=intent.jump;a.input.dash=intent.dash;
   a.physics.step(dt,a.input,this.worldForward);
  }
 }
 sync(){this.actors.forEach(a=>a.physics.sync());}
 contact(first:number,second:number,strength:number){if((first===this.playerHandle&&this.byCollider.has(second))||(second===this.playerHandle&&this.byCollider.has(first)))this.collisionsWithPlayer++;for(const handle of [first,second]){const index=this.byCollider.get(handle);if(index!==undefined){const a=this.actors[index];a.physics.contact(strength);}}}
 update(dt:number,alpha:number){for(const a of this.actors){a.visual.position.lerpVectors(a.physics.previous,a.physics.current,alpha);a.visual.rollingBody.quaternion.slerpQuaternions(a.physics.prevRotation,a.physics.rotation,alpha);a.visual.face.update(dt,a.physics.heading);a.visual.updateDecorations();}}
 reset(){this.collisionsWithPlayer=0;for(const a of this.actors){a.physics.reset();a.brain.reset();a.lastState=a.brain.state;a.visual.face.rig.reset();a.input.x=a.input.z=0;a.input.jump=a.input.dash=false;}}
 snapshot(){return this.actors.map(a=>({id:a.entry.id,kind:a.entry.kind,appearanceSeed:a.entry.appearanceSeed,state:a.brain.state,position:a.physics.current.toArray(),heading:a.physics.heading,rotation:a.physics.rotation.toArray(),facePose:a.visual.face.expression()}));}
}
