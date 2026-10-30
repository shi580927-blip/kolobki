import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EXPLORATION_PATHS,VALLEY_CLEARINGS,nearestExplorationPath} from '../src/core/valleyExploration';
import {heightAt,WORLD_SIZE} from '../src/core/terrain';
import {nearestRoutePoint} from '../src/core/valleyRoute';
import {valleyLandmarkLayout} from '../src/game/ValleyLandmarks';
import {valleyArtLayout} from '../src/game/ValleyArt';

test('large valley has connected outer walks with gentle grades, rather than paths ending at cliffs',()=>{
 let length=0;
 for(const path of EXPLORATION_PATHS){assert.ok(nearestRoutePoint(path[0][0],path[0][1]).distance<6);
  for(let i=1;i<path.length;i++){
   const [ax,az]=path[i-1],[bx,bz]=path[i],d=Math.hypot(bx-ax,bz-az),n=Math.ceil(d*4);length+=d;
   for(let k=1;k<=n;k++){
    const t=k/n,s=(k-1)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
    assert.ok(Math.abs(x)<WORLD_SIZE/2-10&&Math.abs(z)<WORLD_SIZE/2-10);
    assert.ok(Math.abs(heightAt(x,z)-heightAt(ax+(bx-ax)*s,az+(bz-az)*s))/(d/n)<.85,'walkable terrain grade');
   }
  }
 }
 assert.ok(length>500);assert.equal(VALLEY_CLEARINGS.length,6);
});

test('outer scenery reaches every clearing and keeps broad exploration paths free',()=>{
 const layout=valleyArtLayout(),rocks=valleyLandmarkLayout();assert.ok(rocks.length>=15&&rocks.length<=30);
 for(const c of VALLEY_CLEARINGS){
  assert.ok(layout.trees.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<c.radius*1.2));
  assert.ok(layout.flowers.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<c.radius));
 }
 for(const p of rocks)assert.ok(nearestExplorationPath(p.x,p.z).distance>p.size+5);
 for(const p of layout.trees)assert.ok(nearestExplorationPath(p.x,p.z).distance>5.4);
});

test('a physical player can traverse every exploration walk on the actual terrain and colliders',async()=>{
 const {default:R}=await import('@dimforge/rapier3d-compat'),{Scene,Vector3}=await import('three');
 const {createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events');
 const {applyPondWater}=await import('../src/game/WaterPhysics');
 await R.init();
 for(const [index,path] of EXPLORATION_PATHS.entries()){
  const w=new R.World({x:0,y:-18,z:0});w.timestep=1/60;createWorld(new Scene(),w);
  const p=new PhysicsPlayer(w,new EventBus(),{x:path[0][0],z:path[0][1]}),forward=new Vector3(0,0,1);
  for(const [x,z] of path.slice(1)){
   let arrived=false;
   for(let tick=0;tick<2400;tick++){
    const dx=x-p.current.x,dz=z-p.current.z,d=Math.hypot(dx,dz);if(d<1.1){arrived=true;break;}
    const speed=Math.min(.70,d/4);
    p.step(1/60,{x:-dx/d*speed,z:-dz/d*speed,jump:false,dash:false,touchDrive:true},forward);
    applyPondWater(p.body,1/60);w.step();p.sync();
   }
   assert.ok(arrived,`walk ${index} stalled before ${x},${z} at ${p.current.toArray()}`);
  }
  w.free();
 }
});
