import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Vector3,Raycaster,DoubleSide,Mesh} from 'three';
import {createWorld} from '../src/game/World';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {EventBus} from '../src/core/events';
import {VALLEY_BOOSTS,VALLEY_HURDLE} from '../src/game/ValleyFeatures';
import {heightAt} from '../src/core/terrain';

test('a normal touch-controlled crossing receives one real boost and keeps its coasting momentum',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0});w.timestep=1/60;const level=createWorld(new Scene(),w),pad=VALLEY_BOOSTS[0],dx=Math.sin(pad.yaw),dz=Math.cos(pad.yaw);
 const p=new PhysicsPlayer(w,new EventBus(),{x:pad.x-dx*8,z:pad.z-dz*8}),forward=new Vector3(0,0,1);let maximum=0,afterBoost=0;
 for(let i=0;i<300;i++){
  const active=level.features.snapshot().activations>0;
  p.step(1/60,{x:active?0:-dx*.5,z:active?0:-dz*.5,jump:false,dash:false,touchDrive:true},forward);w.step();p.sync();
  level.features.step([{id:-1,physics:p}]);const speed=Math.hypot(p.body.linvel().x,p.body.linvel().z);maximum=Math.max(maximum,speed);
  if(level.features.snapshot().activations&&afterBoost++===25)assert.ok(speed>12,'touch release does not immediately cancel an environmental boost');
 }
 assert.equal(level.features.snapshot().activations,1);assert.ok(maximum>=18);level.features.reset();assert.equal(level.features.snapshot().activations,0);w.free();
});
test('permanent boost surfaces and the small hurdle share their visible and physical support',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene();createWorld(scene,w);w.step();
 const mesh=scene.getObjectByName('valley-permanent-boosts-and-hurdle') as Mesh;(mesh.material as any).side=DoubleSide;mesh.updateMatrixWorld(true);
 for(const p of [...VALLEY_BOOSTS,VALLEY_HURDLE]){
  const origin=new Vector3(p.x,heightAt(p.x,p.z)+10,p.z),down=new Vector3(0,-1,0),visual=new Raycaster(origin,down).intersectObject(mesh,false)[0],physical=w.castRay(new R.Ray(origin,down),20,true);
  assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.002);
 }w.free();
});
