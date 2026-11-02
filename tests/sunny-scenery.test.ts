import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Raycaster,Vector3,Mesh,DoubleSide} from 'three';
import {SUNNY_BUILDINGS} from '../src/core/scenicLayout';
import {nearestRoutePoint} from '../src/core/valleyRoute';
import {nearestExplorationPath} from '../src/core/valleyExploration';
import {heightAt,WORLD_SIZE} from '../src/core/terrain';
import {addSunnyLandmarks} from '../src/game/SunnyLandmarks';
import {islandCoastGeometry,addIslandHorizon,SEA_LEVEL} from '../src/game/IslandHorizon';
test('landmark buildings keep the full driving corridors open and have real roof support',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),art=addSunnyLandmarks(scene,w);w.step();
 const building=scene.getObjectByName('sunny-valley-landmark-buildings') as Mesh;
 (building.material as any).side=DoubleSide;building.updateMatrixWorld(true);
 for(const p of SUNNY_BUILDINGS){
  assert.ok(nearestRoutePoint(p.x,p.z).distance>p.radius+12);
  assert.ok(nearestExplorationPath(p.x,p.z).distance>p.radius+12);
  const origin=new Vector3(p.x,100,p.z),direction=new Vector3(0,-1,0),visual=new Raycaster(origin,direction).intersectObject(building)[0],physical=w.castRay(new R.Ray(origin,direction),120,true);
  assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.003);
 }
 assert.equal(art.buildings,8);art.update(1);w.free();
});
test('scenic island joins every terrain edge without filling the playable field or adding physics',()=>{
 const g=islandCoastGeometry(),p=g.getAttribute('position');
 for(let i=0;i<=256;i++){
  const x=p.getX(i),z=p.getZ(i);assert.ok(Math.abs(Math.max(Math.abs(x),Math.abs(z))-WORLD_SIZE/2)<.001);
  assert.ok(Math.abs(p.getY(i)-heightAt(x,z))<.003);
 }
 for(let i=0;i<p.count;i++)assert.ok(Math.max(Math.abs(p.getX(i)),Math.abs(p.getZ(i)))>=WORLD_SIZE/2-.001);
 assert.ok(Array.from(p.array).every(Number.isFinite));assert.ok(SEA_LEVEL<0);g.dispose();
 const scene=new Scene(),art=addIslandHorizon(scene);art.update(1);
 for(const name of ['valley-scenic-island-coast','valley-scenic-ocean','valley-distant-mountain-horizon','valley-scenic-balloons'])assert.ok(scene.getObjectByName(name));
});
