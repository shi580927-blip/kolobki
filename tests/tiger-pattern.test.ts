import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeTigerField,sphereTexturePoint} from '../src/skin/TigerPattern';
import {defaultDesign} from '../src/skin/SkinDesign';
test('3D tiger pigment is seeded and continuous across the sphere UV seam and poles',()=>{
 const a=makeTigerField(defaultDesign),b=makeTigerField(defaultDesign),other=makeTigerField({...defaultDesign,seed:99});let different=0,marked=0;
 for(let y=0;y<50;y++)for(let x=0;x<100;x++){const p=sphereTexturePoint(x/100,y/50),value=a(...p);assert.equal(value,b(...p));assert.ok(value===0||value===1);marked+=value;if(value!==other(...p))different++;}
 assert.ok(marked>600&&marked<3800);assert.ok(different>100);
 for(let v=0;v<=1;v+=.02)assert.equal(a(...sphereTexturePoint(0,v)),a(...sphereTexturePoint(1,v)));
 for(const v of [0,1])for(let u=0;u<1;u+=.1)assert.equal(a(...sphereTexturePoint(u,v)),a(...sphereTexturePoint(0,v)));
});
