import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene} from 'three';
import {addRacingArt} from '../src/game/RacingArt';
import {VALLEY_ROUTE} from '../src/core/valleyRoute';
import {EXPLORATION_PATHS} from '../src/core/valleyExploration';
import {heightAt} from '../src/core/terrain';

test('racing furniture leaves every existing driving centreline and exploration exit open',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),art=addRacingArt(scene,w);w.step();
 assert.equal(art.arches,2);assert.ok(art.kerbs>60);assert.equal(scene.children.length,1);
 const paths=[VALLEY_ROUTE.map(p=>[p.x,p.z]),...EXPLORATION_PATHS] as readonly (readonly (readonly number[])[])[];
 for(const path of paths)for(let i=1;i<path.length;i++){
  const [ax,az]=path[i-1],[bx,bz]=path[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)*2);
  for(let k=0;k<=n;k++){
   const t=k/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
   const hit=w.intersectionWithShape({x,y:heightAt(x,z)+1.1,z},{x:0,y:0,z:0,w:1},new R.Ball(.98));
   assert.equal(hit,null,`new furniture blocks ${x},${z}`);
  }
 }
 w.free();
});
