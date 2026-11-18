import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene} from 'three';
import {SOUTH_BRIDGE,southBridgePoint} from '../src/game/SouthBridge';
import {applyPondWater} from '../src/game/WaterPhysics';
test('a three-wagon train can cross the southern arch and return',async()=>{
 const {Vector3}=await import('three'),{createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events'),{TrainSystem}=await import('../src/game/TrainSystem');
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);
 const leader=new PhysicsPlayer(world,new EventBus());
 const actors=Array.from({length:3},(_,id)=>({id,physics:new PhysicsPlayer(world,new EventBus(),{x:80+id*3,z:0})}));
 const train=new TrainSystem(world,leader,actors,new EventBus(),{breakOnContact:false}),forward=new Vector3(0,0,1);
 const tick=(x=0,z=0)=>{leader.step(1/60,{x,z,jump:false,dash:false,touchDrive:true},forward);for(const a of actors)if(!train.has(a.id)&&!train.isJoining(a.id))a.physics.step(1/60,{x:0,z:0,jump:false,dash:false},forward);train.step(1/60);leader.applySandDrag(1/60);for(const a of actors)a.physics.applySandDrag(1/60);applyPondWater(leader.body,1/60);for(const a of actors)applyPondWater(a.physics.body,1/60);world.step();leader.sync();actors.forEach(a=>a.physics.sync());train.afterStep();leader.updateCoating(1/60);for(const a of actors)a.physics.updateCoating(1/60);};
 for(let i=0;i<60;i++)tick();
 for(const a of actors){a.physics.body.setTranslation({x:leader.current.x+1.95,y:leader.current.y,z:leader.current.z},true);a.physics.body.setLinvel({x:0,y:0,z:0},true);a.physics.sync();for(let i=0;i<900&&!train.has(a.id);i++)tick();assert.ok(train.has(a.id),JSON.stringify({id:a.id,head:leader.current.toArray(),headCoat:leader.coating,actor:a.physics.current.toArray(),coat:a.physics.coating,train:train.snapshot()}));}
 let maxGap=0;
 const route=[{x:0,z:12},{x:12,z:30},{x:28,z:42},{x:16,z:55},{x:6,z:68},{x:-8,z:80},{x:-30,z:87},southBridgePoint(1),southBridgePoint(.5),southBridgePoint(0),southBridgePoint(.5),southBridgePoint(1),{x:-30,z:87}];
 for(const [t,target] of route.entries()){
  let arrived=false;
  for(let i=0;i<2200;i++){
   const vx=target.x-leader.current.x,vz=target.z-leader.current.z,d=Math.hypot(vx,vz);if(d<.8){arrived=true;break;}
   const amount=Math.min(.38,d/4);tick(-vx/d*amount,-vz/d*amount);maxGap=Math.max(maxGap,...train.snapshot().gaps);assert.equal(train.count,3);
  }
  assert.ok(arrived,`bridge waypoint ${t}: ${leader.current.toArray()}`);
 }
 assert.ok(maxGap<5,`train separation ${maxGap}`);
 world.free();
});

test('southern deck has matching visual and physical support over the shallow cove',async()=>{
 const {Raycaster,Vector3}=await import('three'),{addSouthBridge}=await import('../src/game/SouthBridge'),{heightAt}=await import('../src/core/terrain');
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),deck=addSouthBridge(scene,w);deck.updateMatrixWorld(true);w.step();
 assert.equal(w.colliders.len(),1);
 for(const t of [.1125,.5125,.8875]){
  const p=southBridgePoint(t),origin=new Vector3(p.x,10,p.z),direction=new Vector3(0,-1,0);
  const visual=new Raycaster(origin,direction).intersectObject(deck)[0],physical=w.castRay(new R.Ray(origin,direction),12,true);
  assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.003);
 }
 const middle=southBridgePoint(.5);assert.ok(heightAt(middle.x,middle.z)<2.15-.1,'open shallow water under the arch');w.free();
});
