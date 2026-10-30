import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {WaterWake} from '../src/game/WaterWake';
import {POND} from '../src/core/terrain';
test('movement wake emits only in water, is bounded, fades and resets',()=>{
 const w=new WaterWake(new Scene()),p={x:POND.x,y:POND.water+.7,z:POND.z};
 w.emit(0,{...p,y:POND.water+2},{x:4,z:0});assert.equal(w.count,0);
 w.emit(0,p,{x:0,z:0});assert.equal(w.count,0);
 w.emit(0,p,{x:4,z:0});assert.equal(w.count,1);
 w.emit(0,p,{x:4,z:0});assert.equal(w.count,1);
 for(let i=0;i<100;i++)w.emit(i+1,p,{x:4,z:0});assert.equal(w.count,64);
 w.update(1);assert.equal(w.count,0);w.reset();assert.equal(w.count,0);
});
test('one falling entry creates a capped splash; ordinary wet movement does not repeat it',()=>{
 const w=new WaterWake(new Scene()),p={x:POND.x,y:POND.water+2,z:POND.z};
 w.emit(0,p,{x:0,y:-5,z:0});w.emit(0,{...p,y:POND.water+.7},{x:0,y:-5,z:0});
 assert.equal(w.splashCount,1);assert.equal(w.dropCount,12);
 for(let i=0;i<100;i++)w.emit(0,{...p,y:POND.water+.7},{x:2,y:0,z:0});assert.equal(w.splashCount,1);
 w.update(1);assert.equal(w.splashCount,0);assert.equal(w.dropCount,0);
 w.reset();assert.equal(w.splashCount,0);
});
