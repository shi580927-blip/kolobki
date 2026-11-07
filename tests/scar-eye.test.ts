import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SketchFace} from '../src/face/SketchFace';
import {contours} from '../src/face/V5Contours';

test('face-bound scar keeps one eye shut through expressions and ordinary blinks',()=>{
 const f=new SketchFace();f.closedScarEye=true;
 const parts=(name:string)=>{const a:{visible:boolean}[]=[];f.traverse(o=>{if(o.name===name)a.push(o);});return a;};
 for(const pose of Object.keys(contours)){
  for(let i=0;i<25;i++)f.updatePose(.05,pose,0,false,'#e6b0a1');
  assert.equal(parts('pupil')[1].visible,false,pose+' must hide scarred pupil');
  assert.equal(parts('iris')[1].visible,false,pose+' must hide scarred iris');
  assert.equal(parts('stun-spiral')[1].visible,false,pose+' must not draw a spiral over the scar');
  assert.equal(parts('scar-closed-lid')[0].visible,true);
 }
 f.updatePose(.05,'neutral',0,false,'#e6b0a1');assert.equal(parts('pupil')[0].visible,true,'other eye opens');
 f.updatePose(.05,'neutral',1,false,'#e6b0a1');assert.equal(parts('pupil')[0].visible,false,'other eye blinks');
 f.closedScarEye=false;f.updatePose(.05,'neutral',0,false,'#e6b0a1');assert.equal(parts('scar-closed-lid')[0].visible,false);assert.equal(parts('pupil')[1].visible,true);
 f.dispose();
});
