import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Raycaster,Vector3,DoubleSide} from 'three';
import {mountainCliffLayout,mountainCliffGeometry,addMountainCliffs} from '../src/game/MountainCliffs';
import {nearestExplorationPath} from '../src/core/valleyExploration';

test('mountain rock shoulders remain outside broad routes and within the physical field',()=>{
 const g=mountainCliffGeometry(),p=g.getAttribute('position');
 assert.ok(p.count/3<12000);assert.ok(p.count/3>100);
 for(let i=0;i<p.count;i++){
  assert.ok(Math.abs(p.getX(i))<195&&Math.abs(p.getZ(i))<195);
  assert.ok(Number.isFinite(p.getY(i)));
  assert.ok(nearestExplorationPath(p.getX(i),p.getZ(i)).distance>7,'open approach');
 }
 g.dispose();
});
test('visible mountain rock triangles match their actual Rapier support',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),mesh=addMountainCliffs(scene,w);
 mesh.material.side=DoubleSide;mesh.updateMatrixWorld(true);w.step();
 for(const p of mountainCliffLayout()){
  const origin=new Vector3(p.x,85,p.z),direction=new Vector3(0,-1,0);
  // Decorative leaves are non-solid; support must match the stone itself.
  const visual=new Raycaster(origin,direction).intersectObject(mesh,false)[0],physical=w.castRay(new R.Ray(origin,direction),120,true);
  assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.002);
 }
 assert.equal(scene.children.length,1);w.free();
});
