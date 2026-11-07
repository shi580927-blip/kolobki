import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {TrainSystem} from '../src/game/TrainSystem';
import {EventBus} from '../src/core/events';
import {terrainData} from '../src/core/terrain';
test('two leaders claim distinct real-contact recruits; protected trial survives outsider impacts and resets',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});const data=terrainData();world.createCollider(R.ColliderDesc.trimesh(data.vertices,data.indices));
 const make=(x:number)=>new PhysicsPlayer(world,new EventBus(),{x,z:0}),leader=make(-3),rival=make(3),actors=[{id:1,physics:make(-4.9)},{id:2,physics:make(4.9)}];
 let b:TrainSystem;
 const a=new TrainSystem(world,leader,actors,new EventBus(),{manageGroups:false,breakOnContact:false,canRecruit:id=>!b.has(id)&&!b.isJoining(id)});
 b=new TrainSystem(world,rival,actors,new EventBus(),{manageGroups:false,breakOnContact:false,canRecruit:id=>!a.has(id)&&!a.isJoining(id)});
 const all=[leader,rival,...actors.map(a=>a.physics)],forward=new Vector3(0,0,1);
 const tick=()=>{
  for(const p of all){const id=actors.find(a=>a.physics===p)?.id;if(id===undefined||(!a.has(id)&&!a.isJoining(id)&&!b.has(id)&&!b.isJoining(id)))p.step(1/60,{x:0,z:0,jump:false,dash:false},forward);}
  a.step(1/60);b.step(1/60);world.step();all.forEach(p=>p.sync());a.afterStep();b.afterStep();
  for(const p of all){const id=actors.find(a=>a.physics===p)?.id;const ownA=p===leader||id!==undefined&&(a.has(id)||a.isJoining(id)),ownB=p===rival||id!==undefined&&(b.has(id)||b.isJoining(id));p.collider.setCollisionGroups(ownA?0x0002fffd:ownB?0x0004fffb:0x0001ffff);}
 };
 for(let i=0;i<900&&(!a.count||!b.count);i++)tick();
 assert.deepEqual(a.snapshot().ids,[1]);assert.deepEqual(b.snapshot().ids,[2]);
 assert.equal((leader.collider.collisionGroups()>>>16)&(rival.collider.collisionGroups()&0xffff),2,'opposing trains still collide');
 const p=leader.current;rival.body.setTranslation({x:p.x+1.9,y:p.y,z:p.z},true);rival.body.setLinvel({x:-20,y:0,z:0},true);rival.sync();for(let i=0;i<20;i++)tick();assert.equal(a.count,1);assert.equal(b.count,1);
 a.reset();b.reset();assert.equal(a.count+b.count,0);world.free();
});
