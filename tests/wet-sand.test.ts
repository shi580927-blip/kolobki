import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion} from 'three';
import {WetSand} from '../src/game/WetSand';
import {SandCoat} from '../src/game/SandCoat';
import {POND,heightAt,pondRadius} from '../src/core/terrain';
const shoreZ=POND.z+pondRadius(Math.PI/2)*1.25;
const sand={x:POND.x,y:heightAt(POND.x,shoreZ)+1.01,z:shoreZ};
const water={x:POND.x,y:POND.water+.7,z:POND.z};
test('only a wet rolling body collects dry shore sand, with bounded load',()=>{
 const s=new WetSand();for(let i=0;i<60;i++)s.update(1/60,sand,.1,true);assert.equal(s.sand,0);
 s.update(1/60,water,0,true);assert.equal(s.wetness,1);
 for(let i=0;i<10;i++)s.update(1/60,sand,.1,false);assert.equal(s.sand,0);
 for(let i=0;i<60;i++)s.update(1/60,sand,.1,true);assert.ok(s.sand>.5&&s.sand<=1);
});
test('bridge, grass and standing still do not add sand; drying sheds and reset clears it',()=>{
 const s=new WetSand();s.update(1/60,water,0,true);
 s.update(1/60,{x:POND.x,y:POND.water+1.23,z:POND.z},.2,true);s.update(1/60,{x:0,y:3,z:0},.2,true);s.update(1/60,sand,0,true);assert.equal(s.sand,0);
 for(let i=0;i<40;i++)s.update(1/60,sand,.1,true);assert.ok(s.sand>0);
 let shed=0;for(let i=0;i<1800;i++){s.update(1/60,{x:0,y:3,z:0},0,true);shed+=s.shed;}assert.equal(s.sand,0);assert.equal(s.wetness,0);assert.ok(shed>0);s.reset();assert.equal(s.shed,0);
});
test('sand overlay disappears on clearing and keeps the face-facing region free',()=>{
 const coat=new SandCoat();coat.update(1,new Quaternion(),new Quaternion(),1);assert.equal(coat.count,72);coat.update(0,new Quaternion(),new Quaternion(),0);assert.equal(coat.count,0);
});
test('a light touch of shallow water wets the body, while the bridge stays dry',()=>{
 const s=new WetSand();s.update(1/60,{x:POND.x,y:POND.water+.98,z:POND.z},0,false);assert.equal(s.wetness,1);s.reset();s.update(1/60,{x:POND.x,y:POND.water+1.23,z:POND.z},0,true);assert.equal(s.wetness,0);
});
