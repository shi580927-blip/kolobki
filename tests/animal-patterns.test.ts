import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeAnimalField} from '../src/skin/AnimalPatterns';
import {sphereTexturePoint} from '../src/skin/TigerPattern';
import {defaultDesign,validateDesign} from '../src/skin/SkinDesign';
test('zebra and giraffe fields stay two-color and wrap continuously around sphere',()=>{
 for(const pattern of ['zebra','giraffe','cow'] as const){const field=makeAnimalField({...defaultDesign,pattern});let marked=0;for(let y=0;y<40;y++)for(let x=0;x<80;x++)marked+=field(...sphereTexturePoint(x/80,y/40));assert.ok(marked>300&&marked<3100);for(let v=0;v<1;v+=.05)assert.equal(field(...sphereTexturePoint(0,v)),field(...sphereTexturePoint(1,v)));}
});
test('gloss and regular settings round-trip and old files remain compatible',()=>{
 const d={...defaultDesign,regular:true,gloss:.8};assert.deepEqual(validateDesign(d),d);const old:any={...defaultDesign};delete old.gloss;delete old.regular;assert.equal(validateDesign(old).gloss,0);for(const patch of [{gloss:2},{gloss:NaN},{regular:'yes'}])assert.throws(()=>validateDesign({...d,...patch}));
});
