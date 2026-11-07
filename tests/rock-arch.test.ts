import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene} from 'three';
import {addRockArch,ROCK_ARCH} from '../src/game/RockArch';
import {heightAt} from '../src/core/terrain';
import {nearestRoutePoint} from '../src/core/valleyRoute';
test('physical arch leaves a wide central passage and stays away from the route',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});addRockArch(new Scene(),world);world.step();const {x,z,inner,outer}=ROCK_ARCH;
 assert.ok(nearestRoutePoint(x,z).distance>outer+6);
 for(const offset of [-2,0,2]){const ray=new R.Ray({x:x+offset,y:heightAt(x+offset,z)+1.1,z:z-4},{x:0,y:0,z:1});assert.equal(world.castRay(ray,8,true),null,'central passage');}
 assert.ok(world.castRay(new R.Ray({x:x+(inner+outer)/2,y:heightAt(x+4.6,z)+1,z:z-4},{x:0,y:0,z:1}),8,true),'pillar has collision');world.free();
});
test('rolling player can traverse the arch over the actual terrain',async()=>{
 const {Vector3}=await import('three'),{createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events');await R.init();
 const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);const p=new PhysicsPlayer(world,new EventBus(),{x:ROCK_ARCH.x,z:24}),forward=new Vector3(0,0,1);
 for(let i=0;i<1500&&p.current.z<45;i++){p.step(1/60,{x:Math.max(-.3,Math.min(.3,(p.current.x-ROCK_ARCH.x)*.2)),z:-.45,jump:false,dash:false,touchDrive:true},forward);world.step();p.sync();assert.ok(p.current.y>heightAt(p.current.x,p.current.z)+.6);}
 assert.ok(p.current.z>=45,`arch crossing stalled: ${p.current.toArray()}`);world.free();
});
