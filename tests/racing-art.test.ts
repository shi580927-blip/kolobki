import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Mesh} from 'three';
import {createWorld} from '../src/game/World';
import {MatchRouteVisual} from '../src/game/MatchRouteVisual';
import {RouteMatch} from '../src/game/RouteMatch';
import {HILL_TRACK,MEADOW_TRACK} from '../src/core/valleyRoute';
import {heightAt} from '../src/core/terrain';

test('open valley has permanent play objects; luminous furniture appears only for the selected match',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),world=createWorld(scene,w),colliders=w.colliders.len();
 assert.equal(scene.getObjectByName('valley-cartoon-race-furniture'),undefined);
 assert.ok(scene.getObjectByName('valley-permanent-boosts-and-hurdle'));assert.equal(world.features.snapshot().boostPads,2);
 const visual=new MatchRouteVisual(scene),match=new RouteMatch(MEADOW_TRACK);visual.update(match);assert.deepEqual(visual.snapshot().visibleTracks,[]);
 match.start([{x:0,z:0},{x:4,z:0}]);visual.update(match);assert.deepEqual(visual.snapshot().visibleTracks,['meadow']);
 match.reset();visual.update(match);assert.equal(visual.snapshot().visible,false);
 match.select(HILL_TRACK);match.start([{x:0,z:0},{x:4,z:0}]);visual.update(match);assert.deepEqual(visual.snapshot().visibleTracks,['hills']);
 assert.equal(w.colliders.len(),colliders,'light gates and edges never add invisible race walls');
 scene.traverse(o=>{if(o instanceof Mesh&&o.name==='match-luminous-edges'){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));assert.ok(p.getY(i)-heightAt(p.getX(i),p.getZ(i))>.10);}}});w.free();
});
