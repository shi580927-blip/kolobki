import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultDesign,patterns,validateDesign,motifLayout,growthLayout} from '../src/skin/SkinDesign';
test('fifteen patterns plus solid are available and exported settings round-trip',()=>{
 assert.equal(Object.keys(patterns).length,16);assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(defaultDesign))),defaultDesign);
});
test('motif scale and size scatter preserve seeded count and placement independently',()=>{
 const base=motifLayout(defaultDesign),large=motifLayout({...defaultDesign,scale:2,sizeScatter:0});
 assert.equal(base.length,large.length);base.forEach((p,i)=>{assert.equal(p.u,large[i].u);assert.equal(p.v,large[i].v);assert.equal(large[i].size,.084);});assert.deepEqual(motifLayout(defaultDesign),base);
 assert.notDeepEqual(motifLayout({...defaultDesign,seed:4322}),base);
});
test('position jitter cannot escape texture bounds and zero jitter remains regular',()=>{
 const a=motifLayout({...defaultDesign,positionScatter:1});assert.ok(a.every(p=>p.u>=0&&p.u<1&&p.v>0&&p.v<1));
 const regular=motifLayout({...defaultDesign,regular:true});assert.ok(regular.every(p=>p.size===.042&&p.angle===0));assert.ok(regular.filter(p=>p.v<.5).length>=regular.length/2-1);
});
test('growth count is exact, directions are spherical and adding growths preserves previous ones',()=>{
 const small=growthLayout({...defaultDesign,growthCount:2}),all=growthLayout({...defaultDesign,growthCount:240});assert.equal(all.length,240);assert.deepEqual(all.slice(0,2),small);assert.ok(all.every(p=>Math.abs(Math.hypot(...p.direction)-1)<1e-5&&p.size>0));assert.equal(growthLayout(defaultDesign).length,0);
});
test('imports reject corrupt, unlimited or nonfinite settings instead of silently changing a design',()=>{
 for(const patch of [{version:2},{base:'red'},{pattern:'unknown'},{pattern:'toString'},{growthCount:241},{growthCount:1.5},{seed:-1},{scale:NaN},{surface:'metal'},{growthAccent:'yes'}])assert.throws(()=>validateDesign({...defaultDesign,...patch}));
});
