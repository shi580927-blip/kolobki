import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {TrainSystem} from '../src/game/TrainSystem';
import {EventBus} from '../src/core/events';
import {terrainData,heightAt,WORLD_SIZE} from '../src/core/terrain';
const dt=1/60,forward=new Vector3(0,0,1),idle=()=>({x:0,z:0,jump:false,dash:false});
async function fixture(){
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=dt;const terrain=terrainData();world.createCollider(R.ColliderDesc.trimesh(terrain.vertices,terrain.indices));
 for(const [x,z] of [[-1,0],[1,0],[0,-1],[0,1]])world.createCollider(R.ColliderDesc.cuboid(x?1:WORLD_SIZE/2,30,z?1:WORLD_SIZE/2).setTranslation(x*WORLD_SIZE/2,0,z*WORLD_SIZE/2));
 const leader=new PhysicsPlayer(world,new EventBus()),actors=Array.from({length:5},(_,id)=>({id,physics:new PhysicsPlayer(world,new EventBus(),{x:35+id*3,z:0})})),train=new TrainSystem(world,leader,actors,new EventBus());
 function tick(input=idle()){
  leader.step(dt,input,forward);for(const a of actors)if(!train.has(a.id)&&!train.isJoining(a.id))a.physics.step(dt,idle(),forward);
  train.step(dt);world.step();leader.sync();actors.forEach(a=>a.physics.sync());train.afterStep();
 }
 function atHead(id:number){const p=leader.current;actors[id].physics.body.setTranslation({x:p.x+1.95,y:p.y,z:p.z},true);actors[id].physics.body.setLinvel({x:0,y:0,z:0},true);actors[id].physics.sync();}
 return {world,leader,actors,train,tick,atHead};
}
test('a newcomer touching the head of a long train cannot instantly tether to a distant tail',async()=>{
 const s=await fixture();
 for(let id=0;id<3;id++){s.atHead(id);for(let i=0;i<900&&!s.train.has(id);i++)s.tick();assert.ok(s.train.has(id),'initial recruitment '+id);for(let i=0;i<80;i++)s.tick();}
 s.atHead(3);const before=s.train.count;
 for(let i=0;i<4;i++)s.tick();
 assert.equal(s.train.count,before,'newcomer must approach the distant tail before joining');
 let maxClearance=0;
 for(let i=0;i<900&&!s.train.has(3);i++){s.tick();for(const p of [s.leader,...s.actors.slice(0,4).map(a=>a.physics)])maxClearance=Math.max(maxClearance,p.current.y-heightAt(p.current.x,p.current.z));}
 assert.ok(s.train.has(3),'newcomer eventually joins');assert.ok(maxClearance<1.8,`joining must not launch balls: ${maxClearance}`);s.world.free();
});

test('compressed full train cannot rest in a tower after turns and jumps',async()=>{
 const s=await fixture();for(let id=0;id<5;id++){s.atHead(id);for(let i=0;i<900&&!s.train.has(id);i++)s.tick();assert.ok(s.train.has(id));}
 let maximumGap=0;
 for(let i=0;i<600;i++){
  const reverse=Math.floor(i/120)%2===1;
  s.tick({x:i%240<120?.6:-.6,z:reverse?.8:-.8,jump:i%100===30,dash:i===240});
  assert.equal(s.train.count,5,'tick '+i);maximumGap=Math.max(maximumGap,...s.train.snapshot().gaps);
 }
 assert.ok(maximumGap<2.7,`horizontal chain spacing ${maximumGap}`);
 // Reproduce an own-body-on-own-body landing, not just a straight-line path.
 const top=s.actors[0].physics,p=s.leader.current;
 top.body.setTranslation({x:p.x,y:p.y+2.02,z:p.z},true);top.body.setLinvel({x:0,y:0,z:0},true);top.sync();
 for(let i=0;i<300;i++)s.tick();
 for(const actor of s.actors){const p=actor.physics.current;assert.ok(p.y-heightAt(p.x,p.z)<1.4,`no sustained tower: ${p.y-heightAt(p.x,p.z)}`);assert.equal(actor.physics.body.bodyType(),R.RigidBodyType.Dynamic);}
 assert.equal(s.world.impulseJoints.len(),0,'no vertical constraint can lift a wagon');s.world.free();
});
