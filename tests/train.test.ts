import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {EventBus} from '../src/core/events';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {TrainSystem,TRAIN_RULES} from '../src/game/TrainSystem';
import {terrainData,heightAt} from '../src/core/terrain';
const dt=1/60,forward=new Vector3(0,0,1),idle=()=>({x:0,z:0,jump:false,dash:false});
async function setup(count=5){
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=dt;
 const terrain=terrainData();world.createCollider(R.ColliderDesc.trimesh(terrain.vertices,terrain.indices));
 const bus=new EventBus(),leader=new PhysicsPlayer(world,bus),actors=Array.from({length:count},(_,id)=>({id,physics:new PhysicsPlayer(world,new EventBus(),{x:20+id*3,z:0})}));
 const train=new TrainSystem(world,leader,actors,bus);
 function tick(input=idle()){
  leader.step(dt,input,forward);for(const a of actors)if(!train.has(a.id)&&!train.isJoining(a.id))a.physics.step(dt,idle(),forward);
  train.step(dt);world.step();leader.sync();actors.forEach(a=>a.physics.sync());train.afterStep();
 }
 function place(p:PhysicsPlayer,x:number,z:number,vx=0,vz=0){p.body.setTranslation({x,y:heightAt(x,z)+1.02,z},true);p.body.setLinvel({x:vx,y:0,z:vz},true);p.sync();}
 function collect(id:number){const p=leader.current;place(actors[id].physics,p.x+1.85,p.z);actors[id].physics.body.setTranslation({x:p.x+1.85,y:p.y,z:p.z},true);actors[id].physics.sync();for(let i=0;i<900&&!train.has(id);i++)tick();assert.ok(train.has(id),'real contact attaches wagon '+id);}
 return {world,bus,leader,actors,train,tick,place,collect};
}
test('Rapier contact collects one wagon once; proximity and hard contact cannot collect',async()=>{
 const s=await setup(2),events:number[]=[];s.bus.on('train_attach',e=>events.push(e.id));
 s.place(s.actors[0].physics,3,0);s.tick();assert.equal(s.train.count,0);
 s.collect(0);for(let i=0;i<30;i++)s.tick();assert.deepEqual(events,[0]);assert.equal(s.actors[0].physics.body.bodyType(),R.RigidBodyType.Dynamic);
 s.train.reset();s.place(s.leader,0,0,18,0);s.place(s.actors[1].physics,1.85,0);for(let i=0;i<5;i++)s.tick();assert.equal(s.train.count,0);
 s.world.free();
});
test('five wagons follow turns and hills, stay finite, roll and do not disable gravity',async()=>{
 const s=await setup();for(let id=0;id<5;id++)s.collect(id);
 assert.equal(s.train.count,5);let rolled=false,minHeight=100;
 for(let i=0;i<300;i++){
  s.tick({x:i<180?0:-.5,z:-.65,jump:i===100,dash:false});
  for(const a of s.actors){const p=a.physics.current;assert.ok(p.toArray().every(Number.isFinite));minHeight=Math.min(minHeight,p.y-heightAt(p.x,p.z));if(a.physics.rotation.angleTo(a.physics.prevRotation)>.001)rolled=true;}
 }
 assert.equal(s.train.count,5);assert.ok(rolled);assert.ok(minHeight>.6,'real terrain supports wagons');
 const tail=s.actors[4].physics.current;assert.ok(tail.distanceTo(s.leader.current)>5);assert.ok(tail.distanceTo(s.leader.current)<22);
 s.world.free();
});
test('landing does not release wagons; a real breakup releases dynamic wagons with momentum, cooldown prevents immediate capture, then permits recollection',async()=>{
 const s=await setup(2),events:string[]=[];s.bus.on('train_break',e=>events.push(e.reason));s.collect(0);s.collect(1);
 s.bus.emit('impact_major',{position:s.leader.current.clone(),strength:200,source:'landing'});
 assert.equal(s.train.count,2,'a landing reaction must not break the train');
 s.train.break('collision');
 assert.equal(s.train.count,0);assert.equal(s.train.breakTotal,1);assert.deepEqual(events,['collision']);assert.ok(s.actors[0].physics.body.linvel().y>2);
 s.place(s.actors[0].physics,s.leader.current.x+1.99,s.leader.current.z);s.tick();assert.equal(s.train.count,0);
 for(let i=0;i<Math.ceil(TRAIN_RULES.recollectDelay/dt)+1;i++)s.tick();s.collect(0);assert.equal(s.train.count,1);
 s.train.reset();s.leader.reset();s.actors.forEach(a=>a.physics.reset());s.train.reset();assert.equal(s.train.count,0);assert.equal(s.train.attachedTotal,0);assert.deepEqual(s.train.snapshot().cooldowns,{});assert.equal(s.leader.collider.collisionGroups(),0x0001ffff);
 s.world.free();
});
test('a fast outsider hitting a wagon breaks the whole train; stationary ground contact does not',async()=>{
 const s=await setup(2);s.collect(0);for(let i=0;i<50;i++)s.tick();assert.equal(s.train.count,1);
 const p=s.actors[0].physics.current;s.place(s.actors[1].physics,p.x+1.85,p.z,-15,0);s.actors[1].physics.body.setTranslation({x:p.x+1.85,y:p.y,z:p.z},true);s.actors[1].physics.sync();for(let i=0;i<4&&s.train.count;i++)s.tick();assert.equal(s.train.count,0);assert.equal(s.train.breakTotal,1);s.world.free();
});


