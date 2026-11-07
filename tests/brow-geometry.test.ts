import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {SketchFace} from '../src/face/SketchFace';

test('changing eyebrow style redraws both 3D meshes without modifying the classic silhouette',()=>{
 const face=new SketchFace();
 const brows:T.Mesh[]=[];
 face.traverse(object=>{if(object instanceof T.Mesh&&object.name==='sculpted-brow')brows.push(object);});
 assert.equal(brows.length,2);
 const sample=()=>brows.map(mesh=>Array.from((mesh.geometry as T.BufferGeometry).attributes.position.array));
 const pose=()=>face.updatePose(.02,'neutral',0,false,'#bb3344');
 for(let i=0;i<80;i++)pose();
 const classic=sample();
 for(const style of ['elegant','rounded','bold_short'] as const){
   face.browStyle=style;pose();
   const variant=sample();
   for(let side=0;side<2;side++)assert.notDeepEqual(variant[side],classic[side],`${style} must update eyebrow ${side}`);
 }
 face.browStyle='classic';pose();
 assert.deepEqual(sample(),classic);
 face.dispose();
});
