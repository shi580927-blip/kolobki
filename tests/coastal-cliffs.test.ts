import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Raycaster,Vector3,DoubleSide} from 'three';
import {COAST_TERRACES,coastHeight} from '../src/core/coast';
import {heightAt,terrainData,WORLD_SIZE} from '../src/core/terrain';
import {VALLEY_ROUTE} from '../src/core/valleyRoute';
import {coastalCliffGeometry,addCoastalCliffs} from '../src/game/CoastalCliffs';

test('coastal headlands add real raised ground and leave the main route unchanged',()=>{
 for(const c of COAST_TERRACES)assert.ok(coastHeight(c.x,c.z)>4);
 for(let i=0;i<VALLEY_ROUTE.length;i++){const a=VALLEY_ROUTE[i],b=VALLEY_ROUTE[(i+1)%VALLEY_ROUTE.length];for(let t=0;t<=1;t+=.01)assert.equal(coastHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),0);}
 const g=coastalCliffGeometry(),p=g.getAttribute('position');assert.ok(p.count/3<1000);assert.ok(p.count/3>300);assert.ok(Array.from(p.array).every(Number.isFinite));g.dispose();
});

test('coastal rock rendering and physical trimesh agree at both water faces',async()=>{
 await R.init();const scene=new Scene(),w=new R.World({x:0,y:-18,z:0}),mesh=addCoastalCliffs(scene,w);mesh.material.side=DoubleSide;mesh.updateMatrixWorld(true);w.step();
 for(const c of COAST_TERRACES){
  const x=c.x+c.facing*c.rx*.75,z=c.z,origin=new Vector3(x,20,z),direction=new Vector3(0,-1,0);
  const visual=new Raycaster(origin,direction).intersectObject(mesh)[0],physical=w.castRay(new R.Ray(origin,direction),40,true);
  assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.002);
 }
 assert.equal(scene.children.length,1);w.free();
});

test('expanded field preserves two-metre ground resolution and solid playable outer terrain',()=>{
 assert.equal(WORLD_SIZE,260);const g=terrainData();assert.equal(g.vertices.length,(131*131)*3);
 assert.equal(g.vertices[3]-g.vertices[0],2);assert.equal(g.vertices[0],-130);
 for(const [x,z] of [[110,61],[-112,-56],[104,83],[-103,-78]])assert.ok(Number.isFinite(heightAt(x,z)));
});
