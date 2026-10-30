import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene} from 'three';
import {shoreSandCoverage} from '../src/core/shore';
import {POND,pondRadius,heightAt} from '../src/core/terrain';
import {WetSand} from '../src/game/WetSand';
import {addShoreArt} from '../src/game/ShoreArt';

test('sand collection ends at the visible beach, rather than continuing onto grass',()=>{
 const a=Math.PI/2,r=pondRadius(a),s=new WetSand();
 for(const factor of [1.01,1.2]){
  const x=POND.x,z=POND.z+r*factor,coverage=shoreSandCoverage(x,z);
  s.reset();s.wetness=1;
  for(let i=0;i<30;i++)s.update(1/60,{x,y:heightAt(x,z)+1.01,z},.1,true);
  if(factor===1.01){assert.ok(coverage>.5);assert.ok(s.sand>.2);}
  else {assert.equal(coverage,0);assert.equal(s.sand,0);}
 }
});

test('shore rock groups leave a broad southern exit and both bridge approaches clear',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0});addShoreArt(new Scene(),w);w.step();
 for(const x of [-20,-18,-16])for(let z=38;z<=50;z+=.5){
  assert.equal(w.castRay(new R.Ray({x,y:15,z},{x:0,y:-1,z:0}),25,true),null,'no solid rock across the southern beach');
 }
 for(const x of [-26,-25,-11,-10])assert.equal(w.castRay(new R.Ray({x,y:15,z:POND.z},{x:0,y:-1,z:0}),25,true),null);
 w.free();
});
