import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion} from 'three';
import {furLayout,makeFurGeometry,FurTufts} from '../src/skin/FurTufts';
import {defaultDesign,validateDesign,patterns} from '../src/skin/SkinDesign';
test('ragged fur is seeded, bounded and made of many curved strands',()=>{
 const d={...defaultDesign,surface:'shaggy' as const},a=furLayout(d),g=makeFurGeometry(d.seed);assert.equal(a.length,64);assert.deepEqual(a,furLayout(d));assert.notDeepEqual(a,furLayout({...d,seed:1}));assert.ok(new Set(a.map(p=>p.size)).size>40);assert.ok(g.attributes.position.count>500);assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));g.dispose();
 const tufts=new FurTufts(d);tufts.updateTufts(new Quaternion().setFromAxisAngle({x:1,y:0,z:0} as any,1));assert.ok(Array.from(tufts.instanceMatrix.array).every(Number.isFinite));assert.equal(tufts.count,64);tufts.release();
});
test('existing author JSON gets fur defaults; bad fur values are rejected',()=>{
 const old:any={...defaultDesign};delete old.furCount;delete old.furLength;delete old.furScatter;const read=validateDesign(old);assert.equal(read.furCount,64);assert.equal(read.furLength,.16);
 for(const patch of [{furCount:161},{furCount:1.1},{furLength:NaN},{furScatter:-1}])assert.throws(()=>validateDesign({...defaultDesign,...patch}));
 assert.ok(patterns.lightning);for(const surface of ['fuzz','shaggy'])assert.equal(validateDesign({...defaultDesign,surface}).surface,surface);
});

test('fur uses base roots and accent tips in the same mesh',()=>{
 const d={...defaultDesign,base:'#000000',accent:'#ffffff',surface:'shaggy' as const},fur=new FurTufts(d),c=fur.geometry.attributes.color;
 assert.equal(c.getX(0),0);assert.equal(c.getX(25),1);assert.ok(c.getX(20)>0&&c.getX(20)<1);fur.release();
});
