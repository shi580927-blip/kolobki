import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {ImpactMeter,impactSeverity} from '../src/game/ImpactModel';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {EventBus} from '../src/core/events';
import {terrainData} from '../src/core/terrain';

test('combo depends on collision intensity and recovery rather than every third contact',()=>{
 const meter=new ImpactMeter();
 for(let i=0;i<10;i++)assert.equal(meter.add({source:'landing',closingSpeed:20,severity:10},i*.15),false);
 for(let i=0;i<10;i++)assert.equal(meter.add({source:'collision',closingSpeed:7,severity:impactSeverity(7,'collision')},2+i*.3),false);
 meter.reset();assert.equal(meter.add({source:'collision',closingSpeed:20,severity:impactSeverity(20,'collision')},0),true,'an exceptional collision can trigger on its own');
 meter.reset();const hit={source:'collision' as const,closingSpeed:15,severity:impactSeverity(15,'collision')};assert.equal(meter.add(hit,0),false);assert.equal(meter.add(hit,.3),true,'two genuinely hard hits can accumulate');
 meter.reset();assert.equal(meter.add(hit,0),false);assert.equal(meter.add(hit,8),false,'separated impacts recover');
});

test('ordinary repeated jumps over real terrain do not charge combo or disable movement',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;const data=terrainData();world.createCollider(R.ColliderDesc.trimesh(data.vertices,data.indices));
 const bus=new EventBus(),player=new PhysicsPlayer(world,bus),queue=new R.EventQueue(true),meter=new ImpactMeter();let jumps=0,combos=0,now=0;
 bus.on('player_jump',()=>jumps++);bus.on('impact_major',e=>{if(meter.add({source:e.source!,closingSpeed:e.closingSpeed!,severity:e.severity!},now))combos++;});
 for(let i=0;i<480;i++){
  now=i/60;player.step(1/60,{x:0,z:0,jump:i%65===20,dash:false},new Vector3(0,0,1));world.step(queue);player.sync();
  queue.drainContactForceEvents(e=>{const other=e.collider1()===player.collider.handle?e.collider2():e.collider1();player.contact(e.totalForceMagnitude(),world.getCollider(other));});
 }
 assert.ok(jumps>=6,`jumps ${jumps}`);assert.equal(combos,0);assert.equal(meter.value,0);assert.equal(player.body.bodyType(),R.RigidBodyType.Dynamic);queue.free();world.free();
});
