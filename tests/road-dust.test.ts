import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {Scene,Vector3} from 'three';
import {RoadDust} from '../src/game/RoadDust';

test('road dust is bounded, ground-only, fades and resets',()=>{
 const dust=new RoadDust(new Scene()),p=new Vector3(0,1,5),v={x:0,y:0,z:8};
 for(let i=0;i<90;i++){p.z=5+(i%40)*.1;dust.step(1/60,p,v,true);}
 assert.ok(dust.count>0&&dust.count<=120);
 for(let i=0;i<90;i++)dust.step(1/60,p,{x:0,y:0,z:0},true);
 assert.equal(dust.count,0);
 for(let i=0;i<60;i++)dust.step(1/60,p,v,false);
 assert.equal(dust.count,0);
 dust.reset();
 for(let i=0;i<90;i++)dust.step(1/60,new Vector3(90,1,90),v,true);
 assert.equal(dust.count,0);
 dust.reset();assert.equal(dust.count,0);
});
test('landing after a fall emits a brief puff even without horizontal speed',()=>{
 const dust=new RoadDust(new Scene()),p=new Vector3(0,1,5);
 for(let i=0;i<20;i++)dust.step(1/60,p,{x:0,y:-4,z:0},false);
 dust.step(1/60,p,{x:0,y:0,z:0},true);
 assert.ok(dust.count>0);dust.reset();assert.equal(dust.count,0);
});

test('continuous travel emits overlapping puffs in proportion to distance',()=>{
 const dust=new RoadDust(new Scene()),p=new Vector3(0,1,3);
 for(let i=0;i<30;i++){p.z=3+i*.12;dust.step(1/60,p,{x:0,y:0,z:7.2},true);}
 assert.ok(dust.count>=20&&dust.count<=120);
});
