import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POND,heightAt} from '../src/core/terrain';
import {nearestRoutePoint,ROUTE_HALF_WIDTH} from '../src/core/valleyRoute';
import {Scene} from 'three';
import R from '@dimforge/rapier3d-compat';
import {applyPondWater} from '../src/game/WaterPhysics';
import {addPondStudy} from '../src/game/PondStudy';

test('shallow pond has a continuous shore and remains outside the driving corridor',()=>{
 assert.ok(nearestRoutePoint(POND.x,POND.z).distance>POND.radius+ROUTE_HALF_WIDTH);
 assert.ok(POND.water-heightAt(POND.x,POND.z)<.5);
 for(let a=0;a<Math.PI*2;a+=Math.PI/8){let last=heightAt(POND.x,POND.z);for(let r=.25;r<12;r+=.25){const next=heightAt(POND.x+Math.cos(a)*r,POND.z+Math.sin(a)*r);assert.ok(Math.abs(next-last)<.25,'shore slope remains gentle');last=next;}}
});
test('bridge has physical support and pond surface does not add a water collider',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0}),scene=new Scene();addPondStudy(scene,world);assert.equal(world.colliders.len(),18);const ray=new R.Ray({x:POND.x,y:POND.water+4,z:POND.z},{x:0,y:-1,z:0});world.step();assert.ok(world.castRay(ray,10,true));world.free();
});

// Exercise the actual rolling body and current train controller against the real terrain and bridge.
test('a three-wagon train can cross the bridge and return',async()=>{
 const {Vector3}=await import('three'),{createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events'),{TrainSystem}=await import('../src/game/TrainSystem');
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);
 const leader=new PhysicsPlayer(world,new EventBus(),{x:-29,z:22});
 const actors=Array.from({length:3},(_,id)=>({id,physics:new PhysicsPlayer(world,new EventBus(),{x:80+id*3,z:0})}));
 const train=new TrainSystem(world,leader,actors,new EventBus(),{breakOnContact:false}),forward=new Vector3(0,0,1);
 const tick=(x=0,z=0)=>{leader.step(1/60,{x,z,jump:false,dash:false,touchDrive:true},forward);for(const a of actors)if(!train.has(a.id)&&!train.isJoining(a.id))a.physics.step(1/60,{x:0,z:0,jump:false,dash:false},forward);train.step(1/60);leader.applySandDrag(1/60);for(const a of actors)a.physics.applySandDrag(1/60);applyPondWater(leader.body,1/60);for(const a of actors)applyPondWater(a.physics.body,1/60);world.step();leader.sync();actors.forEach(a=>a.physics.sync());train.afterStep();leader.updateCoating(1/60);for(const a of actors)a.physics.updateCoating(1/60);};
 for(let i=0;i<60;i++)tick();
 for(const a of actors){a.physics.body.setTranslation({x:leader.current.x+1.95,y:leader.current.y,z:leader.current.z},true);a.physics.body.setLinvel({x:0,y:0,z:0},true);a.physics.sync();for(let i=0;i<900&&!train.has(a.id);i++)tick();assert.ok(train.has(a.id),'wagon attaches');}
 let maxGap=0;let crossing: number[]|undefined;
 for(let i=0;i<1100&&leader.current.x<-8;i++){tick(-.4,Math.max(-.35,Math.min(.35,(leader.current.z-POND.z)*.2)));if(!crossing&&leader.current.x>=POND.x)crossing=leader.current.toArray();maxGap=Math.max(maxGap,...train.snapshot().gaps);assert.equal(train.count,3);}
 assert.ok(leader.current.x>=-8,`bridge exit: ${leader.current.toArray()}`);
 assert.ok(crossing&&Math.abs(crossing[2]-POND.z)<2.3&&crossing[1]>POND.water+.7,`crossed over bridge: ${crossing}`);
 for(let i=0;i<90;i++)tick();
 for(let i=0;i<1400&&leader.current.x>-28;i++){tick(.4,Math.max(-.35,Math.min(.35,(leader.current.z-POND.z)*.2)));maxGap=Math.max(maxGap,...train.snapshot().gaps);assert.equal(train.count,3);}
 assert.ok(leader.current.x<=-28,`return: ${leader.current.toArray()}`);
 assert.ok(maxGap<5,`train separation ${maxGap}`);
 world.free();
});

