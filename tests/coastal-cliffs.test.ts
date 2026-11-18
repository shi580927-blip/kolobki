import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Raycaster,Vector3,DoubleSide} from 'three';
import {COAST_TERRACES,coastHeight,WEST_COAST_SPINE,joinWestCoast} from '../src/core/coast';
import {heightAt,terrainData,WORLD_SIZE} from '../src/core/terrain';
import {VALLEY_ROUTE} from '../src/core/valleyRoute';
import {coastalCliffGeometry,addCoastalCliffs} from '../src/game/CoastalCliffs';

test('coastal headlands add real raised ground and leave the main route unchanged',()=>{
 for(const c of COAST_TERRACES)assert.ok(coastHeight(c.x,c.z)>2&&coastHeight(c.x,c.z)<4,'low rounded headland');
 for(let i=0;i<VALLEY_ROUTE.length;i++){const a=VALLEY_ROUTE[i],b=VALLEY_ROUTE[(i+1)%VALLEY_ROUTE.length];for(let t=0;t<=1;t+=.01)assert.equal(coastHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),0);}
 const g=coastalCliffGeometry(),p=g.getAttribute('position');assert.ok(p.count/3<1000);assert.ok(p.count/3>300);assert.ok(Array.from(p.array).every(Number.isFinite));g.dispose();
});

test('coastal rock rendering and physical trimesh agree at both water faces',async()=>{
 await R.init();const scene=new Scene(),w=new R.World({x:0,y:-18,z:0}),mesh=addCoastalCliffs(scene,w);mesh.material.side=DoubleSide;mesh.updateMatrixWorld(true);w.step();
 for(const c of [...COAST_TERRACES,{x:-63.4,z:38,rx:0,facing:1},{x:-63,z:46.4,rx:0,facing:1},{x:-64.7,z:42.1,rx:0,facing:1}]){
  const x=c.x+c.facing*c.rx*.75,z=c.z,origin=new Vector3(x,20,z),direction=new Vector3(0,-1,0);
  const visual=new Raycaster(origin,direction).intersectObject(mesh)[0],physical=w.castRay(new R.Ray(origin,direction),40,true);
  assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.002);
 }
 assert.equal(scene.children.length,1);w.free();
});

test('western shoulder connects dry elevations without lifting the spring mouth or beach exits',()=>{
 for(let i=1;i<WEST_COAST_SPINE.length;i++){
  const a=WEST_COAST_SPINE[i-1],b=WEST_COAST_SPINE[i];
  for(let t=0;t<=1;t+=.025){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;assert.ok(heightAt(x,z)>=5.9,'continuous dry ridge');}
 }
 // No fill in the waterfall outlet, open lake, bridge or accepted beach sectors.
 for(const [x,z] of [[-58,42],[-35,18],[-35,60],[-5,48],[0,0]])assert.equal(joinWestCoast(x,z,2),2);
});

test('physical player can roll along the connected western ridge in both directions',async()=>{
 const {PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events'),{createWorld}=await import('../src/game/World');
 await R.init();const w=new R.World({x:0,y:-18,z:0});w.timestep=1/60;createWorld(new Scene(),w);
 const p=new PhysicsPlayer(w,new EventBus(),{x:-68,z:56}),forward=new Vector3(0,0,1);
 for(const [x,z] of [[-68,48],[-68,42],[-70,34],[-68,42],[-68,48],[-68,56]]){
  let arrived=false;
  for(let tick=0;tick<1800;tick++){
   const dx=x-p.current.x,dz=z-p.current.z,d=Math.hypot(dx,dz);if(d<.8){arrived=true;break;}
   const speed=Math.min(.45,d/4);p.step(1/60,{x:-dx/d*speed,z:-dz/d*speed,jump:false,dash:false,touchDrive:true},forward);w.step();p.sync();
   assert.ok(p.current.y>6.4,'no fall through the connecting shoulder');
  }
  assert.ok(arrived,`ridge blocked before ${x},${z}: ${p.current.toArray()}`);
 }
 w.free();
});

test('expanded field preserves two-metre ground resolution and solid playable outer terrain',()=>{
 assert.equal(WORLD_SIZE,400);const g=terrainData();assert.equal(g.vertices.length,(201*201)*3);
 assert.equal(g.vertices[3]-g.vertices[0],2);assert.equal(g.vertices[0],-200);
 for(const [x,z] of [[110,61],[-112,-56],[104,83],[-103,-78]])assert.ok(Number.isFinite(heightAt(x,z)));
});
