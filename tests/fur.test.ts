import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Matrix4,Matrix3} from 'three';
import {makeFurGeometry,FurTufts,FUR_LAYERS} from '../src/skin/FurTufts';
import {defaultDesign,validateDesign,patterns} from '../src/skin/SkinDesign';
test('short fur uses a fixed small shell budget and tracks face-relative rotation',()=>{
 const d={...defaultDesign,surface:'shaggy' as const},g=makeFurGeometry(d.seed);assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));assert.equal(g.attributes.coatLayer.count,FUR_LAYERS);g.dispose();
 const fur=new FurTufts(d),q=new Quaternion().setFromAxisAngle({x:1,y:0,z:0} as any,1);fur.updateTufts(q);assert.deepEqual(fur.coatUniforms.faceFrame.value,new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(q)));assert.equal(fur.count,8);assert.ok(fur.coatUniforms.height.value<=.12);fur.release();
});
test('existing author JSON gets fur defaults; invalid values are rejected',()=>{
 const old:any={...defaultDesign};delete old.furCount;delete old.furLength;delete old.furScatter;delete old.surfaceAccent;const read=validateDesign(old);assert.equal(read.furCount,64);assert.equal(read.furLength,.08);assert.equal(read.surfaceAccent,true);
 for(const patch of [{furCount:161},{furCount:1.1},{furLength:NaN},{furScatter:-1},{surfaceAccent:'yes'}])assert.throws(()=>validateDesign({...defaultDesign,...patch}));assert.ok(patterns.lightning);
});
test('fur upper layers use the accent over a longer portion and monochrome keeps one colour',()=>{
 const fur=new FurTufts({...defaultDesign,base:'#000000',accent:'#ffffff',surface:'shaggy'}),c=fur.instanceColor!;
 assert.equal(c.getX(0),0);assert.equal(c.getX(7),1);assert.ok(c.getX(3)>0&&c.getX(3)<1);fur.release();
 const mono=new FurTufts({...defaultDesign,surface:'fuzz',surfaceAccent:false,base:'#ff0000',accent:'#0000ff'}),m=mono.instanceColor!;for(let i=0;i<m.count;i++){assert.equal(m.getX(i),1);assert.equal(m.getZ(i),0);}mono.release();
});
