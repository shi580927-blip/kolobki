import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,InstancedMesh,Matrix4} from 'three';
import {valleyArtLayout,valleyGroundColor} from '../src/game/ValleyArt';
import {createWorld} from '../src/game/World';
import {nearestRoutePoint} from '../src/core/valleyRoute';
import {heightAt} from '../src/core/terrain';
test('meadow composition is seeded, covers outer hills and keeps a bounded instance budget',()=>{
 const layout=valleyArtLayout();assert.deepEqual(layout,valleyArtLayout());
 assert.ok(layout.trees.length>=60&&layout.trees.length<=105);assert.ok(layout.flowers.length>=350&&layout.flowers.length<=840);assert.ok(layout.grass.length<=3400);assert.ok(layout.rocks.length<=16);assert.ok(layout.pebbles.length<=480);
 assert.ok(layout.flowers.some(p=>p.x>40));assert.ok(layout.flowers.some(p=>p.x< -30));assert.ok(layout.flowers.some(p=>p.z< -35));
 for(const p of layout.trees)assert.ok(nearestRoutePoint(p.x,p.z).distance>11);
 for(const p of layout.rocks){assert.ok(Math.hypot(p.x,p.z)>24,'recruitment area stays free');assert.ok(nearestRoutePoint(p.x,p.z).distance-p.radius>10,'recovery space beside the road');}
 for(const p of layout.flowers)assert.ok(nearestRoutePoint(p.x,p.z).distance>=6.5);
});
test('ground separates warm dirt from greener meadow with finite colours',()=>{
 const road=valleyGroundColor(0,heightAt(0,0),0),meadow=valleyGroundColor(9,heightAt(9,5),5);
 assert.ok(road.r>road.g&&road.g>road.b);assert.ok(meadow.g>meadow.r&&meadow.g>meadow.b);
 for(let x=-100;x<=100;x+=10)for(let z=-100;z<=100;z+=10)assert.ok(valleyGroundColor(x,heightAt(x,z),z).toArray().every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});
test('art batches have finite transforms and decorative outcrops stay outside playable bounds',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0}),scene=new Scene(),level=createWorld(scene,world);assert.ok(level.art.flowers>350);
 const matrix=new Matrix4();let batches=0;
 scene.traverse(o=>{if(o instanceof InstancedMesh&&o.name.startsWith('valley-art-')){batches++;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));if(o.name==='valley-art-distant-outcrops')assert.ok(Math.hypot(matrix.elements[12],matrix.elements[14])>140);}}});
 assert.ok(batches<=14,'art stays batched instead of one draw per flower');world.free();
});