test('a strong side impact against scenery breaks wagons while a sixth wagon is not added',async()=>{
 const s=await setup(6);for(let id=0;id<5;id++)s.collect(id);
 const p=s.leader.current;s.place(s.actors[5].physics,p.x+1.85,p.z);s.actors[5].physics.body.setTranslation({x:p.x+1.85,y:p.y,z:p.z},true);s.actors[5].physics.sync();
 for(let i=0;i<4;i++)s.tick();assert.equal(s.train.count,5);assert.equal(s.train.has(5),false);
 // Clear outsider, then hit a real static side wall with a joined body.
 s.place(s.actors[5].physics,40,0);
 const at=s.leader.current.clone();
 s.world.createCollider(R.ColliderDesc.cuboid(.1,3,3).setTranslation(at.x+1.03,at.y,at.z));
 s.leader.body.setLinvel({x:22,y:0,z:0},true);
 for(let i=0;i<8&&s.train.count;i++)s.tick();assert.equal(s.train.count,0);assert.ok(s.train.breakTotal>=1);s.world.free();
});

test('five colliding wagons survive repeated reversals, acceleration and normal jumps without a two-body gap',async()=>{
 const s=await setup();for(let id=0;id<5;id++)s.collect(id);
 let largestGap=0,closest=10;
 for(let i=0;i<780;i++){
  const reverse=i>=240&&i<480;
  s.tick({x:0,z:reverse?.85:-.85,jump:i%90===60,dash:i===150||i===420});
  assert.equal(s.train.count,5,`train must survive normal driving, tick ${i}`);
  const bodies=[s.leader,...s.train.snapshot().ids.map(id=>s.actors[id].physics)];
  for(let j=1;j<bodies.length;j++)largestGap=Math.max(largestGap,Math.hypot(bodies[j].current.x-bodies[j-1].current.x,bodies[j].current.z-bodies[j-1].current.z));
  if(i>90)for(let j=0;j<bodies.length;j++)for(let k=0;k<j;k++)closest=Math.min(closest,bodies[j].current.distanceTo(bodies[k].current));
 }
 assert.ok(largestGap<2.65,`maximum adjacent separation ${largestGap}`);
 assert.ok(closest>1.85,`spheres must not pass through one another: ${closest}`);
 assert.equal(s.train.snapshot().links,0);s.train.reset();assert.equal(s.world.impulseJoints.len(),0);s.world.free();
});

test('a light outsider bump does not dismantle the train',async()=>{
 const s=await setup(2);s.collect(0);for(let i=0;i<30;i++)s.tick();
 const p=s.leader.current;s.place(s.actors[1].physics,p.x+1.85,p.z,-3,0);s.actors[1].physics.body.setTranslation({x:p.x+1.85,y:p.y,z:p.z},true);s.actors[1].physics.sync();
 for(let i=0;i<20;i++)s.tick();assert.ok(s.train.has(0));assert.equal(s.train.breakTotal,0);s.world.free();
});