test('player can cross the shallow water beside the bridge and return',async()=>{
 const {Vector3}=await import('three'),{createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events');
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);
 const player=new PhysicsPlayer(world,new EventBus(),{x:-29,z:26}),forward=new Vector3(0,0,1);
 const tick=(x:number)=>{const z=Math.max(-.35,Math.min(.35,(player.current.z-26)*.2));player.step(1/60,{x,z,jump:false,dash:false,touchDrive:true},forward);player.applySandDrag(1/60);applyPondWater(player.body,1/60);world.step();player.sync();player.updateCoating(1/60);maxWetness=Math.max(maxWetness,player.coating.wetness);maxSand=Math.max(maxSand,player.coating.sand);};
 let crossed=false,maxWetness=0,maxSand=0;
 for(let i=0;i<1200&&player.current.x<-8;i++){tick(-.4);if(Math.abs(player.current.x-POND.x)<.3&&player.current.z>POND.z+3)crossed=true;}
 assert.ok(crossed&&player.current.x>=-8,`water crossing: ${player.current.toArray()}`);
 for(let i=0;i<90;i++)tick(0);
 for(let i=0;i<1500&&player.current.x>-28;i++)tick(.4);
 assert.ok(player.current.x<=-28,`water return: ${player.current.toArray()}`);assert.ok(maxWetness>.8,`wetness ${maxWetness}`);assert.ok(maxSand>.05,`sand ${maxSand}`);world.free();
});
test('bridge side guards block ordinary sideways rolling, with open end entrances',async()=>{
 const {Vector3}=await import('three'),{createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events');
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);
 const p=new PhysicsPlayer(world,new EventBus(),{x:POND.x,z:POND.z});p.body.setTranslation({x:POND.x,y:POND.water+1.26,z:POND.z},true);p.sync();
 for(let i=0;i<180;i++){p.step(1/60,{x:0,z:-.5,jump:false,dash:false,touchDrive:true},new Vector3(0,0,1));world.step();p.sync();}
 assert.ok(p.current.z<POND.z+2.4,`passed side rail ${p.current.toArray()}`);world.free();
});

test('cascade is solid at the bank and leaves the pond ford and bridge entrances open',async()=>{
 const {SHORE_CASCADE,addShoreCascade}=await import('../src/game/ShoreCascade');
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),cascade=addShoreCascade(scene,w);w.step();
 const {x,z,crest}=SHORE_CASCADE;
 const hit=w.castRay(new R.Ray({x,y:crest+3,z},{x:0,y:-1,z:0}),10,true);assert.ok(hit);assert.ok(Math.abs(hit.timeOfImpact-3)<.3);
 for(const px of [-29,-18,-8])assert.equal(w.castRay(new R.Ray({x:px,y:10,z:26},{x:0,y:-1,z:0}),12,true),null);
 cascade.update(1/60);assert.ok(scene.getObjectByName('shore-cascade-water'));w.free();
});

test('enlarged southern lake has a physical walkable exit and dry sand beyond the water',async()=>{
 const {Vector3}=await import('three'),{createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events');
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);
 const p=new PhysicsPlayer(world,new EventBus(),{x:POND.x,z:POND.z+11});
 let wet=0,sand=0;
 for(let i=0;i<1800&&p.current.z<POND.z+29;i++){
  p.step(1/60,{x:0,z:-.45,jump:false,dash:false,touchDrive:true},new Vector3(0,0,1));p.applySandDrag(1/60);applyPondWater(p.body,1/60);world.step();p.sync();p.updateCoating(1/60);
  wet=Math.max(wet,p.coating.wetness);sand=Math.max(sand,p.coating.sand);assert.ok(p.current.y>heightAt(p.current.x,p.current.z)+.6,'body stays on the solid basin');
 }
 assert.ok(p.current.z>=POND.z+29,`southern shore exit ${p.current.toArray()}`);assert.ok(wet>.8);assert.ok(sand>.05);world.free();
});
